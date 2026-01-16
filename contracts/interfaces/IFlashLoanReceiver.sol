// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IFlashLoanReceiver
 * @author TronFlash Protocol
 * @notice Interface for flash loan receiver contracts
 * @dev All contracts that wish to receive flash loans must implement this interface.
 * The implementing contract will receive the borrowed tokens and must repay them
 * plus the premium within the same transaction.
 */
interface IFlashLoanReceiver {
    /**
     * @notice Executes the flash loan callback operation
     * @dev This function is called after the flash loan amount has been transferred to the receiver.
     * The receiver must approve the pool to pull back the amount + premium before returning.
     * @param token The address of the TRC-20 token being borrowed
     * @param amount The amount of tokens borrowed (in token decimals)
     * @param premium The fee owed in addition to the borrowed amount (amount * fee / 10000)
     * @param initiator The address that initiated the flash loan (original msg.sender to pool)
     * @param params Arbitrary data passed through from the flashLoan() call for custom logic
     * @return success True if the operation was successful and repayment is ready
     */
    function executeOperation(
        address token,
        uint256 amount,
        uint256 premium,
        address initiator,
        bytes calldata params
    ) external returns (bool success);
}
