// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {HackathonRegistry} from "../src/HackathonRegistry.sol";
import {PrizePool} from "../src/PrizePool.sol";

/**
 * @title DeployContracts
 * @dev Deployment script for HackathonRegistry and PrizePool contracts
 * 
 * Usage:
 * Local deployment:
 *   forge script script/DeployContracts.s.sol --fork-url http://localhost:8545 --broadcast
 * 
 * Kaia testnet deployment:
 *   forge script script/DeployContracts.s.sol --rpc-url $KAIA_TESTNET_RPC --private-key $PRIVATE_KEY --broadcast --verify
 * 
 * Kaia mainnet deployment:
 *   forge script script/DeployContracts.s.sol --rpc-url $KAIA_MAINNET_RPC --private-key $PRIVATE_KEY --broadcast --verify
 */
contract DeployContracts is Script {
    HackathonRegistry public hackathonRegistry;
    PrizePool public prizePool;
    
    // Deployment configuration
    address public deployer;
    
    function setUp() public {
        deployer = vm.envOr("DEPLOYER_ADDRESS", msg.sender);
        console.log("Deployer address:", deployer);
        console.log("Chain ID:", block.chainid);
    }

    function run() public {
        console.log("=== Starting Deployment ===");
        console.log("Deployer:", deployer);
        console.log("Balance:", deployer.balance / 1e18, "ETH");
        
        vm.startBroadcast();

        // Deploy HackathonRegistry first
        console.log("\n1. Deploying HackathonRegistry...");
        hackathonRegistry = new HackathonRegistry();
        console.log("HackathonRegistry deployed at:", address(hackathonRegistry));

        // Deploy PrizePool with HackathonRegistry address
        console.log("\n2. Deploying PrizePool...");
        prizePool = new PrizePool(address(hackathonRegistry));
        console.log("PrizePool deployed at:", address(prizePool));

        vm.stopBroadcast();

        // Verify deployment
        _verifyDeployment();
        
        // Print deployment summary
        _printDeploymentSummary();
    }

    function _verifyDeployment() internal view {
        console.log("\n=== Verifying Deployment ===");
        
        // Verify HackathonRegistry
        require(address(hackathonRegistry) != address(0), "HackathonRegistry deployment failed");
        require(address(hackathonRegistry).code.length > 0, "HackathonRegistry has no code");
        console.log("* HackathonRegistry verified");
        
        // Verify PrizePool
        require(address(prizePool) != address(0), "PrizePool deployment failed");
        require(address(prizePool).code.length > 0, "PrizePool has no code");
        
        // Verify PrizePool has correct HackathonRegistry address
        require(
            address(prizePool.hackathonRegistry()) == address(hackathonRegistry),
            "PrizePool registry address mismatch"
        );
        console.log("* PrizePool verified");
        console.log("* Contract integration verified");
    }

    function _printDeploymentSummary() internal view {
        console.log("\n=== Deployment Summary ===");
        console.log("Network Chain ID:", block.chainid);
        console.log("Deployer:", deployer);
        console.log("Gas Price:", tx.gasprice);
        console.log("");
        console.log("Contract Addresses:");
        console.log("  HackathonRegistry:", address(hackathonRegistry));
        console.log("  PrizePool:       ", address(prizePool));
        console.log("");
        console.log("Next Steps:");
        console.log("1. Verify contracts on block explorer");
        console.log("2. Update frontend configuration with contract addresses");
        console.log("3. Test basic functionality with integration scripts");
        console.log("4. Set up initial hackathon for testing");
        
        // Save addresses for other scripts
        console.log("\n=== Environment Variables ===");
        console.log("export HACKATHON_REGISTRY_ADDRESS=", address(hackathonRegistry));
        console.log("export PRIZE_POOL_ADDRESS=", address(prizePool));
    }
}