#!/bin/bash

# =============================================================================
# Environment Setup Script
# =============================================================================
# This script helps set up environment variables for development
# =============================================================================

echo "🚀 Setting up environment variables..."

# Create root environment (Docker Compose)
if [ ! -f .env ]; then
    cp docker.env.example .env
    echo "✅ Created root .env file (Docker Compose)"
else
    echo "⚠️  Root .env file already exists"
fi

# Create web environment
if [ ! -f apps/web/.env ]; then
    cp apps/web/env.example apps/web/.env
    echo "✅ Created web .env file"
else
    echo "⚠️  Web .env file already exists"
fi

# Create API environment
if [ ! -f apps/api/.env ]; then
    cp apps/api/env.example apps/api/.env
    echo "✅ Created API .env file"
else
    echo "⚠️  API .env file already exists"
fi

# Create contracts environment
if [ ! -f contracts/.env ]; then
    cp contracts/env.example contracts/.env
    echo "✅ Created contracts .env file"
    echo ""
    echo "⚠️  IMPORTANT: Update your PRIVATE_KEY in contracts/.env"
    echo "   Never use your main wallet's private key for deployment!"
else
    echo "⚠️  Contracts .env file already exists"
fi

echo ""
echo "🎉 Environment setup complete!"
echo ""
echo "Next steps:"
echo "1. Update contract addresses after deployment"
echo "2. Configure your WalletConnect project ID"
echo "3. Set secure JWT secrets for production"
echo "4. Review ENVIRONMENT_VARIABLES.md for detailed configuration"
echo ""
echo "For development with Docker:"
echo "  docker-compose --profile development up"
echo ""
echo "For local development:"
echo "  pnpm dev"