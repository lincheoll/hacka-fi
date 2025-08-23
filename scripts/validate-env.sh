#!/bin/bash

# =============================================================================
# Environment Validation Script
# =============================================================================
# This script validates that all required environment files and variables
# are properly configured across the monorepo workspaces.
# =============================================================================

echo "🔍 Validating environment configuration..."
echo ""

ERRORS=0

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if file exists
check_file() {
    local file=$1
    local desc=$2
    
    if [ -f "$file" ]; then
        echo -e "${GREEN}✅${NC} $desc exists"
    else
        echo -e "${RED}❌${NC} $desc missing"
        ERRORS=$((ERRORS + 1))
    fi
}

# Function to check if variable exists in file
check_var() {
    local file=$1
    local var=$2
    local desc=$3
    
    if [ -f "$file" ]; then
        if grep -q "^$var=" "$file" || grep -q "^#$var=" "$file"; then
            echo -e "${GREEN}✅${NC} $desc has $var"
        else
            echo -e "${YELLOW}⚠️${NC}  $desc missing $var"
        fi
    fi
}

echo "📁 Checking environment files..."
echo ""

# Check root files (Docker Compose)
check_file "docker.env.example" "Docker environment example"
check_file "docker.env.production.example" "Docker production example"

# Check workspace files
check_file "apps/web/env.example" "Web environment example"
check_file "apps/web/env.production.example" "Web production example"
check_file "apps/api/env.example" "API environment example"
check_file "apps/api/env.production.example" "API production example"
check_file "contracts/env.example" "Contracts environment example"
check_file "contracts/env.production.example" "Contracts production example"

echo ""
echo "🔧 Checking development environment files..."
echo ""

# Check if development files exist
check_file ".env" "Root .env (for Docker)"
check_file "apps/web/.env" "Web .env"
check_file "apps/api/.env" "API .env"
check_file "contracts/.env" "Contracts .env"

echo ""
echo "🔑 Validating critical variables..."
echo ""

# Check critical variables in each workspace
if [ -f "apps/api/.env" ]; then
    echo "API workspace variables:"
    check_var "apps/api/.env" "DATABASE_URL" "API"
    check_var "apps/api/.env" "JWT_SECRET" "API"
    check_var "apps/api/.env" "RPC_URL" "API"
fi

if [ -f "apps/web/.env" ]; then
    echo "Web workspace variables:"
    check_var "apps/web/.env" "NEXT_PUBLIC_API_URL" "Web"
    check_var "apps/web/.env" "NEXT_PUBLIC_KAIA_CHAIN_ID" "Web"
fi

if [ -f "contracts/.env" ]; then
    echo "Contracts workspace variables:"
    check_var "contracts/.env" "PRIVATE_KEY" "Contracts"
    check_var "contracts/.env" "KAIA_TESTNET_RPC" "Contracts"
fi

echo ""
echo "🐳 Checking Docker configuration..."
echo ""

# Check Docker Compose file
if [ -f "docker-compose.yml" ]; then
    echo -e "${GREEN}✅${NC} docker-compose.yml exists"
    
    # Check if env_file is used
    if grep -q "env_file:" "docker-compose.yml"; then
        echo -e "${GREEN}✅${NC} Docker Compose uses env_file"
    else
        echo -e "${YELLOW}⚠️${NC}  Docker Compose doesn't use env_file"
    fi
else
    echo -e "${RED}❌${NC} docker-compose.yml missing"
    ERRORS=$((ERRORS + 1))
fi

echo ""
echo "📋 Summary:"
echo ""

if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}🎉 All environment files are properly configured!${NC}"
    echo ""
    echo "You can now:"
    echo "  • Start development: pnpm dev"
    echo "  • Start with Docker: pnpm run docker:dev"
    echo "  • Deploy contracts: cd contracts && forge script script/DeployContracts.s.sol"
else
    echo -e "${RED}❌ Found $ERRORS configuration issues${NC}"
    echo ""
    echo "To fix issues:"
    echo "  • Run: pnpm run setup:env"
    echo "  • Check: ENVIRONMENT_VARIABLES.md"
    echo "  • Migrate: MIGRATION_GUIDE.md"
fi

echo ""
echo "For detailed configuration help, see:"
echo "  • ENVIRONMENT_VARIABLES.md - Complete guide"
echo "  • MIGRATION_GUIDE.md - Migration from old structure"

exit $ERRORS