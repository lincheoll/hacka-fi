# Hacka-Fi

Decentralized hackathon platform on Kaia blockchain with automated prize distribution.

## Tech Stack

- **Frontend**: Next.js 14+ + TypeScript + Tailwind CSS + wagmi v2
- **Backend**: NestJS 11+ + Prisma + PostgreSQL
- **Smart Contracts**: Solidity + Foundry
- **Infrastructure**: Turborepo + Docker Compose

## Quick Start

```bash
# Install dependencies
pnpm install

# Start development
pnpm docker:dev

# Or run locally
pnpm dev
```

## Services

- Frontend: http://localhost:3000
- Backend: http://localhost:3001
- Database: PostgreSQL (Docker)

## Commands

```bash
pnpm dev                    # Start all services
pnpm build                  # Build all apps
pnpm test                   # Run tests
pnpm contracts:build        # Compile contracts
pnpm db:migrate            # Run migrations
```

## Environment

Copy `.env.example` to `.env` and configure your settings.
