# Web3 Chain Configuration Refactoring Guide

## Overview

The Web3 configuration system has been refactored to support dynamic chain selection and flexible testing environments. This document outlines the changes made and how to use the new system.

## Key Improvements

### 1. Dynamic Chain Import System

**Before:**

```typescript
import { klaytn, klaytnBaobab } from "wagmi/chains";
```

**After:**

```typescript
import * as chains from "wagmi/chains";
```

This allows access to all wagmi chains without hardcoding specific ones.

### 2. Environment-Driven Configuration

**Before:** Fixed chain support (only Kaia mainnet/testnet)
**After:** Configurable via environment variables

### 3. Anvil/Local Chain Support

Built-in support for:

- Anvil (chain ID 31337)
- Generic localhost (chain ID 1337)
- Any custom local chain via environment configuration

### 4. Chain-Specific Configuration

Support for per-chain RPC URLs and contract addresses.

## Environment Variables

### Primary Configuration

```bash
# Main chain ID (required)
NEXT_PUBLIC_KAIA_CHAIN_ID=1001

# Additional chains (optional, comma-separated)
NEXT_PUBLIC_ADDITIONAL_CHAIN_IDS=8217,31337
```

### RPC Configuration

```bash
# Generic fallback (used for all chains unless overridden)
NEXT_PUBLIC_RPC_URL=https://public-en-baobab.klaytn.net

# Chain-specific URLs (optional)
NEXT_PUBLIC_RPC_URL_1001=https://public-en-baobab.klaytn.net
NEXT_PUBLIC_RPC_URL_8217=https://public-en-cypress.klaytn.net
NEXT_PUBLIC_RPC_URL_31337=http://127.0.0.1:8545  # Anvil
NEXT_PUBLIC_RPC_URL_1337=http://localhost:8545    # Generic local
```

### Contract Addresses

```bash
# Generic contract addresses (fallback for all chains)
NEXT_PUBLIC_HACKATHON_REGISTRY_ADDRESS=0x1234...
NEXT_PUBLIC_PRIZE_POOL_ADDRESS=0x5678...

# Chain-specific contract addresses (optional)
NEXT_PUBLIC_HACKATHON_REGISTRY_ADDRESS_1001=0xabcd...  # Kaia Testnet
NEXT_PUBLIC_HACKATHON_REGISTRY_ADDRESS_8217=0xefgh...  # Kaia Mainnet
NEXT_PUBLIC_HACKATHON_REGISTRY_ADDRESS_31337=0xijkl... # Anvil
```

## Usage Examples

### 1. Testing with Anvil

```bash
# Start Anvil
anvil

# Configure environment for local testing
NEXT_PUBLIC_KAIA_CHAIN_ID=31337
NEXT_PUBLIC_RPC_URL_31337=http://127.0.0.1:8545
NEXT_PUBLIC_HACKATHON_REGISTRY_ADDRESS_31337=0xYourDeployedContract...
```

### 2. Multi-Chain Support

```bash
# Support both Kaia testnet and mainnet
NEXT_PUBLIC_KAIA_CHAIN_ID=1001
NEXT_PUBLIC_ADDITIONAL_CHAIN_IDS=8217

# Each chain can have different contract addresses
NEXT_PUBLIC_HACKATHON_REGISTRY_ADDRESS_1001=0xTestnetContract...
NEXT_PUBLIC_HACKATHON_REGISTRY_ADDRESS_8217=0xMainnetContract...
```

### 3. Custom Local Chain

```bash
# Custom local chain with specific ID
NEXT_PUBLIC_KAIA_CHAIN_ID=12345
NEXT_PUBLIC_RPC_URL_12345=http://localhost:8546
NEXT_PUBLIC_HACKATHON_REGISTRY_ADDRESS_12345=0xCustomContract...
```

## API Reference

### Core Functions

#### `getChainById(chainId: number): Chain | undefined`

Get chain configuration by ID.

```typescript
const chain = getChainById(31337); // Returns Anvil chain config
```

#### `addCustomChain(chainId: number, chain: Chain): void`

Add custom chain configuration dynamically.

```typescript
addCustomChain(12345, {
  id: 12345,
  name: "Custom Chain",
  // ... chain config
});
```

#### `getContractAddress(chainId: number, contract: string): string | undefined`

Get contract address for specific chain.

```typescript
const registryAddress = getContractAddress(31337, "hackathonRegistry");
```

#### `getNetworkName(chainId: number): string`

Get human-readable network name.

```typescript
const name = getNetworkName(31337); // Returns "Anvil Local"
```

#### `isSupportedChain(chainId: number): boolean`

Check if chain is supported.

```typescript
const isSupported = isSupportedChain(31337); // true if configured
```

### Configuration Objects

#### `CHAIN_CONFIG: Record<number, Chain>`

Maps chain IDs to chain configurations.

#### `SUPPORTED_CHAIN_IDS: number[]`

Array of all supported chain IDs (dynamically generated).

#### `RPC_URLS: Record<number, string>`

Maps chain IDs to RPC URLs.

#### `CONTRACT_ADDRESSES: Record<number, Record<string, string>>`

Maps chain IDs to contract address objects.

## Migration Guide

### For Existing Code

Most existing code should work without changes due to maintained API compatibility:

- `SUPPORTED_CHAIN_IDS` - Still available, now dynamically generated
- `DEFAULT_CHAIN_ID` - Still available, now from environment
- `getContractAddress()` - Same API, improved flexibility
- `isSupportedChain()` - Same API, improved logic
- `getNetworkName()` - Same API, expanded chain support

### For New Features

Use the new capabilities:

```typescript
// Add custom chain support
addCustomChain(99999, customChainConfig);

// Get chain-specific configuration
const chain = getChainById(31337);
const rpcUrl = RPC_URLS[31337];
```

## Testing Scenarios

### 1. Anvil Integration Test

```typescript
// Set up environment for Anvil testing
process.env.NEXT_PUBLIC_KAIA_CHAIN_ID = "31337";
process.env.NEXT_PUBLIC_RPC_URL_31337 = "http://127.0.0.1:8545";

// Deploy contracts to Anvil
// Configure contract addresses
process.env.NEXT_PUBLIC_HACKATHON_REGISTRY_ADDRESS_31337 = deployedAddress;

// Run tests against local chain
```

### 2. Multi-Chain Testing

```typescript
// Test across multiple chains
const chainIds = [1001, 8217, 31337];
chainIds.forEach((chainId) => {
  test(`Chain ${chainId} configuration`, () => {
    expect(isSupportedChain(chainId)).toBe(true);
    expect(getContractAddress(chainId, "hackathonRegistry")).toBeTruthy();
  });
});
```

## Benefits

1. **Flexibility**: Support any chain by ID without code changes
2. **Testing**: Easy integration with Anvil and local chains
3. **Maintainability**: Single source of truth for chain configuration
4. **Scalability**: Add new chains via environment variables only
5. **Backward Compatibility**: Existing code continues to work
6. **Environment Separation**: Different chains for dev/staging/production

## Best Practices

1. **Use chain-specific env vars** for production deployments
2. **Test with Anvil** before mainnet deployment
3. **Validate contract addresses** for each chain in CI/CD
4. **Document chain IDs** used in your deployment environments
5. **Use fallback values** for robustness

## Troubleshooting

### Chain Not Found Error

```bash
Error: No valid chains found in configuration
```

**Solution:** Ensure `NEXT_PUBLIC_KAIA_CHAIN_ID` is set to a valid chain ID.

### RPC Connection Failed

**Solution:** Verify the RPC URL for your chain ID is accessible:

```bash
curl -X POST -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
  $NEXT_PUBLIC_RPC_URL_31337
```

### Contract Address Not Found

**Solution:** Ensure contract addresses are configured for the active chain:

```bash
echo $NEXT_PUBLIC_HACKATHON_REGISTRY_ADDRESS_$NEXT_PUBLIC_KAIA_CHAIN_ID
```
