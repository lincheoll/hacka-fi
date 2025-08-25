#!/bin/bash

# =============================================================================
# 03 - Project Dependencies Installation Script
# =============================================================================
# This script clones the HackaFi project (if needed) and installs all 
# dependencies across all workspaces using pnpm.
# =============================================================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="hacka-fi"
GITHUB_URL="https://github.com/your-organization/hacka-fi.git"  # Update with actual repo URL
WORKSPACES=("apps/api" "apps/web" "contracts")

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
    
    local failed=0
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js not found. Please run 01-system-prerequisites.sh first"
        failed=1
    else
        local node_version=$(node --version | sed 's/v//' | cut -d'.' -f1)
        if [[ "$node_version" -ge 18 ]]; then
            log_success "Node.js $(node --version) found"
        else
            log_error "Node.js version must be 18+. Current: $(node --version)"
            failed=1
        fi
    fi
    
    # Check pnpm
    if ! command -v pnpm &> /dev/null; then
        log_error "pnpm not found. Please run 01-system-prerequisites.sh first"
        failed=1
    else
        log_success "pnpm $(pnpm --version) found"
    fi
    
    # Check Git
    if ! command -v git &> /dev/null; then
        log_error "Git not found. Please run 01-system-prerequisites.sh first"
        failed=1
    else
        log_success "Git $(git --version | cut -d' ' -f3) found"
    fi
    
    if [[ $failed -eq 1 ]]; then
        log_error "Prerequisites check failed"
        exit 1
    fi
    
    log_success "All prerequisites are available"
}

# Handle project directory
setup_project_directory() {
    log_step "Setting up project directory"
    
    # Check if we're already in the project directory
    if [[ -f "package.json" && -f "pnpm-workspace.yaml" ]]; then
        log_success "Already in HackaFi project directory"
        return 0
    fi
    
    # Check if project directory exists in current location
    if [[ -d "$PROJECT_NAME" ]]; then
        log_info "Found existing $PROJECT_NAME directory"
        cd "$PROJECT_NAME"
        
        # Verify it's the correct project
        if [[ -f "package.json" && -f "pnpm-workspace.yaml" ]]; then
            log_success "Using existing project directory"
            return 0
        else
            log_error "Directory exists but doesn't appear to be HackaFi project"
            exit 1
        fi
    fi
    
    # Project doesn't exist, provide clone instructions
    log_warning "HackaFi project not found in current directory"
    echo ""
    echo "To clone the project, run one of these commands:"
    echo ""
    echo "Option 1: Clone via HTTPS"
    echo "  git clone $GITHUB_URL"
    echo ""
    echo "Option 2: Clone via SSH (if you have SSH keys set up)"
    echo "  git clone git@github.com:your-organization/hacka-fi.git"
    echo ""
    echo "Option 3: If you already have the project elsewhere:"
    echo "  cd /path/to/your/hacka-fi"
    echo "  ./scripts/03-project-dependencies.sh"
    echo ""
    
    read -p "Do you want to clone the project now using HTTPS? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log_info "Cloning HackaFi project..."
        git clone "$GITHUB_URL"
        cd "$PROJECT_NAME"
        log_success "Project cloned successfully"
    else
        log_info "Please clone the project manually and run this script from the project directory"
        exit 0
    fi
}

# Verify project structure
verify_project_structure() {
    log_step "Verifying project structure"
    
    local missing_files=()
    local required_files=("package.json" "pnpm-workspace.yaml" "turbo.json")
    
    for file in "${required_files[@]}"; do
        if [[ ! -f "$file" ]]; then
            missing_files+=("$file")
        fi
    done
    
    # Check workspace directories
    for workspace in "${WORKSPACES[@]}"; do
        if [[ ! -d "$workspace" ]]; then
            missing_files+=("$workspace/")
        elif [[ ! -f "$workspace/package.json" ]]; then
            missing_files+=("$workspace/package.json")
        fi
    done
    
    if [[ ${#missing_files[@]} -gt 0 ]]; then
        log_error "Missing required files/directories:"
        for file in "${missing_files[@]}"; do
            echo "  ❌ $file"
        done
        exit 1
    fi
    
    log_success "Project structure is valid"
    
    # Show project info
    local project_name=$(grep '"name"' package.json | head -1 | cut -d'"' -f4)
    local node_version=$(grep '"node"' package.json -A 5 | grep -o '[0-9]\+' | head -1)
    local pnpm_version=$(grep 'packageManager' package.json | cut -d'"' -f4 | cut -d'@' -f2)
    
    echo ""
    echo "Project Information:"
    echo "  • Name: $project_name"
    echo "  • Node.js required: ${node_version}+"
    echo "  • Package manager: pnpm $pnpm_version"
}

# Install dependencies
install_dependencies() {
    log_step "Installing project dependencies"
    
    log_info "Installing dependencies with pnpm..."
    log_info "This may take several minutes depending on your internet connection..."
    
    # Run pnpm install with progress output
    if pnpm install --reporter=append-only; then
        log_success "Dependencies installed successfully"
    else
        log_error "Failed to install dependencies"
        echo ""
        echo "Common solutions:"
        echo "1. Check your internet connection"
        echo "2. Clear pnpm cache: pnpm store prune"
        echo "3. Delete node_modules and try again: rm -rf node_modules && pnpm install"
        echo "4. Check if you have sufficient disk space"
        exit 1
    fi
}

# Verify installations
verify_installations() {
    log_step "Verifying workspace installations"
    
    local failed_workspaces=()
    
    for workspace in "${WORKSPACES[@]}"; do
        log_info "Checking $workspace..."
        
        if [[ -d "$workspace/node_modules" ]]; then
            local package_count=$(find "$workspace/node_modules" -maxdepth 1 -type d | wc -l)
            log_success "$workspace: $((package_count - 1)) packages installed"
        else
            log_error "$workspace: node_modules not found"
            failed_workspaces+=("$workspace")
        fi
    done
    
    if [[ ${#failed_workspaces[@]} -gt 0 ]]; then
        log_error "Some workspaces failed to install properly:"
        for workspace in "${failed_workspaces[@]}"; do
            echo "  ❌ $workspace"
        done
        return 1
    fi
    
    log_success "All workspaces have dependencies installed"
}

# Test workspace commands
test_workspace_commands() {
    log_step "Testing workspace commands"
    
    log_info "Testing TypeScript compilation..."
    if pnpm run typecheck > /dev/null 2>&1; then
        log_success "TypeScript compilation test passed"
    else
        log_warning "TypeScript compilation test failed (this might be expected if there are type errors)"
    fi
    
    log_info "Testing build process..."
    if timeout 60s pnpm run build > /dev/null 2>&1; then
        log_success "Build process test passed"
    else
        log_warning "Build process test failed or timed out (this might be expected without environment setup)"
    fi
    
    log_info "Testing linting..."
    if pnpm run lint > /dev/null 2>&1; then
        log_success "Linting test passed"
    else
        log_warning "Linting test failed (this might be expected with existing issues)"
    fi
}

# Show dependency summary
show_dependency_summary() {
    log_step "Dependency Installation Summary"
    
    echo "Installed dependencies for workspaces:"
    echo ""
    
    # Root dependencies
    if [[ -f "package.json" ]]; then
        local root_deps=$(grep -c '"' package.json | grep -E 'dependencies|devDependencies' | wc -l || echo "0")
        echo "• Root: $(jq -r '.devDependencies | length' package.json 2>/dev/null || echo '?') dev dependencies"
    fi
    
    # API dependencies
    if [[ -f "apps/api/package.json" ]]; then
        local api_deps=$(jq -r '.dependencies | length' apps/api/package.json 2>/dev/null || echo '?')
        local api_dev_deps=$(jq -r '.devDependencies | length' apps/api/package.json 2>/dev/null || echo '?')
        echo "• API: $api_deps dependencies, $api_dev_deps dev dependencies"
    fi
    
    # Web dependencies  
    if [[ -f "apps/web/package.json" ]]; then
        local web_deps=$(jq -r '.dependencies | length' apps/web/package.json 2>/dev/null || echo '?')
        local web_dev_deps=$(jq -r '.devDependencies | length' apps/web/package.json 2>/dev/null || echo '?')
        echo "• Web: $web_deps dependencies, $web_dev_deps dev dependencies"
    fi
    
    echo ""
    echo "Key technologies installed:"
    echo "• NestJS 11+ (Backend framework)"
    echo "• Next.js 15+ (Frontend framework)" 
    echo "• Prisma 6+ (Database ORM)"
    echo "• TypeScript 5+ (Type safety)"
    echo "• Tailwind CSS 4+ (Styling)"
    echo "• wagmi v2 (Web3 integration)"
    echo "• Viem (Ethereum client)"
    echo ""
    
    # Show total installation size
    local total_size=$(du -sh node_modules 2>/dev/null | cut -f1 || echo "Unknown")
    echo "Total installation size: $total_size"
    
    echo ""
    echo "Available scripts:"
    echo "• pnpm dev          - Start development servers"
    echo "• pnpm build        - Build all projects"
    echo "• pnpm test         - Run all tests"
    echo "• pnpm lint         - Lint all code"
    echo "• pnpm typecheck    - Check TypeScript types"
}

# Main installation flow
main() {
    echo "📦 HackaFi Project Dependencies Installation"
    echo "============================================"
    echo "This script will:"
    echo "  • Set up the project directory structure"
    echo "  • Install all dependencies across workspaces"
    echo "  • Verify installations"
    echo "  • Test basic functionality"
    echo ""
    
    check_prerequisites
    setup_project_directory
    verify_project_structure
    
    read -p "Do you want to install project dependencies? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Installation cancelled"
        exit 0
    fi
    
    install_dependencies
    
    if ! verify_installations; then
        log_error "Dependency installation verification failed"
        echo ""
        echo "You can try to fix this by:"
        echo "1. Running: pnpm install --frozen-lockfile"
        echo "2. Clearing cache: pnpm store prune"
        echo "3. Removing node_modules: rm -rf node_modules && pnpm install"
        exit 1
    fi
    
    test_workspace_commands
    show_dependency_summary
    
    echo ""
    log_success "🎉 Project dependencies installation completed!"
    echo ""
    echo "Next steps:"
    echo "  1. Run: ./scripts/04-environment-setup.sh"
    echo "  2. Or continue with: HackaFi environment configuration"
    echo ""
    echo "You can now run:"
    echo "  • pnpm dev          - Start development servers (after environment setup)"
    echo "  • pnpm build        - Build all projects"
    echo "  • pnpm test         - Run tests"
}

# Handle help
if [[ "${1:-}" == "help" ]] || [[ "${1:-}" == "-h" ]] || [[ "${1:-}" == "--help" ]]; then
    echo "HackaFi Project Dependencies Installation Script"
    echo "==============================================="
    echo "This script sets up the HackaFi project and installs all dependencies."
    echo ""
    echo "What it does:"
    echo "  1. Verify prerequisites (Node.js, pnpm, Git)"
    echo "  2. Set up project directory (clone if needed)"
    echo "  3. Verify project structure"
    echo "  4. Install dependencies with pnpm"
    echo "  5. Verify installations across workspaces"
    echo "  6. Test basic workspace commands"
    echo ""
    echo "Usage: $0"
    echo ""
    echo "Prerequisites:"
    echo "  • Node.js 18+ (run 01-system-prerequisites.sh)"
    echo "  • pnpm 9.0+ (run 01-system-prerequisites.sh)"
    echo "  • Git (run 01-system-prerequisites.sh)"
    echo ""
    echo "Workspaces:"
    echo "  • apps/api   - NestJS backend"
    echo "  • apps/web   - Next.js frontend"
    echo "  • contracts  - Foundry smart contracts"
    echo ""
    exit 0
fi

# Run main function
main