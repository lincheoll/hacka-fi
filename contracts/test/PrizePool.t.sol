// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "@forge-std/Test.sol";
import {HackathonRegistry} from "../src/HackathonRegistry.sol";
import {PrizePool} from "../src/PrizePool.sol";

contract PrizePoolTest is Test {
    HackathonRegistry public registry;
    PrizePool public prizePool;
    
    address public organizer = makeAddr("organizer");
    address public participant1 = makeAddr("participant1");
    address public participant2 = makeAddr("participant2");
    address public participant3 = makeAddr("participant3");
    address public judge1 = makeAddr("judge1");
    
    uint256 public registrationDeadline;
    uint256 public submissionDeadline;
    uint256 public votingDeadline;
    
    string public constant TITLE = "Test Hackathon";
    string public constant DESCRIPTION = "A test hackathon";
    uint256 public constant PRIZE_AMOUNT = 10 ether;

    event PrizePoolCreated(
        uint256 indexed hackathonId,
        address indexed organizer,
        uint256 totalAmount,
        uint16[] percentages
    );

    event PrizeDistributionUpdated(
        uint256 indexed hackathonId,
        uint16[] oldPercentages,
        uint16[] newPercentages
    );

    event PrizesDistributed(
        uint256 indexed hackathonId,
        address[] winners,
        uint256[] amounts,
        uint256 totalDistributed
    );

    function setUp() public {
        registry = new HackathonRegistry();
        prizePool = new PrizePool(address(registry));
        
        // Set deadlines
        registrationDeadline = block.timestamp + 1 days;
        submissionDeadline = block.timestamp + 7 days;
        votingDeadline = block.timestamp + 14 days;
        
        // Fund addresses
        vm.deal(organizer, 100 ether);
        vm.deal(participant1, 1 ether);
        vm.deal(participant2, 1 ether);
        vm.deal(participant3, 1 ether);
    }

    function _setupCompleteHackathon() internal returns (uint256 hackathonId) {
        // Create hackathon
        vm.prank(organizer);
        hackathonId = registry.createHackathon(
            TITLE,
            DESCRIPTION,
            registrationDeadline,
            submissionDeadline,
            votingDeadline
        );
        
        // Add judge
        vm.prank(organizer);
        registry.addJudge(hackathonId, judge1);
        
        // Register participants
        vm.prank(participant1);
        registry.registerParticipant(hackathonId);
        
        vm.prank(participant2);
        registry.registerParticipant(hackathonId);
        
        vm.prank(participant3);
        registry.registerParticipant(hackathonId);
        
        // Submit projects
        vm.prank(participant1);
        registry.updateSubmission(hackathonId, "https://github.com/participant1/project");
        
        vm.prank(participant2);
        registry.updateSubmission(hackathonId, "https://github.com/participant2/project");
        
        vm.prank(participant3);
        registry.updateSubmission(hackathonId, "https://github.com/participant3/project");
        
        // Start voting
        vm.warp(submissionDeadline + 1);
        vm.prank(organizer);
        registry.startVotingPhase(hackathonId);
        
        // Cast votes (different scores to create ranking)
        vm.prank(judge1);
        registry.castVote(hackathonId, participant1, 9, "Great project!"); // 1st place
        
        vm.prank(judge1);
        registry.castVote(hackathonId, participant2, 7, "Good work!"); // 2nd place
        
        vm.prank(judge1);
        registry.castVote(hackathonId, participant3, 5, "Needs improvement"); // 3rd place
        
        // Complete voting
        vm.warp(votingDeadline + 1);
        vm.prank(organizer);
        registry.completeVoting(hackathonId);
        
        return hackathonId;
    }

    function test_CreatePrizePool() public {
        uint256 hackathonId = _setupCompleteHackathon();
        
        vm.prank(organizer);
        vm.expectEmit(true, true, false, true);
        
        uint16[] memory expectedPercentages = new uint16[](1);
        expectedPercentages[0] = 10000; // 100%
        
        emit PrizePoolCreated(hackathonId, organizer, PRIZE_AMOUNT, expectedPercentages);
        
        prizePool.createPrizePool{value: PRIZE_AMOUNT}(hackathonId);
        
        // Check prize pool configuration
        (
            uint16[] memory percentages,
            uint256 totalPrizePool,
            address poolOrganizer,
            bool distributed,
            uint256 createdAt
        ) = prizePool.getPrizeConfiguration(hackathonId);
        
        assertEq(percentages.length, 1, "Should have 1 percentage");
        assertEq(percentages[0], 10000, "Should be 100%");
        assertEq(totalPrizePool, PRIZE_AMOUNT, "Prize pool should match sent amount");
        assertEq(poolOrganizer, organizer, "Organizer should match");
        assertFalse(distributed, "Should not be distributed yet");
        assertEq(createdAt, block.timestamp, "Created at should match");
    }

    function test_CreatePrizePool_RevertOnInvalidConditions() public {
        uint256 hackathonId = _setupCompleteHackathon();
        
        // Fund participant1 with enough balance for the test
        vm.deal(participant1, 50 ether);
        
        // Only organizer can create prize pool
        vm.prank(participant1);
        vm.expectRevert("PrizePool: Only hackathon organizer can perform this action");
        prizePool.createPrizePool{value: PRIZE_AMOUNT}(hackathonId);
        
        // Cannot create with zero value
        vm.prank(organizer);
        vm.expectRevert("PrizePool: Prize pool must be greater than 0");
        prizePool.createPrizePool{value: 0}(hackathonId);
        
        // Create prize pool first
        vm.prank(organizer);
        prizePool.createPrizePool{value: PRIZE_AMOUNT}(hackathonId);
        
        // Cannot create twice
        vm.prank(organizer);
        vm.expectRevert("PrizePool: Prize pool already exists");
        prizePool.createPrizePool{value: PRIZE_AMOUNT}(hackathonId);
    }

    function test_SetPrizeDistribution() public {
        uint256 hackathonId = _setupCompleteHackathon();
        
        vm.prank(organizer);
        prizePool.createPrizePool{value: PRIZE_AMOUNT}(hackathonId);
        
        // Set 60/25/15% distribution
        uint16[] memory newPercentages = new uint16[](3);
        newPercentages[0] = 6000; // 60%
        newPercentages[1] = 2500; // 25%
        newPercentages[2] = 1500; // 15%
        
        vm.prank(organizer);
        vm.expectEmit(true, false, false, true);
        
        uint16[] memory oldPercentages = new uint16[](1);
        oldPercentages[0] = 10000;
        
        emit PrizeDistributionUpdated(hackathonId, oldPercentages, newPercentages);
        
        prizePool.setPrizeDistribution(hackathonId, newPercentages);
        
        // Check updated configuration
        (uint16[] memory percentages, , , , ) = prizePool.getPrizeConfiguration(hackathonId);
        
        assertEq(percentages.length, 3, "Should have 3 percentages");
        assertEq(percentages[0], 6000, "First should be 60%");
        assertEq(percentages[1], 2500, "Second should be 25%");
        assertEq(percentages[2], 1500, "Third should be 15%");
    }

    function test_SetPrizeDistribution_RevertOnInvalidConditions() public {
        uint256 hackathonId = _setupCompleteHackathon();
        
        vm.prank(organizer);
        prizePool.createPrizePool{value: PRIZE_AMOUNT}(hackathonId);
        
        // Empty percentages
        uint16[] memory emptyPercentages = new uint16[](0);
        vm.prank(organizer);
        vm.expectRevert("PrizePool: At least one percentage required");
        prizePool.setPrizeDistribution(hackathonId, emptyPercentages);
        
        // Percentages don't sum to 100%
        uint16[] memory invalidPercentages = new uint16[](2);
        invalidPercentages[0] = 5000; // 50%
        invalidPercentages[1] = 3000; // 30% (total 80%)
        
        vm.prank(organizer);
        vm.expectRevert("PrizePool: Percentages must sum to 100%");
        prizePool.setPrizeDistribution(hackathonId, invalidPercentages);
        
        // Zero percentage
        uint16[] memory zeroPercentages = new uint16[](2);
        zeroPercentages[0] = 10000; // 100%
        zeroPercentages[1] = 0; // 0%
        
        vm.prank(organizer);
        vm.expectRevert("PrizePool: Percentage must be greater than 0");
        prizePool.setPrizeDistribution(hackathonId, zeroPercentages);
    }

    function test_DistributePrizes_WinnerTakesAll() public {
        uint256 hackathonId = _setupCompleteHackathon();
        
        vm.prank(organizer);
        prizePool.createPrizePool{value: PRIZE_AMOUNT}(hackathonId);
        
        // Default is winner takes all (100%)
        vm.prank(organizer);
        prizePool.distributePrizes(hackathonId);
        
        // Check distribution
        assertTrue(prizePool.isPrizeDistributed(hackathonId), "Prizes should be distributed");
        
        // Check winner payout (only 1st place gets everything)
        (address winner, uint256 amount, bool paid) = prizePool.getWinnerPayout(hackathonId, 1);
        
        assertEq(winner, participant1, "Winner should be participant1");
        assertEq(amount, PRIZE_AMOUNT, "Amount should be full prize pool");
        assertFalse(paid, "Should not be paid yet");
    }

    function test_DistributePrizes_MultipleWinners() public {
        uint256 hackathonId = _setupCompleteHackathon();
        
        vm.prank(organizer);
        prizePool.createPrizePool{value: PRIZE_AMOUNT}(hackathonId);
        
        // Set 60/25/15% distribution
        uint16[] memory percentages = new uint16[](3);
        percentages[0] = 6000; // 60%
        percentages[1] = 2500; // 25%
        percentages[2] = 1500; // 15%
        
        vm.prank(organizer);
        prizePool.setPrizeDistribution(hackathonId, percentages);
        
        vm.prank(organizer);
        prizePool.distributePrizes(hackathonId);
        
        // Check all winner payouts
        (address winner1, uint256 amount1, bool paid1) = prizePool.getWinnerPayout(hackathonId, 1);
        (address winner2, uint256 amount2, bool paid2) = prizePool.getWinnerPayout(hackathonId, 2);
        (address winner3, uint256 amount3, bool paid3) = prizePool.getWinnerPayout(hackathonId, 3);
        
        assertEq(winner1, participant1, "1st place should be participant1");
        assertEq(amount1, (PRIZE_AMOUNT * 6000) / 10000, "1st place should get 60%");
        assertFalse(paid1, "1st place should not be paid yet");
        
        assertEq(winner2, participant2, "2nd place should be participant2");
        assertEq(amount2, (PRIZE_AMOUNT * 2500) / 10000, "2nd place should get 25%");
        assertFalse(paid2, "2nd place should not be paid yet");
        
        assertEq(winner3, participant3, "3rd place should be participant3");
        assertEq(amount3, (PRIZE_AMOUNT * 1500) / 10000, "3rd place should get 15%");
        assertFalse(paid3, "3rd place should not be paid yet");
    }

    function test_WithdrawPrize() public {
        uint256 hackathonId = _setupCompleteHackathon();
        
        vm.prank(organizer);
        prizePool.createPrizePool{value: PRIZE_AMOUNT}(hackathonId);
        
        vm.prank(organizer);
        prizePool.distributePrizes(hackathonId);
        
        uint256 balanceBefore = participant1.balance;
        
        // Winner withdraws prize
        vm.prank(participant1);
        prizePool.withdrawPrize(hackathonId, 1);
        
        uint256 balanceAfter = participant1.balance;
        
        assertEq(balanceAfter - balanceBefore, PRIZE_AMOUNT, "Should receive full prize amount");
        
        // Check payout status updated
        (, , bool paid) = prizePool.getWinnerPayout(hackathonId, 1);
        assertTrue(paid, "Should be marked as paid");
    }

    function test_WithdrawPrize_RevertOnInvalidConditions() public {
        uint256 hackathonId = _setupCompleteHackathon();
        
        vm.prank(organizer);
        prizePool.createPrizePool{value: PRIZE_AMOUNT}(hackathonId);
        
        // Cannot withdraw before distribution
        vm.prank(participant1);
        vm.expectRevert("PrizePool: Prizes not yet distributed");
        prizePool.withdrawPrize(hackathonId, 1);
        
        vm.prank(organizer);
        prizePool.distributePrizes(hackathonId);
        
        // Invalid position
        vm.prank(participant1);
        vm.expectRevert("PrizePool: Invalid position");
        prizePool.withdrawPrize(hackathonId, 5);
        
        // Not the winner
        vm.prank(participant2);
        vm.expectRevert("PrizePool: Not the winner for this position");
        prizePool.withdrawPrize(hackathonId, 1);
        
        // Withdraw first time
        vm.prank(participant1);
        prizePool.withdrawPrize(hackathonId, 1);
        
        // Cannot withdraw twice
        vm.prank(participant1);
        vm.expectRevert("PrizePool: Prize already withdrawn");
        prizePool.withdrawPrize(hackathonId, 1);
    }

    function test_WithdrawAllPrizes() public {
        uint256 hackathonId = _setupCompleteHackathon();
        
        vm.prank(organizer);
        prizePool.createPrizePool{value: PRIZE_AMOUNT}(hackathonId);
        
        // Set distribution where participant1 wins multiple positions (for testing)
        // In real scenario, one person can't win multiple positions, but for testing the function
        uint16[] memory percentages = new uint16[](2);
        percentages[0] = 7000; // 70%
        percentages[1] = 3000; // 30%
        
        vm.prank(organizer);
        prizePool.setPrizeDistribution(hackathonId, percentages);
        
        vm.prank(organizer);
        prizePool.distributePrizes(hackathonId);
        
        uint256 balanceBefore = participant1.balance;
        
        // participant1 withdraws all their prizes
        vm.prank(participant1);
        prizePool.withdrawAllPrizes(hackathonId);
        
        uint256 balanceAfter = participant1.balance;
        uint256 expectedAmount = (PRIZE_AMOUNT * 7000) / 10000; // Only 1st place for participant1
        
        assertEq(balanceAfter - balanceBefore, expectedAmount, "Should receive 1st place prize");
    }

    function test_EmergencyWithdraw() public {
        uint256 hackathonId = _setupCompleteHackathon();
        
        vm.prank(organizer);
        prizePool.createPrizePool{value: PRIZE_AMOUNT}(hackathonId);
        
        uint256 balanceBefore = organizer.balance;
        
        // Emergency withdraw before distribution
        vm.prank(organizer);
        prizePool.emergencyWithdraw(hackathonId);
        
        uint256 balanceAfter = organizer.balance;
        
        assertEq(balanceAfter - balanceBefore, PRIZE_AMOUNT, "Should get back full amount");
        assertEq(prizePool.getTotalPrizePool(hackathonId), 0, "Prize pool should be 0");
    }

    function test_GetAllWinnerPayouts() public {
        uint256 hackathonId = _setupCompleteHackathon();
        
        vm.prank(organizer);
        prizePool.createPrizePool{value: PRIZE_AMOUNT}(hackathonId);
        
        // Set 60/25/15% distribution
        uint16[] memory percentages = new uint16[](3);
        percentages[0] = 6000; // 60%
        percentages[1] = 2500; // 25%
        percentages[2] = 1500; // 15%
        
        vm.prank(organizer);
        prizePool.setPrizeDistribution(hackathonId, percentages);
        
        vm.prank(organizer);
        prizePool.distributePrizes(hackathonId);
        
        (
            address[] memory winners,
            uint256[] memory amounts,
            uint256[] memory positions,
            bool[] memory paid
        ) = prizePool.getAllWinnerPayouts(hackathonId);
        
        assertEq(winners.length, 3, "Should have 3 winners");
        assertEq(winners[0], participant1, "1st should be participant1");
        assertEq(winners[1], participant2, "2nd should be participant2");
        assertEq(winners[2], participant3, "3rd should be participant3");
        
        assertEq(amounts[0], (PRIZE_AMOUNT * 6000) / 10000, "1st should get 60%");
        assertEq(amounts[1], (PRIZE_AMOUNT * 2500) / 10000, "2nd should get 25%");
        assertEq(amounts[2], (PRIZE_AMOUNT * 1500) / 10000, "3rd should get 15%");
        
        assertEq(positions[0], 1, "First position should be 1");
        assertEq(positions[1], 2, "Second position should be 2");
        assertEq(positions[2], 3, "Third position should be 3");
        
        assertFalse(paid[0], "1st should not be paid yet");
        assertFalse(paid[1], "2nd should not be paid yet");
        assertFalse(paid[2], "3rd should not be paid yet");
    }
}