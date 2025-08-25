#!/bin/bash

# =============================================================================
# 08 - Production Setup Script
# =============================================================================  
# This script configures and deploys HackaFi for production environments
# using Docker Compose with PostgreSQL, Redis, and production optimizations.
# =============================================================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
PRODUCTION_SERVICES=("api" "web" "db" "redis")
REQUIRED_PORTS=(80 443 3000 3010 5432 6379)
BACKUP_DIR="./backups"

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

log_critical() {
    echo -e "${RED}[CRITICAL]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_step "Checking production prerequisites"
    
    # Check if we're in project root
    if [[ ! -f "package.json" ]] || [[ ! -f "docker-compose.yml" ]]; then
        log_error "This script must be run from the HackaFi project root directory"
        exit 1
    fi
    
    # Check Docker and Docker Compose
    if ! command -v docker &> /dev/null; then
        log_error "Docker not found. Please run 01-system-prerequisites.sh first"
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        log_error "Docker is not running. Please start Docker first."
        exit 1
    fi
    
    if ! docker compose version &> /dev/null; then
        log_error "Docker Compose not available"
        exit 1
    fi
    
    # Check if development environment exists
    if [[ ! -f ".env" ]]; then
        log_warning "No environment configuration found"
        log_info "Running environment setup first..."
        ./scripts/04-environment-setup.sh
    fi
    
    log_success "Production prerequisites verified"
}

# Create production environment files
setup_production_environment() {
    log_step "Setting up production environment"
    
    # Create production environment files if they don't exist
    local prod_files_created=()
    
    if [[ ! -f ".env.production" ]]; then
        if [[ -f "docker.env.production.example" ]]; then
            cp docker.env.production.example .env.production
            prod_files_created+=(".env.production")
        else
            log_warning "No production environment example found, using development as template"
            cp .env .env.production
            prod_files_created+=(".env.production (from dev)")
        fi
    fi
    
    if [[ ! -f "apps/api/.env.production" ]]; then
        if [[ -f "apps/api/env.production.example" ]]; then
            cp apps/api/env.production.example apps/api/.env.production
            prod_files_created+=("apps/api/.env.production")
        else
            cp apps/api/.env apps/api/.env.production
            prod_files_created+=("apps/api/.env.production (from dev)")
        fi
    fi
    
    if [[ ! -f "apps/web/.env.production" ]]; then
        if [[ -f "apps/web/env.production.example" ]]; then
            cp apps/web/env.production.example apps/web/.env.production
            prod_files_created+=("apps/web/.env.production")
        else
            cp apps/web/.env apps/web/.env.production
            prod_files_created+=("apps/web/.env.production (from dev)")
        fi
    fi
    
    if [[ ${#prod_files_created[@]} -gt 0 ]]; then
        log_success "Created production environment files:"
        for file in "${prod_files_created[@]}"; do
            echo "  ✅ $file"
        done
    else
        log_info "Production environment files already exist"
    fi
    
    configure_production_settings
}

# Configure production-specific settings
configure_production_settings() {
    log_step "Configuring production settings"
    
    log_warning "⚠️  CRITICAL: Production configuration required!"
    echo ""
    echo "Production deployment requires secure configuration:"
    echo ""
    
    # Generate secure passwords and secrets
    local db_password=$(openssl rand -base64 32 2>/dev/null | tr -d "=+/" | cut -c1-25)
    local jwt_secret=$(openssl rand -hex 64)
    local redis_password=$(openssl rand -base64 32 2>/dev/null | tr -d "=+/" | cut -c1-25)
    
    log_info "Generated secure production secrets"
    
    # Update production environment files
    update_prod_env_var ".env.production" "NODE_ENV" "production"
    update_prod_env_var ".env.production" "POSTGRES_PASSWORD" "$db_password"
    
    # Database URL for production
    update_prod_env_var "apps/api/.env.production" "DATABASE_URL" "postgresql://postgres:$db_password@db:5432/hacka_fi_prod"
    update_prod_env_var "apps/api/.env.production" "DATABASE_PROVIDER" "postgresql"
    update_prod_env_var "apps/api/.env.production" "JWT_SECRET" "$jwt_secret"
    update_prod_env_var "apps/api/.env.production" "NODE_ENV" "production"
    
    # Web production settings
    update_prod_env_var "apps/web/.env.production" "NODE_ENV" "production"
    
    echo ""
    log_warning "IMPORTANT: Configure these production settings manually:"
    echo ""
    echo "1. Domain and SSL Configuration:"
    echo "   • Update NEXT_PUBLIC_API_URL in apps/web/.env.production"
    echo "   • Set up SSL certificates (Let's Encrypt recommended)"
    echo "   • Configure reverse proxy (nginx/traefik)"
    echo ""
    echo "2. Database Backup Strategy:"
    echo "   • Set up automated PostgreSQL backups"
    echo "   • Configure backup retention policy"
    echo "   • Test backup restoration procedures"
    echo ""
    echo "3. Monitoring and Alerting:"
    echo "   • Set up application monitoring (Sentry, DataDog, etc.)"
    echo "   • Configure log aggregation (ELK, Fluentd)"
    echo "   • Set up uptime monitoring"
    echo ""
    echo "4. Security Configuration:"
    echo "   • Review firewall settings"
    echo "   • Configure rate limiting"
    echo "   • Set up intrusion detection"
    echo ""
    
    read -p "Have you reviewed the production configuration checklist? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_warning "Please review production configuration before deployment"
        echo ""
        echo "Production checklist available in: PRODUCTION_CHECKLIST.md"
        echo "Continue with deployment at your own risk."
        echo ""
    fi
}

# Helper function to update production environment variables
update_prod_env_var() {
    local file="$1"
    local var="$2"
    local value="$3"
    
    if [[ -f "$file" ]]; then
        if grep -q "^$var=" "$file"; then
            sed -i.bak "s/^$var=.*/$var=$value/" "$file"
            rm -f "$file.bak"
        elif grep -q "^#$var=" "$file"; then
            sed -i.bak "s/^#$var=.*/$var=$value/" "$file"
            rm -f "$file.bak"
        else
            echo "$var=$value" >> "$file"
        fi
    fi
}

# Check production readiness
check_production_readiness() {
    log_step "Checking production readiness"
    
    local readiness_issues=()
    
    # Check critical production settings
    if ! grep -q "NODE_ENV=production" .env.production 2>/dev/null; then
        readiness_issues+=("NODE_ENV not set to production in .env.production")
    fi
    
    if ! grep -q "JWT_SECRET=" apps/api/.env.production 2>/dev/null || grep -q "JWT_SECRET=your-" apps/api/.env.production 2>/dev/null; then
        readiness_issues+=("JWT_SECRET not properly configured for production")
    fi
    
    if grep -q "DATABASE_URL=file:" apps/api/.env.production 2>/dev/null; then
        readiness_issues+=("Production still using SQLite database")
    fi
    
    # Check smart contract addresses
    if ! grep -q "HACKATHON_REGISTRY_ADDRESS=0x" .env.production 2>/dev/null; then
        readiness_issues+=("Smart contract addresses not configured for production")
    fi
    
    # Check ports availability
    local blocked_ports=()
    for port in "${REQUIRED_PORTS[@]}"; do
        if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
            blocked_ports+=($port)
        fi
    done
    
    if [[ ${#blocked_ports[@]} -gt 0 ]]; then
        readiness_issues+=("Ports in use: ${blocked_ports[*]}")
    fi
    
    # Report readiness status
    if [[ ${#readiness_issues[@]} -gt 0 ]]; then
        log_warning "Production readiness issues found:"
        for issue in "${readiness_issues[@]}"; do
            echo "  ⚠️  $issue"
        done
        echo ""
        
        read -p "Do you want to continue despite these issues? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "Production deployment cancelled"
            echo ""
            echo "Please address the issues above and try again."
            exit 1
        fi
    else
        log_success "Production readiness checks passed"
    fi
}

# Build production images
build_production_images() {
    log_step "Building production Docker images"
    
    log_info "Building optimized production images..."
    log_warning "This may take several minutes..."
    
    if docker compose -f docker-compose.yml build --no-cache; then
        log_success "Production images built successfully"
        
        # Show image sizes
        log_info "Production image sizes:"
        docker images | grep hacka-fi || echo "No HackaFi images found"
    else
        log_error "Failed to build production images"
        echo ""
        echo "Common issues:"
        echo "1. Check Dockerfile syntax"
        echo "2. Verify build context and dependencies"
        echo "3. Ensure sufficient disk space"
        echo "4. Check network connectivity for package downloads"
        exit 1
    fi
}

# Deploy production services
deploy_production_services() {
    log_step "Deploying production services"
    
    log_critical "🚨 PRODUCTION DEPLOYMENT WARNING 🚨"
    echo ""
    echo "You are about to deploy HackaFi to production with:"
    echo "  • PostgreSQL database (persistent data)"
    echo "  • Redis cache"
    echo "  • Production-optimized builds"
    echo "  • Real user traffic handling"
    echo ""
    echo "This deployment will:"
    echo "  • Create production database with migrations"
    echo "  • Start all services in production mode"
    echo "  • Use production environment variables"
    echo "  • Handle real user data and transactions"
    echo ""
    
    read -p "Are you sure you want to deploy to production? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Production deployment cancelled"
        exit 0
    fi
    
    # Create backup directory
    mkdir -p "$BACKUP_DIR"
    
    # Start production services
    log_info "Starting production services..."
    
    if docker compose --env-file .env.production up -d --profile production; then
        log_success "Production services started successfully"
    else
        log_error "Failed to start production services"
        echo ""
        echo "Check Docker logs for details:"
        echo "  docker compose logs"
        exit 1
    fi
}

# Run production database migrations
setup_production_database() {
    log_step "Setting up production database"
    
    log_info "Waiting for database to be ready..."
    
    # Wait for PostgreSQL to be ready
    local max_attempts=30
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        if docker compose exec -T db pg_isready -U postgres &> /dev/null; then
            log_success "Database is ready"
            break
        fi
        
        if [[ $attempt -eq $max_attempts ]]; then
            log_error "Database failed to start within timeout"
            docker compose logs db
            exit 1
        fi
        
        sleep 5
        ((attempt++))
    done
    
    # Run database migrations
    log_info "Running production database migrations..."
    
    if docker compose exec api pnpm prisma migrate deploy; then
        log_success "Database migrations completed"
    else
        log_error "Database migrations failed"
        echo ""
        echo "Check API logs: docker compose logs api"
        exit 1
    fi
    
    # Optionally seed production data
    read -p "Do you want to seed production database with initial data? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log_info "Seeding production database..."
        if docker compose exec api pnpm prisma db seed; then
            log_success "Production database seeded"
        else
            log_warning "Database seeding failed or skipped"
        fi
    fi
}

# Perform production health checks
production_health_checks() {
    log_step "Performing production health checks"
    
    local health_endpoints=(
        "http://localhost:3010/health"
        "http://localhost:3010/health/database"
        "http://localhost:3000"
    )
    
    local max_attempts=20
    local healthy_services=0
    
    for endpoint in "${health_endpoints[@]}"; do
        local attempt=1
        local service_healthy=false
        
        while [[ $attempt -le $max_attempts ]]; do
            if curl -s -f "$endpoint" > /dev/null 2>&1; then
                log_success "✓ $endpoint is healthy"
                service_healthy=true
                break
            fi
            
            sleep 3
            ((attempt++))
        done
        
        if [[ "$service_healthy" == true ]]; then
            ((healthy_services++))
        else
            log_error "✗ $endpoint health check failed"
        fi
    done
    
    if [[ $healthy_services -eq ${#health_endpoints[@]} ]]; then
        log_success "All production health checks passed"
    else
        log_error "Some services failed health checks"
        echo ""
        echo "Check service logs:"
        echo "  docker compose logs api"
        echo "  docker compose logs web"
        echo "  docker compose logs db"
    fi
}

# Setup production monitoring and backups
setup_production_monitoring() {
    log_step "Setting up production monitoring"
    
    # Create monitoring setup script
    cat > setup_monitoring.sh << 'EOF'
#!/bin/bash
echo "Setting up production monitoring..."

# Basic log rotation for Docker containers
cat > /etc/logrotate.d/docker << 'LOGROTATE'
/var/lib/docker/containers/*/*.log {
    rotate 7
    daily
    compress
    size=1M
    missingok
    delaycompress
    copytruncate
}
LOGROTATE

# Create backup script
cat > backup_production.sh << 'BACKUP'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="./backups"
mkdir -p "$BACKUP_DIR"

echo "Creating production backup: $DATE"

# Database backup
docker compose exec -T db pg_dump -U postgres hacka_fi_prod > "$BACKUP_DIR/database_$DATE.sql"

# Uploaded files backup (if any)
if [ -d "uploads" ]; then
    tar -czf "$BACKUP_DIR/uploads_$DATE.tar.gz" uploads/
fi

# Environment backup
cp .env.production "$BACKUP_DIR/env_production_$DATE"

echo "Backup completed: $BACKUP_DIR/"
ls -la "$BACKUP_DIR/"
BACKUP

chmod +x backup_production.sh
echo "Backup script created: backup_production.sh"

EOF
    
    chmod +x setup_monitoring.sh
    log_success "Created monitoring setup script: setup_monitoring.sh"
    
    # Create initial backup
    log_info "Creating initial production backup..."
    ./setup_monitoring.sh
    
    if [[ -f "backup_production.sh" ]]; then
        ./backup_production.sh
        log_success "Initial backup created"
    fi
}

# Show production deployment summary
show_production_summary() {
    log_step "Production Deployment Summary"
    
    echo -e "${GREEN}🎉 HackaFi production deployment completed!${NC}"
    echo ""
    
    echo "🌐 Production Services:"
    echo "  • Web Application:     http://localhost:3000"
    echo "  • API Server:          http://localhost:3010"
    echo "  • API Documentation:   http://localhost:3010/api/docs"
    echo "  • Database:            PostgreSQL (internal)"
    echo "  • Cache:               Redis (internal)"
    
    echo ""
    echo "🔧 Management Commands:"
    echo "  • View services:       docker compose ps"
    echo "  • View logs:           docker compose logs [service]"
    echo "  • Restart service:     docker compose restart [service]"
    echo "  • Stop all:            docker compose down"
    echo "  • Database shell:      docker compose exec db psql -U postgres -d hacka_fi_prod"
    
    echo ""
    echo "📊 Monitoring:"
    echo "  • Health checks:       curl http://localhost:3010/health"
    echo "  • Database backup:     ./backup_production.sh"
    echo "  • Service status:      docker compose ps"
    echo "  • Resource usage:      docker stats"
    
    echo ""
    echo "🔒 Security Reminders:"
    echo "  • Set up SSL certificates (Let's Encrypt)"
    echo "  • Configure firewall rules"
    echo "  • Set up monitoring and alerting"
    echo "  • Review environment variable security"
    echo "  • Set up automated backups"
    
    echo ""
    echo "📋 Next Steps:"
    echo "  1. Configure domain and SSL certificates"
    echo "  2. Set up monitoring and alerting systems"
    echo "  3. Configure automated backup schedule"
    echo "  4. Review production logs regularly"
    echo "  5. Set up CI/CD pipeline for updates"
    
    echo ""
    echo "📚 Important Files:"
    echo "  • Production env:      .env.production"
    echo "  • Backup script:       backup_production.sh"
    echo "  • Monitoring setup:    setup_monitoring.sh"
    echo "  • Production checklist: PRODUCTION_CHECKLIST.md"
    
    echo ""
    log_success "Production deployment is complete and running!"
    
    # Show running services
    echo ""
    echo "Current service status:"
    docker compose ps
}

# Main production deployment flow
main() {
    echo "🏭 HackaFi Production Setup"
    echo "=========================="
    echo ""
    echo -e "${RED}⚠️  WARNING: This is a production deployment script!${NC}"
    echo ""
    echo "This script will:"
    echo "  • Set up production environment configuration"
    echo "  • Build optimized Docker images"  
    echo "  • Deploy services with PostgreSQL and Redis"
    echo "  • Run database migrations"
    echo "  • Set up monitoring and backup tools"
    echo ""
    echo "Prerequisites:"
    echo "  • Domain configured (recommended)"
    echo "  • SSL certificates ready (recommended)"
    echo "  • Production server configured"
    echo "  • Smart contracts deployed to mainnet"
    echo ""
    
    read -p "Do you want to continue with production deployment? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Production deployment cancelled"
        echo ""
        echo "For development deployment, use:"
        echo "  ./scripts/07-development-start.sh"
        exit 0
    fi
    
    check_prerequisites
    setup_production_environment
    check_production_readiness
    build_production_images
    deploy_production_services
    setup_production_database
    production_health_checks
    setup_production_monitoring
    show_production_summary
    
    echo ""
    log_success "🚀 HackaFi is now running in production!"
}

# Handle help
if [[ "${1:-}" == "help" ]] || [[ "${1:-}" == "-h" ]] || [[ "${1:-}" == "--help" ]]; then
    echo "HackaFi Production Setup Script"
    echo "==============================="
    echo "This script deploys HackaFi to production with all necessary"
    echo "optimizations, security configurations, and monitoring tools."
    echo ""
    echo "What it does:"
    echo "  1. Set up production environment configuration"
    echo "  2. Check production readiness and security"
    echo "  3. Build optimized Docker production images"
    echo "  4. Deploy services (API, Web, PostgreSQL, Redis)"
    echo "  5. Run database migrations and setup"
    echo "  6. Perform comprehensive health checks"
    echo "  7. Set up monitoring and backup systems"
    echo ""
    echo "Usage: $0"
    echo ""
    echo "Prerequisites:"
    echo "  • Complete development setup"
    echo "  • Docker and Docker Compose installed"
    echo "  • Production environment files configured"
    echo "  • Smart contracts deployed (recommended)"
    echo "  • Domain and SSL setup (recommended)"
    echo ""
    echo "Production services:"
    echo "  • NestJS API (production build)"
    echo "  • Next.js Web App (production build)"
    echo "  • PostgreSQL database"
    echo "  • Redis cache"
    echo ""
    echo "Security considerations:"
    echo "  • Uses secure production secrets"
    echo "  • PostgreSQL with authentication"
    echo "  • Production-optimized builds"
    echo "  • Monitoring and logging setup"
    echo ""
    echo "IMPORTANT: Review PRODUCTION_CHECKLIST.md before deployment!"
    echo ""
    exit 0
fi

# Run main function
main