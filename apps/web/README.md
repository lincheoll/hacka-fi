# Hacka-Fi Frontend

A Next.js 15+ frontend application for the Hacka-Fi blockchain hackathon platform with Web3 integration.

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- pnpm (recommended)
- MetaMask or other Web3 wallet

### Environment Variables

Create a `.env.local` file in the root directory and add the following:

```bash
# WalletConnect Project ID (Required for wallet connection)
# Get your free Project ID at: https://cloud.walletconnect.com
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id_here

# Optional: Custom RPC endpoints
NEXT_PUBLIC_KAIA_MAINNET_RPC=https://public-en-cypress.klaytn.net
NEXT_PUBLIC_KAIA_TESTNET_RPC=https://public-en-baobab.klaytn.net
```

### Installation & Development

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## 🏗️ Architecture

### Tech Stack

- **Framework**: Next.js 15+ with App Router
- **Styling**: Tailwind CSS 4+ with CSS Variables
- **UI Components**: shadcn/ui + Radix UI primitives
- **Web3**: wagmi v2 + viem for Kaia blockchain integration
- **State Management**: Zustand v5
- **Data Fetching**: TanStack Query v5

### Web3 Integration

- **Supported Networks**: Kaia Mainnet, Kaia Testnet (Baobab)
- **Supported Wallets**: MetaMask, WalletConnect v2
- **Smart Contracts**: HackathonRegistry, PrizePool

### Project Structure

```
src/
├── app/                  # Next.js App Router pages
├── components/
│   ├── ui/              # shadcn/ui base components
│   ├── features/        # Feature-specific components
│   ├── layout/          # Layout components
│   ├── common/          # Shared components
│   └── providers/       # Context providers
├── lib/                 # Utilities & configurations
│   ├── utils.ts         # Utility functions
│   ├── web3.ts          # Web3 configuration
│   └── constants.ts     # App constants
├── hooks/               # Custom React hooks
├── store/               # Zustand stores
├── types/               # TypeScript definitions
└── styles/              # Global styles
```

## 🔗 Web3 Setup

### Getting WalletConnect Project ID

1. Visit [WalletConnect Cloud](https://cloud.walletconnect.com)
2. Sign up for a free account
3. Create a new project
4. Copy the Project ID
5. Add it to your `.env.local` file

### Supported Networks

- **Kaia Mainnet** (Chain ID: 8217)
- **Kaia Testnet** (Chain ID: 1001) - Default for development

## 🧪 Development

### Available Scripts

```bash
pnpm dev          # Start development server
pnpm build        # Build for production
pnpm start        # Start production server
pnpm lint         # Run ESLint
pnpm clean        # Clean build artifacts
```

### Component Development

This project uses shadcn/ui components. To add new components:

```bash
npx shadcn-ui@latest add button
npx shadcn-ui@latest add card
```

## 🚨 Troubleshooting

### Common Issues

1. **WalletConnect not working**: Ensure `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` is set
2. **Network connection issues**: Check RPC endpoints in `lib/web3.ts`
3. **Wallet connection fails**: Try refreshing the page and reconnecting

### Web3 Debugging

Check browser console for Web3-related errors. Common issues:

- Unsupported network (switch to Kaia)
- Wallet not installed
- User rejected transaction

## 📚 Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [wagmi Documentation](https://wagmi.sh)
- [Kaia Documentation](https://docs.kaia.io)
- [shadcn/ui Documentation](https://ui.shadcn.com)

## 🚀 Deployment

The application is optimized for deployment on Vercel:

```bash
pnpm build
```

Remember to set environment variables in your deployment platform.
