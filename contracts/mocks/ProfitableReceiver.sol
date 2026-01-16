// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../interfaces/IFlashLoanReceiver.sol";
import "../interfaces/IFlashLoanPool.sol";

/**
 * @title ProfitableReceiver
 * @notice Test receiver that simulates profitable flash loan strategy
 */
contract ProfitableReceiver is IFlashLoanReceiver {
    using SafeERC20 for IERC20;

    IFlashLoanPool public pool;
    uint256 public profit;

    constructor(address _pool) {
        pool = IFlashLoanPool(_pool);
    }

    function executeOperation(
        address token,
        uint256 amount,
        uint256 premium,
        address,
        bytes calldata
    ) external override returns (bool) {
        // Simulate profit by checking balance
        uint256 balance = IERC20(token).balanceOf(address(this));
        uint256 amountOwed = amount + premium;
        
        require(balance >= amountOwed, "Insufficient balance for repayment");
        
        profit = balance - amountOwed;
        
        // Approve pool for repayment
        IERC20(token).safeIncreaseAllowance(msg.sender, amountOwed);
        
        return true;
    }

    function initiateFlashLoan(
        address token,
        uint256 amount,
        bytes calldata params
    ) external {
        pool.flashLoan(address(this), token, amount, params);
    }

    function withdrawProfit(address token, address to) external {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).safeTransfer(to, balance);
        }
    }
}
