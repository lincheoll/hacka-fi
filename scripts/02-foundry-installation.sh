#!/bin/bash

# =============================================================================
# 02 - Foundry Installation Script
# =============================================================================
# This script installs the complete Foundry toolchain for Ethereum/EVM 
# smart contract development including forge, cast, anvil, and chisel.
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

# Check if Foundry is already installed
check_existing_foundry() {
    log_step "Checking existing Foundry installation"
    
    if command -v forge &> /dev/null && command -v cast &> /dev/null && command -v anvil &> /dev/null; then
        local forge_version=$(forge --version | head -n1 | grep -o 'forge [0-9.]*' | cut -d' ' -f2)
        log_success "Foundry is already installed (forge $forge_version)"
        
        read -p "Do you want to update Foundry to the latest version? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            return 1  # Continue with installation/update
        else
            log_info "Skipping Foundry installation"
            return 0  # Skip installation
        fi
    fi
    
    return 1  # Continue with installation
}

# Install Foundry
install_foundry() {
    log_step "Installing Foundry toolchain"
    
    log_info "Downloading and running Foundry installer..."
    log_warning "This will download and execute a script from https://foundry.paradigm.xyz"
    
    # Download and run the Foundry installer
    curl -L https://foundry.paradigm.xyz | bash
    
    # Add Foundry to PATH for current session
    export PATH="$HOME/.foundry/bin:$PATH"
    
    # Update shell profile for permanent PATH addition
    local shell_profile=""
    if [[ -n "$ZSH_VERSION" ]]; then
        shell_profile="$HOME/.zshrc"
    elif [[ -n "$BASH_VERSION" ]]; then
        shell_profile="$HOME/.bashrc"
    fi
    
    if [[ -n "$shell_profile" ]] && [[ -f "$shell_profile" ]]; then
        # Check if PATH is already added
        if ! grep -q 'foundry/bin' "$shell_profile"; then
            echo 'export PATH="$HOME/.foundry/bin:$PATH"' >> "$shell_profile"
            log_info "Added Foundry to PATH in $shell_profile"
        fi
    fi
    
    log_success "Foundry installer completed"
}

# Update Foundry to latest version
update_foundry() {
    log_step "Updating Foundry to latest version"
    
    # Ensure Foundry is in PATH
    export PATH="$HOME/.foundry/bin:$PATH"
    
    log_info "Running foundryup to get the latest version..."
    foundryup
    
    log_success "Foundry updated successfully"
}

# Verify Foundry installation
verify_foundry() {
    log_step "Verifying Foundry installation"
    
    # Ensure Foundry is in PATH
    export PATH="$HOME/.foundry/bin:$PATH"
    
    local failed=0
    
    # Check forge
    if command -v forge &> /dev/null; then
        local forge_version=$(forge --version | head -n1)
        log_success "✓ $forge_version"
    else
        log_error "✗ forge not found"
        failed=1
    fi
    
    # Check cast
    if command -v cast &> /dev/null; then
        local cast_version=$(cast --version | head -n1)
        log_success "✓ $cast_version"
    else
        log_error "✗ cast not found"
        failed=1
    fi
    
    # Check anvil
    if command -v anvil &> /dev/null; then
        local anvil_version=$(anvil --version | head -n1)
        log_success "✓ $anvil_version"
    else
        log_error "✗ anvil not found"
        failed=1
    fi
    
    # Check chisel
    if command -v chisel &> /dev/null; then
        local chisel_version=$(chisel --version | head -n1)
        log_success "✓ $chisel_version"
    else
        log_error "✗ chisel not found"
        failed=1
    fi
    
    if [[ $failed -eq 1 ]]; then
        log_error "Some Foundry tools are missing. Installation may have failed."
        return 1
    fi
    
    log_success "All Foundry tools are properly installed!"
    return 0
}

# Test basic Foundry functionality
test_foundry() {
    log_step "Testing Foundry functionality"
    
    # Ensure Foundry is in PATH
    export PATH="$HOME/.foundry/bin:$PATH"
    
    # Create temporary directory for testing
    local temp_dir=$(mktemp -d)
    cd "$temp_dir"
    
    log_info "Creating test Foundry project..."
    
    # Initialize a new Foundry project
    forge init test-project --no-git &> /dev/null
    cd test-project
    
    # Try to build the default project
    log_info "Testing forge build..."
    if forge build &> /dev/null; then
        log_success "forge build works correctly"
    else
        log_error "forge build failed"
        cd - && rm -rf "$temp_dir"
        return 1
    fi
    
    # Try to run tests
    log_info "Testing forge test..."
    if forge test &> /dev/null; then
        log_success "forge test works correctly"
    else
        log_error "forge test failed"
        cd - && rm -rf "$temp_dir"
        return 1
    fi
    
    # Clean up
    cd - && rm -rf "$temp_dir"
    
    log_success "Foundry functionality test passed!"
}

# Show Foundry information
show_foundry_info() {
    log_step "Foundry Installation Summary"
    
    # Ensure Foundry is in PATH
    export PATH="$HOME/.foundry/bin:$PATH"
    
    echo "Foundry toolchain installed with the following tools:"
    echo ""
    echo "• forge   - Ethereum testing framework and build tool"
    echo "• cast    - Command-line tool for Ethereum RPC calls"
    echo "• anvil   - Local Ethereum node for development"
    echo "• chisel  - Solidity REPL for rapid prototyping"
    echo ""
    echo "Installation directory: $HOME/.foundry/"
    echo "Documentation: https://book.getfoundry.sh/"
    echo ""
    
    # Show versions
    forge --version | head -n1
    cast --version | head -n1
    anvil --version | head -n1
    chisel --version | head -n1
}

# Main installation flow
main() {
    echo "🔨 HackaFi Foundry Installation"
    echo "==============================="
    echo "This script will install the Foundry toolchain including:"
    echo "  • forge   - Build and test smart contracts"
    echo "  • cast    - Interact with EVM-compatible blockchains"
    echo "  • anvil   - Local Ethereum node for development"
    echo "  • chisel  - Solidity REPL for rapid prototyping"
    echo ""
    
    # Check if Foundry is already installed
    if check_existing_foundry; then
        show_foundry_info
        echo ""
        log_success "Foundry is ready to use!"
        echo ""
        echo "Next steps:"
        echo "  1. Run: ./scripts/03-project-dependencies.sh"
        echo "  2. Or continue with: HackaFi project setup"
        return 0
    fi
    
    read -p "Do you want to continue with Foundry installation? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Installation cancelled"
        exit 0
    fi
    
    install_foundry
    update_foundry
    
    if ! verify_foundry; then
        log_error "Foundry installation verification failed"
        echo ""
        echo "Troubleshooting tips:"
        echo "1. Restart your terminal to reload PATH"
        echo "2. Run: source ~/.bashrc (or ~/.zshrc)"
        echo "3. Manually add to PATH: export PATH=\"\$HOME/.foundry/bin:\$PATH\""
        echo ""
        exit 1
    fi
    
    test_foundry
    show_foundry_info
    
    echo ""
    log_success "🎉 Foundry installation completed successfully!"
    echo ""
    echo "Next steps:"
    echo "  1. Restart your terminal or run: source ~/.bashrc (or ~/.zshrc)"
    echo "  2. Run: ./scripts/03-project-dependencies.sh"
    echo "  3. Continue with HackaFi project setup"
    echo ""
    echo "Note: If Foundry commands are not found, restart your terminal"
    echo "      or add ~/.foundry/bin to your PATH manually."
}

# Handle help
if [[ "${1:-}" == "help" ]] || [[ "${1:-}" == "-h" ]] || [[ "${1:-}" == "--help" ]]; then
    echo "HackaFi Foundry Installation Script"
    echo "==================================="
    echo "This script installs the complete Foundry toolchain for Ethereum"
    echo "smart contract development."
    echo ""
    echo "What gets installed:"
    echo "  • forge   - Ethereum testing framework (like Truffle, Hardhat)"
    echo "  • cast    - Swiss army knife for interacting with EVM contracts"
    echo "  • anvil   - Local Ethereum node (like Ganache, Hardhat Network)"
    echo "  • chisel  - Fast, utilitarian, and verbose Solidity REPL"
    echo ""
    echo "Usage: $0"
    echo ""
    echo "The script will:"
    echo "  1. Check for existing Foundry installation"
    echo "  2. Download and run the official Foundry installer"
    echo "  3. Update to the latest version"
    echo "  4. Verify all tools are working"
    echo "  5. Run basic functionality tests"
    echo ""
    echo "Installation directory: ~/.foundry/"
    echo "Documentation: https://book.getfoundry.sh/"
    echo ""
    exit 0
fi

# Run main function
main