// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {HackathonRegistry} from "../src/HackathonRegistry.sol";
import {PrizePool} from "../src/PrizePool.sol";

/**
 * @title SetupIntegration
 * @dev Integration test script to demonstrate complete hackathon flow
 * 
 * Usage:
 *   forge script script/SetupIntegration.s.sol --rpc-url $RPC_URL --private-key $PRIVATE_KEY --broadcast
 */
contract SetupIntegration is Script {
    HackathonRegistry public hackathonRegistry;
    PrizePool public prizePool;
    
    // Test addresses
    address public organizer;
    address public judge1;
    address public judge2;
    address public participant1;
    address public participant2;
    address public participant3;
    
    uint256 public hackathonId;
    uint256 public constant PRIZE_AMOUNT = 1 ether;

    function setUp() public {
        // Load deployed contract addresses
        hackathonRegistry = HackathonRegistry(vm.envAddress("HACKATHON_REGISTRY_ADDRESS"));
        prizePool = PrizePool(vm.envAddress("PRIZE_POOL_ADDRESS"));
        
        // Set up test addresses
        organizer = vm.envOr("TEST_ORGANIZER", msg.sender);
        judge1 = vm.envOr("TEST_JUDGE1", vm.addr(0x1001));
        judge2 = vm.envOr("TEST_JUDGE2", vm.addr(0x1002));
        participant1 = vm.envOr("TEST_PARTICIPANT1", vm.addr(0x2001));
        participant2 = vm.envOr("TEST_PARTICIPANT2", vm.addr(0x2002));
        participant3 = vm.envOr("TEST_PARTICIPANT3", vm.addr(0x2003));
        
        console.log("Contract addresses loaded:");
        console.log("  HackathonRegistry:", address(hackathonRegistry));
        console.log("  PrizePool:", address(prizePool));
    }

    function run() public {
        console.log("=== Integration Test: Complete Hackathon Flow ===");
        
        vm.startBroadcast();
        
        // Step 1: Create hackathon
        _createHackathon();
        
        // Step 2: Setup judges
        _setupJudges();
        
        // Step 3: Register participants
        _registerParticipants();
        
        // Step 4: Create prize pool
        _createPrizePool();
        
        // Step 5: Submit projects (simulate time passing)
        _submitProjects();
        
        // Step 6: Conduct voting
        _conductVoting();
        
        // Step 7: Distribute prizes
        _distributePrizes();
        
        // Step 8: Winners withdraw prizes
        _withdrawPrizes();
        
        vm.stopBroadcast();
        
        console.log("\n=== Integration Test Completed Successfully! ===");
    }

    function _createHackathon() internal {
        console.log("\n1. Creating Hackathon...");
        
        uint256 registrationDeadline = block.timestamp + 1 days;
        uint256 submissionDeadline = block.timestamp + 7 days;
        uint256 votingDeadline = block.timestamp + 14 days;
        
        hackathonId = hackathonRegistry.createHackathon(
            "Test Integration Hackathon",
            "A comprehensive test of the hackathon platform",
            registrationDeadline,
            submissionDeadline,
            votingDeadline
        );
        
        console.log("* Hackathon created with ID:", hackathonId);
    }

    function _setupJudges() internal {
        console.log("\n2. Setting up Judges...");
        
        hackathonRegistry.addJudge(hackathonId, judge1);
        hackathonRegistry.addJudge(hackathonId, judge2);
        
        console.log("* Added judge1:", judge1);
        console.log("* Added judge2:", judge2);
    }

    function _registerParticipants() internal {
        console.log("\n3. Registering Participants...");
        
        // Need to switch to participant addresses for registration
        vm.stopBroadcast();
        
        vm.broadcast(participant1);
        hackathonRegistry.registerParticipant(hackathonId);
        console.log("* Registered participant1:", participant1);
        
        vm.broadcast(participant2);
        hackathonRegistry.registerParticipant(hackathonId);
        console.log("* Registered participant2:", participant2);
        
        vm.broadcast(participant3);
        hackathonRegistry.registerParticipant(hackathonId);
        console.log("* Registered participant3:", participant3);
        
        vm.startBroadcast();
    }

    function _createPrizePool() internal {
        console.log("\n4. Creating Prize Pool...");
        
        // Ensure organizer has enough balance
        require(organizer.balance >= PRIZE_AMOUNT, "Insufficient balance for prize pool");
        
        prizePool.createPrizePool{value: PRIZE_AMOUNT}(hackathonId);
        
        // Set 60/25/15% distribution
        uint16[] memory percentages = new uint16[](3);
        percentages[0] = 6000; // 60%
        percentages[1] = 2500; // 25%
        percentages[2] = 1500; // 15%
        
        prizePool.setPrizeDistribution(hackathonId, percentages);
        
        console.log("* Prize pool created with", PRIZE_AMOUNT / 1e18, "ETH");
        console.log("* Distribution set: 60%/25%/15%");
    }

    function _submitProjects() internal {
        console.log("\n5. Submitting Projects...");
        
        vm.stopBroadcast();
        
        vm.broadcast(participant1);
        hackathonRegistry.updateSubmission(hackathonId, "https://github.com/participant1/amazing-project");
        
        vm.broadcast(participant2);
        hackathonRegistry.updateSubmission(hackathonId, "https://github.com/participant2/great-dapp");
        
        vm.broadcast(participant3);
        hackathonRegistry.updateSubmission(hackathonId, "https://github.com/participant3/cool-protocol");
        
        console.log("* All participants submitted projects");
        
        vm.startBroadcast();
    }

    function _conductVoting() internal {
        console.log("\n6. Conducting Voting...");
        
        // Fast forward past submission deadline
        vm.warp(block.timestamp + 8 days);
        
        // Start voting phase
        hackathonRegistry.startVotingPhase(hackathonId);
        console.log("* Voting phase started");
        
        vm.stopBroadcast();
        
        // Cast votes - participant1 gets highest scores
        vm.broadcast(judge1);
        hackathonRegistry.castVote(hackathonId, participant1, 9, "Excellent implementation!");
        
        vm.broadcast(judge1);
        hackathonRegistry.castVote(hackathonId, participant2, 7, "Good work!");
        
        vm.broadcast(judge1);
        hackathonRegistry.castVote(hackathonId, participant3, 6, "Nice effort!");
        
        vm.broadcast(judge2);
        hackathonRegistry.castVote(hackathonId, participant1, 8, "Very impressive!");
        
        vm.broadcast(judge2);
        hackathonRegistry.castVote(hackathonId, participant2, 7, "Solid project!");
        
        vm.broadcast(judge2);
        hackathonRegistry.castVote(hackathonId, participant3, 5, "Needs improvement!");
        
        console.log("* All judges cast their votes");
        
        vm.startBroadcast();
        
        // Complete voting
        vm.warp(block.timestamp + 7 days);
        hackathonRegistry.completeVoting(hackathonId);
        console.log("* Voting completed");
        
        // Show results
        (address first, address second, address third) = hackathonRegistry.getWinners(hackathonId);
        console.log("Winners:");
        console.log("  1st Place:", first);
        console.log("  2nd Place:", second);
        console.log("  3rd Place:", third);
    }

    function _distributePrizes() internal {
        console.log("\n7. Distributing Prizes...");
        
        prizePool.distributePrizes(hackathonId);
        console.log("* Prizes distributed");
        
        // Show prize amounts
        (address winner1, uint256 amount1,) = prizePool.getWinnerPayout(hackathonId, 1);
        (address winner2, uint256 amount2,) = prizePool.getWinnerPayout(hackathonId, 2);
        (address winner3, uint256 amount3,) = prizePool.getWinnerPayout(hackathonId, 3);
        
        console.log("Prize Amounts:");
        console.log("  1st:", winner1, "->", amount1 / 1e18, "ETH");
        console.log("  2nd:", winner2, "->", amount2 / 1e18, "ETH");
        console.log("  3rd:", winner3, "->", amount3 / 1e18, "ETH");
    }

    function _withdrawPrizes() internal {
        console.log("\n8. Withdrawing Prizes...");
        
        vm.stopBroadcast();
        
        // Winners withdraw their prizes
        vm.broadcast(participant1);
        prizePool.withdrawPrize(hackathonId, 1);
        console.log("* 1st place winner withdrew prize");
        
        vm.broadcast(participant2);
        prizePool.withdrawPrize(hackathonId, 2);
        console.log("* 2nd place winner withdrew prize");
        
        vm.broadcast(participant3);
        prizePool.withdrawPrize(hackathonId, 3);
        console.log("* 3rd place winner withdrew prize");
        
        vm.startBroadcast();
    }
}