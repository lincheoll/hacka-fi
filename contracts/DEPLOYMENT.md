# 🚀 Hacka-Fi Smart Contract Deployment Guide

This guide explains how to deploy Hacka-Fi smart contracts to the Kaia network.

## 📋 Prerequisites

### 1. Development Environment
- **Install Foundry**: `curl -L https://foundry.paradigm.xyz | bash && foundryup`
- **Node.js**: v18 or higher
- **Git**: Latest version

### 2. Wallet Setup
- Deployment wallet address and private key
- Testnet: Kaia Kairos testnet KAIA
- Mainnet: Kaia Cypress mainnet KAIA

### 3. RPC Endpoints
- **Mainnet**: `https://rpc.ankr.com/kaia`
- **Testnet**: `https://rpc.ankr.com/kaia_testnet`

## ⚙️ Environment Setup

### 1. Setting Environment Variables
```bash
# Create .env file
cp .env.example .env

# Edit environment variables
vim .env
```

### 2. Required Environment Variables
```env
PRIVATE_KEY=your_private_key_here
DEPLOYER_ADDRESS=your_deployer_address_here
KAIA_MAINNET_RPC=https://rpc.ankr.com/kaia
KAIA_TESTNET_RPC=https://rpc.ankr.com/kaia_testnet
```

## 🔧 Deployment Process

### 1. Local Testing
```bash
# Verify compilation
forge build

# Run tests
forge test

# Check gas report
forge test --gas-report
```

### 2. Kaia Testnet Deployment

#### **Kaia Kairos Testnet Information**
- **Network Name**: Kaia Kairos
- **Chain ID**: 1001
- **RPC URL**: `https://rpc.ankr.com/kaia_testnet`
- **Explorer**: https://kairos.kaiascan.io/ko
- **Faucet**: https://kairos.wallet.kaia.io/faucet

#### **Getting KAIA Test Tokens**
1. Visit https://kairos.wallet.kaia.io/faucet
2. Enter wallet address
3. Receive 5 KAIA (sufficient for deployment)

#### **Deployment Commands**
```bash
# 1. Set environment variables
export PRIVATE_KEY="your_private_key_here"
export KAIA_TESTNET_RPC="https://rpc.ankr.com/kaia_testnet"

# 2. Check network connection
cast block latest --rpc-url $KAIA_TESTNET_RPC

# 3. Check balance
cast balance $DEPLOYER_ADDRESS --rpc-url $KAIA_TESTNET_RPC

# 4. Execute deployment (--legacy flag required for Kaia)
forge script script/DeployContracts.s.sol \
  --rpc-url $KAIA_TESTNET_RPC \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --verify \
  --legacy \
  --gas-price 25000000000

# 5. Verify deployment results
# Store deployed contract addresses in environment variables
export HACKATHON_REGISTRY_ADDRESS="deployed_address_here"
export PRIZE_POOL_ADDRESS="deployed_address_here"
```

#### **Common Deployment Error Solutions**
```bash
# Error: "transaction type not supported"
# Solution: Add --legacy flag

# Error: "insufficient funds"  
# Solution: Get KAIA from faucet above

# Error: "gas price too low"
# Solution: Add --gas-price 25000000000

# Error: "nonce too low"
# Solution: Check with cast nonce $DEPLOYER_ADDRESS --rpc-url $KAIA_TESTNET_RPC
```

### 3. Run Integration Tests
```bash
# Set deployed addresses in environment variables
export HACKATHON_REGISTRY_ADDRESS=deployed_registry_address
export PRIZE_POOL_ADDRESS=deployed_prizepool_address

# Run integration tests
forge script script/SetupIntegration.s.sol \
  --rpc-url $KAIA_TESTNET_RPC \
  --private-key $PRIVATE_KEY \
  --broadcast
```

### 4. Mainnet Deployment
```bash
# Deploy to mainnet after final testing
forge script script/DeployContracts.s.sol \
  --rpc-url $KAIA_MAINNET_RPC \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --verify
```

## 📊 Post-Deployment Checklist

### 1. Contract Verification
- [ ] Verify HackathonRegistry deployment
- [ ] Verify PrizePool deployment
- [ ] Verify contract integration
- [ ] Complete verification on block explorer

### 2. Function Testing
```bash
# Basic function tests
forge test --match-contract HackathonRegistryTest
forge test --match-contract PrizePoolTest

# Integration function tests
forge script script/SetupIntegration.s.sol --rpc-url $RPC_URL
```

### 3. Gas Cost Optimization
```bash
# Analyze gas usage
forge test --gas-report

# Retest after optimization
forge build --optimize
```

## 🔗 Deployed Contract Addresses

### Kaia Testnet (Kairos)
- **HackathonRegistry**: `TBD`
- **PrizePool**: `TBD`
- **Explorer**: https://kairos.kaiascan.io/ko

### Kaia Mainnet (Cypress)
- **HackathonRegistry**: `TBD`
- **PrizePool**: `TBD`
- **Explorer**: https://kaiascan.io

## 📖 Usage

### 1. Create Hackathon
```solidity
uint256 hackathonId = hackathonRegistry.createHackathon(
    "Hackathon Title",
    "Hackathon Description",
    registrationDeadline,
    submissionDeadline,
    votingDeadline
);
```

### 2. Create Prize Pool
```solidity
// Create 1 KAIA prize pool
prizePool.createPrizePool{value: 1 ether}(hackathonId);

// Set distribution ratios (60/25/15%)
uint16[] memory percentages = new uint16[](3);
percentages[0] = 6000; // 60%
percentages[1] = 2500; // 25%
percentages[2] = 1500; // 15%
prizePool.setPrizeDistribution(hackathonId, percentages);
```

### 3. Voting and Winner Selection
```solidity
// Start voting phase
hackathonRegistry.startVotingPhase(hackathonId);

// Judge voting (1-10 points)
hackathonRegistry.castVote(hackathonId, participant, 9, "Excellent project!");

// Complete voting and determine winner
hackathonRegistry.completeVoting(hackathonId);
```

### 4. Prize Distribution and Withdrawal
```solidity
// Distribute prizes
prizePool.distributePrizes(hackathonId);

// Winner prize withdrawal
prizePool.withdrawPrize(hackathonId, 1); // Withdraw 1st place prize
```

## 🛠️ Troubleshooting

### Common Issues

#### 1. Deployment Failure
```
Error: insufficient funds for gas * price + value
```
**Solution**: Ensure sufficient KAIA balance in wallet

#### 2. Contract Verification Failure
```
Error: contract verification failed
```
**Solution**: 
- Check API key
- Verify compiler version match
- Use `--verify` flag

#### 3. RPC Connection Error
```
Error: connection failed
```
**Solution**: 
- Check RPC URL
- Verify network connection status
- Use alternative RPC endpoint

### Debugging Commands
```bash
# Output detailed logs
forge script script/DeployContracts.s.sol --rpc-url $RPC_URL -vvvv

# Run simulation only (no deployment)
forge script script/DeployContracts.s.sol --rpc-url $RPC_URL

# Estimate gas
forge script script/DeployContracts.s.sol --rpc-url $RPC_URL --estimate-gas
```

## 📚 Additional Resources

- [Foundry Official Documentation](https://book.getfoundry.sh/)
- [Kaia Developer Documentation](https://docs.kaia.io/)
- [Kaia Block Explorer](https://kaiascan.io/)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/)

## 🤝 Support

If you encounter issues or have questions:
1. Create an issue on GitHub
2. Provide detailed description with logs
3. Include environment information (OS, Foundry version, etc.)

---

**⚠️ Important Notes**
- Thorough testing on testnet is required before mainnet deployment
- Never expose your private key
- Source code verification is recommended after contract deployment