# TronFlash Protocol - Developer Integration Guide

## Table of Contents

1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [Flash Loan Basics](#flash-loan-basics)
4. [Implementing a Flash Loan Receiver](#implementing-a-flash-loan-receiver)
5. [Use Cases](#use-cases)
6. [Advanced Topics](#advanced-topics)
7. [Security Considerations](#security-considerations)
8. [API Reference](#api-reference)
9. [FAQ](#faq)

---

## Introduction

TronFlash is the first production-grade flash loan protocol for the TRON blockchain. Flash loans allow you to borrow any amount of supported tokens without collateral, provided you return the borrowed amount plus a small fee within the same transaction.

### Key Features

- **Zero Collateral**: Borrow without putting up any assets
- **Atomic Execution**: All-or-nothing transaction guarantee
- **Low Fees**: Only 0.05% (5 basis points) per loan
- **Multi-Token Support**: USDT, USDC, USDD, WTRX and more

### Prerequisites

- Solidity 0.8.20+
- TronBox or Hardhat
- Understanding of TRON smart contracts
- TronLink wallet for testing

---

## Getting Started

### Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/Steake/JustFlash.git
cd JustFlash
npm install
```

### Import Interfaces

In your Solidity project, import the required interfaces:

```solidity
import "./interfaces/IFlashLoanReceiver.sol";
import "./interfaces/IFlashLoanPool.sol";
```

Or install via npm (when published):

```bash
npm install @tronflash/contracts
```

---

## Flash Loan Basics

### How It Works

1. **Initiate**: Your contract calls `flashLoan()` on the pool
2. **Receive**: Pool transfers tokens to your receiver contract
3. **Execute**: Pool calls `executeOperation()` on your contract
4. **Repay**: Your contract approves pool to pull back tokens + fee
5. **Verify**: Pool confirms repayment; transaction completes or reverts

### The Flash Loan Function

```solidity
function flashLoan(
    address receiverAddress,  // Your contract implementing IFlashLoanReceiver
    address token,            // TRC-20 token to borrow
    uint256 amount,           // Amount to borrow (in token decimals)
    bytes calldata params     // Arbitrary data passed to your callback
) external returns (bool);
```

### Fee Calculation

```
Premium = Amount × 0.0005 (5 basis points)
Total Repayment = Amount + Premium
```

Example: Borrowing 1,000,000 USDT
- Premium: 1,000,000 × 0.0005 = 500 USDT
- Total: 1,000,500 USDT

---

## Implementing a Flash Loan Receiver

### Basic Implementation

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./interfaces/IFlashLoanReceiver.sol";
import "./interfaces/IFlashLoanPool.sol";

contract MyFlashLoanReceiver is IFlashLoanReceiver {
    IFlashLoanPool public immutable pool;
    
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
        // 1. Verify caller is the pool
        require(msg.sender == address(pool), "Unauthorized");
        
        // 2. Your custom logic here
        // - Arbitrage
        // - Liquidation
        // - Collateral swap
        // - etc.
        
        // 3. Calculate total amount owed
        uint256 amountOwed = amount + premium;
        
        // 4. Approve pool to pull repayment
        IERC20(token).approve(address(pool), amountOwed);
        
        // 5. Return true to indicate success
        return true;
    }
    
    // Entry point to trigger flash loan
    function executeFlashLoan(
        address token,
        uint256 amount,
        bytes calldata params
    ) external {
        pool.flashLoan(address(this), token, amount, params);
    }
}
```

### Using FlashLoanReceiverBase

For convenience, inherit from our base contract:

```solidity
import "./adapters/FlashLoanReceiverBase.sol";

contract MyStrategy is FlashLoanReceiverBase {
    constructor(address pool, address owner)
        FlashLoanReceiverBase(pool, owner)
    {}
    
    function _executeOperation(
        address token,
        uint256 amount,
        uint256 premium,
        address initiator,
        bytes calldata params
    ) internal override returns (bool) {
        // Your logic here
        // Base contract handles approval automatically
        return true;
    }
}
```

---

## Use Cases

### 1. Arbitrage

Profit from price differences between DEXs:

```solidity
function _executeOperation(
    address token,
    uint256 amount,
    uint256 premium,
    address,
    bytes calldata params
) internal override returns (bool) {
    (address dexA, address dexB, address tokenOut) = 
        abi.decode(params, (address, address, address));
    
    // Swap on DEX A (better sell price)
    IERC20(token).approve(dexA, amount);
    uint256 received = IDex(dexA).swap(token, tokenOut, amount);
    
    // Swap back on DEX B (better buy price)
    IERC20(tokenOut).approve(dexB, received);
    uint256 finalAmount = IDex(dexB).swap(tokenOut, token, received);
    
    // Ensure profit covers premium
    require(finalAmount >= amount + premium, "Not profitable");
    
    return true;
}
```

### 2. Liquidations

Liquidate underwater positions on JustLend:

```solidity
function _executeOperation(
    address token,
    uint256 amount,
    uint256 premium,
    address,
    bytes calldata params
) internal override returns (bool) {
    (address borrower, address jTokenDebt, address jTokenCollateral) = 
        abi.decode(params, (address, address, address));
    
    // Repay debt
    IERC20(token).approve(jTokenDebt, amount);
    IJToken(jTokenDebt).liquidateBorrow(borrower, amount, jTokenCollateral);
    
    // Redeem seized collateral
    uint256 seized = IERC20(jTokenCollateral).balanceOf(address(this));
    IJToken(jTokenCollateral).redeem(seized);
    
    // Swap collateral back to debt token
    // ... swap logic ...
    
    return true;
}
```

### 3. Collateral Swaps

Swap collateral without closing position:

```solidity
function _executeOperation(
    address token,
    uint256 amount,
    uint256 premium,
    address,
    bytes calldata params
) internal override returns (bool) {
    (address lendingPool, address newCollateral) = 
        abi.decode(params, (address, address));
    
    // Repay loan
    IERC20(token).approve(lendingPool, amount);
    ILending(lendingPool).repay(token, amount);
    
    // Withdraw old collateral
    ILending(lendingPool).withdraw(token, amount);
    
    // Swap to new collateral
    // ... swap logic ...
    
    // Deposit new collateral
    ILending(lendingPool).deposit(newCollateral, swappedAmount);
    
    // Borrow again
    ILending(lendingPool).borrow(token, amount + premium);
    
    return true;
}
```

---

## Advanced Topics

### Passing Parameters

Use the `params` argument to pass data to your callback:

```solidity
// Encoding
bytes memory params = abi.encode(
    targetAddress,
    minProfit,
    deadline
);

// Decoding
(address target, uint256 minProfit, uint256 deadline) = 
    abi.decode(params, (address, uint256, uint256));
```

### Multi-Token Flash Loans

Execute multiple flash loans in sequence:

```solidity
function executeMultiFlashLoan() external {
    // First flash loan
    pool.flashLoan(address(this), tokenA, amountA, abi.encode(1));
}

function executeOperation(
    address token,
    uint256 amount,
    uint256 premium,
    address,
    bytes calldata params
) external override returns (bool) {
    uint256 step = abi.decode(params, (uint256));
    
    if (step == 1) {
        // Process first loan
        // Trigger second loan
        pool.flashLoan(address(this), tokenB, amountB, abi.encode(2));
    } else if (step == 2) {
        // Process second loan
    }
    
    IERC20(token).approve(msg.sender, amount + premium);
    return true;
}
```

### Gas Optimization Tips

1. **Batch Operations**: Combine multiple swaps into one
2. **Use Assembly**: For critical paths, consider inline assembly
3. **Minimize Storage**: Use memory variables where possible
4. **Pre-approve**: Approve max amounts to avoid repeated approvals

---

## Security Considerations

### Critical Checks

1. **Verify Caller**: Always verify `msg.sender` is the pool
2. **Validate Amounts**: Check that amounts are non-zero and valid
3. **Slippage Protection**: Use minimum output amounts for swaps
4. **Reentrancy**: Use OpenZeppelin's ReentrancyGuard
5. **Access Control**: Restrict who can trigger flash loans

### Common Pitfalls

```solidity
// ❌ DON'T: Trust any caller
function executeOperation(...) external returns (bool) {
    // Anyone can call this!
}

// ✅ DO: Verify caller
function executeOperation(...) external returns (bool) {
    require(msg.sender == address(pool), "Unauthorized");
}
```

```solidity
// ❌ DON'T: Ignore return values
IERC20(token).transfer(recipient, amount);

// ✅ DO: Check return values or use SafeERC20
IERC20(token).safeTransfer(recipient, amount);
```

---

## API Reference

### IFlashLoanPool

```solidity
interface IFlashLoanPool {
    function flashLoan(
        address receiverAddress,
        address token,
        uint256 amount,
        bytes calldata params
    ) external returns (bool);
    
    function getAvailableLiquidity(address token) external view returns (uint256);
    function getFlashLoanFee() external view returns (uint256);
}
```

### IFlashLoanReceiver

```solidity
interface IFlashLoanReceiver {
    function executeOperation(
        address token,
        uint256 amount,
        uint256 premium,
        address initiator,
        bytes calldata params
    ) external returns (bool);
}
```

---

## FAQ

### Q: What happens if I can't repay?
A: The entire transaction reverts. No tokens are lost, but you pay for gas.

### Q: Can I borrow multiple tokens at once?
A: Not in a single call, but you can chain flash loans.

### Q: What's the maximum I can borrow?
A: Up to the total available liquidity in the pool for that token.

### Q: Are flash loans safe to use?
A: Flash loans themselves are safe (atomic guarantee), but your strategy must be sound.

### Q: How do I test flash loans?
A: Use our local Docker environment or deploy to Nile testnet.

---

## Support

- **GitHub**: https://github.com/Steake/JustFlash
- **Documentation**: https://docs.tronflash.io
- **Discord**: https://discord.gg/tronflash

---

*Last updated: January 2026*
