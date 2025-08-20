# Multi-stage build for NestJS API
FROM node:20-alpine AS base

# Install dependencies for building
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install pnpm
RUN corepack enable pnpm

# Copy root package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY packages/ packages/

# Copy API package files
COPY apps/api/package.json ./apps/api/
COPY apps/api/prisma/ ./apps/api/prisma/

# Development stage
FROM base AS development

# Install all dependencies (including dev dependencies)
RUN pnpm install --frozen-lockfile

# Copy source code
COPY apps/api/ ./apps/api/

# Generate Prisma client
RUN cd apps/api && pnpm prisma generate

# Expose port
EXPOSE 3001

# Default command for development
CMD ["pnpm", "--filter", "api", "run", "dev"]

# Build stage
FROM base AS builder

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY apps/api/ ./apps/api/

# Generate Prisma client
RUN cd apps/api && pnpm prisma generate

# Build the application
RUN pnpm --filter api run build

# Production stage
FROM node:20-alpine AS production

RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install pnpm
RUN corepack enable pnpm

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs

# Copy root package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY packages/ packages/
COPY apps/api/package.json ./apps/api/

# Install only production dependencies
RUN pnpm install --prod --frozen-lockfile

# Copy built application
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/dist ./apps/api/dist
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder --chown=nestjs:nodejs /app/node_modules/.pnpm ./node_modules/.pnpm
COPY --from=builder --chown=nestjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma

# Generate Prisma client for production
RUN cd apps/api && pnpm prisma generate

# Create uploads directory
RUN mkdir -p ./apps/api/uploads && chown nestjs:nodejs ./apps/api/uploads

# Switch to non-root user
USER nestjs

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node apps/api/dist/health-check.js || exit 1

# Set environment
ENV NODE_ENV=production

# Start the application
CMD ["node", "apps/api/dist/main"]