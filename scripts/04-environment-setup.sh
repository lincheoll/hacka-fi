#!/bin/bash

# =============================================================================
# 04 - Environment Setup Script
# =============================================================================
# This script sets up all environment variables across workspaces and provides
# guided configuration for development. Enhanced version of setup-env.sh.
# =============================================================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
WORKSPACES=("." "apps/web" "apps/api" "contracts")
ENV_FILES=("docker.env.example" "apps/web/env.example" "apps/api/env.example" "contracts/env.example")

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

# Check if we're in the project directory
check_project_directory() {
    if [[ ! -f "package.json" ]] || [[ ! -f "pnpm-workspace.yaml" ]]; then
        log_error "This script must be run from the HackaFi project root directory"
        echo "Please cd to your project directory and run:"
        echo "  ./scripts/04-environment-setup.sh"
        exit 1
    fi
}

# Verify example files exist
verify_example_files() {
    log_step "Verifying environment example files"
    
    local missing_files=()
    
    for file in "${ENV_FILES[@]}"; do
        if [[ ! -f "$file" ]]; then
            missing_files+=("$file")
        fi
    done
    
    if [[ ${#missing_files[@]} -gt 0 ]]; then
        log_error "Missing environment example files:"
        for file in "${missing_files[@]}"; do
            echo "  ❌ $file"
        done
        echo ""
        echo "Please ensure you have the latest project code with all example files."
        exit 1
    fi
    
    log_success "All environment example files found"
}

# Create environment files
create_env_files() {
    log_step "Creating environment files"
    
    local created_files=()
    local existing_files=()
    
    # Root environment (Docker Compose)
    if [[ ! -f .env ]]; then
        cp docker.env.example .env
        created_files+=(".env")
    else
        existing_files+=(".env")
    fi
    
    # Web environment
    if [[ ! -f apps/web/.env ]]; then
        cp apps/web/env.example apps/web/.env
        created_files+=("apps/web/.env")
    else
        existing_files+=("apps/web/.env")
    fi
    
    # API environment
    if [[ ! -f apps/api/.env ]]; then
        cp apps/api/env.example apps/api/.env
        created_files+=("apps/api/.env")
    else
        existing_files+=("apps/api/.env")
    fi
    
    # Contracts environment
    if [[ ! -f contracts/.env ]]; then
        cp contracts/env.example contracts/.env
        created_files+=("contracts/.env")
    else
        existing_files+=("contracts/.env")
    fi
    
    # Report results
    if [[ ${#created_files[@]} -gt 0 ]]; then
        log_success "Created environment files:"
        for file in "${created_files[@]}"; do
            echo "  ✅ $file"
        done
    fi
    
    if [[ ${#existing_files[@]} -gt 0 ]]; then
        log_info "Existing environment files (not modified):"
        for file in "${existing_files[@]}"; do
            echo "  ⚠️  $file"
        done
    fi
}

# Generate secure secrets
generate_secrets() {
    log_step "Generating secure secrets"
    
    log_info "Generating JWT secret for API..."
    
    # Generate a secure JWT secret (32 characters)
    local jwt_secret=$(openssl rand -hex 32 2>/dev/null || date +%s%N | sha256sum | head -c 64)
    
    # Update API .env file with generated JWT secret
    if [[ -f "apps/api/.env" ]]; then
        if grep -q "JWT_SECRET=" apps/api/.env; then
            # Check if JWT_SECRET is empty or placeholder
            local current_jwt=$(grep "JWT_SECRET=" apps/api/.env | cut -d'=' -f2-)
            if [[ -z "$current_jwt" || "$current_jwt" == "your-secret-key" || "$current_jwt" == "your-jwt-secret" ]]; then
                sed -i.bak "s/JWT_SECRET=.*/JWT_SECRET=$jwt_secret/" apps/api/.env
                rm -f apps/api/.env.bak
                log_success "Generated and set secure JWT secret"
            else
                log_info "JWT secret already configured"
            fi
        else
            echo "JWT_SECRET=$jwt_secret" >> apps/api/.env
            log_success "Added JWT secret to API environment"
        fi
    fi
}

# Configure blockchain network
configure_blockchain() {
    log_step "Configuring blockchain network"
    
    echo "Choose blockchain network for development:"
    echo ""
    echo "1. Kaia Kairos Testnet (Recommended for development)"
    echo "2. Kaia Mainnet (Production only)"
    echo "3. Local development (Anvil)"
    echo ""
    
    local network_choice
    read -p "Enter your choice (1-3) [1]: " network_choice
    network_choice=${network_choice:-1}
    
    local rpc_url=""
    local chain_id=""
    local network_name=""
    
    case $network_choice in
        1)
            rpc_url="https://public-en-kairos.node.kaia.io"
            chain_id="1001"
            network_name="Kaia Kairos Testnet"
            ;;
        2)
            rpc_url="https://public-en.node.kaia.io" 
            chain_id="8217"
            network_name="Kaia Mainnet"
            log_warning "⚠️  You selected mainnet. Make sure you understand the implications!"
            ;;
        3)
            rpc_url="http://localhost:8545"
            chain_id="31337"
            network_name="Local Anvil"
            log_info "You'll need to run 'anvil' for local development"
            ;;
        *)
            log_warning "Invalid choice, using default (Kaia Kairos Testnet)"
            rpc_url="https://public-en-kairos.node.kaia.io"
            chain_id="1001"
            network_name="Kaia Kairos Testnet"
            ;;
    esac
    
    log_success "Selected: $network_name"
    
    # Update environment files with network configuration
    update_env_var ".env" "RPC_URL" "$rpc_url"
    update_env_var ".env" "KAIA_CHAIN_ID" "$chain_id"
    update_env_var "apps/web/.env" "NEXT_PUBLIC_RPC_URL" "$rpc_url"
    update_env_var "apps/web/.env" "NEXT_PUBLIC_KAIA_CHAIN_ID" "$chain_id"
    update_env_var "apps/api/.env" "RPC_URL" "$rpc_url"
    update_env_var "apps/api/.env" "CHAIN_ID" "$chain_id"
    
    # Update contracts environment based on network
    if [[ $network_choice -eq 1 ]]; then
        update_env_var "contracts/.env" "KAIA_TESTNET_RPC" "$rpc_url"
    elif [[ $network_choice -eq 2 ]]; then
        update_env_var "contracts/.env" "KAIA_MAINNET_RPC" "$rpc_url"
    fi
    
    log_success "Network configuration updated in all environment files"
}

# Helper function to update environment variable
update_env_var() {
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

# Collect wallet configuration
configure_wallets() {
    log_step "Configuring wallet addresses"
    
    echo "For smart contract deployment and admin functions, you'll need:"
    echo "1. A deployer wallet private key (keep this secure!)"
    echo "2. An admin wallet address"
    echo ""
    log_warning "⚠️  NEVER use your main wallet private key for development!"
    log_warning "⚠️  Create a separate wallet for development/testing only"
    echo ""
    
    read -p "Do you want to configure wallet addresses now? (y/N): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        # Get deployer private key
        echo ""
        read -p "Enter deployer wallet private key (without 0x prefix): " -s deployer_key
        echo ""
        
        if [[ -n "$deployer_key" ]]; then
            # Add 0x prefix if not present
            if [[ ! "$deployer_key" =~ ^0x ]]; then
                deployer_key="0x$deployer_key"
            fi
            
            update_env_var "contracts/.env" "PRIVATE_KEY" "$deployer_key"
            log_success "Deployer private key configured"
        fi
        
        # Get admin wallet address
        echo ""
        read -p "Enter admin wallet address (with 0x prefix): " admin_address
        
        if [[ -n "$admin_address" ]]; then
            update_env_var ".env" "ADMIN_WALLET_ADDRESS" "$admin_address"
            update_env_var "apps/api/.env" "ADMIN_WALLET_ADDRESS" "$admin_address"
            log_success "Admin wallet address configured"
        fi
    else
        log_info "Wallet configuration skipped - you can configure this later"
        echo ""
        echo "To configure wallets later, edit these files:"
        echo "  • contracts/.env - Set PRIVATE_KEY"
        echo "  • .env - Set ADMIN_WALLET_ADDRESS"
        echo "  • apps/api/.env - Set ADMIN_WALLET_ADDRESS"
    fi
}

# Configure development database
configure_database() {
    log_step "Configuring database"
    
    echo "Choose database configuration:"
    echo ""
    echo "1. SQLite (Recommended for development - no setup required)"
    echo "2. PostgreSQL via Docker (For production-like development)"
    echo ""
    
    local db_choice
    read -p "Enter your choice (1-2) [1]: " db_choice
    db_choice=${db_choice:-1}
    
    if [[ $db_choice -eq 1 ]]; then
        log_success "Using SQLite for development"
        update_env_var "apps/api/.env" "DATABASE_URL" "file:./dev.db"
        update_env_var "apps/api/.env" "DATABASE_PROVIDER" "sqlite"
    else
        log_success "Using PostgreSQL via Docker"
        
        # Generate a secure database password
        local db_password=$(openssl rand -base64 32 2>/dev/null | tr -d "=+/" | cut -c1-25)
        
        update_env_var ".env" "POSTGRES_PASSWORD" "$db_password"
        update_env_var "apps/api/.env" "DATABASE_URL" "postgresql://postgres:$db_password@localhost:5432/hacka_fi"
        update_env_var "apps/api/.env" "DATABASE_PROVIDER" "postgresql"
        
        log_success "PostgreSQL configuration set with generated password"
        log_info "You'll need to run Docker services for PostgreSQL"
    fi
}

# Validate environment files
validate_environment() {
    log_step "Validating environment configuration"
    
    # Use the existing validation script if available
    if [[ -f "scripts/validate-env.sh" ]]; then
        log_info "Running comprehensive environment validation..."
        ./scripts/validate-env.sh
    else
        # Basic validation
        local missing_vars=()
        
        # Check critical variables in API
        if [[ -f "apps/api/.env" ]]; then
            local api_vars=("DATABASE_URL" "JWT_SECRET" "RPC_URL")
            for var in "${api_vars[@]}"; do
                if ! grep -q "^$var=" apps/api/.env; then
                    missing_vars+=("apps/api/.env:$var")
                fi
            done
        fi
        
        # Check critical variables in Web
        if [[ -f "apps/web/.env" ]]; then
            local web_vars=("NEXT_PUBLIC_API_URL" "NEXT_PUBLIC_KAIA_CHAIN_ID")
            for var in "${web_vars[@]}"; do
                if ! grep -q "^$var=" apps/web/.env; then
                    missing_vars+=("apps/web/.env:$var")
                fi
            done
        fi
        
        if [[ ${#missing_vars[@]} -gt 0 ]]; then
            log_warning "Some variables may need attention:"
            for var in "${missing_vars[@]}"; do
                echo "  ⚠️  $var"
            done
        else
            log_success "Basic environment validation passed"
        fi
    fi
}

# Show configuration summary
show_configuration_summary() {
    log_step "Environment Configuration Summary"
    
    echo "Environment files created/configured:"
    echo ""
    
    # Root environment
    if [[ -f ".env" ]]; then
        local node_env=$(grep "NODE_ENV=" .env | cut -d'=' -f2 || echo "development")
        local rpc_url=$(grep "RPC_URL=" .env | cut -d'=' -f2 || echo "Not set")
        echo "• Root (.env):"
        echo "  - Environment: $node_env"
        echo "  - RPC URL: $rpc_url"
    fi
    
    # API environment
    if [[ -f "apps/api/.env" ]]; then
        local db_provider=$(grep "DATABASE_PROVIDER=" apps/api/.env | cut -d'=' -f2 || echo "sqlite")
        local jwt_status="Set"
        if ! grep -q "JWT_SECRET=" apps/api/.env || grep -q "JWT_SECRET=your-" apps/api/.env; then
            jwt_status="Not configured"
        fi
        echo "• API (apps/api/.env):"
        echo "  - Database: $db_provider"
        echo "  - JWT Secret: $jwt_status"
    fi
    
    # Web environment  
    if [[ -f "apps/web/.env" ]]; then
        local api_url=$(grep "NEXT_PUBLIC_API_URL=" apps/web/.env | cut -d'=' -f2 || echo "http://localhost:3010")
        local chain_id=$(grep "NEXT_PUBLIC_KAIA_CHAIN_ID=" apps/web/.env | cut -d'=' -f2 || echo "Not set")
        echo "• Web (apps/web/.env):"
        echo "  - API URL: $api_url"
        echo "  - Chain ID: $chain_id"
    fi
    
    # Contracts environment
    if [[ -f "contracts/.env" ]]; then
        local private_key_status="Not configured"
        if grep -q "PRIVATE_KEY=0x" contracts/.env; then
            private_key_status="Configured"
        fi
        echo "• Contracts (contracts/.env):"
        echo "  - Private Key: $private_key_status"
    fi
    
    echo ""
    echo "Next steps to complete setup:"
    echo ""
    
    # Check what still needs to be done
    local next_steps=()
    
    if ! grep -q "PRIVATE_KEY=0x" contracts/.env 2>/dev/null; then
        next_steps+=("Configure deployer wallet in contracts/.env")
    fi
    
    if grep -q "NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=" apps/web/.env 2>/dev/null; then
        next_steps+=("Get WalletConnect Project ID from https://cloud.walletconnect.com")
    fi
    
    if [[ ${#next_steps[@]} -gt 0 ]]; then
        for step in "${next_steps[@]}"; do
            echo "  • $step"
        done
        echo ""
    fi
    
    echo "Ready for next phase:"
    echo "  • Run: ./scripts/05-database-setup.sh"
    echo "  • Or continue with database setup"
}

# Main setup flow
main() {
    echo "⚙️  HackaFi Environment Setup"
    echo "============================"
    echo "This script will set up environment variables for all workspaces:"
    echo "  • Root environment (Docker Compose)"
    echo "  • API environment (NestJS backend)"  
    echo "  • Web environment (Next.js frontend)"
    echo "  • Contracts environment (Foundry deployment)"
    echo ""
    
    read -p "Do you want to continue with environment setup? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Environment setup cancelled"
        exit 0
    fi
    
    check_project_directory
    verify_example_files
    create_env_files
    generate_secrets
    configure_blockchain
    configure_wallets
    configure_database
    validate_environment
    show_configuration_summary
    
    echo ""
    log_success "🎉 Environment setup completed successfully!"
    echo ""
    echo "Your environment is now configured for HackaFi development."
    echo ""
    echo "Quick verification commands:"
    echo "  • Check configuration: ./scripts/validate-env.sh"
    echo "  • Next step: ./scripts/05-database-setup.sh"
    echo ""
    echo "Important files to keep secure:"
    echo "  • contracts/.env (contains private key)"
    echo "  • apps/api/.env (contains JWT secret)"
}

# Handle help
if [[ "${1:-}" == "help" ]] || [[ "${1:-}" == "-h" ]] || [[ "${1:-}" == "--help" ]]; then
    echo "HackaFi Environment Setup Script"
    echo "================================"
    echo "This script sets up environment variables across all workspaces with"
    echo "guided configuration for development settings."
    echo ""
    echo "What it configures:"
    echo "  • Blockchain network settings (Kaia testnet/mainnet/local)"
    echo "  • Database configuration (SQLite/PostgreSQL)"
    echo "  • Wallet addresses and private keys"  
    echo "  • JWT secrets and security settings"
    echo "  • API endpoints and service ports"
    echo ""
    echo "Usage: $0"
    echo ""
    echo "Environment files created:"
    echo "  • .env                - Docker Compose orchestration"
    echo "  • apps/web/.env       - Next.js frontend settings"
    echo "  • apps/api/.env       - NestJS backend settings"
    echo "  • contracts/.env      - Foundry deployment settings"
    echo ""
    echo "Security notes:"
    echo "  • Never commit .env files to git"
    echo "  • Use separate wallets for development"  
    echo "  • Keep private keys secure"
    echo ""
    exit 0
fi

# Run main function
main