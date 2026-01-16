// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IFlashLoanPool
 * @author TronFlash Protocol
 * @notice Interface for the flash loan pool contract
 * @dev Defines the core functions for flash loans, deposits, and withdrawals
 */
interface IFlashLoanPool {
    /**
     * @notice Emitted when a flash loan is executed successfully
     * @param receiver The address that received the flash loan
     * @param token The address of the borrowed token
     * @param amount The amount borrowed
     * @param premium The premium paid
     * @param initiator The address that initiated the flash loan
     */
    event FlashLoan(
        address indexed receiver,
        address indexed token,
        uint256 amount,
        uint256 premium,
        address indexed initiator
    );

    /**
     * @notice Emitted when liquidity is deposited into the pool
     * @param depositor The address that deposited
     * @param token The address of the deposited token
     * @param amount The amount deposited
     * @param shares The number of pool shares minted
     */
    event Deposit(
        address indexed depositor,
        address indexed token,
        uint256 amount,
        uint256 shares
    );

    /**
     * @notice Emitted when liquidity is withdrawn from the pool
     * @param withdrawer The address that withdrew
     * @param token The address of the withdrawn token
     * @param shares The number of pool shares burned
     * @param amount The amount withdrawn
     */
    event Withdrawal(
        address indexed withdrawer,
        address indexed token,
        uint256 shares,
        uint256 amount
    );

    /**
     * @notice Executes a flash loan
     * @dev The receiver must implement IFlashLoanReceiver and repay amount + premium
     * @param receiverAddress The address of the contract that will receive the loan and execute callback
     * @param token The address of the TRC-20 token to borrow
     * @param amount The amount of tokens to borrow
     * @param params Arbitrary data to pass to the receiver's executeOperation callback
     * @return success True if the flash loan was executed successfully
     */
    function flashLoan(
        address receiverAddress,
        address token,
        uint256 amount,
        bytes calldata params
    ) external returns (bool success);

    /**
     * @notice Deposits liquidity into the pool
     * @dev Depositors receive pool shares (ERC-4626 pattern) proportional to their contribution
     * @param token The address of the TRC-20 token to deposit
     * @param amount The amount of tokens to deposit
     * @return shares The number of pool shares minted to the depositor
     */
    function deposit(
        address token,
        uint256 amount
    ) external returns (uint256 shares);

    /**
     * @notice Withdraws liquidity from the pool
     * @dev Burns pool shares and returns the proportional amount of underlying tokens
     * @param token The address of the TRC-20 token to withdraw
     * @param shares The number of pool shares to burn
     * @return amount The amount of tokens withdrawn
     */
    function withdraw(
        address token,
        uint256 shares
    ) external returns (uint256 amount);

    /**
     * @notice Returns the total liquidity available for a given token
     * @param token The address of the token to query
     * @return liquidity The total amount of tokens available in the pool
     */
    function getAvailableLiquidity(address token) external view returns (uint256 liquidity);

    /**
     * @notice Returns the current flash loan fee in basis points
     * @return fee The flash loan fee (e.g., 5 = 0.05%)
     */
    function getFlashLoanFee() external view returns (uint256 fee);

    /**
     * @notice Returns the pool share balance for a user and token
     * @param user The address of the user
     * @param token The address of the token
     * @return balance The number of pool shares owned
     */
    function getPoolShares(address user, address token) external view returns (uint256 balance);

    /**
     * @notice Returns the total pool shares for a token
     * @param token The address of the token
     * @return totalShares The total number of pool shares outstanding
     */
    function getTotalPoolShares(address token) external view returns (uint256 totalShares);
}
