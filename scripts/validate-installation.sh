#!/bin/bash

# =============================================================================
# Installation Validation Script
# =============================================================================
# This script validates that all required tools and dependencies are properly
# installed for HackaFi development without installing anything.
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
NODE_MIN_VERSION=20
PNPM_MIN_VERSION="9.0"
REQUIRED_PORTS=(3000 3010 5432 6379)

# Helper functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[✅ PASS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[⚠️ WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[❌ FAIL]${NC} $1"
}

log_step() {
    echo -e "\n${BLUE}==== $1 ====${NC}"
}

# Version comparison function
version_compare() {
    local version1=$1
    local version2=$2
    local op=$3
    
    if [[ "$op" == ">=" ]]; then
        if printf '%s\n%s\n' "$version2" "$version1" | sort -V -C; then
            return 0
        else
            return 1
        fi
    fi
}

# Check system prerequisites
check_system_prerequisites() {
    log_step "Checking System Prerequisites"
    
    local errors=0
    
    # OS Detection
    if [[ "$OSTYPE" == "darwin"* ]]; then
        log_success "Operating System: macOS"
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        log_success "Operating System: Linux"
    else
        log_error "Unsupported operating system: $OSTYPE"
        errors=$((errors + 1))
    fi
    
    # Git
    if command -v git &> /dev/null; then
        local git_version=$(git --version | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
        log_success "Git: $git_version"
    else
        log_error "Git not found. Please install Git first."
        errors=$((errors + 1))
    fi
    
    # curl
    if command -v curl &> /dev/null; then
        log_success "curl: $(curl --version | head -1 | cut -d' ' -f2)"
    else
        log_error "curl not found. Required for installations."
        errors=$((errors + 1))
    fi
    
    return $errors
}

# Check Node.js and nvm
check_nodejs() {
    log_step "Checking Node.js Environment"
    
    local errors=0
    
    # Node.js
    if command -v node &> /dev/null; then
        local node_version=$(node --version | sed 's/v//' | cut -d'.' -f1)
        if [[ "$node_version" -ge "$NODE_MIN_VERSION" ]]; then
            log_success "Node.js: $(node --version) (>= $NODE_MIN_VERSION required)"
        else
            log_error "Node.js version $(node --version) is too old. Need >= v$NODE_MIN_VERSION"
            errors=$((errors + 1))
        fi
    else
        log_error "Node.js not found. Please install Node.js $NODE_MIN_VERSION+"
        errors=$((errors + 1))
    fi
    
    # nvm
    if command -v nvm &> /dev/null || [[ -s "$HOME/.nvm/nvm.sh" ]]; then
        log_success "nvm: Available for Node.js version management"
    else
        log_warning "nvm not found. Recommended for Node.js version management"
    fi
    
    # npm
    if command -v npm &> /dev/null; then
        log_success "npm: $(npm --version)"
    else
        log_error "npm not found. Should come with Node.js"
        errors=$((errors + 1))
    fi
    
    return $errors
}

# Check pnpm
check_pnpm() {
    log_step "Checking pnpm Package Manager"
    
    local errors=0
    
    if command -v pnpm &> /dev/null; then
        local pnpm_version=$(pnpm --version)
        if version_compare "$pnpm_version" "$PNPM_MIN_VERSION" ">="; then
            log_success "pnpm: $pnpm_version (>= $PNPM_MIN_VERSION required)"
        else
            log_error "pnpm version $pnpm_version is too old. Need >= $PNPM_MIN_VERSION"
            errors=$((errors + 1))
        fi
    else
        log_error "pnpm not found. Please install pnpm $PNPM_MIN_VERSION+"
        errors=$((errors + 1))
    fi
    
    return $errors
}

# Check Docker
check_docker() {
    log_step "Checking Docker Environment"
    
    local errors=0
    
    # Docker
    if command -v docker &> /dev/null; then
        local docker_version=$(docker --version | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
        log_success "Docker: $docker_version"
        
        # Check if Docker daemon is running
        if docker info &> /dev/null; then
            log_success "Docker daemon: Running"
        else
            log_error "Docker daemon is not running. Please start Docker Desktop or daemon"
            errors=$((errors + 1))
        fi
    else
        log_error "Docker not found. Please install Docker Desktop"
        errors=$((errors + 1))
    fi
    
    # Docker Compose
    if command -v docker &> /dev/null && docker compose version &> /dev/null; then
        local compose_version=$(docker compose version | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
        log_success "Docker Compose: $compose_version (built-in)"
    elif command -v docker-compose &> /dev/null; then
        local compose_version=$(docker-compose --version | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
        log_success "Docker Compose: $compose_version (standalone)"
    else
        log_error "Docker Compose not found. Please install Docker Desktop or docker-compose"
        errors=$((errors + 1))
    fi
    
    return $errors
}

# Check Foundry
check_foundry() {
    log_step "Checking Foundry Toolkit"
    
    local errors=0
    
    # forge
    if command -v forge &> /dev/null; then
        local forge_version=$(forge --version | head -1 | grep -oE '[0-9a-f]{7}' | head -1)
        log_success "forge: $forge_version"
    else
        log_error "forge not found. Please install Foundry"
        errors=$((errors + 1))
    fi
    
    # cast
    if command -v cast &> /dev/null; then
        local cast_version=$(cast --version | head -1 | grep -oE '[0-9a-f]{7}' | head -1)
        log_success "cast: $cast_version"
    else
        log_error "cast not found. Please install Foundry"
        errors=$((errors + 1))
    fi
    
    # anvil
    if command -v anvil &> /dev/null; then
        local anvil_version=$(anvil --version | head -1 | grep -oE '[0-9a-f]{7}' | head -1)
        log_success "anvil: $anvil_version"
    else
        log_error "anvil not found. Please install Foundry"
        errors=$((errors + 1))
    fi
    
    # chisel
    if command -v chisel &> /dev/null; then
        local chisel_version=$(chisel --version | head -1 | grep -oE '[0-9a-f]{7}' | head -1)
        log_success "chisel: $chisel_version"
    else
        log_error "chisel not found. Please install Foundry"
        errors=$((errors + 1))
    fi
    
    return $errors
}

# Check port availability
check_ports() {
    log_step "Checking Port Availability"
    
    local warnings=0
    
    for port in "${REQUIRED_PORTS[@]}"; do
        if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
            local process=$(lsof -Pi :$port -sTCP:LISTEN -t 2>/dev/null | head -1)
            local process_info=$(ps -p "$process" -o comm= 2>/dev/null || echo "unknown")
            log_warning "Port $port is in use by $process_info (PID: $process)"
            warnings=$((warnings + 1))
        else
            log_success "Port $port is available"
        fi
    done
    
    if [[ $warnings -gt 0 ]]; then
        echo ""
        log_info "Note: Port conflicts may prevent services from starting"
        log_info "You can stop processes using: kill <PID>"
    fi
    
    return 0  # Warnings don't fail validation
}

# Check project structure
check_project_structure() {
    log_step "Checking Project Structure"
    
    local errors=0
    
    # Required files
    local required_files=(
        "package.json"
        "pnpm-workspace.yaml"
        "docker-compose.yml"
        "apps/api/package.json"
        "apps/web/package.json"
        "contracts/foundry.toml"
    )
    
    for file in "${required_files[@]}"; do
        if [[ -f "$file" ]]; then
            log_success "Found: $file"
        else
            log_error "Missing: $file"
            errors=$((errors + 1))
        fi
    done
    
    # Required directories
    local required_dirs=(
        "apps/api"
        "apps/web" 
        "contracts"
        "packages"
    )
    
    for dir in "${required_dirs[@]}"; do
        if [[ -d "$dir" ]]; then
            log_success "Found: $dir/"
        else
            log_error "Missing: $dir/"
            errors=$((errors + 1))
        fi
    done
    
    return $errors
}

# Check dependencies
check_dependencies() {
    log_step "Checking Project Dependencies"
    
    local errors=0
    
    # Check if node_modules exists
    if [[ -d "node_modules" ]]; then
        log_success "Root dependencies: Installed"
    else
        log_error "Root dependencies: Not installed. Run 'pnpm install'"
        errors=$((errors + 1))
    fi
    
    # Check workspace dependencies
    if [[ -d "apps/api/node_modules" ]] || [[ -d "node_modules/apps/api" ]]; then
        log_success "API dependencies: Available"
    else
        log_warning "API dependencies: May not be installed"
    fi
    
    if [[ -d "apps/web/node_modules" ]] || [[ -d "node_modules/apps/web" ]]; then
        log_success "Web dependencies: Available"
    else
        log_warning "Web dependencies: May not be installed"
    fi
    
    return $errors
}

# Check environment files
check_environment() {
    log_step "Checking Environment Configuration"
    
    local warnings=0
    
    # Environment files
    local env_files=(
        "apps/api/.env:API environment"
        "apps/web/.env:Web environment"
        "contracts/.env:Contracts environment"
    )
    
    for entry in "${env_files[@]}"; do
        local file="${entry%:*}"
        local desc="${entry#*:}"
        
        if [[ -f "$file" ]]; then
            log_success "$desc: Configured"
        else
            log_warning "$desc: Not configured ($file missing)"
            warnings=$((warnings + 1))
        fi
    done
    
    if [[ $warnings -gt 0 ]]; then
        echo ""
        log_info "Run environment setup script to configure missing files"
    fi
    
    return 0  # Environment warnings don't fail validation
}

# Check database
check_database() {
    log_step "Checking Database Setup"
    
    local warnings=0
    
    # Check Prisma client
    if [[ -d "apps/api/node_modules/@prisma/client" ]] || [[ -d "node_modules/@prisma/client" ]]; then
        log_success "Prisma client: Generated"
    else
        log_warning "Prisma client: Not generated. Run 'cd apps/api && pnpm prisma generate'"
        warnings=$((warnings + 1))
    fi
    
    # Check for SQLite database (development)
    if [[ -f "apps/api/prisma/dev.db" ]]; then
        log_success "Development database: Found (SQLite)"
    else
        log_warning "Development database: Not found. Run database setup"
        warnings=$((warnings + 1))
    fi
    
    return 0  # Database warnings don't fail validation
}

# Main validation function
main() {
    echo "🔍 HackaFi Installation Validator"
    echo "================================="
    echo "This script checks if all required tools and dependencies"
    echo "are properly installed for HackaFi development."
    echo ""
    
    local total_errors=0
    
    # Run all checks
    check_system_prerequisites
    total_errors=$((total_errors + $?))
    
    check_nodejs  
    total_errors=$((total_errors + $?))
    
    check_pnpm
    total_errors=$((total_errors + $?))
    
    check_docker
    total_errors=$((total_errors + $?))
    
    check_foundry
    total_errors=$((total_errors + $?))
    
    check_ports
    total_errors=$((total_errors + $?))
    
    check_project_structure
    total_errors=$((total_errors + $?))
    
    check_dependencies
    total_errors=$((total_errors + $?))
    
    check_environment
    total_errors=$((total_errors + $?))
    
    check_database
    total_errors=$((total_errors + $?))
    
    # Final summary
    log_step "Validation Summary"
    
    if [[ $total_errors -eq 0 ]]; then
        echo -e "${GREEN}🎉 All systems ready for HackaFi development!${NC}"
        echo ""
        echo "Next steps:"
        echo "  • Start development: pnpm dev"
        echo "  • Setup environment: ./scripts/04-environment-setup.sh"
        echo "  • Setup database: ./scripts/05-database-setup.sh"
        echo "  • Deploy contracts: ./scripts/06-smart-contracts.sh"
    else
        echo -e "${RED}❌ Found $total_errors critical issues that need to be resolved${NC}"
        echo ""
        echo "To fix issues, run the setup scripts in order:"
        echo "  • System prerequisites: ./scripts/01-system-prerequisites.sh"
        echo "  • Foundry installation: ./scripts/02-foundry-installation.sh"
        echo "  • Project dependencies: ./scripts/03-project-dependencies.sh"
        echo "  • Or run the guided setup: ./scripts/00-setup-guide.sh"
    fi
    
    echo ""
    echo "📚 For help:"
    echo "  • Complete setup guide: ./scripts/README.md"
    echo "  • Interactive setup: ./scripts/00-setup-guide.sh"
    echo "  • Environment setup: ./scripts/04-environment-setup.sh"
    
    exit $total_errors
}

# Handle help
if [[ "${1:-}" == "help" ]] || [[ "${1:-}" == "-h" ]] || [[ "${1:-}" == "--help" ]]; then
    echo "HackaFi Installation Validator"
    echo "============================="
    echo "Validates that all required tools and dependencies are installed"
    echo "for HackaFi development without installing anything."
    echo ""
    echo "What it checks:"
    echo "  • System prerequisites (Git, curl, OS compatibility)"
    echo "  • Node.js environment (Node.js 20+, nvm, npm)"
    echo "  • pnpm package manager (9.0+)"
    echo "  • Docker and Docker Compose"
    echo "  • Foundry toolkit (forge, cast, anvil, chisel)"
    echo "  • Port availability (3000, 3010, 5432, 6379)"
    echo "  • Project structure and dependencies"
    echo "  • Environment configuration"
    echo "  • Database setup status"
    echo ""
    echo "Usage: $0"
    echo ""
    echo "Exit codes:"
    echo "  • 0: All checks passed"
    echo "  • >0: Number of critical issues found"
    echo ""
    exit 0
fi

# Run main function
main