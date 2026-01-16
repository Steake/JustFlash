// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "../interfaces/IFlashLoanPool.sol";
import "../interfaces/IFlashLoanReceiver.sol";
import "../interfaces/IFeeCollector.sol";

/**
 * @title FlashLoanPool
 * @author TronFlash Protocol
 * @notice Core flash loan pool contract for TRON
 * @dev Implements pool-based flash loan architecture inspired by Aave V3,
 * adapted for TVM's resource model. Supports ERC-4626 vault pattern for LP shares.
 *
 * Security Features:
 * - ReentrancyGuard on all external entry points
 * - Checks-Effects-Interactions pattern
 * - Balance verification post-callback
 * - Token whitelist support
 */
contract FlashLoanPool is IFlashLoanPool, ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    /// @notice Flash loan fee in basis points (5 bps = 0.05%)
    uint256 public flashLoanFeeBps;

    /// @notice Maximum flash loan fee in basis points (100 bps = 1%)
    uint256 public constant MAX_FEE_BPS = 100;

    /// @notice Basis points denominator
    uint256 public constant BPS_DENOMINATOR = 10000;

    /// @notice Fee collector contract address
    IFeeCollector public feeCollector;

    /// @notice Mapping of token => user => pool shares
    mapping(address => mapping(address => uint256)) private _poolShares;

    /// @notice Mapping of token => total pool shares
    mapping(address => uint256) private _totalPoolShares;

    /// @notice Mapping of token => total deposits (for share calculation)
    mapping(address => uint256) private _totalDeposits;

    /// @notice Mapping of supported tokens (whitelist)
    mapping(address => bool) private _supportedTokens;

    /// @notice Array of all supported token addresses
    address[] private _tokenList;

    /// @notice Emitted when a token is added to the whitelist
    event TokenWhitelisted(address indexed token);

    /// @notice Emitted when a token is removed from the whitelist
    event TokenDelisted(address indexed token);

    /// @notice Emitted when flash loan fee is updated
    event FlashLoanFeeUpdated(uint256 oldFee, uint256 newFee);

    /// @notice Emitted when fee collector is updated
    event FeeCollectorUpdated(address indexed oldCollector, address indexed newCollector);

    /// @notice Error thrown when amount is zero
    error ZeroAmount();

    /// @notice Error thrown when token is not supported
    error TokenNotSupported(address token);

    /// @notice Error thrown when insufficient liquidity
    error InsufficientLiquidity(address token, uint256 requested, uint256 available);

    /// @notice Error thrown when flash loan repayment fails
    error FlashLoanRepaymentFailed(address token, uint256 expected, uint256 received);

    /// @notice Error thrown when receiver callback fails
    error ReceiverCallbackFailed();

    /// @notice Error thrown when fee exceeds maximum
    error FeeTooHigh(uint256 fee, uint256 maxFee);

    /// @notice Error thrown when address is zero
    error ZeroAddress();

    /// @notice Error thrown when insufficient shares
    error InsufficientShares(uint256 requested, uint256 available);

    /**
     * @notice Initializes the flash loan pool
     * @param initialOwner The address of the initial owner
     * @param initialFee The initial flash loan fee in basis points
     */
    constructor(address initialOwner, uint256 initialFee) Ownable(initialOwner) {
        if (initialFee > MAX_FEE_BPS) revert FeeTooHigh(initialFee, MAX_FEE_BPS);
        flashLoanFeeBps = initialFee;
    }

    /**
     * @inheritdoc IFlashLoanPool
     * @dev Implements atomic flash loan with CEI pattern:
     * 1. CHECKS: Validate inputs (amount, liquidity, receiver)
     * 2. EFFECTS: Calculate premium, record pre-balance
     * 3. INTERACTIONS: Transfer, callback, pull repayment
     */
    function flashLoan(
        address receiverAddress,
        address token,
        uint256 amount,
        bytes calldata params
    ) external override nonReentrant returns (bool) {
        // CHECKS
        if (amount == 0) revert ZeroAmount();
        if (receiverAddress == address(0)) revert ZeroAddress();
        if (!_supportedTokens[token]) revert TokenNotSupported(token);

        IERC20 tokenContract = IERC20(token);
        uint256 availableLiquidity = tokenContract.balanceOf(address(this));

        if (amount > availableLiquidity) {
            revert InsufficientLiquidity(token, amount, availableLiquidity);
        }

        // EFFECTS
        uint256 premium = (amount * flashLoanFeeBps) / BPS_DENOMINATOR;
        uint256 amountPlusPremium = amount + premium;
        uint256 preBalance = availableLiquidity;

        // INTERACTIONS
        // Transfer tokens to receiver
        tokenContract.safeTransfer(receiverAddress, amount);

        // Execute callback on receiver
        bool success = IFlashLoanReceiver(receiverAddress).executeOperation(
            token,
            amount,
            premium,
            msg.sender,
            params
        );

        if (!success) revert ReceiverCallbackFailed();

        // Pull repayment (receiver must have approved this contract)
        tokenContract.safeTransferFrom(receiverAddress, address(this), amountPlusPremium);

        // Verify repayment
        uint256 postBalance = tokenContract.balanceOf(address(this));
        if (postBalance < preBalance + premium) {
            revert FlashLoanRepaymentFailed(token, preBalance + premium, postBalance);
        }

        // Distribute fees
        if (premium > 0 && address(feeCollector) != address(0)) {
            // Transfer premium to fee collector for distribution
            tokenContract.safeTransfer(address(feeCollector), premium);
            feeCollector.collectFees(token, premium);
        } else if (premium > 0) {
            // If no fee collector, premium stays in pool (increases share value)
            _totalDeposits[token] += premium;
        }

        emit FlashLoan(receiverAddress, token, amount, premium, msg.sender);

        return true;
    }

    /**
     * @inheritdoc IFlashLoanPool
     * @dev Implements ERC-4626 vault pattern for share calculation.
     * Shares represent proportional ownership of the pool.
     */
    function deposit(
        address token,
        uint256 amount
    ) external override nonReentrant returns (uint256 shares) {
        if (amount == 0) revert ZeroAmount();
        if (!_supportedTokens[token]) revert TokenNotSupported(token);

        IERC20 tokenContract = IERC20(token);

        // Calculate shares to mint
        uint256 totalShares = _totalPoolShares[token];
        uint256 totalDeposited = _totalDeposits[token];

        if (totalShares == 0 || totalDeposited == 0) {
            // First deposit: 1:1 ratio
            shares = amount;
        } else {
            // Subsequent deposits: proportional to existing shares
            shares = (amount * totalShares) / totalDeposited;
        }

        // Effects
        _poolShares[token][msg.sender] += shares;
        _totalPoolShares[token] += shares;
        _totalDeposits[token] += amount;

        // Interactions
        tokenContract.safeTransferFrom(msg.sender, address(this), amount);

        emit Deposit(msg.sender, token, amount, shares);

        return shares;
    }

    /**
     * @inheritdoc IFlashLoanPool
     * @dev Burns shares and returns proportional underlying tokens.
     * Implements withdrawal fee if configured (currently 0).
     */
    function withdraw(
        address token,
        uint256 shares
    ) external override nonReentrant returns (uint256 amount) {
        if (shares == 0) revert ZeroAmount();
        if (!_supportedTokens[token]) revert TokenNotSupported(token);

        uint256 userShares = _poolShares[token][msg.sender];
        if (shares > userShares) revert InsufficientShares(shares, userShares);

        uint256 totalShares = _totalPoolShares[token];
        uint256 totalDeposited = _totalDeposits[token];

        // Calculate amount to withdraw (proportional to shares)
        amount = (shares * totalDeposited) / totalShares;

        // Effects
        _poolShares[token][msg.sender] -= shares;
        _totalPoolShares[token] -= shares;
        _totalDeposits[token] -= amount;

        // Interactions
        IERC20(token).safeTransfer(msg.sender, amount);

        emit Withdrawal(msg.sender, token, shares, amount);

        return amount;
    }

    /**
     * @inheritdoc IFlashLoanPool
     */
    function getAvailableLiquidity(address token) external view override returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }

    /**
     * @inheritdoc IFlashLoanPool
     */
    function getFlashLoanFee() external view override returns (uint256) {
        return flashLoanFeeBps;
    }

    /**
     * @inheritdoc IFlashLoanPool
     */
    function getPoolShares(address user, address token) external view override returns (uint256) {
        return _poolShares[token][user];
    }

    /**
     * @inheritdoc IFlashLoanPool
     */
    function getTotalPoolShares(address token) external view override returns (uint256) {
        return _totalPoolShares[token];
    }

    /**
     * @notice Returns the total deposits for a token
     * @param token The token address
     * @return totalDeposits The total amount deposited
     */
    function getTotalDeposits(address token) external view returns (uint256) {
        return _totalDeposits[token];
    }

    /**
     * @notice Converts shares to underlying amount
     * @param token The token address
     * @param shares The number of shares
     * @return amount The underlying token amount
     */
    function sharesToAmount(address token, uint256 shares) external view returns (uint256 amount) {
        uint256 totalShares = _totalPoolShares[token];
        if (totalShares == 0) return shares;
        return (shares * _totalDeposits[token]) / totalShares;
    }

    /**
     * @notice Converts underlying amount to shares
     * @param token The token address
     * @param amount The token amount
     * @return shares The equivalent number of shares
     */
    function amountToShares(address token, uint256 amount) external view returns (uint256 shares) {
        uint256 totalDeposited = _totalDeposits[token];
        if (totalDeposited == 0) return amount;
        return (amount * _totalPoolShares[token]) / totalDeposited;
    }

    /**
     * @notice Checks if a token is supported
     * @param token The token address
     * @return supported True if the token is whitelisted
     */
    function isTokenSupported(address token) external view returns (bool) {
        return _supportedTokens[token];
    }

    /**
     * @notice Returns all supported tokens
     * @return tokens Array of whitelisted token addresses
     */
    function getSupportedTokens() external view returns (address[] memory) {
        return _tokenList;
    }

    // ============ Admin Functions ============

    /**
     * @notice Adds a token to the whitelist
     * @param token The token address to whitelist
     */
    function whitelistToken(address token) external onlyOwner {
        if (token == address(0)) revert ZeroAddress();
        if (!_supportedTokens[token]) {
            _supportedTokens[token] = true;
            _tokenList.push(token);
            emit TokenWhitelisted(token);
        }
    }

    /**
     * @notice Removes a token from the whitelist
     * @param token The token address to delist
     */
    function delistToken(address token) external onlyOwner {
        if (_supportedTokens[token]) {
            _supportedTokens[token] = false;
            // Remove from token list
            for (uint256 i = 0; i < _tokenList.length; i++) {
                if (_tokenList[i] == token) {
                    _tokenList[i] = _tokenList[_tokenList.length - 1];
                    _tokenList.pop();
                    break;
                }
            }
            emit TokenDelisted(token);
        }
    }

    /**
     * @notice Updates the flash loan fee
     * @param newFeeBps The new fee in basis points
     */
    function setFlashLoanFee(uint256 newFeeBps) external onlyOwner {
        if (newFeeBps > MAX_FEE_BPS) revert FeeTooHigh(newFeeBps, MAX_FEE_BPS);
        uint256 oldFee = flashLoanFeeBps;
        flashLoanFeeBps = newFeeBps;
        emit FlashLoanFeeUpdated(oldFee, newFeeBps);
    }

    /**
     * @notice Updates the fee collector contract
     * @param newFeeCollector The new fee collector address
     */
    function setFeeCollector(address newFeeCollector) external onlyOwner {
        address oldCollector = address(feeCollector);
        feeCollector = IFeeCollector(newFeeCollector);
        emit FeeCollectorUpdated(oldCollector, newFeeCollector);
    }
}
