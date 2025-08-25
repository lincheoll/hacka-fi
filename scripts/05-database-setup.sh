#!/bin/bash

# =============================================================================
# 05 - Database Setup Script  
# =============================================================================
# This script sets up the database using Prisma ORM, runs migrations,
# and optionally seeds the database with test data.
# =============================================================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
    echo -e "\n${BLUE}==== $1 ====${NC}"
}

# Check prerequisites
check_prerequisites() {
    log_step "Checking prerequisites"
    
    # Check if we're in project root
    if [[ ! -f "package.json" ]] || [[ ! -f "apps/api/package.json" ]]; then
        log_error "This script must be run from the HackaFi project root directory"
        exit 1
    fi
    
    # Check if environment is configured
    if [[ ! -f "apps/api/.env" ]]; then
        log_error "API environment file not found. Please run 04-environment-setup.sh first"
        exit 1
    fi
    
    # Check if Prisma schema exists
    if [[ ! -f "apps/api/prisma/schema.prisma" ]]; then
        log_error "Prisma schema not found at apps/api/prisma/schema.prisma"
        exit 1
    fi
    
    # Check if pnpm is available
    if ! command -v pnpm &> /dev/null; then
        log_error "pnpm not found. Please run 01-system-prerequisites.sh first"
        exit 1
    fi
    
    log_success "All prerequisites are met"
}

# Detect database configuration
detect_database_config() {
    log_step "Detecting database configuration"
    
    local database_url=$(grep "DATABASE_URL=" apps/api/.env | cut -d'=' -f2- || echo "")
    local database_provider=$(grep "DATABASE_PROVIDER=" apps/api/.env | cut -d'=' -f2- || echo "sqlite")
    
    if [[ -z "$database_url" ]]; then
        log_error "DATABASE_URL not found in apps/api/.env"
        echo "Please run 04-environment-setup.sh to configure the database"
        exit 1
    fi
    
    # Determine database type
    if [[ "$database_url" == *"sqlite"* ]] || [[ "$database_url" == *"file:"* ]]; then
        DB_TYPE="sqlite"
        DB_NAME="SQLite"
        DB_FILE="apps/api/prisma/dev.db"
    elif [[ "$database_url" == *"postgresql"* ]]; then
        DB_TYPE="postgresql"
        DB_NAME="PostgreSQL"
        # Extract connection details for verification
        DB_HOST=$(echo "$database_url" | sed -n 's|.*://.*@\([^:]*\):.*|\1|p')
        DB_PORT=$(echo "$database_url" | sed -n 's|.*://.*@[^:]*:\([^/]*\)/.*|\1|p')
    else
        log_error "Unsupported database URL format: $database_url"
        exit 1
    fi
    
    log_success "Detected database type: $DB_NAME"
    
    export DB_TYPE DB_NAME
}

# Start database services if needed
start_database_services() {
    if [[ "$DB_TYPE" == "postgresql" ]]; then
        log_step "Starting PostgreSQL services"
        
        # Check if Docker is running
        if ! docker info &> /dev/null; then
            log_error "Docker is not running. Please start Docker first."
            exit 1
        fi
        
        # Check if PostgreSQL container is running
        if ! docker compose ps | grep -q "db.*running"; then
            log_info "Starting PostgreSQL container..."
            docker compose up -d db
            
            # Wait for PostgreSQL to be ready
            log_info "Waiting for PostgreSQL to be ready..."
            for i in {1..30}; do
                if docker compose exec -T db pg_isready -U postgres &> /dev/null; then
                    log_success "PostgreSQL is ready"
                    break
                fi
                
                if [[ $i -eq 30 ]]; then
                    log_error "PostgreSQL failed to start within 30 seconds"
                    docker compose logs db
                    exit 1
                fi
                
                sleep 2
            done
        else
            log_success "PostgreSQL is already running"
        fi
    else
        log_info "Using SQLite - no services need to be started"
    fi
}

# Generate Prisma client
generate_prisma_client() {
    log_step "Generating Prisma client"
    
    cd apps/api
    
    log_info "Running prisma generate..."
    if pnpm prisma generate; then
        log_success "Prisma client generated successfully"
    else
        log_error "Failed to generate Prisma client"
        cd ../..
        exit 1
    fi
    
    cd ../..
}

# Run database migrations
run_migrations() {
    log_step "Running database migrations"
    
    cd apps/api
    
    if [[ "$DB_TYPE" == "sqlite" ]]; then
        log_info "Running development migrations (SQLite)..."
        if pnpm prisma migrate dev --name "initial_setup"; then
            log_success "SQLite migrations completed"
        else
            log_warning "Migration failed, attempting to reset and retry..."
            if pnpm prisma migrate reset --force; then
                log_success "Database reset successfully"
            else
                log_error "Failed to reset database"
                cd ../..
                exit 1
            fi
        fi
    else
        log_info "Running production migrations (PostgreSQL)..."
        if pnpm prisma migrate deploy; then
            log_success "PostgreSQL migrations completed"
        else
            log_error "Failed to run PostgreSQL migrations"
            echo ""
            echo "Common solutions:"
            echo "1. Ensure PostgreSQL is running: docker compose up -d db"
            echo "2. Check database connection in .env file"
            echo "3. Verify PostgreSQL credentials"
            cd ../..
            exit 1
        fi
    fi
    
    cd ../..
}

# Verify database setup
verify_database() {
    log_step "Verifying database setup"
    
    cd apps/api
    
    # Check if database file exists (SQLite) or connection works (PostgreSQL)
    if [[ "$DB_TYPE" == "sqlite" ]]; then
        if [[ -f "prisma/dev.db" ]]; then
            local db_size=$(du -h prisma/dev.db | cut -f1)
            log_success "SQLite database created (size: $db_size)"
            
            # Verify tables exist
            if pnpm prisma db execute --stdin < <(echo "SELECT name FROM sqlite_master WHERE type='table';") &> /dev/null; then
                log_success "Database tables verified"
            else
                log_warning "Could not verify database tables"
            fi
        else
            log_error "SQLite database file not created"
            cd ../..
            exit 1
        fi
    else
        # Test PostgreSQL connection
        log_info "Testing PostgreSQL connection..."
        if pnpm prisma db execute --stdin < <(echo "SELECT 1;") &> /dev/null; then
            log_success "PostgreSQL connection verified"
        else
            log_error "Cannot connect to PostgreSQL"
            echo ""
            echo "Troubleshooting steps:"
            echo "1. Check if PostgreSQL is running: docker compose ps"
            echo "2. Check logs: docker compose logs db"
            echo "3. Verify DATABASE_URL in apps/api/.env"
            cd ../..
            exit 1
        fi
    fi
    
    cd ../..
}

# Seed database with test data
seed_database() {
    log_step "Seeding database with test data"
    
    cd apps/api
    
    # Check if seed file exists
    if [[ ! -f "prisma/seed.ts" ]]; then
        log_warning "No seed file found at prisma/seed.ts"
        log_info "Skipping database seeding"
        cd ../..
        return
    fi
    
    echo ""
    read -p "Do you want to seed the database with test data? (y/N): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log_info "Running database seed..."
        if pnpm prisma db seed; then
            log_success "Database seeded successfully"
        else
            log_warning "Database seeding failed (this might be expected if seed data already exists)"
        fi
    else
        log_info "Database seeding skipped"
    fi
    
    cd ../..
}

# Test database queries
test_database_queries() {
    log_step "Testing basic database queries"
    
    cd apps/api
    
    # Create a simple test script
    cat > test_db.js << 'EOF'
const { PrismaClient } = require('@prisma/client');

async function testDatabase() {
    const prisma = new PrismaClient();
    
    try {
        // Test connection by counting users
        const userCount = await prisma.userProfile.count();
        console.log(`✅ Database connection successful - Found ${userCount} users`);
        
        // Test basic operations
        const hackathonCount = await prisma.hackathon.count();
        console.log(`✅ Found ${hackathonCount} hackathons`);
        
    } catch (error) {
        console.error('❌ Database test failed:', error.message);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

testDatabase();
EOF
    
    log_info "Running database connectivity test..."
    if node test_db.js; then
        log_success "Database queries working correctly"
    else
        log_error "Database query test failed"
        rm -f test_db.js
        cd ../..
        exit 1
    fi
    
    # Clean up test file
    rm -f test_db.js
    cd ../..
}

# Show database status and information
show_database_status() {
    log_step "Database Setup Summary"
    
    cd apps/api
    
    echo "Database Configuration:"
    echo "  • Type: $DB_NAME"
    
    if [[ "$DB_TYPE" == "sqlite" ]]; then
        echo "  • File: $DB_FILE"
        if [[ -f "prisma/dev.db" ]]; then
            local db_size=$(du -h prisma/dev.db | cut -f1)
            echo "  • Size: $db_size"
        fi
        echo "  • Access: pnpm prisma studio (from apps/api directory)"
    else
        echo "  • Host: $DB_HOST:$DB_PORT"
        echo "  • Access: docker compose exec db psql -U postgres -d hacka_fi"
        echo "  • Studio: pnpm prisma studio (from apps/api directory)"
    fi
    
    echo ""
    echo "Available Prisma commands (run from apps/api/):"
    echo "  • pnpm prisma studio     - Open database browser"
    echo "  • pnpm prisma migrate dev - Create and apply new migration"  
    echo "  • pnpm prisma db seed    - Run database seeding"
    echo "  • pnpm prisma generate   - Regenerate Prisma client"
    
    if [[ "$DB_TYPE" == "sqlite" ]]; then
        echo "  • pnpm prisma migrate reset - Reset database (development only)"
    fi
    
    echo ""
    echo "Database Models Available:"
    
    # List models from schema
    local models=$(grep "^model " prisma/schema.prisma | cut -d' ' -f2 | sort)
    for model in $models; do
        echo "  • $model"
    done
    
    cd ../..
}

# Main database setup flow
main() {
    echo "🗄️  HackaFi Database Setup"
    echo "========================="
    echo "This script will set up the database using Prisma ORM:"
    echo "  • Generate Prisma client"
    echo "  • Start database services (if needed)"
    echo "  • Run database migrations"
    echo "  • Verify database setup"
    echo "  • Optionally seed with test data"
    echo ""
    
    read -p "Do you want to continue with database setup? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Database setup cancelled"
        exit 0
    fi
    
    check_prerequisites
    detect_database_config
    start_database_services
    generate_prisma_client
    run_migrations
    verify_database
    seed_database
    test_database_queries
    show_database_status
    
    echo ""
    log_success "🎉 Database setup completed successfully!"
    echo ""
    echo "Your $DB_NAME database is now ready for HackaFi development."
    echo ""
    echo "Quick commands to get started:"
    echo "  • View database: cd apps/api && pnpm prisma studio"
    echo "  • Next step: ./scripts/06-smart-contracts.sh"
    echo "  • Start development: ./scripts/07-development-start.sh"
    echo ""
    echo "Database is ready for the HackaFi application!"
}

# Handle help
if [[ "${1:-}" == "help" ]] || [[ "${1:-}" == "-h" ]] || [[ "${1:-}" == "--help" ]]; then
    echo "HackaFi Database Setup Script"
    echo "============================"
    echo "This script sets up and configures the database for HackaFi development"
    echo "using Prisma ORM."
    echo ""
    echo "What it does:"
    echo "  1. Check prerequisites (project structure, environment)"
    echo "  2. Detect database configuration (SQLite/PostgreSQL)"
    echo "  3. Start database services if needed (Docker for PostgreSQL)"
    echo "  4. Generate Prisma client code"
    echo "  5. Run database migrations"
    echo "  6. Verify database setup and connectivity"
    echo "  7. Optionally seed database with test data"
    echo ""
    echo "Usage: $0"
    echo ""
    echo "Prerequisites:"
    echo "  • Environment configured (run 04-environment-setup.sh)"
    echo "  • Dependencies installed (run 03-project-dependencies.sh)"
    echo "  • Docker running (for PostgreSQL only)"
    echo ""
    echo "Supported databases:"
    echo "  • SQLite (default for development)"
    echo "  • PostgreSQL (production-like development)"
    echo ""
    echo "The script will automatically detect your database configuration"
    echo "from the DATABASE_URL in apps/api/.env file."
    echo ""
    exit 0
fi

# Run main function
main