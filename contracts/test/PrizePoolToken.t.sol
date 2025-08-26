// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "@forge-std/Test.sol";
import {console} from "@forge-std/console.sol";
import {HackathonRegistry} from "../src/HackathonRegistry.sol";
import {PrizePool} from "../src/PrizePool.sol";
import {MockUSDT} from "../src/MockUSDT.sol";

contract PrizePoolTokenTest is Test {
    HackathonRegistry public registry;
    PrizePool public prizePool;
    MockUSDT public usdt;

    address public admin = makeAddr("admin");
    address public organizer = makeAddr("organizer");
    address public participant1 = makeAddr("participant1");
    address public participant2 = makeAddr("participant2");
    address public participant3 = makeAddr("participant3");
    address public judge1 = makeAddr("judge1");

    uint256 public registrationDeadline;
    uint256 public submissionDeadline;
    uint256 public votingDeadline;

    string public constant TITLE = "Token Hackathon";
    string public constant DESCRIPTION = "A hackathon with token prizes";
    uint256 public constant PRIZE_AMOUNT = 1000 * 10 ** 6; // 1000 USDT

    event PrizePoolCreated(
        uint256 indexed hackathonId,
        address indexed organizer,
        address indexed token,
        uint256 totalAmount,
        uint16[] percentages
    );

    event TokenAdded(address indexed token, bool supported);
    event TokenRemoved(address indexed token);

    function setUp() public {
        vm.startPrank(admin);

        // Deploy contracts
        registry = new HackathonRegistry();
        prizePool = new PrizePool(address(registry));
        usdt = new MockUSDT();

        // Add USDT as supported token
        prizePool.addSupportedToken(address(usdt));

        // Disable platform fees for backward compatibility tests
        prizePool.setPlatformFeeRate(0);

        vm.stopPrank();

        // Set up test environment
        vm.deal(organizer, 100 ether);
        vm.deal(participant1, 1 ether);
        vm.deal(participant2, 1 ether);
        vm.deal(participant3, 1 ether);
        vm.deal(judge1, 1 ether);

        // Give organizer USDT tokens
        vm.prank(admin);
        usdt.mint(organizer, PRIZE_AMOUNT * 10); // 10x for testing

        // Set deadlines
        registrationDeadline = block.timestamp + 7 days;
        submissionDeadline = registrationDeadline + 14 days;
        votingDeadline = submissionDeadline + 7 days;
    }

    function testTokenManagement() public {
        // Test adding token (already done in setup)
        assertTrue(prizePool.isSupportedToken(address(usdt)));

        // Test removing token
        vm.prank(admin);
        prizePool.removeSupportedToken(address(usdt));
        assertFalse(prizePool.isSupportedToken(address(usdt)));

        // Test re-adding token
        vm.prank(admin);
        vm.expectEmit(true, true, false, true);
        emit TokenAdded(address(usdt), true);
        prizePool.addSupportedToken(address(usdt));
        assertTrue(prizePool.isSupportedToken(address(usdt)));
    }

    function testCreateTokenPrizePool() public {
        // Create hackathon first
        vm.prank(organizer);
        uint256 hackathonId = registry.createHackathon(
            TITLE,
            DESCRIPTION,
            registrationDeadline,
            submissionDeadline,
            votingDeadline
        );

        // Add judge
        vm.prank(organizer);
        registry.addJudge(hackathonId, judge1);

        // Approve USDT transfer
        vm.prank(organizer);
        usdt.approve(address(prizePool), PRIZE_AMOUNT);

        // Create token prize pool
        vm.prank(organizer);
        vm.expectEmit(true, true, true, true);

        uint16[] memory percentages = new uint16[](1);
        percentages[0] = 10000; // 100%
        emit PrizePoolCreated(
            hackathonId,
            organizer,
            address(usdt),
            PRIZE_AMOUNT,
            percentages
        );

        prizePool.createTokenPrizePool(
            hackathonId,
            address(usdt),
            PRIZE_AMOUNT
        );

        // Verify prize pool configuration
        (
            uint16[] memory retrievedPercentages,
            uint256 totalPrizePool,
            address prizeOrganizer,
            address token,
            bool distributed,
            uint256 createdAt
        ) = prizePool.getPrizeConfiguration(hackathonId);

        assertEq(retrievedPercentages.length, 1);
        assertEq(retrievedPercentages[0], 10000);
        assertEq(totalPrizePool, PRIZE_AMOUNT);
        assertEq(prizeOrganizer, organizer);
        assertEq(token, address(usdt));
        assertFalse(distributed);
        assertGt(createdAt, 0);

        // Verify token was transferred
        assertEq(usdt.balanceOf(address(prizePool)), PRIZE_AMOUNT);
    }

    function testCreatePrizePoolWithUnsupportedToken() public {
        // Deploy another token but don't add it as supported
        MockUSDT unsupportedToken = new MockUSDT();

        vm.prank(organizer);
        uint256 hackathonId = registry.createHackathon(
            TITLE,
            DESCRIPTION,
            registrationDeadline,
            submissionDeadline,
            votingDeadline
        );

        vm.prank(organizer);
        registry.addJudge(hackathonId, judge1);

        vm.prank(organizer);
        vm.expectRevert("PrizePool: Token not supported");
        prizePool.createTokenPrizePool(
            hackathonId,
            address(unsupportedToken),
            PRIZE_AMOUNT
        );
    }

    function testTokenPrizeDistributionAndWithdrawal() public {
        // Setup hackathon with participants and voting
        vm.prank(organizer);
        uint256 hackathonId = registry.createHackathon(
            TITLE,
            DESCRIPTION,
            registrationDeadline,
            submissionDeadline,
            votingDeadline
        );

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
        vm.warp(registrationDeadline + 1 days);
        vm.prank(participant1);
        registry.updateSubmission(hackathonId, "github.com/project1");
        vm.prank(participant2);
        registry.updateSubmission(hackathonId, "github.com/project2");
        vm.prank(participant3);
        registry.updateSubmission(hackathonId, "github.com/project3");

        // Create token prize pool
        vm.prank(organizer);
        usdt.approve(address(prizePool), PRIZE_AMOUNT);
        vm.prank(organizer);
        prizePool.createTokenPrizePool(
            hackathonId,
            address(usdt),
            PRIZE_AMOUNT
        );

        // Set prize distribution (60%, 30%, 10%)
        uint16[] memory percentages = new uint16[](3);
        percentages[0] = 6000; // 60% - 600 USDT
        percentages[1] = 3000; // 30% - 300 USDT
        percentages[2] = 1000; // 10% - 100 USDT
        vm.prank(organizer);
        prizePool.setPrizeDistribution(hackathonId, percentages);

        // Vote and finalize hackathon
        vm.warp(submissionDeadline + 1 days);
        vm.prank(judge1);
        registry.castVote(hackathonId, participant1, 10, "Great project"); // 1st place
        vm.prank(judge1);
        registry.castVote(hackathonId, participant2, 8, "Good project"); // 2nd place
        vm.prank(judge1);
        registry.castVote(hackathonId, participant3, 6, "Nice work"); // 3rd place

        vm.warp(votingDeadline + 1 days);
        vm.prank(organizer);
        registry.completeVoting(hackathonId);

        // Distribute prizes
        vm.prank(organizer);
        prizePool.distributePrizes(hackathonId);

        // Check winner payouts
        (address winner1, uint256 amount1, bool paid1) = prizePool
            .getWinnerPayout(hackathonId, 1);
        (address winner2, uint256 amount2, bool paid2) = prizePool
            .getWinnerPayout(hackathonId, 2);
        (address winner3, uint256 amount3, bool paid3) = prizePool
            .getWinnerPayout(hackathonId, 3);

        assertEq(winner1, participant1);
        assertEq(amount1, 600 * 10 ** 6); // 600 USDT
        assertFalse(paid1);

        assertEq(winner2, participant2);
        assertEq(amount2, 300 * 10 ** 6); // 300 USDT
        assertFalse(paid2);

        assertEq(winner3, participant3);
        assertEq(amount3, 100 * 10 ** 6); // 100 USDT
        assertFalse(paid3);

        // Winners withdraw prizes
        uint256 participant1BalanceBefore = usdt.balanceOf(participant1);
        vm.prank(participant1);
        prizePool.withdrawPrize(hackathonId, 1);
        assertEq(
            usdt.balanceOf(participant1),
            participant1BalanceBefore + 600 * 10 ** 6
        );

        uint256 participant2BalanceBefore = usdt.balanceOf(participant2);
        vm.prank(participant2);
        prizePool.withdrawPrize(hackathonId, 2);
        assertEq(
            usdt.balanceOf(participant2),
            participant2BalanceBefore + 300 * 10 ** 6
        );

        uint256 participant3BalanceBefore = usdt.balanceOf(participant3);
        vm.prank(participant3);
        prizePool.withdrawPrize(hackathonId, 3);
        assertEq(
            usdt.balanceOf(participant3),
            participant3BalanceBefore + 100 * 10 ** 6
        );

        // Verify payouts marked as paid
        (, , bool finalPaid1) = prizePool.getWinnerPayout(hackathonId, 1);
        (, , bool finalPaid2) = prizePool.getWinnerPayout(hackathonId, 2);
        (, , bool finalPaid3) = prizePool.getWinnerPayout(hackathonId, 3);

        assertTrue(finalPaid1);
        assertTrue(finalPaid2);
        assertTrue(finalPaid3);
    }

    function testEmergencyWithdrawToken() public {
        vm.prank(organizer);
        uint256 hackathonId = registry.createHackathon(
            TITLE,
            DESCRIPTION,
            registrationDeadline,
            submissionDeadline,
            votingDeadline
        );

        vm.prank(organizer);
        registry.addJudge(hackathonId, judge1);

        // Create token prize pool
        vm.prank(organizer);
        usdt.approve(address(prizePool), PRIZE_AMOUNT);
        vm.prank(organizer);
        prizePool.createTokenPrizePool(
            hackathonId,
            address(usdt),
            PRIZE_AMOUNT
        );

        uint256 organizerBalanceBefore = usdt.balanceOf(organizer);

        // Emergency withdraw
        vm.prank(organizer);
        prizePool.emergencyWithdraw(hackathonId);

        assertEq(
            usdt.balanceOf(organizer),
            organizerBalanceBefore + PRIZE_AMOUNT
        );
        assertEq(usdt.balanceOf(address(prizePool)), 0);
    }

    function testViewFunctions() public {
        vm.prank(organizer);
        uint256 hackathonId = registry.createHackathon(
            TITLE,
            DESCRIPTION,
            registrationDeadline,
            submissionDeadline,
            votingDeadline
        );

        vm.prank(organizer);
        registry.addJudge(hackathonId, judge1);

        // Create token prize pool
        vm.prank(organizer);
        usdt.approve(address(prizePool), PRIZE_AMOUNT);
        vm.prank(organizer);
        prizePool.createTokenPrizePool(
            hackathonId,
            address(usdt),
            PRIZE_AMOUNT
        );

        // Test view functions
        assertEq(prizePool.getPrizePoolToken(hackathonId), address(usdt));
        assertFalse(prizePool.isNativeToken(hackathonId));
        assertTrue(prizePool.isSupportedToken(address(usdt)));
        assertTrue(prizePool.isSupportedToken(address(0))); // Native token
    }

    function testMixedTokenTypes() public {
        // Create hackathon for native token
        vm.prank(organizer);
        uint256 nativeHackathonId = registry.createHackathon(
            "Native Hackathon",
            DESCRIPTION,
            registrationDeadline,
            submissionDeadline,
            votingDeadline
        );

        vm.prank(organizer);
        registry.addJudge(nativeHackathonId, judge1);

        // Create hackathon for USDT token
        vm.prank(organizer);
        uint256 tokenHackathonId = registry.createHackathon(
            "Token Hackathon",
            DESCRIPTION,
            registrationDeadline + 1 days,
            submissionDeadline + 1 days,
            votingDeadline + 1 days
        );

        vm.prank(organizer);
        registry.addJudge(tokenHackathonId, judge1);

        // Create native prize pool
        vm.prank(organizer);
        prizePool.createPrizePool{value: 5 ether}(nativeHackathonId);

        // Create token prize pool
        vm.prank(organizer);
        usdt.approve(address(prizePool), PRIZE_AMOUNT);
        vm.prank(organizer);
        prizePool.createTokenPrizePool(
            tokenHackathonId,
            address(usdt),
            PRIZE_AMOUNT
        );

        // Verify both pools
        assertTrue(prizePool.isNativeToken(nativeHackathonId));
        assertFalse(prizePool.isNativeToken(tokenHackathonId));

        assertEq(prizePool.getPrizePoolToken(nativeHackathonId), address(0));
        assertEq(prizePool.getPrizePoolToken(tokenHackathonId), address(usdt));
    }
}
