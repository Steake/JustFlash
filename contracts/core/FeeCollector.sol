// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "../interfaces/IFeeCollector.sol";

/**
 * @title FeeCollector
 * @author TronFlash Protocol
 * @notice Handles protocol fee accumulation and distribution
 * @dev Splits flash loan fees between treasury (20%) and depositors (80%)
 * according to the protocol specification.
 *
 * Fee Distribution Model:
 * - Treasury Share: 20% of premium (protocol revenue)
 * - Depositor Share: 80% of premium (yield for LPs)
 */
contract FeeCollector is IFeeCollector, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /// @notice Basis points denominator
    uint256 public constant BPS_DENOMINATOR = 10000;

    /// @notice Treasury share in basis points (default: 2000 = 20%)
    uint256 public treasuryShareBps;

    /// @notice Depositor share in basis points (default: 8000 = 80%)
    uint256 public depositorShareBps;

    /// @notice Treasury address for protocol fees
    address public treasury;

    /// @notice Flash loan pool address (authorized caller)
    address public flashLoanPool;

    /// @notice Mapping of token => accumulated treasury fees
    mapping(address => uint256) private _treasuryFees;

    /// @notice Mapping of token => accumulated depositor fees (returned to pool)
    mapping(address => uint256) private _depositorFees;

    /// @notice Error thrown when caller is not the flash loan pool
    error UnauthorizedCaller(address caller);

    /// @notice Error thrown when address is zero
    error ZeroAddress();

    /// @notice Error thrown when fee split is invalid
    error InvalidFeeSplit(uint256 treasuryBps, uint256 depositorBps);

    /// @notice Error thrown when no fees to withdraw
    error NoFeesToWithdraw(address token);

    /// @notice Emitted when flash loan pool is updated
    event FlashLoanPoolUpdated(address indexed oldPool, address indexed newPool);

    /**
     * @notice Initializes the fee collector
     * @param initialOwner The initial owner address
     * @param treasuryAddress The treasury address for protocol fees
     * @param poolAddress The flash loan pool address
     */
    constructor(
        address initialOwner,
        address treasuryAddress,
        address poolAddress
    ) Ownable(initialOwner) {
        if (treasuryAddress == address(0)) revert ZeroAddress();
        if (poolAddress == address(0)) revert ZeroAddress();
        
        treasury = treasuryAddress;
        flashLoanPool = poolAddress;
        
        // Default split: 20% treasury, 80% depositors
        treasuryShareBps = 2000;
        depositorShareBps = 8000;
    }

    /**
     * @notice Modifier to restrict to flash loan pool
     */
    modifier onlyPool() {
        if (msg.sender != flashLoanPool) revert UnauthorizedCaller(msg.sender);
        _;
    }

    /**
     * @inheritdoc IFeeCollector
     * @dev Called by FlashLoanPool after successful flash loan repayment.
     * Splits fees according to configured percentages.
     */
    function collectFees(address token, uint256 amount) external override onlyPool {
        if (amount == 0) return;

        // Calculate split
        uint256 treasuryAmount = (amount * treasuryShareBps) / BPS_DENOMINATOR;
        uint256 depositorAmount = amount - treasuryAmount;

        // Record fees
        _treasuryFees[token] += treasuryAmount;
        _depositorFees[token] += depositorAmount;

        emit FeesCollected(token, amount, treasuryAmount, depositorAmount);

        // Return depositor share to pool immediately
        if (depositorAmount > 0) {
            IERC20(token).safeTransfer(flashLoanPool, depositorAmount);
        }
    }

    /**
     * @inheritdoc IFeeCollector
     */
    function withdrawTreasuryFees(address token) external override nonReentrant {
        uint256 amount = _treasuryFees[token];
        if (amount == 0) revert NoFeesToWithdraw(token);

        _treasuryFees[token] = 0;

        IERC20(token).safeTransfer(treasury, amount);

        emit TreasuryWithdrawal(token, amount, treasury);
    }

    /**
     * @inheritdoc IFeeCollector
     */
    function getTreasuryFees(address token) external view override returns (uint256) {
        return _treasuryFees[token];
    }

    /**
     * @notice Returns accumulated depositor fees for a token
     * @param token The token address
     * @return fees The accumulated depositor fee amount
     */
    function getDepositorFees(address token) external view returns (uint256) {
        return _depositorFees[token];
    }

    /**
     * @inheritdoc IFeeCollector
     */
    function getFeeSplit() external view override returns (uint256, uint256) {
        return (treasuryShareBps, depositorShareBps);
    }

    /**
     * @inheritdoc IFeeCollector
     */
    function getTreasury() external view override returns (address) {
        return treasury;
    }

    /**
     * @inheritdoc IFeeCollector
     */
    function setTreasury(address newTreasury) external override onlyOwner {
        if (newTreasury == address(0)) revert ZeroAddress();
        
        address oldTreasury = treasury;
        treasury = newTreasury;
        
        emit TreasuryUpdated(oldTreasury, newTreasury);
    }

    /**
     * @inheritdoc IFeeCollector
     */
    function setFeeSplit(uint256 newTreasuryBps, uint256 newDepositorBps) external override onlyOwner {
        if (newTreasuryBps + newDepositorBps != BPS_DENOMINATOR) {
            revert InvalidFeeSplit(newTreasuryBps, newDepositorBps);
        }
        
        treasuryShareBps = newTreasuryBps;
        depositorShareBps = newDepositorBps;
        
        emit FeeSplitUpdated(newTreasuryBps, newDepositorBps);
    }

    /**
     * @notice Updates the flash loan pool address
     * @param newPool The new pool address
     */
    function setFlashLoanPool(address newPool) external onlyOwner {
        if (newPool == address(0)) revert ZeroAddress();
        
        address oldPool = flashLoanPool;
        flashLoanPool = newPool;
        
        emit FlashLoanPoolUpdated(oldPool, newPool);
    }
}
