#!/bin/bash

# =============================================================================
# 06 - Smart Contracts Setup Script
# =============================================================================
# This script compiles, tests, and deploys the HackaFi smart contracts using
# Foundry and updates environment variables with deployed addresses.
# =============================================================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
CONTRACTS_DIR="contracts"
DEPLOYMENT_NETWORK="testnet"  # Default to testnet

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
    if [[ ! -f "package.json" ]] || [[ ! -d "$CONTRACTS_DIR" ]]; then
        log_error "This script must be run from the HackaFi project root directory"
        exit 1
    fi
    
    # Check Foundry installation
    if ! command -v forge &> /dev/null; then
        log_error "Foundry not found. Please run 02-foundry-installation.sh first"
        echo "Or install manually: curl -L https://foundry.paradigm.xyz | bash && foundryup"
        exit 1
    fi
    
    # Check contracts environment
    if [[ ! -f "$CONTRACTS_DIR/.env" ]]; then
        log_error "Contracts environment file not found. Please run 04-environment-setup.sh first"
        exit 1
    fi
    
    # Check if contracts directory has proper structure
    if [[ ! -f "$CONTRACTS_DIR/foundry.toml" ]]; then
        log_error "Foundry configuration not found. Invalid contracts directory structure."
        exit 1
    fi
    
    log_success "All prerequisites are met"
}

# Verify Foundry installation
verify_foundry() {
    log_step "Verifying Foundry installation"
    
    local foundry_tools=("forge" "cast" "anvil")
    local failed=0
    
    for tool in "${foundry_tools[@]}"; do
        if command -v "$tool" &> /dev/null; then
            local version=$($tool --version | head -n1)
            log_success "✓ $version"
        else
            log_error "✗ $tool not found"
            failed=1
        fi
    done
    
    if [[ $failed -eq 1 ]]; then
        log_error "Some Foundry tools are missing"
        exit 1
    fi
    
    log_success "Foundry installation verified"
}

# Compile smart contracts
compile_contracts() {
    log_step "Compiling smart contracts"
    
    cd "$CONTRACTS_DIR"
    
    log_info "Running forge build..."
    if forge build; then
        log_success "Smart contracts compiled successfully"
        
        # Show contract sizes
        log_info "Contract sizes:"
        forge build --sizes 2>/dev/null | grep -E "(Contract|Size)" || true
    else
        log_error "Failed to compile smart contracts"
        echo ""
        echo "Common issues:"
        echo "1. Check for Solidity syntax errors"
        echo "2. Verify import statements"
        echo "3. Ensure all dependencies are properly configured"
        cd ..
        exit 1
    fi
    
    cd ..
}

# Run smart contract tests
test_contracts() {
    log_step "Running smart contract tests"
    
    cd "$CONTRACTS_DIR"
    
    log_info "Running forge test..."
    if forge test -vv; then
        log_success "All smart contract tests passed"
        
        # Show test gas usage
        log_info "Gas usage summary:"
        forge test --gas-report 2>/dev/null | tail -10 || true
    else
        log_warning "Some tests failed. This might be expected during development."
        echo ""
        read -p "Do you want to continue despite test failures? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            cd ..
            exit 1
        fi
    fi
    
    cd ..
}

# Check network configuration
check_network_config() {
    log_step "Checking network configuration"
    
    cd "$CONTRACTS_DIR"
    
    # Load environment variables
    source .env
    
    # Check if private key is set
    if [[ -z "$PRIVATE_KEY" ]] || [[ "$PRIVATE_KEY" == "your-private-key" ]]; then
        log_error "Private key not configured in contracts/.env"
        echo ""
        echo "To configure:"
        echo "1. Create a new wallet for deployment (NEVER use your main wallet)"
        echo "2. Add private key to contracts/.env: PRIVATE_KEY=0x..."
        echo "3. Fund the wallet with test tokens for deployment"
        echo ""
        cd ..
        exit 1
    fi
    
    # Determine network based on RPC URL
    if [[ -n "$KAIA_TESTNET_RPC" ]] && [[ "$KAIA_TESTNET_RPC" != *"your-rpc"* ]]; then
        DEPLOYMENT_NETWORK="testnet"
        RPC_URL="$KAIA_TESTNET_RPC"
        NETWORK_NAME="Kaia Kairos Testnet"
    elif [[ -n "$KAIA_MAINNET_RPC" ]] && [[ "$KAIA_MAINNET_RPC" != *"your-rpc"* ]]; then
        DEPLOYMENT_NETWORK="mainnet"
        RPC_URL="$KAIA_MAINNET_RPC"
        NETWORK_NAME="Kaia Mainnet"
        log_warning "⚠️  MAINNET deployment detected! Make sure this is intentional."
    else
        # Default to public testnet RPC
        DEPLOYMENT_NETWORK="testnet"
        RPC_URL="https://public-en-kairos.node.kaia.io"
        NETWORK_NAME="Kaia Kairos Testnet (default)"
        log_warning "Using default testnet RPC URL"
    fi
    
    log_success "Network: $NETWORK_NAME"
    log_info "RPC URL: $RPC_URL"
    
    # Get deployer address from private key
    DEPLOYER_ADDRESS=$(cast wallet address --private-key "$PRIVATE_KEY" 2>/dev/null || echo "Invalid private key")
    
    if [[ "$DEPLOYER_ADDRESS" == "Invalid private key" ]]; then
        log_error "Invalid private key format"
        cd ..
        exit 1
    fi
    
    log_info "Deployer address: $DEPLOYER_ADDRESS"
    
    # Check deployer balance
    log_info "Checking deployer balance..."
    local balance
    if balance=$(cast balance "$DEPLOYER_ADDRESS" --rpc-url "$RPC_URL" 2>/dev/null); then
        local balance_eth=$(cast to-unit "$balance" ether)
        log_info "Balance: $balance_eth KAIA"
        
        # Check if balance is sufficient (need at least 0.1 KAIA for deployment)
        if (( $(echo "$balance_eth < 0.1" | bc -l) )); then
            log_warning "⚠️  Low balance ($balance_eth KAIA). You may need more funds for deployment."
            
            if [[ "$DEPLOYMENT_NETWORK" == "testnet" ]]; then
                echo ""
                echo "For testnet funds, you can use a Kaia testnet faucet:"
                echo "  • Visit: https://kairos.wallet.klaytn.foundation/faucet"
                echo "  • Address: $DEPLOYER_ADDRESS"
            fi
        else
            log_success "Sufficient balance for deployment"
        fi
    else
        log_warning "Could not check balance (RPC might be unavailable)"
    fi
    
    cd ..
    export DEPLOYMENT_NETWORK RPC_URL NETWORK_NAME DEPLOYER_ADDRESS
}

# Deploy smart contracts
deploy_contracts() {
    log_step "Deploying smart contracts"
    
    cd "$CONTRACTS_DIR"
    
    echo "Deployment Summary:"
    echo "  • Network: $NETWORK_NAME"
    echo "  • RPC URL: $RPC_URL"
    echo "  • Deployer: $DEPLOYER_ADDRESS"
    echo ""
    
    if [[ "$DEPLOYMENT_NETWORK" == "mainnet" ]]; then
        log_warning "⚠️  You are about to deploy to MAINNET!"
        echo "This will:"
        echo "  • Use real KAIA tokens"
        echo "  • Deploy contracts permanently"  
        echo "  • Cost actual money"
        echo ""
        read -p "Are you absolutely sure you want to deploy to mainnet? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "Mainnet deployment cancelled"
            cd ..
            exit 0
        fi
    fi
    
    read -p "Do you want to deploy smart contracts to $NETWORK_NAME? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Contract deployment cancelled"
        cd ..
        exit 0
    fi
    
    # Load environment for deployment
    source .env
    
    log_info "Starting contract deployment..."
    
    # Deploy using Foundry script
    if [[ -f "script/DeployContracts.s.sol" ]]; then
        log_info "Using deployment script: script/DeployContracts.s.sol"
        
        if forge script script/DeployContracts.s.sol:DeployContracts \
            --rpc-url "$RPC_URL" \
            --private-key "$PRIVATE_KEY" \
            --broadcast \
            --verify; then
            log_success "Smart contracts deployed successfully"
        else
            log_error "Smart contract deployment failed"
            echo ""
            echo "Common issues:"
            echo "1. Insufficient funds for gas"
            echo "2. Network connectivity issues"
            echo "3. Contract compilation errors"
            echo "4. Invalid private key or RPC URL"
            cd ..
            exit 1
        fi
    else
        log_warning "No deployment script found. Creating basic deployment..."
        
        # Basic deployment without script (fallback)
        log_info "Deploying contracts individually..."
        
        # This would need to be customized based on actual contracts
        log_warning "Automated deployment requires a proper deployment script"
        log_info "Please create script/DeployContracts.s.sol for automated deployment"
        
        cd ..
        return
    fi
    
    cd ..
}

# Extract deployed addresses from broadcast logs
extract_deployed_addresses() {
    log_step "Extracting deployed contract addresses"
    
    cd "$CONTRACTS_DIR"
    
    # Look for the latest broadcast run
    local broadcast_dir="broadcast/DeployContracts.s.sol"
    local latest_run=""
    
    if [[ -d "$broadcast_dir" ]]; then
        # Find the latest run directory (by chain ID)
        for chain_dir in "$broadcast_dir"/*; do
            if [[ -d "$chain_dir" ]]; then
                latest_run=$(find "$chain_dir" -name "run-latest.json" | head -1)
                break
            fi
        done
    fi
    
    if [[ -f "$latest_run" ]]; then
        log_info "Found deployment data: $latest_run"
        
        # Extract contract addresses (this would need to be customized based on actual contracts)
        # For now, provide a template
        log_info "Extracting contract addresses from deployment data..."
        
        # Example extraction (customize based on your contracts)
        local hackathon_registry=$(jq -r '.transactions[] | select(.contractName == "HackathonRegistry") | .contractAddress' "$latest_run" 2>/dev/null || echo "")
        local prize_pool=$(jq -r '.transactions[] | select(.contractName == "PrizePool") | .contractAddress' "$latest_run" 2>/dev/null || echo "")
        
        if [[ -n "$hackathon_registry" && "$hackathon_registry" != "null" ]]; then
            log_success "HackathonRegistry deployed at: $hackathon_registry"
            export HACKATHON_REGISTRY_ADDRESS="$hackathon_registry"
        fi
        
        if [[ -n "$prize_pool" && "$prize_pool" != "null" ]]; then
            log_success "PrizePool deployed at: $prize_pool"
            export PRIZE_POOL_ADDRESS="$prize_pool"
        fi
        
        # If no addresses found, provide manual instructions
        if [[ -z "$hackathon_registry" && -z "$prize_pool" ]]; then
            log_warning "Could not automatically extract contract addresses"
            echo ""
            echo "Please manually extract addresses from deployment output above"
            echo "Look for lines like:"
            echo "  Contract deployed at: 0x..."
            echo ""
            
            read -p "Enter HackathonRegistry address (or press Enter to skip): " hackathon_registry
            if [[ -n "$hackathon_registry" ]]; then
                export HACKATHON_REGISTRY_ADDRESS="$hackathon_registry"
            fi
            
            read -p "Enter PrizePool address (or press Enter to skip): " prize_pool
            if [[ -n "$prize_pool" ]]; then
                export PRIZE_POOL_ADDRESS="$prize_pool"
            fi
        fi
    else
        log_warning "No deployment broadcast data found"
        echo "Please manually provide contract addresses:"
        echo ""
        
        read -p "Enter HackathonRegistry address (or press Enter to skip): " hackathon_registry
        if [[ -n "$hackathon_registry" ]]; then
            export HACKATHON_REGISTRY_ADDRESS="$hackathon_registry"
        fi
        
        read -p "Enter PrizePool address (or press Enter to skip): " prize_pool  
        if [[ -n "$prize_pool" ]]; then
            export PRIZE_POOL_ADDRESS="$prize_pool"
        fi
    fi
    
    cd ..
}

# Update environment files with deployed addresses
update_environment_files() {
    if [[ -n "$HACKATHON_REGISTRY_ADDRESS" || -n "$PRIZE_POOL_ADDRESS" ]]; then
        log_step "Updating environment files with contract addresses"
        
        # Update root .env
        if [[ -n "$HACKATHON_REGISTRY_ADDRESS" ]]; then
            update_env_var ".env" "HACKATHON_REGISTRY_ADDRESS" "$HACKATHON_REGISTRY_ADDRESS"
            log_success "Updated root .env with HackathonRegistry address"
        fi
        
        if [[ -n "$PRIZE_POOL_ADDRESS" ]]; then
            update_env_var ".env" "PRIZE_POOL_ADDRESS" "$PRIZE_POOL_ADDRESS"  
            log_success "Updated root .env with PrizePool address"
        fi
        
        # Update web .env
        if [[ -n "$HACKATHON_REGISTRY_ADDRESS" ]]; then
            update_env_var "apps/web/.env" "NEXT_PUBLIC_HACKATHON_REGISTRY_ADDRESS" "$HACKATHON_REGISTRY_ADDRESS"
            log_success "Updated web .env with HackathonRegistry address"
        fi
        
        if [[ -n "$PRIZE_POOL_ADDRESS" ]]; then
            update_env_var "apps/web/.env" "NEXT_PUBLIC_PRIZE_POOL_ADDRESS" "$PRIZE_POOL_ADDRESS"
            log_success "Updated web .env with PrizePool address"
        fi
        
        # Update API .env  
        if [[ -n "$HACKATHON_REGISTRY_ADDRESS" ]]; then
            update_env_var "apps/api/.env" "HACKATHON_REGISTRY_ADDRESS" "$HACKATHON_REGISTRY_ADDRESS"
            log_success "Updated API .env with HackathonRegistry address"
        fi
        
        if [[ -n "$PRIZE_POOL_ADDRESS" ]]; then
            update_env_var "apps/api/.env" "PRIZE_POOL_ADDRESS" "$PRIZE_POOL_ADDRESS"
            log_success "Updated API .env with PrizePool address"
        fi
        
        # Update contracts .env
        if [[ -n "$HACKATHON_REGISTRY_ADDRESS" ]]; then
            update_env_var "contracts/.env" "HACKATHON_REGISTRY_ADDRESS" "$HACKATHON_REGISTRY_ADDRESS"
        fi
        
        if [[ -n "$PRIZE_POOL_ADDRESS" ]]; then
            update_env_var "contracts/.env" "PRIZE_POOL_ADDRESS" "$PRIZE_POOL_ADDRESS"
        fi
        
        log_success "All environment files updated with contract addresses"
    else
        log_info "No contract addresses to update"
    fi
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

# Show deployment summary
show_deployment_summary() {
    log_step "Smart Contract Deployment Summary"
    
    echo "Deployment completed on: $NETWORK_NAME"
    echo "Deployer address: $DEPLOYER_ADDRESS"
    echo ""
    
    if [[ -n "$HACKATHON_REGISTRY_ADDRESS" ]]; then
        echo "• HackathonRegistry: $HACKATHON_REGISTRY_ADDRESS"
    fi
    
    if [[ -n "$PRIZE_POOL_ADDRESS" ]]; then
        echo "• PrizePool: $PRIZE_POOL_ADDRESS"
    fi
    
    echo ""
    echo "Blockchain Explorer:"
    if [[ "$DEPLOYMENT_NETWORK" == "testnet" ]]; then
        echo "  • Kairos Explorer: https://kairos.kaiascan.io/"
    else
        echo "  • Kaia Explorer: https://kaiascan.io/"
    fi
    
    echo ""
    echo "Smart contract ABIs available in:"
    echo "  • contracts/out/ (Foundry artifacts)"
    echo "  • contracts/abi/ (Frontend integration)"
    
    echo ""
    echo "Next steps:"
    echo "  • Verify contracts on block explorer (if not done automatically)"
    echo "  • Update frontend integration with new addresses"
    echo "  • Run integration tests"
    echo ""
    echo "Ready for development with deployed contracts!"
}

# Main deployment flow
main() {
    echo "⚔️  HackaFi Smart Contracts Setup"
    echo "================================="
    echo "This script will:"
    echo "  • Compile smart contracts with Foundry"
    echo "  • Run contract tests"
    echo "  • Deploy contracts to chosen network"
    echo "  • Update environment files with addresses"
    echo ""
    
    read -p "Do you want to continue with smart contract setup? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Smart contract setup cancelled"
        exit 0
    fi
    
    check_prerequisites
    verify_foundry
    compile_contracts
    test_contracts
    check_network_config
    deploy_contracts
    extract_deployed_addresses
    update_environment_files
    show_deployment_summary
    
    echo ""
    log_success "🎉 Smart contract setup completed successfully!"
    echo ""
    echo "Your smart contracts are now deployed and configured."
    echo ""
    echo "Next steps:"
    echo "  • Run: ./scripts/07-development-start.sh"
    echo "  • Or start development servers manually"
    echo ""
    echo "Smart contracts are ready for HackaFi integration!"
}

# Handle help
if [[ "${1:-}" == "help" ]] || [[ "${1:-}" == "-h" ]] || [[ "${1:-}" == "--help" ]]; then
    echo "HackaFi Smart Contracts Setup Script"  
    echo "===================================="
    echo "This script compiles, tests, and deploys HackaFi smart contracts"
    echo "using the Foundry toolkit."
    echo ""
    echo "What it does:"
    echo "  1. Verify Foundry installation and prerequisites"
    echo "  2. Compile smart contracts with forge build"
    echo "  3. Run comprehensive test suite with forge test"
    echo "  4. Check network configuration and deployer balance"
    echo "  5. Deploy contracts to configured network"
    echo "  6. Extract deployed contract addresses"
    echo "  7. Update all environment files with new addresses"
    echo ""
    echo "Usage: $0"
    echo ""
    echo "Prerequisites:"
    echo "  • Foundry installed (run 02-foundry-installation.sh)"
    echo "  • Environment configured (run 04-environment-setup.sh)"
    echo "  • Private key configured in contracts/.env"
    echo "  • Network funded for deployment"
    echo ""
    echo "Supported networks:"
    echo "  • Kaia Kairos Testnet (recommended for development)"
    echo "  • Kaia Mainnet (production only)"
    echo ""
    echo "Security notes:"
    echo "  • Never use your main wallet for deployment"
    echo "  • Use a dedicated deployment wallet"
    echo "  • Keep private keys secure"
    echo "  • Double-check network before mainnet deployment"
    echo ""
    exit 0
fi

# Run main function
main