# 🛠️ Complete Guide to Foundry & Solidity

This document covers comprehensive aspects of smart contract development using Foundry.

## 📚 Table of Contents

1. [Foundry Basics](#1-foundry-basics)
2. [Project Setup](#2-project-setup)
3. [Solidity Syntax Overview](#3-solidity-syntax-overview)
4. [Smart Contract Development](#4-smart-contract-development)
5. [Testing Guide](#5-testing-guide)
6. [Deployment and Verification](#6-deployment-and-verification)
7. [Debugging and Optimization](#7-debugging-and-optimization)
8. [Best Practices](#8-best-practices)

---

## 1. Foundry Basics

### 🔧 **What is Foundry?**

Foundry is a fast, portable, and modular Ethereum development toolkit written in Rust.

### 📦 **Core Tools**

- **`forge`**: Compilation, testing, and deployment tool
- **`cast`**: RPC calls and Ethereum utilities
- **`anvil`**: Local testnet node
- **`chisel`**: Solidity REPL

### 🏗️ **Directory Structure**

```
my-project/
├── src/              # Smart contract source code
├── test/             # Test files
├── script/           # Deployment scripts
├── lib/              # Dependencies (auto-generated)
├── out/              # Compilation output (auto-generated)
├── cache/            # Compilation cache (auto-generated)
├── foundry.toml      # Configuration file
└── remappings.txt    # Import path mappings
```

---

## 2. Project Setup

### 🚀 **Installation and Initialization**

```bash
# Install Foundry
curl -L https://foundry.paradigm.xyz | bash
foundryup

# Create new project
forge init my-project
cd my-project

# Initialize in existing project (⚠️ Warning: use in empty directory only)
forge init --force .
```

**⚠️ Warning:**

- `--force` flag can overwrite existing files, use ONLY in empty directories
- For directories with existing files, backup first or set up manually

### ⚙️ **foundry.toml Configuration**

```toml
[profile.default]
src = "src"
out = "out"
libs = ["lib"]

# Solidity version setting (varies by Foundry version)
solc_version = "0.8.20"  # Old Foundry
# or
solc = "0.8.20"          # New Foundry (v0.2.0+)

optimizer = true
optimizer_runs = 200
via_ir = false

[profile.default.model_checker]
contracts = { "src/MyContract.sol" = ["MyContract"] }
engine = "chc"
timeout = 10000
targets = ["assert", "underflow", "overflow", "divByZero"]

# Network settings
[rpc_endpoints]
mainnet = "https://eth-mainnet.alchemyapi.io/v2/your-api-key"
kaia_mainnet = "https://rpc.ankr.com/kaia"
kaia_testnet = "https://rpc.ankr.com/kaia_testnet"

# Etherscan settings (for verification)
[etherscan]
mainnet = { key = "your-etherscan-api-key" }
```

### 📦 **Installing Dependencies**

```bash
# Install OpenZeppelin
forge install OpenZeppelin/openzeppelin-contracts

# Other useful libraries
forge install foundry-rs/forge-std        # Standard testing library
forge install transmissions11/solmate     # Gas optimized contracts
forge install Uniswap/v4-core            # Uniswap v4

# Update dependencies
forge update
```

### 🔧 **remappings.txt Configuration**

```
@openzeppelin/contracts/=lib/openzeppelin-contracts/contracts/
@forge-std/=lib/forge-std/src/
@solmate/=lib/solmate/src/
```

---

## 3. Solidity Syntax Overview

### 📝 **Basic Structure**

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract MyContract is AccessControl, ReentrancyGuard {
    // Constants
    uint256 public constant MAX_SUPPLY = 10000;
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    // State variables
    mapping(address => uint256) public balances;
    address[] private users;

    // Events
    event Transfer(address indexed from, address indexed to, uint256 amount);
    event RoleGranted(bytes32 indexed role, address indexed account);

    // Errors (Gas efficient)
    error InsufficientBalance();
    error Unauthorized();

    // Modifiers
    modifier onlyAdmin() {
        if (!hasRole(ADMIN_ROLE, msg.sender)) revert Unauthorized();
        _;
    }

    // Constructor
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
    }

    // Functions
    function deposit() external payable nonReentrant {
        require(msg.value > 0, "Amount must be greater than 0");
        balances[msg.sender] += msg.value;
        emit Transfer(address(0), msg.sender, msg.value);
    }
}
```

### 🔒 **Access Control Patterns**

```solidity
// 1. Using OpenZeppelin AccessControl (recommended)
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

contract MyContract is AccessControl {
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");

    modifier onlyManager() {
        require(hasRole(MANAGER_ROLE, msg.sender), "Not a manager");
        _;
    }
}

// 2. Ownable pattern (for simple cases)
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract SimpleContract is Ownable {
    // OpenZeppelin v5.0+ (latest)
    constructor() Ownable(msg.sender) {}

    // OpenZeppelin v4.x (old) - no constructor argument
    // constructor() {
    //     _transferOwnership(msg.sender);
    // }

    function adminFunction() external onlyOwner {
        // Only owner can execute
    }
}

// 📝 Version differences:
// - v5.0+: constructor takes initial owner as argument
// - v4.x: uses _transferOwnership() in constructor
// - v3.x: uses _setOwner() in constructor
```

### 💰 **Safe ETH Transfer**

```solidity
// ⚠️ Warning: using transfer (2300 gas limit)
// May fail in modern EVM due to gas cost changes
payable(recipient).transfer(amount);

// ❌ Avoid: using send (requires failure handling)
bool success = payable(recipient).send(amount);
require(success, "Send failed");

// ✅ Recommended: using call + ReentrancyGuard (safest)
function withdraw(uint256 amount) external nonReentrant {
    require(balances[msg.sender] >= amount, "Insufficient balance");
    balances[msg.sender] -= amount;

    (bool success, ) = payable(msg.sender).call{value: amount}("");
    require(success, "Transfer failed");
}

// 📝 ETH transfer method characteristics:
// - transfer: 2300 gas limit, reverts on failure (not recommended now)
// - send: 2300 gas limit, returns false on failure (not recommended)
// - call: forwards all gas, most flexible (recommended)
```

**⚠️ Important Notes:**

- **Use transfer/send only for legacy code compatibility**
- **call + ReentrancyGuard is the current standard**
- **transfer may fail due to recent EVM changes**

### 📊 **Data Types and Optimization**

```solidity
// Gas optimization through packing
struct User {
    uint128 balance;      // 16 bytes
    uint64 timestamp;     // 8 bytes
    uint32 id;           // 4 bytes
    bool isActive;       // 1 byte (but uses 32-byte slot)
}                        // Total 32 bytes = 1 slot

// Using enums
enum Status { Pending, Active, Completed, Cancelled }

// Mapping optimization
mapping(address => mapping(uint256 => bool)) public userVotes;
```

---

## 4. Smart Contract Development

### 🏗️ **Contract Architecture Patterns**

#### **1. Single Responsibility Principle (SRP)**

```solidity
// Good example: Each contract has one responsibility
contract HackathonRegistry {
    // Only manages hackathon
}

contract PrizePool {
    // Only manages prize pool
}
```

#### **2. Upgradeable Contracts**

```solidity
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

contract MyUpgradeableContract is Initializable, UUPSUpgradeable, OwnableUpgradeable {
    uint256 public value;

    function initialize(uint256 _value) public initializer {
        // Initialization order matters!
        __Ownable_init(msg.sender);        // Initialize Ownable first
        __UUPSUpgradeable_init();          // Then initialize UUPS
        // Or use _init_unchained version
        // __UUPSUpgradeable_init_unchained();

        value = _value;
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
}

// 📝 Initialization function types:
// - __Contract_init(): Includes parent contract initialization
// - __Contract_init_unchained(): Initializes only this contract
// - Use _unchained version for complex inheritance structures

// ⚠️ Warnings:
// - Wrong initialization order can cause unexpected behavior
// - This is a simple example, refer to OpenZeppelin docs for actual use
```

### 🛡️ **Security Patterns**

#### **1. Checks-Effects-Interactions Pattern**

```solidity
function withdraw(uint256 amount) external {
    // 1. Checks - verify conditions
    require(balances[msg.sender] >= amount, "Insufficient balance");
    require(amount > 0, "Amount must be positive");

    // 2. Effects - state changes
    balances[msg.sender] -= amount;

    // 3. Interactions - external calls
    (bool success, ) = payable(msg.sender).call{value: amount}("");
    require(success, "Transfer failed");
}
```

#### **2. Using ReentrancyGuard**

```solidity
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract SafeContract is ReentrancyGuard {
    function criticalFunction() external nonReentrant {
        // Protected from reentrancy attacks
    }
}
```

### 🎯 **Events and Error Handling**

```solidity
contract EventExample {
    // Event definition (max 3 indexed)
    event Transfer(
        address indexed from,
        address indexed to,
        uint256 amount,
        uint256 timestamp
    );

    // Custom errors (gas efficient)
    error InsufficientBalance(uint256 required, uint256 available);
    error Unauthorized(address caller);

    function transfer(address to, uint256 amount) external {
        if (balances[msg.sender] < amount) {
            revert InsufficientBalance(amount, balances[msg.sender]);
        }

        balances[msg.sender] -= amount;
        balances[to] += amount;

        emit Transfer(msg.sender, to, amount, block.timestamp);
    }
}
```

---

## 5. Testing Guide

### 🧪 **Basic Test Structure**

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "@forge-std/Test.sol";
import {console} from "@forge-std/console.sol";
import {MyContract} from "../src/MyContract.sol";

contract MyContractTest is Test {
    MyContract public myContract;

    address public owner = makeAddr("owner");
    address public user1 = makeAddr("user1");
    address public user2 = makeAddr("user2");

    function setUp() public {
        vm.prank(owner);
        myContract = new MyContract();

        // Provide test ETH
        vm.deal(user1, 10 ether);
        vm.deal(user2, 5 ether);
    }

    function test_BasicFunctionality() public {
        // Given
        uint256 amount = 1 ether;

        // When
        vm.prank(user1);
        myContract.deposit{value: amount}();

        // Then
        assertEq(myContract.balanceOf(user1), amount);
    }

    function test_RevertOnInvalidInput() public {
        vm.prank(user1);
        vm.expectRevert("Amount must be greater than 0");
        myContract.deposit{value: 0}();
    }

    function testFuzz_Deposit(uint256 amount) public {
        vm.assume(amount > 0 && amount <= 100 ether);

        vm.deal(user1, amount);
        vm.prank(user1);
        myContract.deposit{value: amount}();

        assertEq(myContract.balanceOf(user1), amount);
    }
}
```

### 🔧 **Foundry Cheatcodes Usage**

```solidity
function test_CheatCodes() public {
    // Time manipulation
    vm.warp(block.timestamp + 1 days);

    // Block number manipulation
    vm.roll(block.number + 100);

    // Address manipulation
    vm.prank(user1);              // Next call as user1
    vm.startPrank(user1);         // Continue as user1
    vm.stopPrank();               // Stop prank

    // Event testing
    vm.expectEmit(true, true, false, true);
    emit Transfer(user1, user2, 1 ether);
    myContract.transfer(user2, 1 ether);

    // Revert testing
    vm.expectRevert("Insufficient balance");
    myContract.withdraw(1000 ether);

    // Storage manipulation
    vm.store(address(myContract), bytes32(uint256(0)), bytes32(uint256(100)));

    // Balance setting
    vm.deal(user1, 50 ether);
}
```

### 📊 **Gas Optimization Testing**

```solidity
function test_GasOptimization() public {
    uint256 gasBefore = gasleft();

    myContract.expensiveOperation();

    uint256 gasUsed = gasBefore - gasleft();
    console.log("Gas used:", gasUsed);

    // Gas usage limit test
    assertTrue(gasUsed < 100000, "Gas usage too high");
}
```

---

## 6. Deployment and Verification

### 🚀 **Writing Deployment Scripts**

```solidity
// script/Deploy.s.sol
pragma solidity ^0.8.20;

import {Script} from "@forge-std/Script.sol";
import {console} from "@forge-std/console.sol";
import {MyContract} from "../src/MyContract.sol";

contract DeployScript is Script {
    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);

        MyContract myContract = new MyContract();

        vm.stopBroadcast();

        console.log("Contract deployed at:", address(myContract));
    }
}
```

### 🌐 **Network-Specific Deployment**

#### **1. Local Testnet (Anvil)**

```bash
# Terminal 1: Run local node
anvil

# Terminal 2: Deploy
forge script script/DeployContracts.s.sol --rpc-url http://localhost:8545 --broadcast
```

#### **2. Kaia Testnet (Kairos) Deployment**

```bash
# Set environment variables
export PRIVATE_KEY="your_private_key_here"
export KAIA_TESTNET_RPC="https://rpc.ankr.com/kaia_testnet"

# Execute deployment
forge script script/DeployContracts.s.sol \
  --rpc-url $KAIA_TESTNET_RPC \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --verify \
  --legacy

# Or use .env file
forge script script/DeployContracts.s.sol \
  --rpc-url kaia_testnet \
  --broadcast \
  --verify \
  --legacy
```

#### **3. Kaia Mainnet (Cypress) Deployment**

```bash
export KAIA_MAINNET_RPC="https://rpc.ankr.com/kaia"

forge script script/DeployContracts.s.sol \
  --rpc-url $KAIA_MAINNET_RPC \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --verify \
  --legacy \
  --slow
```

#### **4. Kaia Network Specifics**

- **`--legacy` flag required**: Kaia doesn't support EIP-1559
- **Gas price setting**: `--gas-price 25000000000` (25 Gwei)
- **Verification**: May need manual verification on Klaytnscope

#### **5. Pre-deployment Checklist**

```bash
# 1. Check wallet balance
cast balance $DEPLOYER_ADDRESS --rpc-url $KAIA_TESTNET_RPC

# 2. Check gas price
cast gas-price --rpc-url $KAIA_TESTNET_RPC

# 3. Test network connection
cast block latest --rpc-url $KAIA_TESTNET_RPC

# 4. Run simulation (before actual deployment)
forge script script/DeployContracts.s.sol --rpc-url $KAIA_TESTNET_RPC
```

### 🔍 **Contract Verification**

```bash
# Verify during deployment
forge create MyContract \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY \
  --verify

# Separate verification (for Kaia network)
forge verify-contract \
  --chain-id 8217 \
  --num-of-optimizations 200 \
  --compiler-version v0.8.20 \
  $CONTRACT_ADDRESS \
  src/MyContract.sol:MyContract \
  $SCAN_API_KEY

# Note: Kaia network block explorers
# - Mainnet: https://kaiascan.io
# - Testnet: https://kairos.kaiascan.io
# Manual verification might be needed
```

---

## 7. Debugging and Optimization

### 🐛 **Debugging Tools**

```bash
# Detailed trace
forge test -vvvv

# Run specific test
forge test --match-test test_deposit

# Gas report
forge test --gas-report

# Check coverage
forge coverage

# View trace
forge test --debug test_function_name
```

### ⚡ **Gas Optimization**

```solidity
// 1. Packing optimization
struct OptimizedStruct {
    uint128 a;    // 16 bytes
    uint64 b;     // 8 bytes
    uint32 c;     // 4 bytes
    bool d;       // 1 byte (but 4 bytes padding)
}                 // Total 32 bytes = 1 slot

// 2. Using constants
uint256 private constant MAX_VALUE = 1000; // Use constant instead of SLOAD

// 3. Memory vs Storage
function processArray(uint256[] memory arr) external pure { // Use memory
    // Use memory for temporary processing
}

// 4. Unchecked block (when sure no overflow)
function optimizedLoop(uint256 n) external pure returns (uint256) {
    uint256 sum;
    for (uint256 i; i < n;) {
        sum += i;
        unchecked { ++i; } // Save gas
    }
    return sum;
}
```

### 🔧 **Compilation Optimization**

```toml
# foundry.toml
[profile.default]
optimizer = true
optimizer_runs = 1000    # Expected number of function calls after deployment
via_ir = true           # Stronger optimization (increases compile time)

[profile.ci]
optimizer = false       # Fast compilation in CI
```

---

## 8. Best Practices

### ✅ **Coding Conventions**

```solidity
contract MyContract {
    // 1. State variable order
    // - Constants
    uint256 public constant MAX_SUPPLY = 10000;

    // - Immutable variables
    address public immutable owner;

    // - Regular state variables
    mapping(address => uint256) public balances;

    // 2. Function order
    // - constructor
    // - receive/fallback
    // - external functions
    // - public functions
    // - internal functions
    // - private functions

    // 3. Naming conventions
    // - functions/variables: camelCase
    // - constants: SCREAMING_SNAKE_CASE
    // - events: PascalCase
    // - errors: PascalCase
}
```

### 🔒 **Security Checklist**

- [ ] Use ReentrancyGuard
- [ ] Check integer overflow (automatic in Solidity 0.8+)
- [ ] State changes before external calls (CEI pattern)
- [ ] Implement Access Control
- [ ] Validate inputs
- [ ] Log events
- [ ] Handle errors

### 📝 **Documentation**

```solidity
/**
 * @title MyContract
 * @author Your Name
 * @notice Brief explanation of contract purpose
 * @dev Detailed explanation for developers
 */
contract MyContract {
    /**
     * @notice Transfers tokens
     * @dev Follows CEI pattern
     * @param to Recipient address
     * @param amount Amount to transfer
     * @return success Whether transfer succeeded
     */
    function transfer(address to, uint256 amount) external returns (bool success) {
        // Implementation
    }
}
```

---

## 🔗 Useful Command Collection

### 🛠️ **Development Workflow**

```bash
# Initialize project
forge init my-project

# Install dependencies
forge install openzeppelin/openzeppelin-contracts

# Compile
forge build

# Test
forge test
forge test -vvvv                    # Detailed logs
forge test --match-test test_name   # Specific test
forge test --gas-report             # Gas report

# Format
forge fmt

# Coverage
forge coverage

# Generate docs
forge doc

# Run local node
anvil

# RPC calls
cast call $CONTRACT_ADDRESS "balanceOf(address)" $USER_ADDRESS
cast send $CONTRACT_ADDRESS "transfer(address,uint256)" $TO $AMOUNT --private-key $PK

# Deploy
forge create MyContract --private-key $PK --rpc-url $RPC_URL
```

### 🔍 **Analysis Tools**

```bash
# Static analysis
slither .

# Symbolic execution
echidna contract.sol --config echidna.yaml

# Gas analysis
forge test --gas-report > gas-report.txt
```

---

## 🔍 Version Compatibility Check

### **Check Foundry Version**

```bash
# Check current installed version
forge --version
cast --version
anvil --version

# Update to latest version
foundryup
```

### **Check OpenZeppelin Version**

```bash
# Check installed OpenZeppelin version
ls lib/openzeppelin-contracts/package.json
cat lib/openzeppelin-contracts/package.json | grep version

# Install specific version
forge install OpenZeppelin/openzeppelin-contracts@v5.0.0
```

### **Version Change Summary**

| Tool/Library     | Version | Key Changes                                       |
| ---------------- | ------- | ------------------------------------------------- |
| **Foundry**      | v0.2.0+ | `solc = "0.8.20"` (old: `solc_version`)           |
| **OpenZeppelin** | v5.0+   | `Ownable(msg.sender)` constructor arg required    |
| **OpenZeppelin** | v4.x    | Use `_transferOwnership(msg.sender)`              |
| **OpenZeppelin** | v5.0+   | Stricter upgrade initialization order             |
| **Solidity**     | 0.8.20+ | Stricter type checking, improved gas optimization |

### **Compatibility Issue Solutions**

```bash
# 1. foundry.toml settings not working
# Old version: solc_version = "0.8.20"
# New version: solc = "0.8.20"

# 2. Ownable compilation error
# v5.0+: constructor() Ownable(msg.sender) {}
# v4.x:  constructor() { _transferOwnership(msg.sender); }

# 3. Upgradeable contract initialization error
# Must follow exact initialization order (see docs example)
```

---

## 📚 Additional Learning Resources

- [Foundry Book](https://book.getfoundry.sh/) - Official documentation
- [Solidity Documentation](https://docs.soliditylang.org/) - Solidity official docs
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/) - Security-audited contract library
- [OpenZeppelin Upgrades](https://docs.openzeppelin.com/upgrades-plugins/) - Upgradeable contracts guide
- [Ethereum.org](https://ethereum.org/en/developers/) - Ethereum developer resources
- [Consensys Best Practices](https://consensys.github.io/smart-contract-best-practices/) - Smart contract security guide

---

_This document is continuously updated. Please add new patterns or best practices as you discover them._
