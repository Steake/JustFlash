// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../interfaces/IFlashLoanReceiver.sol";
import "../interfaces/IFlashLoanPool.sol";

/**
 * @title MockFlashLoanReceiver
 * @notice Mock receiver for testing flash loans
 */
contract MockFlashLoanReceiver is IFlashLoanReceiver {
    using SafeERC20 for IERC20;

    IFlashLoanPool public pool;
    
    // Test configuration
    bool public shouldRepay = true;
    bool public shouldReturnTrue = true;
    uint256 public extraRepayment = 0;
    
    // Tracking
    uint256 public lastAmount;
    uint256 public lastPremium;
    address public lastToken;
    address public lastInitiator;
    bytes public lastParams;
    uint256 public callCount;

    constructor(address _pool) {
        pool = IFlashLoanPool(_pool);
    }

    function executeOperation(
        address token,
        uint256 amount,
        uint256 premium,
        address initiator,
        bytes calldata params
    ) external override returns (bool) {
        // Record call data
        lastToken = token;
        lastAmount = amount;
        lastPremium = premium;
        lastInitiator = initiator;
        lastParams = params;
        callCount++;

        if (shouldRepay) {
            // Approve pool for repayment
            uint256 amountOwed = amount + premium + extraRepayment;
            IERC20(token).safeIncreaseAllowance(msg.sender, amountOwed);
        }

        return shouldReturnTrue;
    }

    function initiateFlashLoan(
        address token,
        uint256 amount,
        bytes calldata params
    ) external {
        pool.flashLoan(address(this), token, amount, params);
    }

    // Test configuration functions
    function setShouldRepay(bool _shouldRepay) external {
        shouldRepay = _shouldRepay;
    }

    function setShouldReturnTrue(bool _shouldReturnTrue) external {
        shouldReturnTrue = _shouldReturnTrue;
    }

    function setExtraRepayment(uint256 _extraRepayment) external {
        extraRepayment = _extraRepayment;
    }

    function setPool(address _pool) external {
        pool = IFlashLoanPool(_pool);
    }
}
