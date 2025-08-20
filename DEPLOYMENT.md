# HackaFi Deployment Guide

This guide provides comprehensive instructions for deploying the HackaFi platform in both development and production environments.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Development Deployment](#development-deployment)
- [Production Deployment](#production-deployment)
- [Docker Configuration](#docker-configuration)
- [Database Management](#database-management)
- [Smart Contract Deployment](#smart-contract-deployment)
- [Monitoring and Health Checks](#monitoring-and-health-checks)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Software

- **Docker** (version 20.10+) and **Docker Compose** (v2.0+)
- **Node.js** (version 20+)
- **pnpm** (version 8+)
- **Git** for version control

### System Requirements

**Development:**

- RAM: 4GB minimum, 8GB recommended
- Storage: 10GB free space
- Ports: 3000, 3001, 5432, 6379

**Production:**

- RAM: 8GB minimum, 16GB recommended
- Storage: 50GB free space (with room for database growth)
- CPU: 2+ cores
- Ports: 80, 443, 3000, 3001, 5432, 6379

### Installation Commands

```bash
# Install Docker (Ubuntu/Debian)
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Node.js (using nvm)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 20
nvm use 20

# Install pnpm
npm install -g pnpm

# Verify installations
docker --version
docker compose version
node --version
pnpm --version
```

## Environment Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd hacka-fi
```

### 2. Environment Configuration

Copy the example environment file:

```bash
cp .env.example .env
```

Update the `.env` file with your specific configuration:

```bash
# Essential configurations to update:

# Database (for production)
POSTGRES_PASSWORD=your-secure-password
DATABASE_URL=postgresql://postgres:your-secure-password@db:5432/hacka_fi_prod

# JWT Security
JWT_SECRET=your-very-secure-jwt-secret-at-least-32-characters-long

# Blockchain
RPC_URL=https://public-en-kairos.node.kaia.io  # Kairos testnet
# RPC_URL=https://public-en.node.kaia.io      # Kaia mainnet
PRIVATE_KEY=your-private-key-for-contract-deployment

# Admin wallet
ADMIN_WALLET_ADDRESS=0xYourAdminWalletAddress

# Frontend URLs (update for production)
NEXT_PUBLIC_API_URL=https://your-domain.com/api  # Production
# NEXT_PUBLIC_API_URL=http://localhost:3001     # Development
```

## Development Deployment

### Quick Start

Use the automated deployment script:

```bash
./deploy.sh development
```

### Manual Development Setup

1. **Install Dependencies:**

   ```bash
   pnpm install
   ```

2. **Setup Database:**

   ```bash
   cd apps/api
   pnpm prisma generate
   pnpm prisma migrate dev
   pnpm prisma db seed  # Optional: seed with test data
   cd ../..
   ```

3. **Start Development Services:**

   ```bash
   # Using Docker Compose
   docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build -d --profile development

   # Or run manually without Docker
   pnpm run dev  # Starts both API and Web in development mode
   ```

4. **Access Services:**
   - Web Application: http://localhost:3000
   - API Server: http://localhost:3001
   - API Documentation: http://localhost:3001/api/docs

### Development Features

- **Hot Reload:** Code changes automatically reload services
- **SQLite Database:** Lightweight database for development
- **Detailed Logging:** Debug-level logging enabled
- **Source Maps:** For easier debugging

## Production Deployment

### Quick Start

```bash
# Set production environment variables
cp .env.production.example .env.production

# Deploy production services
./deploy.sh production
```

### Manual Production Setup

1. **Prepare Production Environment:**

   ```bash
   # Set environment
   export NODE_ENV=production

   # Use production environment file
   cp .env.production.example .env.production
   # Update .env.production with actual values
   ```

2. **Build and Deploy:**

   ```bash
   docker compose up --build -d --profile production
   ```

3. **Database Migration:**

   ```bash
   # Run database migrations in production
   docker compose exec api pnpm prisma migrate deploy
   ```

4. **Health Check:**
   ```bash
   # Check service status
   curl http://localhost:3001/health/database
   curl http://localhost:3000
   ```

### Production Features

- **PostgreSQL Database:** Robust, production-ready database
- **Redis Caching:** Performance optimization
- **Security Headers:** Helmet.js for security
- **Process Management:** PM2 for API process management
- **Compressed Assets:** Optimized bundle sizes
- **Health Monitoring:** Built-in health check endpoints

## Docker Configuration

### Services Overview

| Service   | Description         | Port | Profile   |
| --------- | ------------------- | ---- | --------- |
| **api**   | NestJS Backend API  | 3001 | dev, prod |
| **web**   | Next.js Frontend    | 3000 | dev, prod |
| **db**    | PostgreSQL Database | 5432 | prod only |
| **redis** | Redis Cache         | 6379 | prod only |

### Docker Commands

```bash
# View running services
docker compose ps

# View service logs
docker compose logs api
docker compose logs web
docker compose logs -f api  # Follow logs

# Execute commands in containers
docker compose exec api pnpm prisma studio
docker compose exec db psql -U postgres -d hacka_fi_prod

# Scale services (production)
docker compose up --scale api=2 -d

# Update services
docker compose pull
docker compose up --build -d

# Cleanup
docker compose down
docker system prune -f
```

### Container Health Checks

All containers include health checks:

```bash
# Check container health
docker compose ps
# HEALTHY containers are ready to serve requests
```

## Database Management

### Development (SQLite)

```bash
# Access database
cd apps/api
pnpm prisma studio  # Web UI
sqlite3 prisma/dev.db  # CLI access

# Reset database
pnpm prisma migrate reset
```

### Production (PostgreSQL)

```bash
# Access database
docker compose exec db psql -U postgres -d hacka_fi_prod

# Backup database
docker compose exec db pg_dump -U postgres hacka_fi_prod > backup.sql

# Restore database
docker compose exec -T db psql -U postgres hacka_fi_prod < backup.sql

# Database monitoring
docker compose exec db psql -U postgres -d hacka_fi_prod -c "
SELECT schemaname,tablename,attname,n_distinct,correlation
FROM pg_stats WHERE schemaname = 'public'
ORDER BY tablename, attname;
"
```

### Migration Management

```bash
# Generate migration
cd apps/api
pnpm prisma migrate dev --name description-of-changes

# Apply migrations (production)
docker compose exec api pnpm prisma migrate deploy

# Reset migrations (development only!)
pnpm prisma migrate reset
```

## Smart Contract Deployment

### Prerequisites

```bash
# Install Foundry
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

### Development Deployment (Kairos Testnet)

```bash
cd contracts

# Set environment variables
export PRIVATE_KEY=your-private-key
export RPC_URL=https://public-en-kairos.node.kaia.io

# Deploy contracts
forge script script/DeployContracts.s.sol:DeployContracts --rpc-url $RPC_URL --private-key $PRIVATE_KEY --broadcast

# Update environment with deployed addresses
# Copy contract addresses from deployment output to .env file
```

### Production Deployment (Kaia Mainnet)

```bash
cd contracts

# Set production environment
export PRIVATE_KEY=your-production-private-key
export RPC_URL=https://public-en.node.kaia.io

# Deploy with verification
forge script script/DeployContracts.s.sol:DeployContracts --rpc-url $RPC_URL --private-key $PRIVATE_KEY --broadcast --verify

# Update production environment
# Update .env.production with actual contract addresses
```

### Contract Integration

After deployment, update environment variables:

```bash
# Update .env file
HACKATHON_REGISTRY_ADDRESS=0x... # Deployed contract address
PRIZE_POOL_ADDRESS=0x...         # Deployed contract address

# Update frontend environment
NEXT_PUBLIC_HACKATHON_REGISTRY_ADDRESS=0x...
NEXT_PUBLIC_PRIZE_POOL_ADDRESS=0x...
```

## Monitoring and Health Checks

### Built-in Health Endpoints

- **Database Health:** `GET /health/database`
- **Web3 Health:** `GET /health/web3`
- **General Health:** `GET /health`

### Monitoring Commands

```bash
# Service status
./deploy.sh development status
./deploy.sh production status

# Real-time logs
docker compose logs -f api web

# Resource usage
docker stats

# Container inspection
docker compose exec api ps aux
docker compose exec api df -h
```

### Production Monitoring

Consider integrating with monitoring solutions:

- **Application Monitoring:** New Relic, DataDog
- **Log Management:** ELK Stack, Fluentd
- **Uptime Monitoring:** Pingdom, UptimeRobot
- **Error Tracking:** Sentry

## Troubleshooting

### Common Issues

#### Port Already in Use

```bash
# Check which process is using the port
lsof -i :3000
lsof -i :3001

# Kill the process or change ports in .env
```

#### Database Connection Issues

```bash
# Check database status
docker compose exec db pg_isready -U postgres

# Reset database connection
docker compose restart db api

# Check database logs
docker compose logs db
```

#### Memory Issues

```bash
# Check container memory usage
docker stats

# Increase Docker memory limits (Docker Desktop)
# Settings > Resources > Memory > Increase allocation
```

#### Build Failures

```bash
# Clean Docker cache
docker system prune -a -f

# Rebuild without cache
docker compose build --no-cache

# Check for missing dependencies
docker compose exec api pnpm install
docker compose exec web pnpm install
```

#### SSL/TLS Issues (Production)

```bash
# Check certificate status
openssl s_client -connect your-domain.com:443

# Renew Let's Encrypt certificates (if using)
docker compose exec nginx certbot renew
```

### Debug Mode

Enable debug mode for troubleshooting:

```bash
# Set debug environment
export DEBUG=*
export LOG_LEVEL=debug

# Restart with debug
docker compose up --build -d
```

### Support

For additional support:

1. Check the GitHub Issues page
2. Review application logs: `docker compose logs`
3. Verify environment configuration
4. Test with minimal configuration first

### Performance Optimization

#### Production Optimizations

```bash
# Enable production optimizations in .env
NODE_ENV=production
HELMET_ENABLE=true

# Database optimizations
# Consider connection pooling, read replicas for high traffic
```

#### Scaling

```bash
# Horizontal scaling
docker compose up --scale api=3 --scale web=2 -d

# Load balancer configuration (nginx/traefik)
# Configure reverse proxy for multiple instances
```

---

## Quick Reference

### Essential Commands

```bash
# Development
./deploy.sh development          # Full development deploy
./deploy.sh development cleanup  # Cleanup development

# Production
./deploy.sh production          # Full production deploy
./deploy.sh production status   # Check status

# Database
docker compose exec api pnpm prisma studio       # Database UI
docker compose exec api pnpm prisma migrate dev  # Run migrations

# Logs
docker compose logs -f api  # Follow API logs
docker compose logs -f web  # Follow Web logs
```

This deployment guide should cover most scenarios for deploying HackaFi. Remember to always test deployments in a staging environment before going to production.
