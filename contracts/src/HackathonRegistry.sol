// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract HackathonRegistry is AccessControl, ReentrancyGuard {
    bytes32 public constant ORGANIZER_ROLE = keccak256("ORGANIZER_ROLE");
    bytes32 public constant JUDGE_ROLE = keccak256("JUDGE_ROLE");

    enum HackathonStatus {
        Created,
        Active,
        Voting,
        Completed,
        Cancelled
    }

    struct Hackathon {
        uint256 id;
        string title;
        string description;
        address organizer;
        uint256 registrationDeadline;
        uint256 submissionDeadline;
        uint256 votingDeadline;
        HackathonStatus status;
        uint256 participantCount;
        mapping(address => bool) judges;
        uint256 judgeCount;
    }

    struct Participant {
        address participantAddress;
        string submissionUrl;
        uint256 registrationTime;
        bool hasSubmitted;
        uint256 totalScore;
        uint256 voteCount;
        uint256 averageScore; // Stored as score * 100 for precision (e.g., 750 = 7.50)
    }

    struct Vote {
        address judge;
        address participant;
        uint8 score; // 1-10 points
        uint256 timestamp;
        string comment;
    }

    uint256 private _hackathonIdCounter;
    mapping(uint256 => Hackathon) public hackathons;
    mapping(uint256 => mapping(address => Participant)) public participants;
    mapping(uint256 => address[]) public participantList;
    
    // Voting mappings
    mapping(uint256 => mapping(address => mapping(address => Vote))) public votes; // hackathonId => judge => participant => vote
    mapping(uint256 => mapping(address => bool)) public hasJudgeVoted; // hackathonId => judge => hasVoted for at least one participant
    mapping(uint256 => uint256) public totalVotesCount; // hackathonId => total votes cast

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

    event JudgeRemoved(
        uint256 indexed hackathonId,
        address indexed judge,
        address indexed organizer
    );

    event SubmissionUpdated(
        uint256 indexed hackathonId,
        address indexed participant,
        string submissionUrl
    );

    event HackathonStatusChanged(
        uint256 indexed hackathonId,
        HackathonStatus oldStatus,
        HackathonStatus newStatus
    );

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

    modifier onlyOrganizer(uint256 hackathonId) {
        require(
            hackathons[hackathonId].organizer == msg.sender,
            "HackathonRegistry: Only organizer can perform this action"
        );
        _;
    }

    modifier onlyJudge(uint256 hackathonId) {
        require(
            hackathons[hackathonId].judges[msg.sender],
            "HackathonRegistry: Only judge can perform this action"
        );
        _;
    }

    modifier hackathonExists(uint256 hackathonId) {
        require(
            hackathonId > 0 && hackathonId <= _hackathonIdCounter,
            "HackathonRegistry: Hackathon does not exist"
        );
        _;
    }

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ORGANIZER_ROLE, msg.sender);
    }

    function createHackathon(
        string memory title,
        string memory description,
        uint256 registrationDeadline,
        uint256 submissionDeadline,
        uint256 votingDeadline
    ) external returns (uint256) {
        require(bytes(title).length > 0, "HackathonRegistry: Title cannot be empty");
        require(bytes(description).length > 0, "HackathonRegistry: Description cannot be empty");
        require(
            registrationDeadline > block.timestamp,
            "HackathonRegistry: Registration deadline must be in the future"
        );
        require(
            submissionDeadline > registrationDeadline,
            "HackathonRegistry: Submission deadline must be after registration deadline"
        );
        require(
            votingDeadline > submissionDeadline,
            "HackathonRegistry: Voting deadline must be after submission deadline"
        );

        _hackathonIdCounter++;
        uint256 hackathonId = _hackathonIdCounter;

        Hackathon storage hackathon = hackathons[hackathonId];
        hackathon.id = hackathonId;
        hackathon.title = title;
        hackathon.description = description;
        hackathon.organizer = msg.sender;
        hackathon.registrationDeadline = registrationDeadline;
        hackathon.submissionDeadline = submissionDeadline;
        hackathon.votingDeadline = votingDeadline;
        hackathon.status = HackathonStatus.Created;
        hackathon.participantCount = 0;
        hackathon.judgeCount = 0;

        _grantRole(ORGANIZER_ROLE, msg.sender);

        emit HackathonCreated(
            hackathonId,
            title,
            msg.sender,
            registrationDeadline,
            submissionDeadline,
            votingDeadline
        );

        return hackathonId;
    }

    function registerParticipant(uint256 hackathonId) 
        external 
        hackathonExists(hackathonId) 
        nonReentrant 
    {
        Hackathon storage hackathon = hackathons[hackathonId];
        
        require(
            hackathon.status == HackathonStatus.Created || 
            hackathon.status == HackathonStatus.Active,
            "HackathonRegistry: Registration not available"
        );
        require(
            block.timestamp <= hackathon.registrationDeadline,
            "HackathonRegistry: Registration deadline has passed"
        );
        require(
            participants[hackathonId][msg.sender].participantAddress == address(0),
            "HackathonRegistry: Already registered"
        );
        require(
            msg.sender != hackathon.organizer,
            "HackathonRegistry: Organizer cannot participate"
        );

        participants[hackathonId][msg.sender] = Participant({
            participantAddress: msg.sender,
            submissionUrl: "",
            registrationTime: block.timestamp,
            hasSubmitted: false,
            totalScore: 0,
            voteCount: 0,
            averageScore: 0
        });

        participantList[hackathonId].push(msg.sender);
        hackathon.participantCount++;

        if (hackathon.status == HackathonStatus.Created) {
            hackathon.status = HackathonStatus.Active;
            emit HackathonStatusChanged(hackathonId, HackathonStatus.Created, HackathonStatus.Active);
        }

        emit ParticipantRegistered(hackathonId, msg.sender, block.timestamp);
    }

    function addJudge(uint256 hackathonId, address judge) 
        external 
        hackathonExists(hackathonId) 
        onlyOrganizer(hackathonId) 
    {
        require(judge != address(0), "HackathonRegistry: Invalid judge address");
        require(
            !hackathons[hackathonId].judges[judge],
            "HackathonRegistry: Judge already added"
        );
        require(
            participants[hackathonId][judge].participantAddress == address(0),
            "HackathonRegistry: Judge cannot be a participant"
        );

        hackathons[hackathonId].judges[judge] = true;
        hackathons[hackathonId].judgeCount++;
        _grantRole(JUDGE_ROLE, judge);

        emit JudgeAdded(hackathonId, judge, msg.sender);
    }

    function removeJudge(uint256 hackathonId, address judge) 
        external 
        hackathonExists(hackathonId) 
        onlyOrganizer(hackathonId) 
    {
        require(
            hackathons[hackathonId].judges[judge],
            "HackathonRegistry: Judge not found"
        );

        hackathons[hackathonId].judges[judge] = false;
        hackathons[hackathonId].judgeCount--;

        emit JudgeRemoved(hackathonId, judge, msg.sender);
    }

    function updateSubmission(uint256 hackathonId, string memory submissionUrl) 
        external 
        hackathonExists(hackathonId) 
    {
        require(
            participants[hackathonId][msg.sender].participantAddress == msg.sender,
            "HackathonRegistry: Not registered as participant"
        );
        require(
            block.timestamp <= hackathons[hackathonId].submissionDeadline,
            "HackathonRegistry: Submission deadline has passed"
        );
        require(bytes(submissionUrl).length > 0, "HackathonRegistry: Submission URL cannot be empty");

        participants[hackathonId][msg.sender].submissionUrl = submissionUrl;
        participants[hackathonId][msg.sender].hasSubmitted = true;

        emit SubmissionUpdated(hackathonId, msg.sender, submissionUrl);
    }

    function getHackathonInfo(uint256 hackathonId) 
        external 
        view 
        hackathonExists(hackathonId) 
        returns (
            string memory title,
            string memory description,
            address organizer,
            uint256 registrationDeadline,
            uint256 submissionDeadline,
            uint256 votingDeadline,
            HackathonStatus status,
            uint256 participantCount,
            uint256 judgeCount
        ) 
    {
        Hackathon storage hackathon = hackathons[hackathonId];
        return (
            hackathon.title,
            hackathon.description,
            hackathon.organizer,
            hackathon.registrationDeadline,
            hackathon.submissionDeadline,
            hackathon.votingDeadline,
            hackathon.status,
            hackathon.participantCount,
            hackathon.judgeCount
        );
    }

    function getParticipants(uint256 hackathonId) 
        external 
        view 
        hackathonExists(hackathonId) 
        returns (address[] memory) 
    {
        return participantList[hackathonId];
    }

    function isJudge(uint256 hackathonId, address judge) 
        external 
        view 
        hackathonExists(hackathonId) 
        returns (bool) 
    {
        return hackathons[hackathonId].judges[judge];
    }

    function getParticipantInfo(uint256 hackathonId, address participant) 
        external 
        view 
        hackathonExists(hackathonId) 
        returns (
            string memory submissionUrl,
            uint256 registrationTime,
            bool hasSubmitted
        ) 
    {
        Participant storage p = participants[hackathonId][participant];
        require(
            p.participantAddress != address(0),
            "HackathonRegistry: Participant not found"
        );
        return (p.submissionUrl, p.registrationTime, p.hasSubmitted);
    }

    function getCurrentHackathonId() external view returns (uint256) {
        return _hackathonIdCounter;
    }

    function startVotingPhase(uint256 hackathonId) 
        external 
        hackathonExists(hackathonId) 
        onlyOrganizer(hackathonId) 
    {
        Hackathon storage hackathon = hackathons[hackathonId];
        require(
            hackathon.status == HackathonStatus.Active,
            "HackathonRegistry: Hackathon must be in Active status"
        );
        require(
            block.timestamp > hackathon.submissionDeadline,
            "HackathonRegistry: Submission deadline has not passed"
        );
        require(
            hackathon.judgeCount > 0,
            "HackathonRegistry: No judges assigned"
        );

        hackathon.status = HackathonStatus.Voting;
        emit HackathonStatusChanged(hackathonId, HackathonStatus.Active, HackathonStatus.Voting);
        emit VotingPhaseStarted(hackathonId, block.timestamp);
    }

    function castVote(
        uint256 hackathonId,
        address participant,
        uint8 score,
        string memory comment
    ) external hackathonExists(hackathonId) onlyJudge(hackathonId) nonReentrant {
        Hackathon storage hackathon = hackathons[hackathonId];
        require(
            hackathon.status == HackathonStatus.Voting,
            "HackathonRegistry: Voting is not active"
        );
        require(
            block.timestamp <= hackathon.votingDeadline,
            "HackathonRegistry: Voting deadline has passed"
        );
        require(
            score >= 1 && score <= 10,
            "HackathonRegistry: Score must be between 1 and 10"
        );
        require(
            participants[hackathonId][participant].participantAddress == participant,
            "HackathonRegistry: Participant not found"
        );
        require(
            participants[hackathonId][participant].hasSubmitted,
            "HackathonRegistry: Participant has not submitted"
        );
        require(
            votes[hackathonId][msg.sender][participant].judge == address(0),
            "HackathonRegistry: Judge has already voted for this participant"
        );

        // Record the vote
        votes[hackathonId][msg.sender][participant] = Vote({
            judge: msg.sender,
            participant: participant,
            score: score,
            timestamp: block.timestamp,
            comment: comment
        });

        // Update participant scores
        Participant storage p = participants[hackathonId][participant];
        p.totalScore += score;
        p.voteCount++;
        p.averageScore = (p.totalScore * 100) / p.voteCount; // Store as score * 100

        // Track total votes
        totalVotesCount[hackathonId]++;
        hasJudgeVoted[hackathonId][msg.sender] = true;

        emit VoteCast(hackathonId, msg.sender, participant, score, comment, block.timestamp);
    }

    function completeVoting(uint256 hackathonId) 
        external 
        hackathonExists(hackathonId) 
        onlyOrganizer(hackathonId) 
    {
        Hackathon storage hackathon = hackathons[hackathonId];
        require(
            hackathon.status == HackathonStatus.Voting,
            "HackathonRegistry: Hackathon is not in voting phase"
        );
        require(
            block.timestamp > hackathon.votingDeadline || _allJudgesVoted(hackathonId),
            "HackathonRegistry: Voting deadline not reached and not all judges voted"
        );

        hackathon.status = HackathonStatus.Completed;
        emit HackathonStatusChanged(hackathonId, HackathonStatus.Voting, HackathonStatus.Completed);
        emit VotingCompleted(hackathonId, totalVotesCount[hackathonId], block.timestamp);
    }

    function getVote(uint256 hackathonId, address judge, address participant) 
        external 
        view 
        hackathonExists(hackathonId) 
        returns (
            uint8 score,
            string memory comment,
            uint256 timestamp
        ) 
    {
        Vote storage vote = votes[hackathonId][judge][participant];
        require(vote.judge != address(0), "HackathonRegistry: Vote not found");
        return (vote.score, vote.comment, vote.timestamp);
    }

    function getParticipantScores(uint256 hackathonId, address participant) 
        external 
        view 
        hackathonExists(hackathonId) 
        returns (
            uint256 totalScore,
            uint256 voteCount,
            uint256 averageScore
        ) 
    {
        Participant storage p = participants[hackathonId][participant];
        require(
            p.participantAddress != address(0),
            "HackathonRegistry: Participant not found"
        );
        return (p.totalScore, p.voteCount, p.averageScore);
    }

    function getLeaderboard(uint256 hackathonId) 
        external 
        view 
        hackathonExists(hackathonId) 
        returns (
            address[] memory sortedParticipants,
            uint256[] memory averageScores
        ) 
    {
        address[] memory participants_list = participantList[hackathonId];
        uint256 participantCount = participants_list.length;
        
        // Create arrays for sorting
        address[] memory tempParticipants = new address[](participantCount);
        uint256[] memory tempScores = new uint256[](participantCount);
        
        // Fill arrays with participants who have submitted and received votes
        uint256 validCount = 0;
        for (uint256 i = 0; i < participantCount; i++) {
            address participant = participants_list[i];
            if (participants[hackathonId][participant].hasSubmitted && 
                participants[hackathonId][participant].voteCount > 0) {
                tempParticipants[validCount] = participant;
                tempScores[validCount] = participants[hackathonId][participant].averageScore;
                validCount++;
            }
        }
        
        // Create final arrays with correct size
        sortedParticipants = new address[](validCount);
        averageScores = new uint256[](validCount);
        
        // Copy valid entries
        for (uint256 i = 0; i < validCount; i++) {
            sortedParticipants[i] = tempParticipants[i];
            averageScores[i] = tempScores[i];
        }
        
        // Simple bubble sort (descending order)
        for (uint256 i = 0; i < validCount; i++) {
            for (uint256 j = i + 1; j < validCount; j++) {
                if (averageScores[i] < averageScores[j]) {
                    // Swap scores
                    uint256 tempScore = averageScores[i];
                    averageScores[i] = averageScores[j];
                    averageScores[j] = tempScore;
                    
                    // Swap participants
                    address tempParticipant = sortedParticipants[i];
                    sortedParticipants[i] = sortedParticipants[j];
                    sortedParticipants[j] = tempParticipant;
                }
            }
        }
        
        return (sortedParticipants, averageScores);
    }

    function getWinners(uint256 hackathonId) 
        external 
        view 
        hackathonExists(hackathonId) 
        returns (
            address firstPlace,
            address secondPlace,
            address thirdPlace
        ) 
    {
        require(
            hackathons[hackathonId].status == HackathonStatus.Completed,
            "HackathonRegistry: Hackathon not completed"
        );
        
        (address[] memory sortedParticipants, ) = this.getLeaderboard(hackathonId);
        
        if (sortedParticipants.length >= 1) {
            firstPlace = sortedParticipants[0];
        }
        if (sortedParticipants.length >= 2) {
            secondPlace = sortedParticipants[1];
        }
        if (sortedParticipants.length >= 3) {
            thirdPlace = sortedParticipants[2];
        }
        
        return (firstPlace, secondPlace, thirdPlace);
    }

    function getVotingStats(uint256 hackathonId) 
        external 
        view 
        hackathonExists(hackathonId) 
        returns (
            uint256 totalVotes,
            uint256 totalJudges,
            uint256 judgesWhoVoted,
            bool isVotingComplete
        ) 
    {
        Hackathon storage hackathon = hackathons[hackathonId];
        
        // Count judges who have voted
        uint256 votedCount = 0;
        address[] memory allParticipants = participantList[hackathonId];
        
        // This is a simplified approach - in a production environment, 
        // you might want to track judges separately
        for (uint256 i = 0; i < allParticipants.length; i++) {
            if (hasJudgeVoted[hackathonId][allParticipants[i]]) {
                votedCount++;
            }
        }
        
        return (
            totalVotesCount[hackathonId],
            hackathon.judgeCount,
            votedCount,
            hackathon.status == HackathonStatus.Completed
        );
    }

    function _allJudgesVoted(uint256 hackathonId) private view returns (bool) {
        // This is a simplified check - would need judge tracking for full implementation
        return totalVotesCount[hackathonId] >= 
               (hackathons[hackathonId].judgeCount * hackathons[hackathonId].participantCount);
    }
}