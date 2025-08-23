# Environment Variables Migration Guide

## Overview

We've refactored the environment variable management to improve organization and fix Docker integration issues. This guide helps you migrate from the old structure to the new workspace-specific approach.

## What Changed

### Before (Old Structure)
- Single root `docker.env.example` with all variables mixed together
- Environment variables not properly injected into NestJS containers
- Inconsistent naming conventions (`DB_PROVIDER` vs `DATABASE_PROVIDER`)
- Hardcoded contract addresses in web3.ts
- Port conflicts between configurations

### After (New Structure)
- Workspace-specific environment files with clear separation
- Proper Docker environment injection
- Consistent naming conventions
- Environment-driven contract addresses
- Aligned port configurations

## Migration Steps

### 1. Backup Your Current Environment

```bash
# Backup your existing .env file
cp .env .env.backup
```

### 2. Run the Automated Setup

```bash
# This will create new environment files from examples
pnpm run setup:env
```

### 3. Migrate Your Values

Transfer your values from the backup to the appropriate new files:

#### Root `.env` (Docker orchestration)
```bash
# Copy these from your backup:
NODE_ENV=
API_PORT=
WEB_PORT=
POSTGRES_DB=
POSTGRES_USER=
POSTGRES_PASSWORD=
KAIA_CHAIN_ID=
RPC_URL=
HACKATHON_REGISTRY_ADDRESS=
PRIZE_POOL_ADDRESS=
CORS_ORIGIN=
```

#### `apps/web/.env.local` (Next.js frontend)
```bash
# Copy and prefix with NEXT_PUBLIC_:
NEXT_PUBLIC_API_URL=
NEXT_PUBLIC_KAIA_CHAIN_ID=
NEXT_PUBLIC_HACKATHON_REGISTRY_ADDRESS=
NEXT_PUBLIC_PRIZE_POOL_ADDRESS=
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=
```

#### `apps/api/.env` (NestJS backend)
```bash
# Copy these values:
NODE_ENV=
PORT=
DATABASE_URL=
DATABASE_PROVIDER=  # Note: changed from DB_PROVIDER
JWT_SECRET=
JWT_EXPIRES_IN=
RPC_URL=
CHAIN_ID=
HACKATHON_REGISTRY_ADDRESS=
PRIZE_POOL_ADDRESS=
CORS_ORIGIN=
# ... other API-specific variables
```

#### `contracts/.env` (Foundry deployment)
```bash
# Copy deployment-related variables:
PRIVATE_KEY=
DEPLOYER_ADDRESS=
KAIA_MAINNET_RPC=
KAIA_TESTNET_RPC=
SCAN_API_KEY=
# ... other contract variables
```

### 4. Variable Name Changes

Update these variable names if you're using them:

| Old Name | New Name |
|----------|----------|
| `DB_PROVIDER` | `DATABASE_PROVIDER` |
| `NEXT_PUBLIC_API_URL` with port 3004 | `NEXT_PUBLIC_API_URL` with port 3001 |

### 5. Contract Address Updates

If you have deployed contracts, update addresses in both:
- Root `.env` (for Docker)
- Workspace-specific `.env` files

### 6. Test the Migration

```bash
# Test local development
pnpm dev

# Test Docker development
pnpm run docker:dev

# Test contract deployment
cd contracts && forge test
```

## Common Migration Issues

### Issue 1: API not accessible from frontend

**Problem**: Frontend trying to reach API on wrong port
**Solution**: Update `NEXT_PUBLIC_API_URL` to use port 3001

```bash
# In apps/web/.env.local
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### Issue 2: Database connection fails

**Problem**: Wrong `DATABASE_PROVIDER` variable name
**Solution**: Update from `DB_PROVIDER` to `DATABASE_PROVIDER`

```bash
# In apps/api/.env
DATABASE_PROVIDER=sqlite  # Not DB_PROVIDER
```

### Issue 3: Docker containers can't find environment variables

**Problem**: Environment variables not properly passed to containers
**Solution**: Ensure root `.env` file exists and contains shared variables

### Issue 4: Contract addresses not updating in frontend

**Problem**: Hardcoded addresses in web3.ts
**Solution**: Contract addresses now come from environment variables automatically

## Verification Steps

After migration, verify everything works:

1. **Local Development**:
   ```bash
   pnpm dev
   # Check that web (3000) and api (3001) start successfully
   ```

2. **Docker Development**:
   ```bash
   pnpm run docker:dev
   # Check that all services start and can communicate
   ```

3. **Contract Deployment**:
   ```bash
   cd contracts
   forge test
   # Ensure tests pass with new environment structure
   ```

4. **Environment Variable Access**:
   - Check that API can access database and blockchain variables
   - Check that frontend can access `NEXT_PUBLIC_*` variables
   - Check that contract deployment uses correct network settings

## Rollback Procedure

If you encounter issues, you can rollback:

```bash
# Restore your backup
cp .env.backup .env

# Remove new environment files
rm apps/web/.env.local
rm apps/api/.env
rm contracts/.env

# Use the old single-file approach temporarily
```

## Getting Help

If you encounter issues during migration:

1. Check the detailed [Environment Variables Guide](./ENVIRONMENT_VARIABLES.md)
2. Ensure all required variables are set in each workspace
3. Verify that variable names match the new conventions
4. Test each workspace independently before testing together

## Benefits After Migration

- ✅ Clear separation of concerns between workspaces
- ✅ Proper Docker environment injection
- ✅ Environment-driven contract addresses
- ✅ Consistent naming conventions
- ✅ Better security isolation
- ✅ Independent workspace development