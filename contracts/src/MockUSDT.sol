// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockUSDT
 * @dev Mock USDT token for testing purposes on Kaia network
 * This contract simulates USDT behavior for hackathon prize pools
 */
contract MockUSDT is ERC20, Ownable {
    uint8 private constant _DECIMALS = 6; // USDT typically uses 6 decimals
    uint256 public constant INITIAL_SUPPLY = 1000000 * 10 ** _DECIMALS; // 1M USDT

    constructor() ERC20("Mock Tether USD", "USDT") Ownable(msg.sender) {
        _mint(msg.sender, INITIAL_SUPPLY);
    }

    /**
     * @dev Override decimals to match USDT standard
     */
    function decimals() public pure override returns (uint8) {
        return _DECIMALS;
    }

    /**
     * @dev Mint tokens (for testing purposes)
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    /**
     * @dev Burn tokens from caller
     */
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }

    /**
     * @dev Faucet function for testing - anyone can get 1000 USDT
     */
    function faucet() external {
        require(
            balanceOf(msg.sender) == 0,
            "MockUSDT: Already claimed from faucet"
        );
        _mint(msg.sender, 1000 * 10 ** _DECIMALS); // 1000 USDT
    }
}
