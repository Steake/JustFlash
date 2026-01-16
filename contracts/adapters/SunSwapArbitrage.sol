// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./FlashLoanReceiverBase.sol";

/**
 * @title SunSwapArbitrage
 * @author JustFlash Protocol
 * @notice Flash loan receiver for SunSwap arbitrage
 * @dev Enables zero-capital arbitrage between SunSwap pools or against external venues.
 *
 * Key Contracts (Mainnet):
 * - SunSwap Router V2: TKzxdSv2FZKQrEqkKVgp5DcwEXBEKMg2Ax
 * - SunSwap Factory V2: TXk8rQSAvPvBBNtqSoY6nCfsXWCSSpTVQF
 */
contract SunSwapArbitrage is FlashLoanReceiverBase {
    using SafeERC20 for IERC20;

    /// @notice SunSwap Router V2 interface
    address public sunswapRouter;

    /// @notice Minimum profit threshold to execute arbitrage
    uint256 public minProfitThreshold;

    /// @notice Emitted when an arbitrage is executed
    event Arbitrage(
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 profit
    );

    /// @notice Emitted when router is updated
    event RouterUpdated(address indexed oldRouter, address indexed newRouter);

    /// @notice Emitted when min profit threshold is updated
    event MinProfitThresholdUpdated(uint256 oldThreshold, uint256 newThreshold);

    /// @notice Error thrown when arbitrage is not profitable
    error NotProfitable(uint256 expected, uint256 actual);

    /// @notice Error thrown when swap fails
    error SwapFailed(string reason);

    /**
     * @notice Initializes the arbitrage contract
     * @param poolAddress The flash loan pool address
     * @param initialOwner The initial owner address
     * @param routerAddress The SunSwap router address
     * @param minProfit The minimum profit threshold
     */
    constructor(
        address poolAddress,
        address initialOwner,
        address routerAddress,
        uint256 minProfit
    ) FlashLoanReceiverBase(poolAddress, initialOwner) {
        sunswapRouter = routerAddress;
        minProfitThreshold = minProfit;
    }

    /**
     * @inheritdoc FlashLoanReceiverBase
     * @dev Executes arbitrage strategy
     * @param params ABI-encoded arbitrage parameters:
     *   - path: Array of token addresses for the swap path
     *   - minAmountOut: Minimum amount to receive from swap
     */
    function _executeOperation(
        address token,
        uint256 amount,
        uint256 premium,
        address, // initiator - not used
        bytes calldata params
    ) internal override returns (bool) {
        // Decode arbitrage parameters
        (
            address[] memory path,
            uint256 minAmountOut
        ) = abi.decode(params, (address[], uint256));

        // Calculate minimum profit needed
        uint256 amountOwed = amount + premium;
        uint256 targetAmount = amountOwed + minProfitThreshold;

        // 1. Approve router for input token
        IERC20(token).safeIncreaseAllowance(sunswapRouter, amount);

        // 2. Execute swap through SunSwap
        // Note: This is a placeholder - actual integration requires SunSwap router interface
        // uint256[] memory amounts = ISunSwapRouter(sunswapRouter).swapExactTokensForTokens(
        //     amount,
        //     minAmountOut,
        //     path,
        //     address(this),
        //     block.timestamp
        // );

        // 3. Execute reverse swap to get back original token with profit
        // Note: Placeholder for actual swap logic

        // 4. Verify profitability
        uint256 currentBalance = IERC20(token).balanceOf(address(this));
        if (currentBalance < targetAmount) {
            revert NotProfitable(targetAmount, currentBalance);
        }

        uint256 profit = currentBalance - amountOwed;

        emit Arbitrage(
            token,
            path.length > 0 ? path[path.length - 1] : token,
            amount,
            currentBalance,
            profit
        );

        return true;
    }

    /**
     * @notice Executes an arbitrage opportunity via flash loan
     * @param token The base token to borrow
     * @param amount The amount to borrow
     * @param path The swap path
     * @param minAmountOut Minimum amount out from swap
     */
    function executeArbitrage(
        address token,
        uint256 amount,
        address[] calldata path,
        uint256 minAmountOut
    ) external onlyOwner {
        bytes memory params = abi.encode(path, minAmountOut);
        POOL.flashLoan(address(this), token, amount, params);
    }

    /**
     * @notice Updates the SunSwap router address
     * @param newRouter The new router address
     */
    function setRouter(address newRouter) external onlyOwner {
        address oldRouter = sunswapRouter;
        sunswapRouter = newRouter;
        emit RouterUpdated(oldRouter, newRouter);
    }

    /**
     * @notice Updates the minimum profit threshold
     * @param newThreshold The new minimum profit
     */
    function setMinProfitThreshold(uint256 newThreshold) external onlyOwner {
        uint256 oldThreshold = minProfitThreshold;
        minProfitThreshold = newThreshold;
        emit MinProfitThresholdUpdated(oldThreshold, newThreshold);
    }
}
