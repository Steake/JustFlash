// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IFeeCollector
 * @author JustFlash Protocol
 * @notice Interface for the fee collector contract
 * @dev Handles protocol fee accumulation and distribution
 */
interface IFeeCollector {
    /**
     * @notice Emitted when fees are collected
     * @param token The address of the token
     * @param amount The amount of fees collected
     * @param treasuryShare The amount sent to treasury
     * @param depositorShare The amount distributed to depositors
     */
    event FeesCollected(
        address indexed token,
        uint256 amount,
        uint256 treasuryShare,
        uint256 depositorShare
    );

    /**
     * @notice Emitted when fees are withdrawn to treasury
     * @param token The address of the token
     * @param amount The amount withdrawn
     * @param recipient The treasury address
     */
    event TreasuryWithdrawal(
        address indexed token,
        uint256 amount,
        address indexed recipient
    );

    /**
     * @notice Emitted when the treasury address is updated
     * @param oldTreasury The previous treasury address
     * @param newTreasury The new treasury address
     */
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);

    /**
     * @notice Emitted when the fee split is updated
     * @param treasuryBps The new treasury share in basis points
     * @param depositorBps The new depositor share in basis points
     */
    event FeeSplitUpdated(uint256 treasuryBps, uint256 depositorBps);

    /**
     * @notice Collects fees from a flash loan
     * @param token The address of the token
     * @param amount The total fee amount
     */
    function collectFees(address token, uint256 amount) external;

    /**
     * @notice Withdraws accumulated treasury fees
     * @param token The address of the token to withdraw
     */
    function withdrawTreasuryFees(address token) external;

    /**
     * @notice Returns the accumulated treasury fees for a token
     * @param token The address of the token
     * @return fees The accumulated fee amount
     */
    function getTreasuryFees(address token) external view returns (uint256 fees);

    /**
     * @notice Returns the current fee split configuration
     * @return treasuryBps Treasury share in basis points
     * @return depositorBps Depositor share in basis points
     */
    function getFeeSplit() external view returns (uint256 treasuryBps, uint256 depositorBps);

    /**
     * @notice Returns the treasury address
     * @return treasury The current treasury address
     */
    function getTreasury() external view returns (address treasury);

    /**
     * @notice Updates the treasury address
     * @param newTreasury The new treasury address
     */
    function setTreasury(address newTreasury) external;

    /**
     * @notice Updates the fee split configuration
     * @param treasuryBps New treasury share in basis points
     * @param depositorBps New depositor share in basis points
     */
    function setFeeSplit(uint256 treasuryBps, uint256 depositorBps) external;
}
