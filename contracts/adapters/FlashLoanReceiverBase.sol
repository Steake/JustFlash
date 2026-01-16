// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "../interfaces/IFlashLoanReceiver.sol";
import "../interfaces/IFlashLoanPool.sol";

/**
 * @title FlashLoanReceiverBase
 * @author TronFlash Protocol
 * @notice Abstract base contract for flash loan receivers
 * @dev Provides common functionality and safety checks for flash loan receivers.
 * Third-party protocols should inherit from this contract.
 */
abstract contract FlashLoanReceiverBase is IFlashLoanReceiver, ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    /// @notice The flash loan pool address
    IFlashLoanPool public immutable POOL;

    /// @notice Error thrown when caller is not the pool
    error UnauthorizedPool(address caller);

    /// @notice Error thrown when operation fails
    error OperationFailed(string reason);

    /**
     * @notice Initializes the receiver with pool address
     * @param poolAddress The flash loan pool address
     * @param initialOwner The initial owner address
     */
    constructor(address poolAddress, address initialOwner) Ownable(initialOwner) {
        POOL = IFlashLoanPool(poolAddress);
    }

    /**
     * @notice Modifier to ensure caller is the flash loan pool
     */
    modifier onlyPool() {
        if (msg.sender != address(POOL)) revert UnauthorizedPool(msg.sender);
        _;
    }

    /**
     * @inheritdoc IFlashLoanReceiver
     * @dev Implementation must:
     * 1. Execute custom logic
     * 2. Approve pool for amount + premium
     * 3. Return true on success
     */
    function executeOperation(
        address token,
        uint256 amount,
        uint256 premium,
        address initiator,
        bytes calldata params
    ) external override onlyPool nonReentrant returns (bool) {
        // Execute custom logic in derived contract
        bool success = _executeOperation(token, amount, premium, initiator, params);
        
        if (!success) revert OperationFailed("Custom operation failed");

        // Approve pool to pull repayment
        uint256 amountOwed = amount + premium;
        IERC20(token).safeIncreaseAllowance(address(POOL), amountOwed);

        return true;
    }

    /**
     * @notice Internal hook for custom flash loan logic
     * @dev Override this function to implement your flash loan strategy
     * @param token The borrowed token address
     * @param amount The borrowed amount
     * @param premium The fee to be paid
     * @param initiator The original initiator address
     * @param params Custom parameters for the operation
     * @return success True if the operation succeeded
     */
    function _executeOperation(
        address token,
        uint256 amount,
        uint256 premium,
        address initiator,
        bytes calldata params
    ) internal virtual returns (bool success);

    /**
     * @notice Initiates a flash loan
     * @param token The token to borrow
     * @param amount The amount to borrow
     * @param params Custom parameters for the operation
     */
    function requestFlashLoan(
        address token,
        uint256 amount,
        bytes calldata params
    ) external onlyOwner {
        POOL.flashLoan(address(this), token, amount, params);
    }

    /**
     * @notice Rescues tokens accidentally sent to the contract
     * @param token The token to rescue
     * @param to The recipient address
     * @param amount The amount to rescue
     */
    function rescueTokens(
        address token,
        address to,
        uint256 amount
    ) external onlyOwner {
        IERC20(token).safeTransfer(to, amount);
    }

    /**
     * @notice Rescues TRX accidentally sent to the contract
     * @param to The recipient address
     * @param amount The amount to rescue
     */
    function rescueTRX(address payable to, uint256 amount) external onlyOwner {
        (bool success, ) = to.call{value: amount}("");
        require(success, "TRX transfer failed");
    }

    /**
     * @notice Allows contract to receive TRX
     */
    receive() external payable {}
}
