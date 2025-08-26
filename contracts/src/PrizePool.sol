// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {HackathonRegistry} from "./HackathonRegistry.sol";

contract PrizePool is AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;

    bytes32 public constant ORGANIZER_ROLE = keccak256("ORGANIZER_ROLE");
    bytes32 public constant TOKEN_ADMIN_ROLE = keccak256("TOKEN_ADMIN_ROLE");

    uint16 public constant BASIS_POINTS = 10000; // 100% = 10000 basis points
    uint16 public constant MAX_WINNERS = 10; // Maximum number of winner positions

    HackathonRegistry public immutable hackathonRegistry;

    // Platform fee system
    uint256 public platformFeeRate = 250; // 2.5% in basis points (250/10000)
    address public platformFeeRecipient;

    // Supported tokens for prize pools
    mapping(address => bool) public supportedTokens;
    address public constant NATIVE_TOKEN = address(0); // Represents native KAIA

    struct PrizeConfiguration {
        uint16[] percentages; // In basis points (e.g., 6000 = 60%)
        uint256 totalPrizePool;
        address organizer;
        address token; // Token address (address(0) for native KAIA)
        bool distributed;
        uint256 createdAt;
        uint256 lockedFeeRate; // Fee rate locked at creation time
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
        address indexed token,
        uint256 totalAmount,
        uint16[] percentages
    );

    event TokenAdded(address indexed token, bool supported);
    event TokenRemoved(address indexed token);

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

    event PlatformFeeRateUpdated(uint256 oldRate, uint256 newRate);
    event PlatformFeeRecipientUpdated(address indexed newRecipient);
    event PlatformFeeCollected(
        uint256 indexed hackathonId,
        uint256 feeAmount,
        address indexed recipient
    );

    modifier onlyHackathonOrganizer(uint256 hackathonId) {
        (, , address organizer, , , , , , ) = hackathonRegistry
            .getHackathonInfo(hackathonId);
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
        (
            ,
            ,
            ,
            ,
            ,
            ,
            HackathonRegistry.HackathonStatus status,
            ,

        ) = hackathonRegistry.getHackathonInfo(hackathonId);
        require(
            status == HackathonRegistry.HackathonStatus.Completed,
            "PrizePool: Hackathon must be completed"
        );
        _;
    }

    constructor(address _hackathonRegistry) {
        require(
            _hackathonRegistry != address(0),
            "PrizePool: Invalid registry address"
        );
        hackathonRegistry = HackathonRegistry(_hackathonRegistry);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(TOKEN_ADMIN_ROLE, msg.sender);

        // Initialize platform fee recipient to deployer
        platformFeeRecipient = msg.sender;

        // Native KAIA token is supported by default
        supportedTokens[NATIVE_TOKEN] = true;
    }

    // Token management functions
    function addSupportedToken(
        address token
    ) external onlyRole(TOKEN_ADMIN_ROLE) {
        require(token != address(0), "PrizePool: Invalid token address");
        require(!supportedTokens[token], "PrizePool: Token already supported");

        supportedTokens[token] = true;
        emit TokenAdded(token, true);
    }

    function removeSupportedToken(
        address token
    ) external onlyRole(TOKEN_ADMIN_ROLE) {
        require(token != NATIVE_TOKEN, "PrizePool: Cannot remove native token");
        require(supportedTokens[token], "PrizePool: Token not supported");

        supportedTokens[token] = false;
        emit TokenRemoved(token);
    }

    function isSupportedToken(address token) public view returns (bool) {
        return supportedTokens[token];
    }

    // Platform fee management functions
    function setPlatformFeeRate(
        uint256 newFeeRate
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        uint256 oldRate = platformFeeRate;
        platformFeeRate = newFeeRate;
        emit PlatformFeeRateUpdated(oldRate, newFeeRate);
    }

    function setPlatformFeeRecipient(
        address newRecipient
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newRecipient != address(0), "PrizePool: Invalid recipient address");
        platformFeeRecipient = newRecipient;
        emit PlatformFeeRecipientUpdated(newRecipient);
    }

    function getPlatformFeeInfo()
        external
        view
        returns (uint256 feeRate, address recipient)
    {
        return (platformFeeRate, platformFeeRecipient);
    }

    // Native KAIA prize pool creation (backward compatibility)
    function createPrizePool(
        uint256 hackathonId
    ) external payable onlyHackathonOrganizer(hackathonId) {
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
            token: NATIVE_TOKEN,
            distributed: false,
            createdAt: block.timestamp,
            lockedFeeRate: platformFeeRate
        });

        _grantRole(ORGANIZER_ROLE, msg.sender);

        emit PrizePoolCreated(
            hackathonId,
            msg.sender,
            NATIVE_TOKEN,
            msg.value,
            defaultPercentages
        );
    }

    // ERC20 token prize pool creation
    function createTokenPrizePool(
        uint256 hackathonId,
        address token,
        uint256 amount
    ) external onlyHackathonOrganizer(hackathonId) {
        require(amount > 0, "PrizePool: Prize pool must be greater than 0");
        require(
            token != NATIVE_TOKEN,
            "PrizePool: Use createPrizePool for native token"
        );
        require(isSupportedToken(token), "PrizePool: Token not supported");
        require(
            prizeConfigurations[hackathonId].organizer == address(0),
            "PrizePool: Prize pool already exists"
        );

        // Transfer tokens from organizer to this contract
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);

        // Default: Winner takes all (100%)
        uint16[] memory defaultPercentages = new uint16[](1);
        defaultPercentages[0] = BASIS_POINTS; // 100%

        prizeConfigurations[hackathonId] = PrizeConfiguration({
            percentages: defaultPercentages,
            totalPrizePool: amount,
            organizer: msg.sender,
            token: token,
            distributed: false,
            createdAt: block.timestamp,
            lockedFeeRate: platformFeeRate
        });

        _grantRole(ORGANIZER_ROLE, msg.sender);

        emit PrizePoolCreated(
            hackathonId,
            msg.sender,
            token,
            amount,
            defaultPercentages
        );
    }

    function setPrizeDistribution(
        uint256 hackathonId,
        uint16[] memory percentages
    )
        external
        prizePoolExists(hackathonId)
        onlyHackathonOrganizer(hackathonId)
    {
        require(
            percentages.length > 0,
            "PrizePool: At least one percentage required"
        );
        require(
            percentages.length <= MAX_WINNERS,
            "PrizePool: Too many winner positions"
        );
        require(
            !prizeConfigurations[hackathonId].distributed,
            "PrizePool: Prizes already distributed"
        );

        // Validate percentages sum to 100%
        uint16 totalPercentage = 0;
        for (uint256 i = 0; i < percentages.length; i++) {
            require(
                percentages[i] > 0,
                "PrizePool: Percentage must be greater than 0"
            );
            totalPercentage += percentages[i];
        }
        require(
            totalPercentage == BASIS_POINTS,
            "PrizePool: Percentages must sum to 100%"
        );

        uint16[] memory oldPercentages = prizeConfigurations[hackathonId]
            .percentages;
        prizeConfigurations[hackathonId].percentages = percentages;

        emit PrizeDistributionUpdated(hackathonId, oldPercentages, percentages);
    }

    function distributePrizes(
        uint256 hackathonId
    )
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

        PrizeConfiguration storage config = prizeConfigurations[hackathonId];
        
        // Calculate platform fee using locked fee rate
        uint256 totalPrizePool = config.totalPrizePool;
        uint256 platformFee = (totalPrizePool * config.lockedFeeRate) / BASIS_POINTS;
        uint256 prizeAmount = totalPrizePool - platformFee;

        // Transfer platform fee if applicable
        if (platformFee > 0) {
            _transferPlatformFee(hackathonId, config.token, platformFee);
        }

        // Get winners and calculate distributions from remaining prize amount
        (
            address[] memory winners,
            uint256[] memory amounts,
            uint256 totalDistributed
        ) = _calculatePrizeDistribution(hackathonId, prizeAmount);

        require(winners.length > 0, "PrizePool: No winners found");

        // Store winner payout info and mark as distributed
        _storePrizePayouts(hackathonId, winners, amounts);
        config.distributed = true;

        emit PrizesDistributed(hackathonId, winners, amounts, totalDistributed);
    }

    function _calculatePrizeDistribution(
        uint256 hackathonId,
        uint256 availablePrizeAmount
    )
        private
        view
        returns (
            address[] memory winners,
            uint256[] memory amounts,
            uint256 totalDistributed
        )
    {
        // Get winners from HackathonRegistry
        (
            address firstPlace,
            address secondPlace,
            address thirdPlace
        ) = hackathonRegistry.getWinners(hackathonId);

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
            amounts[i] =
                (availablePrizeAmount * config.percentages[i]) /
                BASIS_POINTS;
            totalDistributed += amounts[i];
        }

        return (finalWinners, amounts, totalDistributed);
    }

    function _transferPlatformFee(
        uint256 hackathonId,
        address token,
        uint256 feeAmount
    ) private {
        if (token == NATIVE_TOKEN) {
            // Native KAIA transfer
            (bool success, ) = payable(platformFeeRecipient).call{value: feeAmount}("");
            require(success, "PrizePool: Platform fee transfer failed");
        } else {
            // ERC20 token transfer
            IERC20(token).safeTransfer(platformFeeRecipient, feeAmount);
        }

        emit PlatformFeeCollected(hackathonId, feeAmount, platformFeeRecipient);
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

    function withdrawPrize(
        uint256 hackathonId,
        uint256 position
    ) external prizePoolExists(hackathonId) nonReentrant {
        require(
            prizeConfigurations[hackathonId].distributed,
            "PrizePool: Prizes not yet distributed"
        );
        require(
            position > 0 && position <= winnerCounts[hackathonId],
            "PrizePool: Invalid position"
        );

        WinnerPayout storage payout = winnerPayouts[hackathonId][position];
        require(
            payout.winner == msg.sender,
            "PrizePool: Not the winner for this position"
        );
        require(!payout.paid, "PrizePool: Prize already withdrawn");
        require(payout.amount > 0, "PrizePool: No prize amount");

        payout.paid = true;

        address token = prizeConfigurations[hackathonId].token;

        if (token == NATIVE_TOKEN) {
            // Native KAIA transfer
            (bool success, ) = payable(msg.sender).call{value: payout.amount}(
                ""
            );
            require(success, "PrizePool: Native transfer failed");
        } else {
            // ERC20 token transfer
            IERC20(token).safeTransfer(msg.sender, payout.amount);
        }

        emit PrizeWithdrawn(hackathonId, msg.sender, payout.amount, position);
    }

    function withdrawAllPrizes(
        uint256 hackathonId
    ) external prizePoolExists(hackathonId) nonReentrant {
        require(
            prizeConfigurations[hackathonId].distributed,
            "PrizePool: Prizes not yet distributed"
        );

        uint256 totalWithdrawn = 0;
        uint256 winnerCount = winnerCounts[hackathonId];
        address token = prizeConfigurations[hackathonId].token;

        for (uint256 position = 1; position <= winnerCount; position++) {
            WinnerPayout storage payout = winnerPayouts[hackathonId][position];

            if (
                payout.winner == msg.sender && !payout.paid && payout.amount > 0
            ) {
                payout.paid = true;
                totalWithdrawn += payout.amount;

                emit PrizeWithdrawn(
                    hackathonId,
                    msg.sender,
                    payout.amount,
                    position
                );
            }
        }

        require(totalWithdrawn > 0, "PrizePool: No prizes to withdraw");

        if (token == NATIVE_TOKEN) {
            // Native transfer
            (bool success, ) = payable(msg.sender).call{value: totalWithdrawn}(
                ""
            );
            require(success, "PrizePool: Native transfer failed");
        } else {
            // ERC20 token transfer
            IERC20(token).safeTransfer(msg.sender, totalWithdrawn);
        }
    }

    // View functions
    function getPrizeConfiguration(
        uint256 hackathonId
    )
        external
        view
        prizePoolExists(hackathonId)
        returns (
            uint16[] memory percentages,
            uint256 totalPrizePool,
            address organizer,
            address token,
            bool distributed,
            uint256 createdAt
        )
    {
        PrizeConfiguration storage config = prizeConfigurations[hackathonId];
        return (
            config.percentages,
            config.totalPrizePool,
            config.organizer,
            config.token,
            config.distributed,
            config.createdAt
        );
    }

    function getWinnerPayout(
        uint256 hackathonId,
        uint256 position
    )
        external
        view
        prizePoolExists(hackathonId)
        returns (address winner, uint256 amount, bool paid)
    {
        require(
            position > 0 && position <= winnerCounts[hackathonId],
            "PrizePool: Invalid position"
        );
        WinnerPayout storage payout = winnerPayouts[hackathonId][position];
        return (payout.winner, payout.amount, payout.paid);
    }

    function getAllWinnerPayouts(
        uint256 hackathonId
    )
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

    function getTotalPrizePool(
        uint256 hackathonId
    ) external view prizePoolExists(hackathonId) returns (uint256) {
        return prizeConfigurations[hackathonId].totalPrizePool;
    }

    function isPrizeDistributed(
        uint256 hackathonId
    ) external view prizePoolExists(hackathonId) returns (bool) {
        return prizeConfigurations[hackathonId].distributed;
    }

    // Additional view functions
    function getPrizePoolToken(
        uint256 hackathonId
    ) external view prizePoolExists(hackathonId) returns (address) {
        return prizeConfigurations[hackathonId].token;
    }

    function isNativeToken(
        uint256 hackathonId
    ) external view prizePoolExists(hackathonId) returns (bool) {
        return prizeConfigurations[hackathonId].token == NATIVE_TOKEN;
    }

    // Emergency functions
    function emergencyWithdraw(
        uint256 hackathonId
    )
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
        address token = prizeConfigurations[hackathonId].token;

        prizeConfigurations[hackathonId].totalPrizePool = 0;

        if (token == NATIVE_TOKEN) {
            // Native KAIA transfer
            (bool success, ) = payable(msg.sender).call{value: amount}("");
            require(success, "PrizePool: Emergency withdraw failed");
        } else {
            // ERC20 token transfer
            IERC20(token).safeTransfer(msg.sender, amount);
        }
    }
}
