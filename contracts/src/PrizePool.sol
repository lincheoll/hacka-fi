// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {HackathonRegistry} from "./HackathonRegistry.sol";

contract PrizePool is AccessControl, ReentrancyGuard {
    bytes32 public constant ORGANIZER_ROLE = keccak256("ORGANIZER_ROLE");
    
    uint16 public constant BASIS_POINTS = 10000; // 100% = 10000 basis points
    uint16 public constant MAX_WINNERS = 10; // Maximum number of winner positions

    HackathonRegistry public immutable hackathonRegistry;

    struct PrizeConfiguration {
        uint16[] percentages; // In basis points (e.g., 6000 = 60%)
        uint256 totalPrizePool;
        address organizer;
        bool distributed;
        uint256 createdAt;
    }

    struct WinnerPayout {
        address winner;
        uint256 amount;
        uint256 position; // 1st, 2nd, 3rd, etc.
        bool paid;
    }

    // hackathonId => PrizeConfiguration
    mapping(uint256 => PrizeConfiguration) public prizeConfigurations;
    
    // hackathonId => winner position => WinnerPayout
    mapping(uint256 => mapping(uint256 => WinnerPayout)) public winnerPayouts;
    
    // hackathonId => number of winners
    mapping(uint256 => uint256) public winnerCounts;

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

    event PrizeWithdrawn(
        uint256 indexed hackathonId,
        address indexed winner,
        uint256 amount,
        uint256 position
    );

    modifier onlyHackathonOrganizer(uint256 hackathonId) {
        (, , address organizer, , , , , , ) = hackathonRegistry.getHackathonInfo(hackathonId);
        require(
            organizer == msg.sender,
            "PrizePool: Only hackathon organizer can perform this action"
        );
        _;
    }

    modifier prizePoolExists(uint256 hackathonId) {
        require(
            prizeConfigurations[hackathonId].organizer != address(0),
            "PrizePool: Prize pool does not exist"
        );
        _;
    }

    modifier hackathonCompleted(uint256 hackathonId) {
        (, , , , , , HackathonRegistry.HackathonStatus status, , ) = hackathonRegistry.getHackathonInfo(hackathonId);
        require(
            status == HackathonRegistry.HackathonStatus.Completed,
            "PrizePool: Hackathon must be completed"
        );
        _;
    }

    constructor(address _hackathonRegistry) {
        require(_hackathonRegistry != address(0), "PrizePool: Invalid registry address");
        hackathonRegistry = HackathonRegistry(_hackathonRegistry);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function createPrizePool(uint256 hackathonId) 
        external 
        payable 
        onlyHackathonOrganizer(hackathonId) 
    {
        require(msg.value > 0, "PrizePool: Prize pool must be greater than 0");
        require(
            prizeConfigurations[hackathonId].organizer == address(0),
            "PrizePool: Prize pool already exists"
        );

        // Default: Winner takes all (100%)
        uint16[] memory defaultPercentages = new uint16[](1);
        defaultPercentages[0] = BASIS_POINTS; // 100%

        prizeConfigurations[hackathonId] = PrizeConfiguration({
            percentages: defaultPercentages,
            totalPrizePool: msg.value,
            organizer: msg.sender,
            distributed: false,
            createdAt: block.timestamp
        });

        _grantRole(ORGANIZER_ROLE, msg.sender);

        emit PrizePoolCreated(hackathonId, msg.sender, msg.value, defaultPercentages);
    }

    function setPrizeDistribution(uint256 hackathonId, uint16[] memory percentages) 
        external 
        prizePoolExists(hackathonId) 
        onlyHackathonOrganizer(hackathonId) 
    {
        require(percentages.length > 0, "PrizePool: At least one percentage required");
        require(percentages.length <= MAX_WINNERS, "PrizePool: Too many winner positions");
        require(
            !prizeConfigurations[hackathonId].distributed,
            "PrizePool: Prizes already distributed"
        );

        // Validate percentages sum to 100%
        uint16 totalPercentage = 0;
        for (uint256 i = 0; i < percentages.length; i++) {
            require(percentages[i] > 0, "PrizePool: Percentage must be greater than 0");
            totalPercentage += percentages[i];
        }
        require(totalPercentage == BASIS_POINTS, "PrizePool: Percentages must sum to 100%");

        uint16[] memory oldPercentages = prizeConfigurations[hackathonId].percentages;
        prizeConfigurations[hackathonId].percentages = percentages;

        emit PrizeDistributionUpdated(hackathonId, oldPercentages, percentages);
    }

    function distributePrizes(uint256 hackathonId) 
        external 
        prizePoolExists(hackathonId) 
        onlyHackathonOrganizer(hackathonId) 
        hackathonCompleted(hackathonId) 
        nonReentrant 
    {
        require(
            !prizeConfigurations[hackathonId].distributed,
            "PrizePool: Prizes already distributed"
        );

        // Get winners and calculate distributions
        (address[] memory winners, uint256[] memory amounts, uint256 totalDistributed) = 
            _calculatePrizeDistribution(hackathonId);

        require(winners.length > 0, "PrizePool: No winners found");

        // Store winner payout info and mark as distributed
        _storePrizePayouts(hackathonId, winners, amounts);
        prizeConfigurations[hackathonId].distributed = true;

        emit PrizesDistributed(hackathonId, winners, amounts, totalDistributed);
    }

    function _calculatePrizeDistribution(uint256 hackathonId) 
        private 
        view 
        returns (
            address[] memory winners,
            uint256[] memory amounts,
            uint256 totalDistributed
        ) 
    {
        // Get winners from HackathonRegistry
        (address firstPlace, address secondPlace, address thirdPlace) = 
            hackathonRegistry.getWinners(hackathonId);

        // Count actual winners
        uint256 actualWinnerCount = 0;
        if (firstPlace != address(0)) actualWinnerCount++;
        if (secondPlace != address(0)) actualWinnerCount++;
        if (thirdPlace != address(0)) actualWinnerCount++;

        // Build winners array
        winners = new address[](actualWinnerCount);
        uint256 index = 0;
        if (firstPlace != address(0)) winners[index++] = firstPlace;
        if (secondPlace != address(0)) winners[index++] = secondPlace;
        if (thirdPlace != address(0)) winners[index++] = thirdPlace;

        PrizeConfiguration storage config = prizeConfigurations[hackathonId];
        uint256 maxPositions = config.percentages.length < actualWinnerCount 
            ? config.percentages.length 
            : actualWinnerCount;

        // Resize arrays to actual distribution size
        address[] memory finalWinners = new address[](maxPositions);
        amounts = new uint256[](maxPositions);
        totalDistributed = 0;

        for (uint256 i = 0; i < maxPositions; i++) {
            finalWinners[i] = winners[i];
            amounts[i] = (config.totalPrizePool * config.percentages[i]) / BASIS_POINTS;
            totalDistributed += amounts[i];
        }

        return (finalWinners, amounts, totalDistributed);
    }

    function _storePrizePayouts(
        uint256 hackathonId,
        address[] memory winners,
        uint256[] memory amounts
    ) private {
        winnerCounts[hackathonId] = winners.length;
        
        for (uint256 i = 0; i < winners.length; i++) {
            winnerPayouts[hackathonId][i + 1] = WinnerPayout({
                winner: winners[i],
                amount: amounts[i],
                position: i + 1,
                paid: false
            });
        }
    }

    function withdrawPrize(uint256 hackathonId, uint256 position) 
        external 
        prizePoolExists(hackathonId) 
        nonReentrant 
    {
        require(
            prizeConfigurations[hackathonId].distributed,
            "PrizePool: Prizes not yet distributed"
        );
        require(position > 0 && position <= winnerCounts[hackathonId], "PrizePool: Invalid position");

        WinnerPayout storage payout = winnerPayouts[hackathonId][position];
        require(payout.winner == msg.sender, "PrizePool: Not the winner for this position");
        require(!payout.paid, "PrizePool: Prize already withdrawn");
        require(payout.amount > 0, "PrizePool: No prize amount");

        payout.paid = true;

        (bool success, ) = payable(msg.sender).call{value: payout.amount}("");
        require(success, "PrizePool: Transfer failed");

        emit PrizeWithdrawn(hackathonId, msg.sender, payout.amount, position);
    }

    function withdrawAllPrizes(uint256 hackathonId) external prizePoolExists(hackathonId) nonReentrant {
        require(
            prizeConfigurations[hackathonId].distributed,
            "PrizePool: Prizes not yet distributed"
        );

        uint256 totalWithdrawn = 0;
        uint256 winnerCount = winnerCounts[hackathonId];

        for (uint256 position = 1; position <= winnerCount; position++) {
            WinnerPayout storage payout = winnerPayouts[hackathonId][position];
            
            if (payout.winner == msg.sender && !payout.paid && payout.amount > 0) {
                payout.paid = true;
                totalWithdrawn += payout.amount;
                
                emit PrizeWithdrawn(hackathonId, msg.sender, payout.amount, position);
            }
        }

        require(totalWithdrawn > 0, "PrizePool: No prizes to withdraw");

        (bool success, ) = payable(msg.sender).call{value: totalWithdrawn}("");
        require(success, "PrizePool: Transfer failed");
    }

    // View functions
    function getPrizeConfiguration(uint256 hackathonId) 
        external 
        view 
        prizePoolExists(hackathonId) 
        returns (
            uint16[] memory percentages,
            uint256 totalPrizePool,
            address organizer,
            bool distributed,
            uint256 createdAt
        ) 
    {
        PrizeConfiguration storage config = prizeConfigurations[hackathonId];
        return (
            config.percentages,
            config.totalPrizePool,
            config.organizer,
            config.distributed,
            config.createdAt
        );
    }

    function getWinnerPayout(uint256 hackathonId, uint256 position) 
        external 
        view 
        prizePoolExists(hackathonId) 
        returns (
            address winner,
            uint256 amount,
            bool paid
        ) 
    {
        require(position > 0 && position <= winnerCounts[hackathonId], "PrizePool: Invalid position");
        WinnerPayout storage payout = winnerPayouts[hackathonId][position];
        return (payout.winner, payout.amount, payout.paid);
    }

    function getAllWinnerPayouts(uint256 hackathonId) 
        external 
        view 
        prizePoolExists(hackathonId) 
        returns (
            address[] memory winners,
            uint256[] memory amounts,
            uint256[] memory positions,
            bool[] memory paid
        ) 
    {
        uint256 winnerCount = winnerCounts[hackathonId];
        winners = new address[](winnerCount);
        amounts = new uint256[](winnerCount);
        positions = new uint256[](winnerCount);
        paid = new bool[](winnerCount);

        for (uint256 i = 0; i < winnerCount; i++) {
            WinnerPayout storage payout = winnerPayouts[hackathonId][i + 1];
            winners[i] = payout.winner;
            amounts[i] = payout.amount;
            positions[i] = payout.position;
            paid[i] = payout.paid;
        }

        return (winners, amounts, positions, paid);
    }

    function getTotalPrizePool(uint256 hackathonId) 
        external 
        view 
        prizePoolExists(hackathonId) 
        returns (uint256) 
    {
        return prizeConfigurations[hackathonId].totalPrizePool;
    }

    function isPrizeDistributed(uint256 hackathonId) 
        external 
        view 
        prizePoolExists(hackathonId) 
        returns (bool) 
    {
        return prizeConfigurations[hackathonId].distributed;
    }

    // Emergency functions
    function emergencyWithdraw(uint256 hackathonId) 
        external 
        prizePoolExists(hackathonId) 
        onlyHackathonOrganizer(hackathonId) 
        nonReentrant 
    {
        require(
            !prizeConfigurations[hackathonId].distributed,
            "PrizePool: Cannot emergency withdraw after distribution"
        );

        uint256 amount = prizeConfigurations[hackathonId].totalPrizePool;
        prizeConfigurations[hackathonId].totalPrizePool = 0;

        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "PrizePool: Emergency withdraw failed");
    }
}