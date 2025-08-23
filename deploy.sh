#!/bin/bash

# HackaFi Deployment Script
# This script automates the deployment process for HackaFi platform

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-development}
DOCKER_COMPOSE_FILE="docker-compose.yml"
DOCKER_COMPOSE_DEV_FILE="docker-compose.dev.yml"

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

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if Docker is installed and running
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        log_error "Docker is not running. Please start Docker first."
        exit 1
    fi
    
    # Check if Docker Compose is available
    if ! docker compose version &> /dev/null; then
        log_error "Docker Compose is not available. Please install Docker Compose."
        exit 1
    fi
    
    # Check if pnpm is installed
    if ! command -v pnpm &> /dev/null; then
        log_error "pnpm is not installed. Please install pnpm first."
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

# Environment setup
setup_environment() {
    log_info "Setting up environment for: $ENVIRONMENT"
    
    if [ ! -f .env ]; then
        if [ -f .env.example ]; then
            log_info "Creating .env file from .env.example"
            cp .env.example .env
            log_warning "Please update .env file with your actual configuration values"
        else
            log_error ".env.example file not found. Please create environment configuration."
            exit 1
        fi
    fi
    
    if [ "$ENVIRONMENT" = "production" ] && [ -f .env.production.example ]; then
        log_info "Production environment detected. Consider using .env.production.example as reference"
    fi
}

# Database setup
setup_database() {
    log_info "Setting up database..."
    
    if [ "$ENVIRONMENT" = "development" ]; then
        log_info "Running Prisma migrations for development (SQLite)"
        cd apps/api
        pnpm prisma generate
        pnpm prisma migrate dev
        cd ../..
    else
        log_info "Database migrations will be handled by the production container"
    fi
    
    log_success "Database setup completed"
}

# Build and start services
deploy_services() {
    log_info "Deploying services for environment: $ENVIRONMENT"
    
    if [ "$ENVIRONMENT" = "development" ]; then
        log_info "Starting development services..."
        docker compose -f $DOCKER_COMPOSE_FILE -f $DOCKER_COMPOSE_DEV_FILE up --build -d --profile development
    elif [ "$ENVIRONMENT" = "production" ]; then
        log_info "Starting production services..."
        docker compose -f $DOCKER_COMPOSE_FILE up --build -d --profile production
    else
        log_error "Unknown environment: $ENVIRONMENT. Use 'development' or 'production'"
        exit 1
    fi
    
    log_success "Services deployed successfully"
}

# Health check
health_check() {
    log_info "Performing health check..."
    
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s -f http://localhost:3010/health/database > /dev/null; then
            log_success "API health check passed"
            break
        fi
        
        if [ $attempt -eq $max_attempts ]; then
            log_error "Health check failed after $max_attempts attempts"
            docker compose logs api
            exit 1
        fi
        
        log_info "Attempt $attempt/$max_attempts - Waiting for services to be ready..."
        sleep 5
        ((attempt++))
    done
    
    # Check web service
    if curl -s -f http://localhost:3000 > /dev/null; then
        log_success "Web service health check passed"
    else
        log_warning "Web service might not be ready yet"
    fi
}

# Show deployment status
show_status() {
    log_info "Deployment Status:"
    echo "===================="
    docker compose ps
    echo "===================="
    log_info "Services are running on:"
    echo "  - Web Application: http://localhost:3000"
    echo "  - API Server: http://localhost:3010"
    echo "  - API Documentation: http://localhost:3010/api/docs"
    
    if [ "$ENVIRONMENT" = "production" ]; then
        echo "  - Database: PostgreSQL on port 5432"
        echo "  - Redis: Redis on port 6379"
    fi
}

# Cleanup function
cleanup() {
    log_info "Cleaning up..."
    docker compose down
    docker system prune -f
    log_success "Cleanup completed"
}

# Main deployment flow
main() {
    log_info "Starting HackaFi deployment process..."
    log_info "Environment: $ENVIRONMENT"
    
    case "${2:-}" in
        "cleanup")
            cleanup
            exit 0
            ;;
        "status")
            show_status
            exit 0
            ;;
    esac
    
    check_prerequisites
    setup_environment
    setup_database
    deploy_services
    health_check
    show_status
    
    log_success "HackaFi deployment completed successfully!"
    log_info "You can now access the application at the URLs shown above."
}

# Help function
show_help() {
    echo "HackaFi Deployment Script"
    echo "========================="
    echo "Usage: $0 [environment] [action]"
    echo ""
    echo "Environments:"
    echo "  development  - Deploy for development (default)"
    echo "  production   - Deploy for production"
    echo ""
    echo "Actions:"
    echo "  (none)       - Full deployment (default)"
    echo "  cleanup      - Stop services and cleanup"
    echo "  status       - Show current deployment status"
    echo ""
    echo "Examples:"
    echo "  $0                          # Development deployment"
    echo "  $0 development              # Development deployment"
    echo "  $0 production               # Production deployment"
    echo "  $0 development cleanup      # Cleanup development"
    echo "  $0 production status        # Show production status"
    echo ""
}

# Handle help
if [ "${1:-}" = "help" ] || [ "${1:-}" = "-h" ] || [ "${1:-}" = "--help" ]; then
    show_help
    exit 0
fi

# Run main function
main