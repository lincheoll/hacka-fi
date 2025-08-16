# Hacka-Fi API Backend

A NestJS-based backend API for the Hacka-Fi hackathon platform with blockchain integration and wallet-based authentication.

## 🏗️ Architecture Overview

This API provides:

- **Wallet Signature Authentication**: Secure authentication using wallet signatures on Kaia blockchain
- **RESTful APIs**: CRUD operations for hackathons, users, and voting
- **Smart Contract Integration**: Read/write operations with HackathonRegistry and PrizePool contracts
- **Database Management**: Prisma ORM with SQLite (dev) / PostgreSQL (prod) support
- **API Documentation**: Auto-generated Swagger/OpenAPI documentation

## 🚀 Quick Start

### Prerequisites

- Node.js 22+ and pnpm
- SQLite (development) or PostgreSQL (production)
- Access to Kaia blockchain RPC (testnet or mainnet)

### Installation

```bash
# Install dependencies
pnpm install

# Generate Prisma client types
pnpm prisma generate

# Run database migrations
pnpm prisma db push

# Start development server
pnpm run start:dev
```

### Environment Configuration

Create `.env` file in the project root:

```env
# Database Configuration
DATABASE_URL="file:./dev.db"           # SQLite for development
DATABASE_PROVIDER="sqlite"             # or "postgresql" for production

# Blockchain Configuration
RPC_URL="https://rpc.ankr.com/kaia_testnet"
CHAIN_ID=1001                          # 1001 for testnet, 8217 for mainnet
HACKATHON_REGISTRY_ADDRESS="0x..."     # Deployed contract address
PRIZE_POOL_ADDRESS="0x..."             # Deployed contract address
PRIVATE_KEY="0x..."                    # Optional: for write operations

# JWT Configuration
JWT_SECRET="your-secret-key"
JWT_EXPIRES_IN="7d"

# Server Configuration
PORT=3004
```

## 📁 Project Structure

```
src/
├── common/                    # Shared utilities and decorators
│   ├── decorators/           # Custom decorators (@Public, etc.)
│   ├── filters/              # Exception filters
│   ├── guards/               # Auth guards
│   └── pipes/                # Validation pipes
├── config/                   # Configuration modules
│   └── app.config.ts         # Environment validation
├── modules/                  # Feature modules
│   ├── auth/                 # Wallet signature authentication
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── jwt.strategy.ts
│   │   └── dto/              # Auth DTOs
│   ├── hackathon/            # Hackathon management
│   │   ├── hackathon.controller.ts
│   │   ├── hackathon.service.ts
│   │   └── dto/              # Hackathon DTOs
│   ├── user/                 # User profile management
│   ├── voting/               # Voting and judging
│   └── web3/                 # Blockchain integration
│       ├── web3.service.ts           # Core Web3 service
│       ├── hackathon-contract.service.ts
│       ├── prize-pool-contract.service.ts
│       ├── contract-test.controller.ts
│       └── contracts/        # Smart contract interfaces
│           ├── HackathonRegistry.json
│           ├── PrizePool.json
│           ├── types.ts      # TypeScript interfaces
│           └── index.ts      # ABI exports
└── prisma/                   # Database schema and migrations
    └── schema.prisma
```

## 🔧 Smart Contract Integration

### ABI Setup

Smart contract ABIs are located in `src/modules/web3/contracts/`:

1. **Source**: ABIs are copied from the `contracts/` directory after compilation with Foundry
2. **Location**:
   - `HackathonRegistry.json` - Main hackathon management contract
   - `PrizePool.json` - Prize distribution contract
3. **Types**: TypeScript interfaces are auto-generated in `types.ts`

### Contract Services

- **HackathonContractService**: Read/write operations for hackathon management
  - Create hackathons, register participants, cast votes
  - Query hackathon info, participants, leaderboards
- **PrizePoolContractService**: Prize pool management
  - Create and fund prize pools, distribute prizes
  - Query prize distributions and balances

### Important Notes

⚠️ **Write Operations**: Require `PRIVATE_KEY` in environment variables
⚠️ **Chain Configuration**: Use `CHAIN_ID` (not URL parsing) for network selection
⚠️ **viem v2 Compatibility**: All contract calls include `chain` and `account` parameters

## 💾 Database Management

### Prisma Setup

```bash
# Generate TypeScript types from schema
pnpm prisma generate

# Apply schema changes to database
pnpm prisma db push

# View database in browser
pnpm prisma studio

# Reset database (development only)
pnpm prisma db push --force-reset
```

### Database Switching

The application supports both SQLite and PostgreSQL:

```env
# SQLite (Development)
DATABASE_URL="file:./dev.db"
DATABASE_PROVIDER="sqlite"

# PostgreSQL (Production)
DATABASE_URL="postgresql://user:password@localhost:5432/hacka_fi"
DATABASE_PROVIDER="postgresql"
```

### Schema Updates

After modifying `prisma/schema.prisma`:

1. Run `pnpm prisma generate` to update TypeScript types
2. Run `pnpm prisma db push` to apply changes to database
3. Restart the development server to load new types

## 🔐 Authentication System

### Wallet Signature Authentication

The API uses wallet signatures for secure authentication:

1. **Login Flow**:

   ```
   POST /auth/login
   {
     "walletAddress": "0x...",
     "signature": "0x...",
     "message": "Login to Hacka-Fi"
   }
   ```

2. **Signature Verification**: Uses viem's `verifyMessage` with Kaia network support

3. **JWT Token**: Returns JWT token for subsequent requests

4. **Protected Routes**: Use `@UseGuards(JwtAuthGuard)` or mark public with `@Public()`

### Testing Authentication

```bash
# Health check (public)
curl http://localhost:3004/auth/health

# Profile (requires authentication)
curl -H "Authorization: Bearer <jwt-token>" http://localhost:3004/auth/profile
```

## 📚 API Documentation

### Swagger Documentation

Available at: `http://localhost:3004/api/docs`

### Key Endpoints

#### Authentication

- `POST /auth/login` - Wallet signature login
- `GET /auth/profile` - Get user profile
- `GET /auth/health` - Health check

#### Hackathons

- `POST /hackathons` - Create hackathon
- `GET /hackathons` - List hackathons
- `GET /hackathons/:id` - Get hackathon details
- `POST /hackathons/:id/participate` - Register for hackathon

#### Contract Testing

- `GET /contracts/hackathon/current-id` - Get current hackathon ID
- `GET /contracts/hackathon/:id/info` - Get hackathon from contract
- `GET /contracts/hackathon/:id/participants` - Get participants
- `GET /contracts/prize-pool/:id` - Get prize pool info

#### Health Checks

- `GET /health/database` - Database connectivity
- `GET /health/web3` - Blockchain connectivity

## 🧪 Development & Testing

### Running the Application

```bash
# Development with hot reload
pnpm run start:dev

# Production build
pnpm run build
pnpm run start:prod

# Type checking
pnpm run type-check
```

### Testing

```bash
# Unit tests
pnpm run test

# E2E tests
pnpm run test:e2e

# Test coverage
pnpm run test:cov
```

### Debugging

1. **TypeScript Errors**: Ensure `pnpm prisma generate` has been run
2. **Database Connection**: Check `DATABASE_URL` and `DATABASE_PROVIDER`
3. **Blockchain Connection**: Verify `RPC_URL` and `CHAIN_ID`
4. **Contract Calls**: Ensure `PRIVATE_KEY` is set for write operations

## 🔧 Configuration Management

### Environment Variables

All configuration is validated using Joi schemas in `src/config/app.config.ts`:

- **Required**: `RPC_URL`, `CHAIN_ID`, `JWT_SECRET`
- **Optional**: `PRIVATE_KEY` (only needed for write operations)
- **Database**: Auto-detected based on `DATABASE_URL` if `DATABASE_PROVIDER` not set

### Validation

The application will fail to start if required environment variables are missing or invalid.

## 🚨 Production Considerations

### Security

- Use strong `JWT_SECRET` (32+ characters)
- Set `PRIVATE_KEY` only when write operations are needed
- Configure CORS for frontend domain only
- Use HTTPS in production

### Performance

- Use PostgreSQL for production database
- Configure database connection pooling
- Set appropriate JWT expiration times
- Monitor RPC usage and rate limits

### Deployment

- Set `NODE_ENV=production`
- Use process manager (PM2, Docker, etc.)
- Configure log aggregation
- Set up health check monitoring
