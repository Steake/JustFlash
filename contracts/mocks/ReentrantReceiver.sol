// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../interfaces/IFlashLoanReceiver.sol";

/**
 * @title ReentrantReceiver
 * @notice Malicious receiver that attempts reentrancy attack
 */
contract ReentrantReceiver is IFlashLoanReceiver {
    address public pool;
    address public token;
    uint256 public attackCount;
    bool public attackEnabled;

    constructor(address _pool) {
        pool = _pool;
    }

    function executeOperation(
        address _token,
        uint256 amount,
        uint256 premium,
        address,
        bytes calldata
    ) external override returns (bool) {
        token = _token;
        
        if (attackEnabled && attackCount < 2) {
            attackCount++;
            // Attempt reentrancy
            (bool success,) = pool.call(
                abi.encodeWithSignature(
                    "flashLoan(address,address,uint256,bytes)",
                    address(this),
                    token,
                    amount / 2,
                    ""
                )
            );
            // Attack should fail due to reentrancy guard
            require(!success, "Reentrancy attack should fail");
        }

        // Approve repayment
        IERC20(token).approve(pool, amount + premium);
        return true;
    }

    function enableAttack(bool _enabled) external {
        attackEnabled = _enabled;
        attackCount = 0;
    }

    function initiateFlashLoan(address _token, uint256 amount) external {
        token = _token;
        (bool success,) = pool.call(
            abi.encodeWithSignature(
                "flashLoan(address,address,uint256,bytes)",
                address(this),
                _token,
                amount,
                ""
            )
        );
        require(success, "Flash loan failed");
    }
}
