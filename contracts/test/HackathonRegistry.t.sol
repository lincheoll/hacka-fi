// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "@forge-std/Test.sol";
import {HackathonRegistry} from "../src/HackathonRegistry.sol";

contract HackathonRegistryTest is Test {
    HackathonRegistry public registry;
    
    address public organizer = makeAddr("organizer");
    address public participant1 = makeAddr("participant1");
    address public participant2 = makeAddr("participant2");
    address public judge1 = makeAddr("judge1");
    address public judge2 = makeAddr("judge2");
    
    uint256 public REGISTRATION_DEADLINE;
    uint256 public SUBMISSION_DEADLINE;
    uint256 public VOTING_DEADLINE;
    
    string public constant TITLE = "Test Hackathon";
    string public constant DESCRIPTION = "A test hackathon for smart contract testing";

    event HackathonCreated(
        uint256 indexed hackathonId,
        string title,
        address indexed organizer,
        uint256 registrationDeadline,
        uint256 submissionDeadline,
        uint256 votingDeadline
    );

    event ParticipantRegistered(
        uint256 indexed hackathonId,
        address indexed participant,
        uint256 timestamp
    );

    event JudgeAdded(
        uint256 indexed hackathonId,
        address indexed judge,
        address indexed organizer
    );

    function setUp() public {
        registry = new HackathonRegistry();
        
        // Set deadlines
        REGISTRATION_DEADLINE = block.timestamp + 1 days;
        SUBMISSION_DEADLINE = block.timestamp + 7 days;
        VOTING_DEADLINE = block.timestamp + 14 days;
        
        // Fund test addresses (not needed for HackathonRegistry anymore)
        vm.deal(organizer, 10 ether);
        vm.deal(participant1, 1 ether);
        vm.deal(participant2, 1 ether);
    }

    function test_CreateHackathon() public {
        vm.prank(organizer);
        
        vm.expectEmit(true, true, false, true);
        emit HackathonCreated(
            1,
            TITLE,
            organizer,
            REGISTRATION_DEADLINE,
            SUBMISSION_DEADLINE,
            VOTING_DEADLINE
        );
        
        uint256 hackathonId = registry.createHackathon(
            TITLE,
            DESCRIPTION,
            REGISTRATION_DEADLINE,
            SUBMISSION_DEADLINE,
            VOTING_DEADLINE
        );
        
        assertEq(hackathonId, 1, "First hackathon should have ID 1");
        
        (
            string memory title,
            string memory description,
            address hackathonOrganizer,
            uint256 regDeadline,
            uint256 subDeadline,
            uint256 voteDeadline,
            HackathonRegistry.HackathonStatus status,
            uint256 participantCount,
            uint256 judgeCount
        ) = registry.getHackathonInfo(hackathonId);
        
        assertEq(title, TITLE, "Title should match");
        assertEq(description, DESCRIPTION, "Description should match");
        assertEq(hackathonOrganizer, organizer, "Organizer should match");
        assertEq(regDeadline, REGISTRATION_DEADLINE, "Registration deadline should match");
        assertEq(subDeadline, SUBMISSION_DEADLINE, "Submission deadline should match");
        assertEq(voteDeadline, VOTING_DEADLINE, "Voting deadline should match");
        assertEq(uint(status), uint(HackathonRegistry.HackathonStatus.Created), "Status should be Created");
        assertEq(participantCount, 0, "Participant count should be 0");
        assertEq(judgeCount, 0, "Judge count should be 0");
    }

    function test_CreateHackathon_RevertOnInvalidInputs() public {
        vm.prank(organizer);
        
        // Empty title
        vm.expectRevert("HackathonRegistry: Title cannot be empty");
        registry.createHackathon(
            "",
            DESCRIPTION,
            REGISTRATION_DEADLINE,
            SUBMISSION_DEADLINE,
            VOTING_DEADLINE
        );
        
        // Empty description
        vm.expectRevert("HackathonRegistry: Description cannot be empty");
        registry.createHackathon(
            TITLE,
            "",
            REGISTRATION_DEADLINE,
            SUBMISSION_DEADLINE,
            VOTING_DEADLINE
        );
        
        // Past registration deadline
        vm.expectRevert("HackathonRegistry: Registration deadline must be in the future");
        registry.createHackathon(
            TITLE,
            DESCRIPTION,
            block.timestamp - 1,
            SUBMISSION_DEADLINE,
            VOTING_DEADLINE
        );
        
        // Invalid deadline order
        vm.expectRevert("HackathonRegistry: Submission deadline must be after registration deadline");
        registry.createHackathon(
            TITLE,
            DESCRIPTION,
            REGISTRATION_DEADLINE,
            REGISTRATION_DEADLINE - 1,
            VOTING_DEADLINE
        );
    }

    function test_RegisterParticipant() public {
        // Create hackathon first
        vm.prank(organizer);
        uint256 hackathonId = registry.createHackathon(
            TITLE,
            DESCRIPTION,
            REGISTRATION_DEADLINE,
            SUBMISSION_DEADLINE,
            VOTING_DEADLINE
        );
        
        // Register participant
        vm.prank(participant1);
        vm.expectEmit(true, true, false, true);
        emit ParticipantRegistered(hackathonId, participant1, block.timestamp);
        
        registry.registerParticipant(hackathonId);
        
        // Check participant info
        (string memory submissionUrl, uint256 regTime, bool hasSubmitted) = 
            registry.getParticipantInfo(hackathonId, participant1);
        
        assertEq(submissionUrl, "", "Submission URL should be empty initially");
        assertEq(regTime, block.timestamp, "Registration time should match");
        assertFalse(hasSubmitted, "Should not have submitted initially");
        
        // Check participant list
        address[] memory participants = registry.getParticipants(hackathonId);
        assertEq(participants.length, 1, "Should have 1 participant");
        assertEq(participants[0], participant1, "Participant should be in list");
        
        // Check hackathon status changed to Active
        (, , , , , , HackathonRegistry.HackathonStatus status, uint256 participantCount, ) = 
            registry.getHackathonInfo(hackathonId);
        assertEq(uint(status), uint(HackathonRegistry.HackathonStatus.Active), "Status should be Active");
        assertEq(participantCount, 1, "Participant count should be 1");
    }

    function test_RegisterParticipant_RevertOnInvalidCases() public {
        vm.prank(organizer);
        uint256 hackathonId = registry.createHackathon(
            TITLE,
            DESCRIPTION,
            REGISTRATION_DEADLINE,
            SUBMISSION_DEADLINE,
            VOTING_DEADLINE
        );
        
        // Organizer cannot participate
        vm.prank(organizer);
        vm.expectRevert("HackathonRegistry: Organizer cannot participate");
        registry.registerParticipant(hackathonId);
        
        // Register participant1 first
        vm.prank(participant1);
        registry.registerParticipant(hackathonId);
        
        // Cannot register twice
        vm.prank(participant1);
        vm.expectRevert("HackathonRegistry: Already registered");
        registry.registerParticipant(hackathonId);
        
        // Test deadline expiry
        vm.warp(REGISTRATION_DEADLINE + 1);
        vm.prank(participant2);
        vm.expectRevert("HackathonRegistry: Registration deadline has passed");
        registry.registerParticipant(hackathonId);
    }

    function test_AddJudge() public {
        vm.prank(organizer);
        uint256 hackathonId = registry.createHackathon(
            TITLE,
            DESCRIPTION,
            REGISTRATION_DEADLINE,
            SUBMISSION_DEADLINE,
            VOTING_DEADLINE
        );
        
        vm.prank(organizer);
        vm.expectEmit(true, true, true, false);
        emit JudgeAdded(hackathonId, judge1, organizer);
        
        registry.addJudge(hackathonId, judge1);
        
        assertTrue(registry.isJudge(hackathonId, judge1), "Address should be a judge");
        
        (, , , , , , , , uint256 judgeCount) = registry.getHackathonInfo(hackathonId);
        assertEq(judgeCount, 1, "Judge count should be 1");
    }

    function test_AddJudge_RevertOnInvalidCases() public {
        vm.prank(organizer);
        uint256 hackathonId = registry.createHackathon(
            TITLE,
            DESCRIPTION,
            REGISTRATION_DEADLINE,
            SUBMISSION_DEADLINE,
            VOTING_DEADLINE
        );
        
        // Only organizer can add judge
        vm.prank(participant1);
        vm.expectRevert("HackathonRegistry: Only organizer can perform this action");
        registry.addJudge(hackathonId, judge1);
        
        // Cannot add same judge twice
        vm.prank(organizer);
        registry.addJudge(hackathonId, judge1);
        
        vm.prank(organizer);
        vm.expectRevert("HackathonRegistry: Judge already added");
        registry.addJudge(hackathonId, judge1);
        
        // Register participant first
        vm.prank(participant1);
        registry.registerParticipant(hackathonId);
        
        // Participant cannot be judge
        vm.prank(organizer);
        vm.expectRevert("HackathonRegistry: Judge cannot be a participant");
        registry.addJudge(hackathonId, participant1);
    }

    function test_UpdateSubmission() public {
        vm.prank(organizer);
        uint256 hackathonId = registry.createHackathon(
            TITLE,
            DESCRIPTION,
            REGISTRATION_DEADLINE,
            SUBMISSION_DEADLINE,
            VOTING_DEADLINE
        );
        
        vm.prank(participant1);
        registry.registerParticipant(hackathonId);
        
        string memory submissionUrl = "https://github.com/participant1/hackathon-project";
        
        vm.prank(participant1);
        registry.updateSubmission(hackathonId, submissionUrl);
        
        (string memory storedUrl, , bool hasSubmitted) = 
            registry.getParticipantInfo(hackathonId, participant1);
        
        assertEq(storedUrl, submissionUrl, "Submission URL should match");
        assertTrue(hasSubmitted, "Should have submitted");
    }

    function test_UpdateSubmission_RevertOnInvalidCases() public {
        vm.prank(organizer);
        uint256 hackathonId = registry.createHackathon(
            TITLE,
            DESCRIPTION,
            REGISTRATION_DEADLINE,
            SUBMISSION_DEADLINE,
            VOTING_DEADLINE
        );
        
        // Not registered participant
        vm.prank(participant1);
        vm.expectRevert("HackathonRegistry: Not registered as participant");
        registry.updateSubmission(hackathonId, "https://example.com");
        
        // Register participant
        vm.prank(participant1);
        registry.registerParticipant(hackathonId);
        
        // Empty submission URL
        vm.prank(participant1);
        vm.expectRevert("HackathonRegistry: Submission URL cannot be empty");
        registry.updateSubmission(hackathonId, "");
        
        // After submission deadline
        vm.warp(SUBMISSION_DEADLINE + 1);
        vm.prank(participant1);
        vm.expectRevert("HackathonRegistry: Submission deadline has passed");
        registry.updateSubmission(hackathonId, "https://example.com");
    }

    function test_RemoveJudge() public {
        vm.prank(organizer);
        uint256 hackathonId = registry.createHackathon(
            TITLE,
            DESCRIPTION,
            REGISTRATION_DEADLINE,
            SUBMISSION_DEADLINE,
            VOTING_DEADLINE
        );
        
        vm.prank(organizer);
        registry.addJudge(hackathonId, judge1);
        
        vm.prank(organizer);
        registry.removeJudge(hackathonId, judge1);
        
        assertFalse(registry.isJudge(hackathonId, judge1), "Address should not be a judge");
        
        (, , , , , , , , uint256 judgeCount) = registry.getHackathonInfo(hackathonId);
        assertEq(judgeCount, 0, "Judge count should be 0");
    }

    function test_MultipleParticipants() public {
        vm.prank(organizer);
        uint256 hackathonId = registry.createHackathon(
            TITLE,
            DESCRIPTION,
            REGISTRATION_DEADLINE,
            SUBMISSION_DEADLINE,
            VOTING_DEADLINE
        );
        
        // Register multiple participants
        vm.prank(participant1);
        registry.registerParticipant(hackathonId);
        
        vm.prank(participant2);
        registry.registerParticipant(hackathonId);
        
        address[] memory participants = registry.getParticipants(hackathonId);
        assertEq(participants.length, 2, "Should have 2 participants");
        assertEq(participants[0], participant1, "First participant should match");
        assertEq(participants[1], participant2, "Second participant should match");
        
        (, , , , , , , uint256 participantCount, ) = registry.getHackathonInfo(hackathonId);
        assertEq(participantCount, 2, "Participant count should be 2");
    }
}