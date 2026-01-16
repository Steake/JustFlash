// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./FlashLoanReceiverBase.sol";

/**
 * @title JustLendLiquidator
 * @author TronFlash Protocol
 * @notice Flash loan receiver for JustLend liquidations
 * @dev Enables zero-capital liquidations on JustLend protocol.
 *
 * Execution Flow:
 * 1. Flashloan USDT (debt token) from TronFlash
 * 2. Approve JustLend jToken contract for USDT
 * 3. Call jToken.liquidateBorrow(borrower, repayAmount, jTokenCollateral)
 * 4. Receive seized collateral (jTokens)
 * 5. Redeem jTokens for underlying collateral
 * 6. Swap collateral to USDT via SunSwap
 * 7. Approve TronFlash for USDT (amount + premium)
 * 8. Return true from executeOperation(); profit remains in contract
 */
contract JustLendLiquidator is FlashLoanReceiverBase {
    using SafeERC20 for IERC20;

    /// @notice JustLend Comptroller address (mainnet)
    address public constant JUSTLEND_COMPTROLLER = address(0); // To be set on deployment

    /// @notice SunSwap Router V2 address (mainnet)
    address public constant SUNSWAP_ROUTER = address(0); // To be set on deployment

    /// @notice Emitted when a liquidation is executed
    event Liquidation(
        address indexed borrower,
        address indexed debtToken,
        address indexed collateralToken,
        uint256 repayAmount,
        uint256 seizedAmount,
        uint256 profit
    );

    /// @notice Error thrown when liquidation fails
    error LiquidationFailed(string reason);

    /**
     * @notice Initializes the liquidator
     * @param poolAddress The flash loan pool address
     * @param initialOwner The initial owner address
     */
    constructor(
        address poolAddress,
        address initialOwner
    ) FlashLoanReceiverBase(poolAddress, initialOwner) {}

    /**
     * @inheritdoc FlashLoanReceiverBase
     * @dev Executes liquidation on JustLend
     * @param params ABI-encoded liquidation parameters:
     *   - borrower: Address of the borrower to liquidate
     *   - jTokenCollateral: Address of the jToken collateral to seize
     *   - jTokenDebt: Address of the jToken debt to repay
     */
    function _executeOperation(
        address token,
        uint256 amount,
        uint256 premium,
        address, // initiator - not used
        bytes calldata params
    ) internal override returns (bool) {
        // Decode liquidation parameters
        (
            address borrower,
            address jTokenCollateral,
            address jTokenDebt
        ) = abi.decode(params, (address, address, address));

        // 1. Approve JustLend jToken for debt repayment
        IERC20(token).safeIncreaseAllowance(jTokenDebt, amount);

        // 2. Execute liquidation on JustLend
        // Note: This is a placeholder - actual integration requires JustLend interfaces
        // bytes memory liquidateCall = abi.encodeWithSignature(
        //     "liquidateBorrow(address,uint256,address)",
        //     borrower,
        //     amount,
        //     jTokenCollateral
        // );
        // (bool liquidateSuccess, ) = jTokenDebt.call(liquidateCall);
        // if (!liquidateSuccess) revert LiquidationFailed("Liquidation call failed");

        // 3. Redeem seized collateral
        // Note: Placeholder for jToken redemption

        // 4. Swap collateral to debt token via SunSwap
        // Note: Placeholder for DEX swap

        // 5. Calculate profit
        uint256 amountOwed = amount + premium;
        uint256 currentBalance = IERC20(token).balanceOf(address(this));

        // Ensure we have enough to repay (with profit)
        if (currentBalance < amountOwed) {
            revert LiquidationFailed("Insufficient balance after liquidation");
        }

        uint256 profit = currentBalance - amountOwed;

        emit Liquidation(
            borrower,
            token,
            jTokenCollateral,
            amount,
            0, // seizedAmount - to be calculated from actual liquidation
            profit
        );

        return true;
    }

    /**
     * @notice Executes a liquidation via flash loan
     * @param debtToken The debt token to borrow
     * @param repayAmount The amount to repay
     * @param borrower The borrower to liquidate
     * @param jTokenCollateral The collateral jToken address
     * @param jTokenDebt The debt jToken address
     */
    function executeLiquidation(
        address debtToken,
        uint256 repayAmount,
        address borrower,
        address jTokenCollateral,
        address jTokenDebt
    ) external onlyOwner {
        bytes memory params = abi.encode(borrower, jTokenCollateral, jTokenDebt);
        POOL.flashLoan(address(this), debtToken, repayAmount, params);
    }
}
