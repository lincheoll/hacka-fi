# HackaFi Setup Scripts

This directory contains step-by-step shell scripts to completely set up the HackaFi project from scratch.

## 📋 Script List

### 🚀 Main Guide

- **`00-setup-guide.sh`** - Complete setup guide (start here!)
  - Interactive menu system
  - Automated quick start
  - Step-by-step guided setup
  - Detailed information and troubleshooting

### 🔧 Setup Scripts (run in order)

1. **`01-system-prerequisites.sh`** - System prerequisites
   - Node.js 20+ (using nvm)
   - pnpm 9.0+
   - Docker & Docker Compose
   - Git installation check
   - Required port verification (3000, 3010, 5432, 6379)

2. **`02-foundry-installation.sh`** - Foundry installation
   - Install forge, cast, anvil, chisel
   - Foundry update and verification
   - Basic functionality testing

3. **`03-project-dependencies.sh`** - Project dependencies installation
   - Project cloning (if needed)
   - pnpm install (all workspaces)
   - Dependency verification

4. **`04-environment-setup.sh`** - Environment setup
   - Create environment files for all workspaces
   - Blockchain network configuration (Kaia Testnet/Mainnet)
   - Generate security secrets (JWT, DB password)
   - Wallet address configuration

5. **`05-database-setup.sh`** - Database setup
   - Generate Prisma client
   - Run database migrations
   - Optional seed data insertion
   - Connection testing

6. **`06-smart-contracts.sh`** - Smart contract setup
   - Compile smart contracts
   - Run tests
   - Deploy to testnet/mainnet
   - Update environment variables with addresses

7. **`07-development-start.sh`** - Development server startup
   - Pre-flight development environment check
   - Start API and Web servers concurrently
   - Perform health checks
   - Provide development tool information

8. **`08-production-setup.sh`** - Production deployment
   - Production environment configuration
   - Build Docker images
   - Deploy with PostgreSQL + Redis
   - Setup monitoring and backup

### 🔨 Legacy Utility Scripts

- **`setup-env.sh`** - Basic environment setup (integrated into script #04)
- **`validate-env.sh`** - Environment validation

## 🚀 Quick Start

### Fully Automated Setup

```bash
# Run main guide (recommended)
./scripts/00-setup-guide.sh

# Or automated quick start
./scripts/00-setup-guide.sh # → Select option 1
```

### Step-by-Step Manual Setup

```bash
# 1. System prerequisites
./scripts/01-system-prerequisites.sh

# 2. Foundry installation
./scripts/02-foundry-installation.sh

# 3. Project dependencies
./scripts/03-project-dependencies.sh

# 4. Environment setup
./scripts/04-environment-setup.sh

# 5. Database setup
./scripts/05-database-setup.sh

# 6. Smart contracts
./scripts/06-smart-contracts.sh

# 7. Development startup
./scripts/07-development-start.sh
```

## 🎯 Usage Scenarios

### 💻 Development Environment Setup

```bash
# First-time setup
./scripts/00-setup-guide.sh  # Select quick start

# Only start development servers (after setup is complete)
./scripts/07-development-start.sh
# or
pnpm dev
```

### 🏭 Production Deployment

```bash
# After development environment setup is complete
./scripts/08-production-setup.sh
```

### 🔧 Individual Component Setup

```bash
# Run specific scripts only
./scripts/05-database-setup.sh  # Reset database only
./scripts/06-smart-contracts.sh  # Redeploy contracts only
```

## 📚 Tech Stack

- **Frontend**: Next.js 15+ + TypeScript + Tailwind CSS + wagmi v2
- **Backend**: NestJS 11+ + Prisma + PostgreSQL/SQLite
- **Smart Contracts**: Solidity + Foundry
- **Infrastructure**: Turborepo + Docker Compose
- **Blockchain**: Kaia Network (Testnet/Mainnet)

## 🔍 Troubleshooting

### Common Issues

1. **Port in use errors**

   ```bash
   lsof -i :3000 -i :3010  # Check processes using ports
   ```

2. **Docker related issues**

   ```bash
   docker info  # Check Docker status
   docker system prune  # Clean up cache
   ```

3. **Permission errors**

   ```bash
   chmod +x scripts/*.sh  # Make all scripts executable
   ```

4. **Dependency installation failures**

   ```bash
   rm -rf node_modules && pnpm install  # Reinstall dependencies
   ```

### Help

All scripts support the `--help` option:

```bash
./scripts/01-system-prerequisites.sh --help
./scripts/02-foundry-installation.sh -h
```

## 📖 Additional Documentation

- **DEPLOYMENT.md** - Detailed deployment guide
- **ENVIRONMENT_VARIABLES.md** - Environment variables setup guide
- **contracts/README.md** - Smart contract development guide

## 🤝 Contributing

When you find script improvements or bugs:

1. Create an issue
2. Suggest improvements
3. Submit a Pull Request

---

**💡 Tip**: Run `./scripts/00-setup-guide.sh` to easily select all options from an interactive menu!
