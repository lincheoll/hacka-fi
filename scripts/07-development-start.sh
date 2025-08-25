#!/bin/bash

# =============================================================================
# 07 - Development Start Script
# =============================================================================
# This script starts all development services, performs health checks,
# and provides easy access to development tools and URLs.
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
HEALTH_CHECK_TIMEOUT=60
SERVICES=("api" "web")
API_PORT=3010
WEB_PORT=3000

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

log_url() {
    echo -e "${CYAN}🔗 $1${NC}"
}

# Check prerequisites
check_prerequisites() {
    log_step "Checking prerequisites"
    
    # Check if we're in project root
    if [[ ! -f "package.json" ]] || [[ ! -f "pnpm-workspace.yaml" ]]; then
        log_error "This script must be run from the HackaFi project root directory"
        exit 1
    fi
    
    # Check if dependencies are installed
    if [[ ! -d "node_modules" ]]; then
        log_error "Dependencies not installed. Please run 03-project-dependencies.sh first"
        exit 1
    fi
    
    # Check environment files
    local missing_env=()
    if [[ ! -f "apps/api/.env" ]]; then
        missing_env+=("apps/api/.env")
    fi
    if [[ ! -f "apps/web/.env" ]]; then
        missing_env+=("apps/web/.env")
    fi
    
    if [[ ${#missing_env[@]} -gt 0 ]]; then
        log_error "Missing environment files: ${missing_env[*]}"
        echo "Please run 04-environment-setup.sh first"
        exit 1
    fi
    
    # Check if pnpm is available
    if ! command -v pnpm &> /dev/null; then
        log_error "pnpm not found. Please run 01-system-prerequisites.sh first"
        exit 1
    fi
    
    log_success "All prerequisites are met"
}

# Check if ports are available
check_ports() {
    log_step "Checking port availability"
    
    local blocked_ports=()
    local ports_to_check=($API_PORT $WEB_PORT)
    
    for port in "${ports_to_check[@]}"; do
        if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
            blocked_ports+=($port)
        fi
    done
    
    if [[ ${#blocked_ports[@]} -gt 0 ]]; then
        log_warning "The following ports are already in use: ${blocked_ports[*]}"
        echo ""
        echo "Services using these ports:"
        for port in "${blocked_ports[@]}"; do
            local process=$(lsof -Pi :$port -sTCP:LISTEN -t 2>/dev/null | head -1)
            if [[ -n "$process" ]]; then
                local process_info=$(ps -p "$process" -o comm= 2>/dev/null || echo "unknown")
                echo "  Port $port: $process_info (PID: $process)"
            fi
        done
        echo ""
        
        read -p "Do you want to continue anyway? Services may fail to start. (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "Please free up the ports and try again"
            echo ""
            echo "To stop processes using these ports:"
            for port in "${blocked_ports[@]}"; do
                local process=$(lsof -Pi :$port -sTCP:LISTEN -t 2>/dev/null | head -1)
                if [[ -n "$process" ]]; then
                    echo "  kill $process  # Stop process on port $port"
                fi
            done
            exit 0
        fi
    else
        log_success "All required ports are available"
    fi
}

# Pre-flight checks
preflight_checks() {
    log_step "Running pre-flight checks"
    
    # Check TypeScript compilation
    log_info "Checking TypeScript compilation..."
    if timeout 30s pnpm run typecheck > /dev/null 2>&1; then
        log_success "TypeScript compilation passed"
    else
        log_warning "TypeScript compilation failed or timed out"
        log_info "Development servers will show type errors during runtime"
    fi
    
    # Check if database is set up (for API)
    log_info "Checking database setup..."
    cd apps/api
    
    if [[ -f ".env" ]]; then
        local database_url=$(grep "DATABASE_URL=" .env | cut -d'=' -f2-)
        if [[ "$database_url" == *"sqlite"* ]] || [[ "$database_url" == *"file:"* ]]; then
            if [[ -f "prisma/dev.db" ]]; then
                log_success "SQLite database found"
            else
                log_warning "SQLite database not found. Run 05-database-setup.sh first."
            fi
        elif [[ "$database_url" == *"postgresql"* ]]; then
            if docker compose ps 2>/dev/null | grep -q "db.*running"; then
                log_success "PostgreSQL database is running"
            else
                log_warning "PostgreSQL database not running. Starting it..."
                cd ../..
                docker compose up -d db
                cd apps/api
                sleep 5
            fi
        fi
    fi
    
    cd ../..
    log_success "Pre-flight checks completed"
}

# Start development services
start_development_services() {
    log_step "Starting development services"
    
    echo "Starting HackaFi development servers..."
    echo "  • API: http://localhost:$API_PORT"
    echo "  • Web: http://localhost:$WEB_PORT"
    echo ""
    
    log_info "This will start:"
    echo "  • NestJS API server (apps/api)"
    echo "  • Next.js development server (apps/web)"
    echo "  • Hot reload enabled for both services"
    echo ""
    
    read -p "Do you want to start the development servers? (Y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Nn]$ ]]; then
        log_info "Development start cancelled"
        exit 0
    fi
    
    log_info "Starting development servers with pnpm dev..."
    log_warning "Press Ctrl+C to stop all services"
    echo ""
    
    # Start development servers using turbo
    # This will run both API and Web in parallel with hot reload
    pnpm dev
}

# Alternative: Start services individually
start_services_individually() {
    log_step "Starting services individually"
    
    echo "This will start services in separate terminal sessions."
    echo "Each service will have its own terminal window/tab."
    echo ""
    
    local start_api=false
    local start_web=false
    
    read -p "Start API server (NestJS)? (Y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Nn]$ ]]; then
        start_api=true
    fi
    
    read -p "Start Web server (Next.js)? (Y/n): " -n 1 -r  
    echo
    if [[ ! $REPLY =~ ^[Nn]$ ]]; then
        start_web=true
    fi
    
    if [[ "$start_api" == true ]]; then
        log_info "Starting API server in background..."
        cd apps/api
        pnpm dev > ../../logs/api.log 2>&1 &
        API_PID=$!
        cd ../..
        echo "API_PID=$API_PID" > .dev_pids
        log_success "API server started (PID: $API_PID)"
    fi
    
    if [[ "$start_web" == true ]]; then
        log_info "Starting Web server in background..."
        cd apps/web
        pnpm dev > ../../logs/web.log 2>&1 &
        WEB_PID=$!
        cd ../..
        echo "WEB_PID=$WEB_PID" >> .dev_pids
        log_success "Web server started (PID: $WEB_PID)"
    fi
    
    if [[ "$start_api" == true || "$start_web" == true ]]; then
        log_info "Services started in background. Check logs in logs/ directory"
        log_info "To stop services, run: ./scripts/stop-development.sh"
    fi
}

# Health check services
health_check_services() {
    log_step "Performing health checks"
    
    local api_healthy=false
    local web_healthy=false
    local attempts=0
    local max_attempts=$((HEALTH_CHECK_TIMEOUT / 5))
    
    log_info "Waiting for services to be ready (timeout: ${HEALTH_CHECK_TIMEOUT}s)..."
    
    while [[ $attempts -lt $max_attempts ]]; do
        attempts=$((attempts + 1))
        
        # Check API health
        if [[ "$api_healthy" == false ]]; then
            if curl -s -f "http://localhost:$API_PORT/health" > /dev/null 2>&1; then
                log_success "✓ API server is healthy"
                api_healthy=true
            fi
        fi
        
        # Check Web health
        if [[ "$web_healthy" == false ]]; then
            if curl -s -f "http://localhost:$WEB_PORT" > /dev/null 2>&1; then
                log_success "✓ Web server is healthy"
                web_healthy=true
            fi
        fi
        
        # Break if both are healthy
        if [[ "$api_healthy" == true && "$web_healthy" == true ]]; then
            break
        fi
        
        # Show progress
        if [[ $((attempts % 3)) -eq 0 ]]; then
            log_info "Health check attempt $attempts/$max_attempts..."
        fi
        
        sleep 5
    done
    
    # Final health status
    if [[ "$api_healthy" == false ]]; then
        log_warning "API server health check failed"
        log_info "Check logs or try accessing http://localhost:$API_PORT/health manually"
    fi
    
    if [[ "$web_healthy" == false ]]; then
        log_warning "Web server health check failed"
        log_info "Check logs or try accessing http://localhost:$WEB_PORT manually"
    fi
    
    if [[ "$api_healthy" == true && "$web_healthy" == true ]]; then
        log_success "All services are healthy and ready!"
    fi
}

# Show development information
show_development_info() {
    log_step "Development Environment Ready"
    
    echo -e "${GREEN}🎉 HackaFi development environment is running!${NC}"
    echo ""
    
    echo "🌐 Service URLs:"
    log_url "  • Web Application:    http://localhost:$WEB_PORT"
    log_url "  • API Server:         http://localhost:$API_PORT" 
    log_url "  • API Documentation:  http://localhost:$API_PORT/api/docs"
    log_url "  • Database Studio:    Run 'cd apps/api && pnpm prisma studio'"
    
    echo ""
    echo "🛠️  Development Tools:"
    echo "  • Hot Reload:         Enabled for both frontend and backend"
    echo "  • TypeScript:         Real-time type checking"
    echo "  • ESLint:            Code linting active"
    echo "  • Prisma Studio:     Database management UI"
    
    echo ""
    echo "📚 Useful Commands:"
    echo "  • pnpm dev           - Start/restart all services"
    echo "  • pnpm build         - Build all projects"
    echo "  • pnpm test          - Run all tests"
    echo "  • pnpm lint          - Lint all code"
    echo "  • pnpm typecheck     - Check TypeScript types"
    
    echo ""
    echo "🔍 Debugging:"
    echo "  • API Logs:          Check terminal or logs/api.log"
    echo "  • Web Logs:          Check terminal or logs/web.log"
    echo "  • Database:          cd apps/api && pnpm prisma studio"
    echo "  • Health Check:      curl http://localhost:$API_PORT/health"
    
    if [[ -f "contracts/.env" ]]; then
        local network=$(grep "KAIA_.*_RPC" contracts/.env | head -1 | cut -d'=' -f1 | sed 's/_RPC$//')
        if [[ -n "$network" ]]; then
            echo ""
            echo "⚔️  Smart Contracts:"
            echo "  • Network:           $network"
            if grep -q "HACKATHON_REGISTRY_ADDRESS=0x" apps/api/.env 2>/dev/null; then
                local registry_addr=$(grep "HACKATHON_REGISTRY_ADDRESS=" apps/api/.env | cut -d'=' -f2)
                echo "  • HackathonRegistry: $registry_addr"
            fi
            if grep -q "PRIZE_POOL_ADDRESS=0x" apps/api/.env 2>/dev/null; then
                local pool_addr=$(grep "PRIZE_POOL_ADDRESS=" apps/api/.env | cut -d'=' -f2)
                echo "  • PrizePool:         $pool_addr"
            fi
        fi
    fi
    
    echo ""
    echo "🚀 Ready for HackaFi development!"
    echo ""
    echo "Press Ctrl+C to stop all services when running with 'pnpm dev'"
    echo "Or use the individual service management tools for background services."
}

# Create logs directory
setup_logging() {
    mkdir -p logs
    log_info "Log directory created: logs/"
}

# Main development start flow
main() {
    echo "🚀 HackaFi Development Starter"
    echo "=============================="
    echo "This script starts all development services and provides"
    echo "a complete development environment for HackaFi."
    echo ""
    
    check_prerequisites
    check_ports
    preflight_checks
    setup_logging
    
    echo "Choose how to start development services:"
    echo ""
    echo "1. Start all services together (Recommended)"
    echo "   • Uses pnpm dev (Turbo) for parallel execution"
    echo "   • Single terminal with combined logs"
    echo "   • Easy to stop with Ctrl+C"
    echo ""
    echo "2. Start services individually"
    echo "   • Background processes with separate logs"
    echo "   • Can start/stop services independently"
    echo "   • Requires stop-development.sh to clean up"
    echo ""
    echo "3. Just show information and exit"
    echo "   • Display service URLs and commands"
    echo "   • No services started"
    echo ""
    
    local choice
    read -p "Enter your choice (1-3) [1]: " choice
    choice=${choice:-1}
    
    case $choice in
        1)
            start_development_services
            ;;
        2)
            start_services_individually
            health_check_services
            show_development_info
            ;;
        3)
            show_development_info
            echo "To start services manually:"
            echo "  • All services: pnpm dev"
            echo "  • API only: cd apps/api && pnpm dev"
            echo "  • Web only: cd apps/web && pnpm dev"
            ;;
        *)
            log_warning "Invalid choice. Starting all services together..."
            start_development_services
            ;;
    esac
}

# Handle help
if [[ "${1:-}" == "help" ]] || [[ "${1:-}" == "-h" ]] || [[ "${1:-}" == "--help" ]]; then
    echo "HackaFi Development Start Script"
    echo "================================"
    echo "This script starts the complete HackaFi development environment"
    echo "with all necessary services and development tools."
    echo ""
    echo "What it does:"
    echo "  1. Check prerequisites and environment"
    echo "  2. Verify port availability"
    echo "  3. Run pre-flight checks (TypeScript, database)"
    echo "  4. Start development services"
    echo "  5. Perform health checks"
    echo "  6. Display service URLs and development info"
    echo ""
    echo "Usage: $0"
    echo ""
    echo "Services started:"
    echo "  • NestJS API server (hot reload enabled)"
    echo "  • Next.js web server (hot reload enabled)"
    echo "  • TypeScript compilation"
    echo "  • ESLint checking"
    echo ""
    echo "Prerequisites:"
    echo "  • System prerequisites (01-system-prerequisites.sh)"
    echo "  • Project dependencies (03-project-dependencies.sh)"
    echo "  • Environment setup (04-environment-setup.sh)"
    echo "  • Database setup (05-database-setup.sh)"
    echo ""
    echo "Development URLs:"
    echo "  • Web:     http://localhost:3000"
    echo "  • API:     http://localhost:3010"
    echo "  • Docs:    http://localhost:3010/api/docs"
    echo ""
    exit 0
fi

# Handle stop command (if implemented)
if [[ "${1:-}" == "stop" ]]; then
    log_info "Stopping development services..."
    
    if [[ -f ".dev_pids" ]]; then
        source .dev_pids
        
        if [[ -n "${API_PID:-}" ]]; then
            kill "$API_PID" 2>/dev/null || true
            log_success "API server stopped"
        fi
        
        if [[ -n "${WEB_PID:-}" ]]; then
            kill "$WEB_PID" 2>/dev/null || true
            log_success "Web server stopped"
        fi
        
        rm -f .dev_pids
        log_success "All development services stopped"
    else
        log_warning "No background services found"
        log_info "If services are running with 'pnpm dev', press Ctrl+C to stop them"
    fi
    
    exit 0
fi

# Run main function
main