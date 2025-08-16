# Claude Code Instructions

## Task Master AI Instructions

**Import Task Master's development workflow commands and guidelines, treat as if import is in the main CLAUDE.md file.**
@./.taskmaster/CLAUDE.md

## Project Development Rules

### Tech Stack & Architecture

- **Monorepo**: Turborepo + pnpm workspaces
- **Backend**: NestJS 10+ + Prisma 5+ + TypeScript 5+
- **Frontend**: Next.js 14+ (App Router) + TypeScript 5+ + wagmi v2 + viem
- **Smart Contracts**: Solidity 0.8.20+ + Foundry
- **Database**: SQLite (development) / PostgreSQL 15+ (production) - selected via environment variables
- **Infrastructure**: Docker Compose

### Code Standards

#### TypeScript Rules

- Use strict TypeScript in all files
- No `any` type allowed, explicit type definitions required
- Prefer Interfaces, use types only when necessary
- Prefer const assertions over Enums

#### Naming Conventions

- File names: kebab-case (e.g., `user-profile.service.ts`)
- Classes/Interfaces: PascalCase (e.g., `UserService`, `IUserRepository`)
- Variables/Functions: camelCase (e.g., `getUserProfile`)
- Constants: SCREAMING_SNAKE_CASE (e.g., `MAX_PARTICIPANTS`)
- Environment variables: SCREAMING_SNAKE_CASE (e.g., `DATABASE_URL`)

#### NestJS 11+ Backend Rules

- **Module Structure**: Feature Module pattern, utilize DI container
- **DTO/Validation**: class-validator + class-transformer required
- **API Documentation**: Swagger/OpenAPI 3.0 auto-generation
- **Error Handling**: Global Exception Filter + Custom Exceptions
- **Configuration**: @nestjs/config + Joi validation
- **Database**: Prisma 5+ ORM + Repository pattern
- **Authentication/Authorization**: Passport.js + JWT + Guards
- **Logging**: Built-in Logger + structured logs

#### Next.js 15+ Frontend Rules

- **App Router**: `/app` directory structure required (pages router prohibited)
- **Server Components**: Use Server Components by default, explicitly mark Client with 'use client'
- **TypeScript**: React 18+ FC types, distinguish Server/Client component types
- **State Management**: Zustand v4+ (Redux prohibited)
- **Data Fetching**: TanStack Query v5 + fetch (axios prohibited)
- **CSS**: Tailwind CSS v3+ + CSS Variables
- **Fonts/Images**: Use Next.js built-in optimizations (next/font, next/image)

#### UI Library Restrictions

- **Allowed UI Libraries**: Radix UI (primitives) + shadcn/ui ONLY
- **Prohibited Libraries**: Material-UI, Ant Design, Chakra UI, Mantine etc.
- Use latest versions for all dependencies (when no compatibility issues)
- shadcn/ui components must be customized per project

#### Web3 Integration Rules

- Use wagmi v2 + viem combination
- ethers.js prohibited
- Error handling required for all contract calls
- Wallet connection state managed globally
- RPC calls configured per environment

### File Structure

#### Monorepo Structure

```
/apps
  /web (Next.js)
  /api (NestJS)
/contracts (Foundry)
/packages (shared)
```

#### Next.js 14+ App Structure (Latest Architecture)

```
/apps/web
├── /app                          # App Router (Next.js 14+)
│   ├── globals.css              # Global styles + CSS variables
│   ├── layout.tsx               # Root layout (Server Component)
│   ├── page.tsx                 # Home page (Server Component)
│   ├── loading.tsx              # Global loading UI
│   ├── error.tsx                # Global error UI
│   ├── not-found.tsx            # 404 page
│   ├── /(auth)                  # Route groups
│   │   ├── /login
│   │   │   ├── page.tsx         # Login page
│   │   │   └── layout.tsx       # Auth layout
│   │   └── /register
│   ├── /hackathons              # Feature routes
│   │   ├── page.tsx             # Hackathons list
│   │   ├── loading.tsx          # Loading for this route
│   │   ├── /[id]
│   │   │   ├── page.tsx         # Hackathon detail
│   │   │   └── /edit
│   │   └── /create
│   ├── /profile
│   │   ├── /[address]           # Dynamic user profile
│   │   └── /me                  # Own profile
│   └── /api                     # API routes (if needed)
├── /components                   # Reusable components
│   ├── /ui                      # shadcn/ui base components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── form.tsx
│   │   └── index.ts             # Barrel exports
│   ├── /providers              # Context providers
│   │   ├── web3-provider.tsx
│   │   ├── query-provider.tsx
│   │   └── theme-provider.tsx
│   ├── /features               # Feature modules
│   │   ├── /hackathon
│   │   │   ├── hackathon-card.tsx
│   │   │   ├── hackathon-form.tsx
│   │   │   ├── hackathon-list.tsx
│   │   │   └── index.ts
│   │   ├── /voting
│   │   ├── /profile
│   │   └── /dashboard
│   ├── /layout                 # Layout components
│   │   ├── header.tsx
│   │   ├── footer.tsx
│   │   ├── sidebar.tsx
│   │   └── navigation.tsx
│   └── /common                 # Shared components
│       ├── loading-spinner.tsx
│       ├── error-boundary.tsx
│       └── wallet-connect.tsx
├── /lib                        # Utilities & configurations
│   ├── utils.ts                # cn() function + utilities
│   ├── validations.ts          # Zod schemas
│   ├── constants.ts            # App constants
│   ├── web3.ts                 # Web3 config
│   ├── api.ts                  # API client setup
│   └── fonts.ts                # Font configurations
├── /hooks                      # Custom React hooks
│   ├── use-web3.ts
│   ├── use-local-storage.ts
│   └── use-hackathon.ts
├── /store                      # Zustand stores
│   ├── auth.ts
│   ├── web3.ts
│   └── hackathon.ts
├── /types                      # TypeScript definitions
│   ├── api.ts
│   ├── web3.ts
│   └── global.ts
└── /styles                     # Style configurations
    └── globals.css             # Tailwind + custom styles
```

#### NestJS 10+ Backend Structure

```
/apps/api
├── /src
│   ├── main.ts                 # Bootstrap application
│   ├── app.module.ts           # Root module
│   ├── /common                 # Shared utilities
│   │   ├── /decorators
│   │   ├── /filters            # Exception filters
│   │   ├── /guards            # Auth guards
│   │   ├── /interceptors      # Response interceptors
│   │   ├── /pipes             # Validation pipes
│   │   └── /types             # Shared types
│   ├── /config                # Configuration
│   │   ├── database.config.ts
│   │   ├── jwt.config.ts
│   │   └── app.config.ts
│   └── /modules               # Feature modules
│       ├── /auth
│       │   ├── auth.module.ts
│       │   ├── auth.service.ts
│       │   ├── auth.controller.ts
│       │   ├── /dto
│       │   ├── /guards
│       │   └── /strategies
│       ├── /hackathon
│       ├── /voting
│       ├── /user
│       └── /web3
├── /prisma
│   ├── schema.prisma
│   ├── /migrations
│   └── seed.ts
├── /test                      # E2E tests
└── /dist                      # Compiled output
```

#### Component Organization Principles

1. **Feature-Based Grouping**: Group components by functionality
2. **Atomic Design Pattern**: UI > Forms > Features > Layouts order
3. **Barrel Exports**: Organize exports in index.ts for each folder
4. **Co-location**: Related files placed in same folder
5. **Single Responsibility**: Each component has one responsibility

#### Component Design Patterns

- **Compound Components**: Complex UIs composed of multiple sub-components
- **Render Props / Children Pattern**: Flexible component composition
- **Custom Hooks**: Separate logic from UI
- **Props Interface**: All props defined with TypeScript interfaces
- **Forwarded Refs**: Use forwardRef for components needing DOM access

#### Dependency Management

- **Latest Versions**: Prioritize latest versions when no compatibility issues
- **Peer Dependencies**: Check version compatibility with shadcn/ui and Radix UI
- **No Legacy**: No use of legacy libraries
- **Security Updates**: Immediate updates for security vulnerabilities

### Database & ORM Rules

- Define all models in Prisma schema file
- created_at, updated_at fields required for all tables
- Explicitly define Foreign Keys
- Manually create and review migrations
- Manage seed data in separate scripts

### Error Handling

- Backend: NestJS Exception Filter + standard HTTP status codes
- Frontend: Error Boundary + Toast notifications
- Web3: User-friendly error message conversion
- try-catch required for all async functions

### Testing Strategy

- Unit Test: Jest + 80%+ coverage per feature
- Integration Test: Supertest (Backend), Playwright (Frontend)
- Smart Contract: Foundry forge test
- E2E: Test only major user flows

### Environment Management

- Manage all configuration values as environment variables
- Must provide `.env.example` file
- Never commit sensitive information
- Separate development/test/production environments

### Git & Deployment Rules

- Use conventional commits: `feat:`, `fix:`, `docs:`, etc.
- Protected main branch, PRs required
- Standardize local environment with Docker Compose
- Platform selection via environment variables for deployment

### Performance Rules

- Use Next.js Image component for all images
- Include appropriate caching headers in API responses
- Optimize database queries (prevent N+1 problems)
- Monitor bundle size

### Security Rules

- Validate all API inputs (class-validator)
- Prevent SQL Injection (using Prisma ORM)
- Prevent XSS (sanitization)
- Authenticate with wallet signature verification
- No logging of sensitive data
