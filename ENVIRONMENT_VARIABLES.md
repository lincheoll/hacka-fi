# Environment Variables Guide

## Overview

This monorepo uses a **workspace-specific environment variable strategy** where each workspace (web, api, contracts) maintains its own environment configuration while sharing common variables at the root level.

## File Structure

```
├── docker.env.example                      # Root shared variables (Docker orchestration)
├── docker.env.production.example           # Root production variables
├── apps/web/env.example             # Next.js development variables
├── apps/web/env.production.example  # Next.js production variables
├── apps/api/env.example             # NestJS development variables
├── apps/api/env.production.example  # NestJS production variables
├── contracts/env.example            # Smart contract deployment variables
└── contracts/env.production.example # Production deployment variables
```

## Setup Instructions

### 1. Development Setup

```bash
# Root level (for Docker Compose)
cp docker.env.example .env

# Web workspace (Next.js)
cd apps/web
cp env.example .env

# API workspace (NestJS)
cd ../api
cp env.example .env

# Contracts workspace (Foundry)
cd ../../contracts
cp env.example .env
```

### 2. Production Setup

```bash
# Use production examples as templates
cp docker.env.production.example .env.production
cp apps/web/env.production.example apps/web/.env.production
cp apps/api/env.production.example apps/api/.env.production
cp contracts/env.production.example contracts/.env.production
```

## Variable Categories

### Root Level Variables (Shared)

These variables are used by Docker Compose and shared across workspaces:

```bash
# Service orchestration
NODE_ENV=development
API_PORT=3001
WEB_PORT=3000
DATABASE_PORT=5432

# Database (shared between API and Docker)
POSTGRES_DB=hacka_fi
POSTGRES_USER=postgres
POSTGRES_PASSWORD=password

# Blockchain (shared configuration)
KAIA_CHAIN_ID=1001
RPC_URL=https://public-en-baobab.klaytn.net
HACKATHON_REGISTRY_ADDRESS=0x...
PRIZE_POOL_ADDRESS=0x...

# Cross-service
CORS_ORIGIN=http://localhost:3000
```

### Web Workspace Variables (Next.js)

Frontend-specific variables (must be prefixed with `NEXT_PUBLIC_` to be exposed to browser):

```bash
# API connection
NEXT_PUBLIC_API_URL=http://localhost:3001

# Blockchain (public)
NEXT_PUBLIC_KAIA_CHAIN_ID=1001
NEXT_PUBLIC_RPC_URL=https://public-en-baobab.klaytn.net
NEXT_PUBLIC_HACKATHON_REGISTRY_ADDRESS=0x...
NEXT_PUBLIC_PRIZE_POOL_ADDRESS=0x...

# External services
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=...
```

### API Workspace Variables (NestJS)

Backend-specific variables:

```bash
# Application
NODE_ENV=development
PORT=3001

# Database
DATABASE_URL=file:./dev.db
DATABASE_PROVIDER=sqlite

# Authentication
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=1d

# Blockchain
RPC_URL=https://public-en-baobab.klaytn.net
CHAIN_ID=1001
HACKATHON_REGISTRY_ADDRESS=0x...
PRIZE_POOL_ADDRESS=0x...

# Security & Features
CORS_ORIGIN=http://localhost:3000
UPLOAD_MAX_SIZE=10485760
RATE_LIMIT_MAX_REQUESTS=100
```

### Contracts Workspace Variables (Foundry)

Smart contract deployment variables:

```bash
# Deployer (KEEP SECRET!)
PRIVATE_KEY=0x...
DEPLOYER_ADDRESS=0x...

# Networks
KAIA_MAINNET_RPC=https://public-en-cypress.klaytn.net
KAIA_TESTNET_RPC=https://public-en-baobab.klaytn.net

# Block explorer
SCAN_URL=https://kairos.kaiascan.io
SCAN_API_KEY=...

# Deployment results
HACKATHON_REGISTRY_ADDRESS=
PRIZE_POOL_ADDRESS=

# Testing
TEST_ORGANIZER=0x...
GAS_PRICE=25000000000
```

## Usage Patterns

### Local Development

1. **Individual workspace development**: Each workspace reads its own `.env` file
2. **Docker development**: Root `.env` file provides shared configuration via Docker Compose
3. **Contract deployment**: Contracts workspace uses its own environment for deployment

### Production Deployment

1. **Environment-specific files**: Use `.env.production` variants
2. **Docker deployment**: Root production file orchestrates all services
3. **Contract verification**: Production contracts workspace handles mainnet deployment

### Variable Precedence

1. **Workspace-specific variables** take precedence over root variables
2. **Docker environment overrides** take precedence in containerized environments
3. **Production files** override development files when explicitly loaded

## Migration from Old Structure

The previous structure had all variables mixed in the root `docker.env.example`. The new structure provides:

### Benefits

1. **Clear separation**: Each workspace only sees relevant variables
2. **Better security**: Sensitive deployment keys isolated to contracts workspace
3. **Docker integration**: Proper environment injection into containers
4. **Independent development**: Teams can work on different workspaces without conflicts

### Key Changes

1. **Contract addresses**: Now environment-driven in web3.ts instead of hardcoded
2. **Database configuration**: Consistent naming (`DATABASE_PROVIDER` vs `DB_PROVIDER`)
3. **Port defaults**: Aligned across all configurations (API=3001, Web=3000)
4. **RPC URLs**: Environment-configurable instead of hardcoded

## Common Issues & Solutions

### Issue: API environment variables not loaded in Docker

**Solution**: Ensure Docker Compose uses `env_file` directive and proper variable passing:

```yaml
api:
  env_file:
    - .env
  environment:
    - DATABASE_URL=postgresql://postgres:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB}
```

### Issue: Next.js can't access environment variables

**Solution**: Ensure variables are prefixed with `NEXT_PUBLIC_` for browser access:

```bash
NEXT_PUBLIC_API_URL=http://localhost:3001  # ✅ Accessible in browser
API_SECRET=secret                          # ❌ Server-side only
```

### Issue: Contract addresses not updating after deployment

**Solution**: Update contract addresses in both root and workspace-specific files:

```bash
# Root .env (for Docker)
HACKATHON_REGISTRY_ADDRESS=0xNewAddress

# Web workspace .env
NEXT_PUBLIC_HACKATHON_REGISTRY_ADDRESS=0xNewAddress
```

### Issue: Database connection fails in production

**Solution**: Use proper DATABASE_URL format for PostgreSQL:

```bash
DATABASE_URL=postgresql://postgres:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB}?schema=public
DATABASE_PROVIDER=postgresql
```

## Security Best Practices

1. **Never commit actual `.env` files** - only `docker.env.example` files
2. **Keep private keys separate** - use dedicated deployer wallets
3. **Use different secrets** for development and production
4. **Rotate secrets regularly** - especially JWT secrets and API keys
5. **Validate required variables** - use Joi validation in NestJS

## Environment Validation

The NestJS application validates required environment variables on startup:

```typescript
// apps/api/src/config/app.config.ts
export const configValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test'),
  DATABASE_URL: Joi.string().required(),
  JWT_SECRET: Joi.string().required(),
  // ... other validations
});
```

This ensures the application fails fast if critical environment variables are missing.