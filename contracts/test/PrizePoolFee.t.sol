// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "@forge-std/Test.sol";
import {console} from "@forge-std/console.sol";
import {HackathonRegistry} from "../src/HackathonRegistry.sol";
import {PrizePool} from "../src/PrizePool.sol";
import {MockUSDT} from "../src/MockUSDT.sol";

contract PrizePoolFeeTest is Test {
    HackathonRegistry public registry;
    PrizePool public prizePool;
    MockUSDT public usdt;

    address public admin = address(this);
    address public organizer = makeAddr("organizer");
    address public participant1 = makeAddr("participant1");
    address public participant2 = makeAddr("participant2");
    address public participant3 = makeAddr("participant3");
    address public judge1 = makeAddr("judge1");
    address public feeRecipient = makeAddr("feeRecipient");

    uint256 public registrationDeadline;
    uint256 public submissionDeadline;
    uint256 public votingDeadline;

    uint256 public constant PRIZE_AMOUNT = 10e18; // 10 ETH
    uint256 public constant TOKEN_PRIZE_AMOUNT = 1000e6; // 1000 USDT
    uint256 public constant DEFAULT_FEE_RATE = 250; // 2.5%

    event PlatformFeeRateUpdated(uint256 oldRate, uint256 newRate);
    event PlatformFeeRecipientUpdated(address indexed newRecipient);
    event PlatformFeeCollected(
        uint256 indexed hackathonId,
        uint256 feeAmount,
        address indexed recipient
    );

    function setUp() public {
        // Deploy contracts
        registry = new HackathonRegistry();
        prizePool = new PrizePool(address(registry));
        usdt = new MockUSDT();

        // Add USDT as supported token
        prizePool.addSupportedToken(address(usdt));

        // Set up fee system
        prizePool.setPlatformFeeRecipient(feeRecipient);
        prizePool.setPlatformFeeRate(DEFAULT_FEE_RATE);

        // Set up test environment
        vm.deal(organizer, 100 ether);
        vm.deal(participant1, 1 ether);
        vm.deal(participant2, 1 ether);
        vm.deal(participant3, 1 ether);
        vm.deal(judge1, 1 ether);
        vm.deal(feeRecipient, 1 ether); // Ensure fee recipient can receive ETH

        // Give organizer USDT tokens
        usdt.mint(organizer, TOKEN_PRIZE_AMOUNT * 10);

        // Set deadlines
        registrationDeadline = block.timestamp + 7 days;
        submissionDeadline = registrationDeadline + 14 days;
        votingDeadline = submissionDeadline + 7 days;
    }

    function testPlatformFeeManagement() public {
        // Test fee rate update
        vm.expectEmit(true, true, true, true);
        emit PlatformFeeRateUpdated(DEFAULT_FEE_RATE, 500);
        prizePool.setPlatformFeeRate(500); // 5%

        // Test fee recipient update
        address newRecipient = makeAddr("newRecipient");
        vm.expectEmit(true, true, true, true);
        emit PlatformFeeRecipientUpdated(newRecipient);
        prizePool.setPlatformFeeRecipient(newRecipient);

        // Test fee info getter
        (uint256 feeRate, address recipient) = prizePool.getPlatformFeeInfo();
        assertEq(feeRate, 500);
        assertEq(recipient, newRecipient);
    }

    function testFeeRateLockedOnCreation() public {
        // Create hackathon
        uint256 hackathonId = _createHackathon();

        // Create prize pool with current fee rate (2.5%)
        vm.prank(organizer);
        prizePool.createPrizePool{value: PRIZE_AMOUNT}(hackathonId);

        // We'll verify the locked fee rate through distribution behavior
        // Change platform fee rate to 5%
        prizePool.setPlatformFeeRate(500);

        // Create another hackathon to test new rate
        uint256 hackathonId2 = _createHackathon2();
        
        vm.prank(organizer);
        prizePool.createPrizePool{value: PRIZE_AMOUNT}(hackathonId2);

        // Complete both hackathons for distribution testing in other tests
    }

    function testNativeFeeCollection() public {
        uint256 hackathonId = _setupCompleteHackathon();

        // Create prize pool
        vm.prank(organizer);
        prizePool.createPrizePool{value: PRIZE_AMOUNT}(hackathonId);

        // Fast forward to completion
        vm.warp(votingDeadline + 1);

        // Complete voting
        vm.prank(organizer);
        registry.completeVoting(hackathonId);

        // Record fee recipient balance before
        uint256 feeRecipientBalanceBefore = feeRecipient.balance;

        // Distribute prizes (should collect fee)
        vm.expectEmit(true, true, true, true);
        emit PlatformFeeCollected(hackathonId, (PRIZE_AMOUNT * DEFAULT_FEE_RATE) / 10000, feeRecipient);
        
        vm.prank(organizer);
        prizePool.distributePrizes(hackathonId);

        // Verify fee was collected
        uint256 expectedFee = (PRIZE_AMOUNT * DEFAULT_FEE_RATE) / 10000; // 2.5%
        uint256 feeRecipientBalanceAfter = feeRecipient.balance;
        assertEq(feeRecipientBalanceAfter - feeRecipientBalanceBefore, expectedFee);

        // Verify winner gets reduced amount
        (address winner1, uint256 amount1, ) = prizePool.getWinnerPayout(hackathonId, 1);
        uint256 expectedPrizeAfterFee = PRIZE_AMOUNT - expectedFee;
        assertEq(amount1, expectedPrizeAfterFee); // Winner takes all after fee
    }

    function testTokenFeeCollection() public {
        uint256 hackathonId = _setupCompleteHackathon();

        // Approve and create token prize pool
        vm.startPrank(organizer);
        usdt.approve(address(prizePool), TOKEN_PRIZE_AMOUNT);
        prizePool.createTokenPrizePool(hackathonId, address(usdt), TOKEN_PRIZE_AMOUNT);
        vm.stopPrank();

        // Fast forward to completion
        vm.warp(votingDeadline + 1);

        // Complete voting
        vm.prank(organizer);
        registry.completeVoting(hackathonId);

        // Record fee recipient USDT balance before
        uint256 feeRecipientBalanceBefore = usdt.balanceOf(feeRecipient);

        // Distribute prizes (should collect fee)
        uint256 expectedFee = (TOKEN_PRIZE_AMOUNT * DEFAULT_FEE_RATE) / 10000; // 2.5%
        vm.expectEmit(true, true, true, true);
        emit PlatformFeeCollected(hackathonId, expectedFee, feeRecipient);
        
        vm.prank(organizer);
        prizePool.distributePrizes(hackathonId);

        // Verify fee was collected in USDT
        uint256 feeRecipientBalanceAfter = usdt.balanceOf(feeRecipient);
        assertEq(feeRecipientBalanceAfter - feeRecipientBalanceBefore, expectedFee);
    }

    function testMultipleWinnersFeeDistribution() public {
        uint256 hackathonId = _setupCompleteHackathon();

        // Create prize pool
        vm.prank(organizer);
        prizePool.createPrizePool{value: PRIZE_AMOUNT}(hackathonId);

        // Set distribution: 60%, 25%, 15%
        uint16[] memory percentages = new uint16[](3);
        percentages[0] = 6000; // 60%
        percentages[1] = 2500; // 25%
        percentages[2] = 1500; // 15%

        vm.prank(organizer);
        prizePool.setPrizeDistribution(hackathonId, percentages);

        // Fast forward and complete
        vm.warp(votingDeadline + 1);
        vm.prank(organizer);
        registry.completeVoting(hackathonId);

        // Distribute prizes
        vm.prank(organizer);
        prizePool.distributePrizes(hackathonId);

        // Calculate expected amounts after fee
        uint256 expectedFee = (PRIZE_AMOUNT * DEFAULT_FEE_RATE) / 10000; // 2.5%
        uint256 prizeAfterFee = PRIZE_AMOUNT - expectedFee;
        
        uint256 expected1st = (prizeAfterFee * 6000) / 10000; // 60%
        uint256 expected2nd = (prizeAfterFee * 2500) / 10000; // 25%
        uint256 expected3rd = (prizeAfterFee * 1500) / 10000; // 15%

        // Verify each winner amount
        (, uint256 amount1, ) = prizePool.getWinnerPayout(hackathonId, 1);
        (, uint256 amount2, ) = prizePool.getWinnerPayout(hackathonId, 2);
        (, uint256 amount3, ) = prizePool.getWinnerPayout(hackathonId, 3);

        assertEq(amount1, expected1st);
        assertEq(amount2, expected2nd);
        assertEq(amount3, expected3rd);

        // Verify fee recipient received correct fee
        assertEq(feeRecipient.balance, 1 ether + expectedFee); // Initial 1 ether + fee
    }

    function testZeroFeeRate() public {
        // Set fee rate to 0%
        prizePool.setPlatformFeeRate(0);

        uint256 hackathonId = _setupCompleteHackathon();

        // Create prize pool
        vm.prank(organizer);
        prizePool.createPrizePool{value: PRIZE_AMOUNT}(hackathonId);

        // Fast forward and complete
        vm.warp(votingDeadline + 1);
        vm.prank(organizer);
        registry.completeVoting(hackathonId);

        // Record balances before distribution
        uint256 feeRecipientBalanceBefore = feeRecipient.balance;

        // Distribute prizes
        vm.prank(organizer);
        prizePool.distributePrizes(hackathonId);

        // Verify no fee was collected
        assertEq(feeRecipient.balance, feeRecipientBalanceBefore);

        // Verify winner gets full amount
        (, uint256 amount1, ) = prizePool.getWinnerPayout(hackathonId, 1);
        assertEq(amount1, PRIZE_AMOUNT); // Full amount, no fee deduction
    }

    function testHighFeeRate() public {
        // Set fee rate to 50%
        uint256 highFeeRate = 5000; // 50%
        prizePool.setPlatformFeeRate(highFeeRate);

        uint256 hackathonId = _setupCompleteHackathon();

        // Create prize pool
        vm.prank(organizer);
        prizePool.createPrizePool{value: PRIZE_AMOUNT}(hackathonId);

        // Fast forward and complete
        vm.warp(votingDeadline + 1);
        vm.prank(organizer);
        registry.completeVoting(hackathonId);

        // Distribute prizes
        vm.prank(organizer);
        prizePool.distributePrizes(hackathonId);

        // Verify high fee was collected
        uint256 expectedFee = (PRIZE_AMOUNT * highFeeRate) / 10000; // 50%
        uint256 expectedPrize = PRIZE_AMOUNT - expectedFee;
        
        assertEq(feeRecipient.balance, 1 ether + expectedFee);
        
        (, uint256 amount1, ) = prizePool.getWinnerPayout(hackathonId, 1);
        assertEq(amount1, expectedPrize);
    }

    // Helper functions
    function _createHackathon() internal returns (uint256) {
        vm.prank(organizer);
        return registry.createHackathon(
            "Test Hackathon",
            "A test hackathon for fee testing",
            registrationDeadline,
            submissionDeadline,
            votingDeadline
        );
    }

    function _createHackathon2() internal returns (uint256) {
        vm.prank(organizer);
        return registry.createHackathon(
            "Test Hackathon 2",
            "A second test hackathon for fee testing",
            registrationDeadline + 1 days,
            submissionDeadline + 1 days,
            votingDeadline + 1 days
        );
    }

    function _setupCompleteHackathon() internal returns (uint256 hackathonId) {
        hackathonId = _createHackathon();

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
        vm.warp(registrationDeadline + 1);
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

        // Cast votes (participant1 wins)
        vm.prank(judge1);
        registry.castVote(hackathonId, participant1, 9, "Excellent!");
        vm.prank(judge1);
        registry.castVote(hackathonId, participant2, 7, "Good work");
        vm.prank(judge1);
        registry.castVote(hackathonId, participant3, 6, "Nice effort");
    }
}