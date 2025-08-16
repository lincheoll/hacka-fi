# 🔌 Frontend Integration Guide

This document explains how to integrate Hacka-Fi smart contracts with your frontend.

## 📋 Overview

What we currently have:
- ✅ **Locally deployed contracts** (Anvil network)
- ✅ **ABI files** (in JSON format in the `abi/` folder)
- ✅ **Integration tests completed** (all functionality verified)
- ✅ **Deployment scripts** (ready for actual network deployment)

## 🚀 Frontend Integration Methods

### 1. **Local Development Environment Integration**

#### **Option A: Anvil (Recommended) - Fully Local Environment**
```bash
# Terminal 1: Run local blockchain
anvil

# Terminal 2: Deploy contracts
forge script script/DeployContracts.s.sol --rpc-url http://localhost:8545 --broadcast

# Use these output addresses in your frontend
# HackathonRegistry: 0x7FA9385bE102ac3EAc297483Dd6233D62b3e1496
# PrizePool: 0x34A1D3fff3958843C43aD80F30b94c510645C316
```

**Advantages:**
- 💨 Fast transactions (instant confirmation)
- 💰 Free (no gas costs)
- 🔄 Full control (time, block manipulation, etc.)
- 🧪 Freedom to create test data

#### **Option B: Kaia Testnet**
```bash
# Deploy to Kaia Kairos testnet
forge script script/DeployContracts.s.sol \
  --rpc-url https://rpc.ankr.com/kaia_testnet \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --legacy
```

**Advantages:**
- 🌐 Real network environment
- 🔗 Public accessibility
- 📱 Mobile wallet integration testing

### 2. **Frontend Configuration**

#### **Next.js + wagmi + viem Example**
```typescript
// config/contracts.ts
export const contracts = {
  hackathonRegistry: {
    address: '0x7FA9385bE102ac3EAc297483Dd6233D62b3e1496' as `0x${string}`,
    abi: hackathonRegistryABI, // Import from ABI file
  },
  prizePool: {
    address: '0x34A1D3fff3958843C43aD80F30b94c510645C316' as `0x${string}`,
    abi: prizePoolABI,
  },
} as const;

// config/wagmi.ts
import { http, createConfig } from 'wagmi'
import { foundry, kaia } from 'wagmi/chains'

export const config = createConfig({
  chains: [foundry, kaia], // For development/testing
  transports: {
    [foundry.id]: http('http://localhost:8545'),
    [kaia.id]: http('https://rpc.ankr.com/kaia_testnet'),
  },
})
```

#### **Contract Function Call Examples**
```typescript
// Create hackathon
import { useWriteContract } from 'wagmi'
import { contracts } from '@/config/contracts'

export function CreateHackathonForm() {
  const { writeContract } = useWriteContract()
  
  const createHackathon = async () => {
    const registrationDeadline = Math.floor(Date.now() / 1000) + 86400 // 1 day later
    const submissionDeadline = registrationDeadline + 604800 // 7 days later
    const votingDeadline = submissionDeadline + 604800 // 7 days later
    
    writeContract({
      ...contracts.hackathonRegistry,
      functionName: 'createHackathon',
      args: [
        'Amazing Hackathon',
        'Build the future!',
        BigInt(registrationDeadline),
        BigInt(submissionDeadline),
        BigInt(votingDeadline)
      ],
    })
  }
  
  return <button onClick={createHackathon}>Create Hackathon</button>
}

// Fetch hackathon information
import { useReadContract } from 'wagmi'

export function HackathonInfo({ hackathonId }: { hackathonId: bigint }) {
  const { data: hackathonInfo } = useReadContract({
    ...contracts.hackathonRegistry,
    functionName: 'getHackathonInfo',
    args: [hackathonId],
  })
  
  if (!hackathonInfo) return <div>Loading...</div>
  
  const [title, description, organizer, regDeadline, subDeadline, voteDeadline, status] = hackathonInfo
  
  return (
    <div>
      <h2>{title}</h2>
      <p>{description}</p>
      <p>Organizer: {organizer}</p>
      <p>Status: {status}</p>
    </div>
  )
}

// Create prize pool
export function CreatePrizePool({ hackathonId }: { hackathonId: bigint }) {
  const { writeContract } = useWriteContract()
  
  const createPrizePool = () => {
    writeContract({
      ...contracts.prizePool,
      functionName: 'createPrizePool',
      args: [hackathonId],
      value: parseEther('1'), // 1 ETH prize
    })
  }
  
  return <button onClick={createPrizePool}>Create 1 ETH Prize Pool</button>
}
```

### 3. **Using ABI Files**

#### **ABI File Import**
```typescript
// types/contracts.ts
import HackathonRegistryABI from '../contracts/abi/HackathonRegistry.json'
import PrizePoolABI from '../contracts/abi/PrizePool.json'

export const hackathonRegistryABI = HackathonRegistryABI as const
export const prizePoolABI = PrizePoolABI as const

// Create types for type safety (optional)
export type HackathonRegistryABI = typeof hackathonRegistryABI
export type PrizePoolABI = typeof prizePoolABI
```

### 4. **Development Workflow**

#### **Typical Development Process**
```bash
# 1. Start local blockchain
anvil

# 2. Deploy contracts (new terminal)
forge script script/DeployContracts.s.sol --rpc-url http://localhost:8545 --broadcast

# 3. Copy contract addresses to frontend config

# 4. Start frontend development server
npm run dev

# 5. Add local network to MetaMask
# - Network Name: Anvil Local
# - RPC URL: http://localhost:8545
# - Chain ID: 31337
# - Currency Symbol: ETH

# 6. Import test account (use private key provided by Anvil)
```

#### **Quick Test Data Generation**
```bash
# Generate sample data using integration test script
export HACKATHON_REGISTRY_ADDRESS="0x7FA9385bE102ac3EAc297483Dd6233D62b3e1496"
export PRIZE_POOL_ADDRESS="0x34A1D3fff3958843C43aD80F30b94c510645C316"

forge script script/SetupIntegration.s.sol \
  --rpc-url http://localhost:8545 \
  --broadcast
```

### 5. **Considerations for Production Network Deployment**

#### **Environment Configuration Management**
```typescript
// config/networks.ts
const networks = {
  development: {
    chainId: 31337,
    rpcUrl: 'http://localhost:8545',
    contracts: {
      hackathonRegistry: '0x7FA9385bE102ac3EAc297483Dd6233D62b3e1496',
      prizePool: '0x34A1D3fff3958843C43aD80F30b94c510645C316',
    }
  },
  testnet: {
    chainId: 1001, // Kaia Kairos
    rpcUrl: 'https://rpc.ankr.com/kaia_testnet',
    contracts: {
      hackathonRegistry: process.env.NEXT_PUBLIC_HACKATHON_REGISTRY_TESTNET,
      prizePool: process.env.NEXT_PUBLIC_PRIZE_POOL_TESTNET,
    }
  },
  mainnet: {
    chainId: 8217, // Kaia Cypress
    rpcUrl: 'https://rpc.ankr.com/kaia',
    contracts: {
      hackathonRegistry: process.env.NEXT_PUBLIC_HACKATHON_REGISTRY_MAINNET,
      prizePool: process.env.NEXT_PUBLIC_PRIZE_POOL_MAINNET,
    }
  }
}

export const getCurrentNetwork = () => {
  const env = process.env.NODE_ENV
  if (env === 'development') return networks.development
  if (env === 'production') return networks.mainnet
  return networks.testnet
}
```

## 🔄 Current Status Summary

### **What We Can Do Right Now:**

1. **✅ Local Development**
   - Run local blockchain with Anvil
   - Deploy and test contracts
   - Work on frontend integration

2. **✅ Use ABIs**
   - Use `abi/HackathonRegistry.json` file
   - Use `abi/PrizePool.json` file
   - Ensure TypeScript type safety

3. **✅ Full Feature Testing**
   - Complete process from hackathon creation to prize distribution
   - All 32 test cases passing
   - Real business logic verified

### **What We Can Do When Needed:**

1. **🔄 Kaia Testnet Deployment**
   - Ready to deploy with a single command
   - Test on public network

2. **🚀 Mainnet Deployment**
   - All preparations complete
   - Deployment scripts verified

## 💡 Recommendations

**Best Current Approach for Starting Frontend Development:**

1. **Use local environment** (Anvil + deployed contracts)
2. **Type-safe integration using ABI files**
3. **Move to testnet after implementing basic features**

This approach allows for fast and stable frontend development!

---

## 🔗 Related Resources

- [wagmi Documentation](https://wagmi.sh/)
- [viem Documentation](https://viem.sh/)
- [Foundry Book - Anvil](https://book.getfoundry.sh/anvil/)
- [Kaia Developer Docs](https://docs.kaia.io/)