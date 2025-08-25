#!/bin/bash

# =============================================================================
# 01 - System Prerequisites Installation Script
# =============================================================================
# This script installs all the system prerequisites needed to run HackaFi
# platform including Node.js, pnpm, Docker, and verifies required ports.
# =============================================================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
NODE_VERSION="20"
PNPM_VERSION="9.0.0"
REQUIRED_PORTS=(3000 3010 5432 6379)

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

# Check if running on macOS or Linux
detect_os() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        OS="macos"
        log_info "Detected macOS"
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        OS="linux"
        log_info "Detected Linux"
    else
        log_error "Unsupported operating system: $OSTYPE"
        exit 1
    fi
}

# Install Node.js using nvm
install_node() {
    log_step "Installing Node.js $NODE_VERSION"
    
    # Check if Node.js is already installed
    if command -v node &> /dev/null; then
        CURRENT_NODE_VERSION=$(node --version | sed 's/v//' | cut -d'.' -f1)
        if [[ "$CURRENT_NODE_VERSION" -ge "$NODE_VERSION" ]]; then
            log_success "Node.js $CURRENT_NODE_VERSION is already installed"
            return
        fi
    fi
    
    # Install nvm if not present
    if ! command -v nvm &> /dev/null && [[ ! -s "$HOME/.nvm/nvm.sh" ]]; then
        log_info "Installing nvm..."
        curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
        
        # Load nvm for current session
        export NVM_DIR="$HOME/.nvm"
        [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
        [ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"
    else
        log_info "nvm already installed, loading..."
        export NVM_DIR="$HOME/.nvm"
        [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    fi
    
    # Install and use Node.js
    log_info "Installing Node.js $NODE_VERSION..."
    nvm install $NODE_VERSION
    nvm use $NODE_VERSION
    nvm alias default $NODE_VERSION
    
    log_success "Node.js $(node --version) installed successfully"
}

# Install pnpm
install_pnpm() {
    log_step "Installing pnpm $PNPM_VERSION+"
    
    # Check if pnpm is already installed
    if command -v pnpm &> /dev/null; then
        CURRENT_PNPM_VERSION=$(pnpm --version)
        log_success "pnpm $CURRENT_PNPM_VERSION is already installed"
        return
    fi
    
    # Install pnpm using npm
    log_info "Installing pnpm..."
    npm install -g pnpm@latest
    
    log_success "pnpm $(pnpm --version) installed successfully"
}

# Install Docker
install_docker() {
    log_step "Installing Docker and Docker Compose"
    
    # Check if Docker is already installed and running
    if command -v docker &> /dev/null && docker info &> /dev/null 2>&1; then
        log_success "Docker is already installed and running"
        return
    fi
    
    if [[ "$OS" == "macos" ]]; then
        # macOS installation
        if command -v brew &> /dev/null; then
            log_info "Installing Docker Desktop via Homebrew..."
            brew install --cask docker
            log_warning "Please start Docker Desktop manually from Applications folder"
        else
            log_warning "Homebrew not found. Please install Docker Desktop manually:"
            log_info "1. Download from https://docs.docker.com/desktop/mac/install/"
            log_info "2. Install and start Docker Desktop"
        fi
    elif [[ "$OS" == "linux" ]]; then
        # Linux installation
        log_info "Installing Docker via convenience script..."
        curl -fsSL https://get.docker.com -o get-docker.sh
        sudo sh get-docker.sh
        rm get-docker.sh
        
        # Add user to docker group
        sudo usermod -aG docker $USER
        log_warning "You may need to log out and back in for Docker permissions to take effect"
        
        # Start Docker service
        sudo systemctl start docker
        sudo systemctl enable docker
        
        log_success "Docker installed successfully"
    fi
    
    # Wait for Docker to be ready
    log_info "Waiting for Docker to start..."
    for i in {1..30}; do
        if docker info &> /dev/null; then
            break
        fi
        if [[ $i -eq 30 ]]; then
            log_error "Docker failed to start. Please start Docker manually and run this script again."
            exit 1
        fi
        sleep 2
    done
    
    log_success "Docker is ready"
}

# Verify Git installation
verify_git() {
    log_step "Verifying Git installation"
    
    if command -v git &> /dev/null; then
        log_success "Git $(git --version | cut -d' ' -f3) is installed"
    else
        if [[ "$OS" == "macos" ]]; then
            log_warning "Git not found. Installing via Xcode Command Line Tools..."
            xcode-select --install
        elif [[ "$OS" == "linux" ]]; then
            log_info "Installing Git..."
            if command -v apt-get &> /dev/null; then
                sudo apt-get update && sudo apt-get install -y git
            elif command -v yum &> /dev/null; then
                sudo yum install -y git
            elif command -v dnf &> /dev/null; then
                sudo dnf install -y git
            else
                log_error "Could not install Git automatically. Please install Git manually."
                exit 1
            fi
        fi
        log_success "Git installed successfully"
    fi
}

# Check if required ports are available
check_ports() {
    log_step "Checking required ports availability"
    
    BLOCKED_PORTS=()
    
    for port in "${REQUIRED_PORTS[@]}"; do
        if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
            BLOCKED_PORTS+=($port)
            log_warning "Port $port is already in use"
        else
            log_success "Port $port is available"
        fi
    done
    
    if [[ ${#BLOCKED_PORTS[@]} -gt 0 ]]; then
        log_warning "The following ports are in use: ${BLOCKED_PORTS[*]}"
        log_info "You may need to stop other services or change ports in configuration"
        log_info "Required ports: 3000 (Web), 3010 (API), 5432 (Database), 6379 (Redis)"
    else
        log_success "All required ports are available"
    fi
}

# Verify installations
verify_installations() {
    log_step "Verifying all installations"
    
    local failed=0
    
    # Check Node.js
    if command -v node &> /dev/null; then
        log_success "✓ Node.js $(node --version)"
    else
        log_error "✗ Node.js not found"
        failed=1
    fi
    
    # Check pnpm
    if command -v pnpm &> /dev/null; then
        log_success "✓ pnpm $(pnpm --version)"
    else
        log_error "✗ pnpm not found"
        failed=1
    fi
    
    # Check Docker
    if command -v docker &> /dev/null && docker info &> /dev/null 2>&1; then
        log_success "✓ Docker $(docker --version | cut -d' ' -f3 | sed 's/,//')"
    else
        log_error "✗ Docker not running"
        failed=1
    fi
    
    # Check Docker Compose
    if docker compose version &> /dev/null; then
        log_success "✓ Docker Compose $(docker compose version --short)"
    else
        log_error "✗ Docker Compose not available"
        failed=1
    fi
    
    # Check Git
    if command -v git &> /dev/null; then
        log_success "✓ Git $(git --version | cut -d' ' -f3)"
    else
        log_error "✗ Git not found"
        failed=1
    fi
    
    if [[ $failed -eq 1 ]]; then
        log_error "Some installations failed. Please fix the issues and run this script again."
        exit 1
    fi
    
    log_success "All system prerequisites are properly installed!"
}

# Main installation flow
main() {
    echo "🚀 HackaFi System Prerequisites Installation"
    echo "============================================"
    echo "This script will install:"
    echo "  • Node.js $NODE_VERSION (via nvm)"
    echo "  • pnpm $PNPM_VERSION+"
    echo "  • Docker & Docker Compose"
    echo "  • Git (if not present)"
    echo ""
    
    read -p "Do you want to continue? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Installation cancelled"
        exit 0
    fi
    
    detect_os
    install_node
    install_pnpm
    install_docker
    verify_git
    check_ports
    verify_installations
    
    echo ""
    log_success "🎉 System prerequisites installation completed!"
    echo ""
    echo "Next steps:"
    echo "  1. Run: ./scripts/02-foundry-installation.sh"
    echo "  2. Or continue with the complete setup process"
    echo ""
    echo "Note: If you're on Linux and installed Docker for the first time,"
    echo "      you may need to log out and back in for Docker permissions."
}

# Handle help
if [[ "${1:-}" == "help" ]] || [[ "${1:-}" == "-h" ]] || [[ "${1:-}" == "--help" ]]; then
    echo "HackaFi System Prerequisites Installation Script"
    echo "==============================================="
    echo "This script installs all system prerequisites for HackaFi development:"
    echo "  • Node.js $NODE_VERSION (via nvm)"
    echo "  • pnpm $PNPM_VERSION+"
    echo "  • Docker & Docker Compose"
    echo "  • Git (verification/installation)"
    echo ""
    echo "Usage: $0"
    echo ""
    echo "The script will:"
    echo "  1. Detect your operating system (macOS/Linux)"
    echo "  2. Install missing prerequisites"
    echo "  3. Verify all installations"
    echo "  4. Check port availability"
    echo ""
    exit 0
fi

# Run main function
main