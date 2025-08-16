// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "@forge-std/Test.sol";
import {HackathonRegistry} from "../src/HackathonRegistry.sol";

contract HackathonRegistryVotingTest is Test {
    HackathonRegistry public registry;
    
    address public organizer = makeAddr("organizer");
    address public participant1 = makeAddr("participant1");
    address public participant2 = makeAddr("participant2");
    address public participant3 = makeAddr("participant3");
    address public judge1 = makeAddr("judge1");
    address public judge2 = makeAddr("judge2");
    address public judge3 = makeAddr("judge3");
    
    uint256 public registrationDeadline;
    uint256 public submissionDeadline;
    uint256 public votingDeadline;
    
    string public constant TITLE = "Test Hackathon";
    string public constant DESCRIPTION = "A test hackathon for voting system testing";
    string public constant SUBMISSION_URL = "https://github.com/participant/project";

    event VoteCast(
        uint256 indexed hackathonId,
        address indexed judge,
        address indexed participant,
        uint8 score,
        string comment,
        uint256 timestamp
    );

    event VotingPhaseStarted(
        uint256 indexed hackathonId,
        uint256 timestamp
    );

    event VotingCompleted(
        uint256 indexed hackathonId,
        uint256 totalVotes,
        uint256 timestamp
    );

    function setUp() public {
        registry = new HackathonRegistry();
        
        // Set deadlines
        registrationDeadline = block.timestamp + 1 days;
        submissionDeadline = block.timestamp + 7 days;
        votingDeadline = block.timestamp + 14 days;
        
        // Fund test addresses
        vm.deal(organizer, 10 ether);
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
        
        // Add judges
        vm.startPrank(organizer);
        registry.addJudge(hackathonId, judge1);
        registry.addJudge(hackathonId, judge2);
        registry.addJudge(hackathonId, judge3);
        vm.stopPrank();
        
        // Register participants
        vm.prank(participant1);
        registry.registerParticipant(hackathonId);
        
        vm.prank(participant2);
        registry.registerParticipant(hackathonId);
        
        vm.prank(participant3);
        registry.registerParticipant(hackathonId);
        
        // Submit projects
        vm.prank(participant1);
        registry.updateSubmission(hackathonId, SUBMISSION_URL);
        
        vm.prank(participant2);
        registry.updateSubmission(hackathonId, SUBMISSION_URL);
        
        vm.prank(participant3);
        registry.updateSubmission(hackathonId, SUBMISSION_URL);
        
        return hackathonId;
    }

    function test_StartVotingPhase() public {
        uint256 hackathonId = _setupCompleteHackathon();
        
        // Move past submission deadline
        vm.warp(submissionDeadline + 1);
        
        vm.prank(organizer);
        vm.expectEmit(true, false, false, true);
        emit VotingPhaseStarted(hackathonId, block.timestamp);
        
        registry.startVotingPhase(hackathonId);
        
        // Check status changed
        (, , , , , , HackathonRegistry.HackathonStatus status, , ) = 
            registry.getHackathonInfo(hackathonId);
        assertEq(uint(status), uint(HackathonRegistry.HackathonStatus.Voting), "Status should be Voting");
    }

    function test_StartVotingPhase_RevertOnInvalidConditions() public {
        uint256 hackathonId = _setupCompleteHackathon();
        
        // Cannot start voting before submission deadline
        vm.prank(organizer);
        vm.expectRevert("HackathonRegistry: Submission deadline has not passed");
        registry.startVotingPhase(hackathonId);
        
        // Move past submission deadline
        vm.warp(submissionDeadline + 1);
        
        // Only organizer can start voting
        vm.prank(participant1);
        vm.expectRevert("HackathonRegistry: Only organizer can perform this action");
        registry.startVotingPhase(hackathonId);
    }

    function test_CastVote() public {
        uint256 hackathonId = _setupCompleteHackathon();
        
        // Start voting phase
        vm.warp(submissionDeadline + 1);
        vm.prank(organizer);
        registry.startVotingPhase(hackathonId);
        
        // Cast vote
        vm.prank(judge1);
        vm.expectEmit(true, true, true, true);
        emit VoteCast(hackathonId, judge1, participant1, 8, "Great project!", block.timestamp);
        
        registry.castVote(hackathonId, participant1, 8, "Great project!");
        
        // Check vote was recorded
        (uint8 score, string memory comment, uint256 timestamp) = 
            registry.getVote(hackathonId, judge1, participant1);
        
        assertEq(score, 8, "Score should be 8");
        assertEq(comment, "Great project!", "Comment should match");
        assertEq(timestamp, block.timestamp, "Timestamp should match");
        
        // Check participant scores updated
        (uint256 totalScore, uint256 voteCount, uint256 averageScore) = 
            registry.getParticipantScores(hackathonId, participant1);
        
        assertEq(totalScore, 8, "Total score should be 8");
        assertEq(voteCount, 1, "Vote count should be 1");
        assertEq(averageScore, 800, "Average score should be 800 (8.00 * 100)");
    }

    function test_CastVote_RevertOnInvalidConditions() public {
        uint256 hackathonId = _setupCompleteHackathon();
        
        // Cannot vote before voting phase
        vm.prank(judge1);
        vm.expectRevert("HackathonRegistry: Voting is not active");
        registry.castVote(hackathonId, participant1, 8, "Great project!");
        
        // Create new participant without submission before voting starts
        address participant4 = makeAddr("participant4");
        vm.prank(participant4);
        registry.registerParticipant(hackathonId);
        
        // Start voting phase
        vm.warp(submissionDeadline + 1);
        vm.prank(organizer);
        registry.startVotingPhase(hackathonId);
        
        // Only judges can vote
        vm.prank(participant1);
        vm.expectRevert("HackathonRegistry: Only judge can perform this action");
        registry.castVote(hackathonId, participant2, 8, "Great project!");
        
        // Invalid score range
        vm.prank(judge1);
        vm.expectRevert("HackathonRegistry: Score must be between 1 and 10");
        registry.castVote(hackathonId, participant1, 11, "Great project!");
        
        vm.prank(judge1);
        vm.expectRevert("HackathonRegistry: Score must be between 1 and 10");
        registry.castVote(hackathonId, participant1, 0, "Great project!");
        
        // Cannot vote for participant who hasn't submitted
        vm.prank(judge1);
        vm.expectRevert("HackathonRegistry: Participant has not submitted");
        registry.castVote(hackathonId, participant4, 8, "Great project!");
        
        // Cannot vote twice for same participant
        vm.prank(judge1);
        registry.castVote(hackathonId, participant1, 8, "Great project!");
        
        vm.prank(judge1);
        vm.expectRevert("HackathonRegistry: Judge has already voted for this participant");
        registry.castVote(hackathonId, participant1, 9, "Even better!");
    }

    function test_MultipleVotesAndScoring() public {
        uint256 hackathonId = _setupCompleteHackathon();
        
        // Start voting phase
        vm.warp(submissionDeadline + 1);
        vm.prank(organizer);
        registry.startVotingPhase(hackathonId);
        
        // Multiple judges vote for participant1
        vm.prank(judge1);
        registry.castVote(hackathonId, participant1, 8, "Great project!");
        
        vm.prank(judge2);
        registry.castVote(hackathonId, participant1, 9, "Excellent work!");
        
        vm.prank(judge3);
        registry.castVote(hackathonId, participant1, 7, "Good effort!");
        
        // Check aggregated scores
        (uint256 totalScore, uint256 voteCount, uint256 averageScore) = 
            registry.getParticipantScores(hackathonId, participant1);
        
        assertEq(totalScore, 24, "Total score should be 24 (8+9+7)");
        assertEq(voteCount, 3, "Vote count should be 3");
        assertEq(averageScore, 800, "Average score should be 800 (8.00 * 100)");
        
        // Vote for other participants with different scores
        vm.prank(judge1);
        registry.castVote(hackathonId, participant2, 6, "Decent project");
        
        vm.prank(judge1);
        registry.castVote(hackathonId, participant3, 10, "Outstanding!");
    }

    function test_GetLeaderboard() public {
        uint256 hackathonId = _setupCompleteHackathon();
        
        // Start voting phase
        vm.warp(submissionDeadline + 1);
        vm.prank(organizer);
        registry.startVotingPhase(hackathonId);
        
        // Cast votes to create different averages
        // Participant1: Average 8.0 (8+9+7)/3 = 8.0
        vm.prank(judge1);
        registry.castVote(hackathonId, participant1, 8, "Great!");
        vm.prank(judge2);
        registry.castVote(hackathonId, participant1, 9, "Excellent!");
        vm.prank(judge3);
        registry.castVote(hackathonId, participant1, 7, "Good!");
        
        // Participant2: Average 9.0 (10+8)/2 = 9.0
        vm.prank(judge1);
        registry.castVote(hackathonId, participant2, 10, "Perfect!");
        vm.prank(judge2);
        registry.castVote(hackathonId, participant2, 8, "Great!");
        
        // Participant3: Average 6.0 (6)/1 = 6.0
        vm.prank(judge1);
        registry.castVote(hackathonId, participant3, 6, "Okay");
        
        // Get leaderboard
        (address[] memory sortedParticipants, uint256[] memory averageScores) = 
            registry.getLeaderboard(hackathonId);
        
        assertEq(sortedParticipants.length, 3, "Should have 3 participants");
        
        // Check order (highest to lowest)
        assertEq(sortedParticipants[0], participant2, "First place should be participant2");
        assertEq(averageScores[0], 900, "First place average should be 900 (9.00)");
        
        assertEq(sortedParticipants[1], participant1, "Second place should be participant1");
        assertEq(averageScores[1], 800, "Second place average should be 800 (8.00)");
        
        assertEq(sortedParticipants[2], participant3, "Third place should be participant3");
        assertEq(averageScores[2], 600, "Third place average should be 600 (6.00)");
    }

    function test_GetWinners() public {
        uint256 hackathonId = _setupCompleteHackathon();
        
        // Start voting phase
        vm.warp(submissionDeadline + 1);
        vm.prank(organizer);
        registry.startVotingPhase(hackathonId);
        
        // Cast votes
        vm.prank(judge1);
        registry.castVote(hackathonId, participant1, 8, "Great!");
        vm.prank(judge1);
        registry.castVote(hackathonId, participant2, 10, "Perfect!");
        vm.prank(judge1);
        registry.castVote(hackathonId, participant3, 6, "Okay");
        
        // Complete voting
        vm.warp(votingDeadline + 1);
        vm.prank(organizer);
        registry.completeVoting(hackathonId);
        
        // Get winners
        (address firstPlace, address secondPlace, address thirdPlace) = 
            registry.getWinners(hackathonId);
        
        assertEq(firstPlace, participant2, "First place should be participant2");
        assertEq(secondPlace, participant1, "Second place should be participant1");
        assertEq(thirdPlace, participant3, "Third place should be participant3");
    }

    function test_CompleteVoting() public {
        uint256 hackathonId = _setupCompleteHackathon();
        
        // Start voting phase
        vm.warp(submissionDeadline + 1);
        vm.prank(organizer);
        registry.startVotingPhase(hackathonId);
        
        // Cast some votes
        vm.prank(judge1);
        registry.castVote(hackathonId, participant1, 8, "Great!");
        
        // Complete voting after deadline
        vm.warp(votingDeadline + 1);
        vm.prank(organizer);
        vm.expectEmit(true, false, false, true);
        emit VotingCompleted(hackathonId, 1, block.timestamp);
        
        registry.completeVoting(hackathonId);
        
        // Check status changed
        (, , , , , , HackathonRegistry.HackathonStatus status, , ) = 
            registry.getHackathonInfo(hackathonId);
        assertEq(uint(status), uint(HackathonRegistry.HackathonStatus.Completed), "Status should be Completed");
    }

    function test_GetVotingStats() public {
        uint256 hackathonId = _setupCompleteHackathon();
        
        // Start voting phase
        vm.warp(submissionDeadline + 1);
        vm.prank(organizer);
        registry.startVotingPhase(hackathonId);
        
        // Cast some votes
        vm.prank(judge1);
        registry.castVote(hackathonId, participant1, 8, "Great!");
        vm.prank(judge2);
        registry.castVote(hackathonId, participant1, 9, "Excellent!");
        vm.prank(judge1);
        registry.castVote(hackathonId, participant2, 7, "Good!");
        
        // Get voting stats
        (uint256 totalVotes, uint256 totalJudges, uint256 judgesWhoVoted, bool isVotingComplete) = 
            registry.getVotingStats(hackathonId);
        
        assertEq(totalVotes, 3, "Should have 3 total votes");
        assertEq(totalJudges, 3, "Should have 3 total judges");
        assertFalse(isVotingComplete, "Voting should not be complete yet");
    }
}