# JustFlash Protocol - Security Documentation

## Overview

This document outlines the security measures, audit status, and best practices for the JustFlash Protocol.

## Security Architecture

### Core Security Features

#### 1. Reentrancy Protection

All external entry points are protected with OpenZeppelin's `ReentrancyGuard`:

```solidity
contract FlashLoanPool is ReentrancyGuard {
    function flashLoan(...) external nonReentrant { ... }
    function deposit(...) external nonReentrant { ... }
    function withdraw(...) external nonReentrant { ... }
}
```

#### 2. Checks-Effects-Interactions Pattern

All functions follow the CEI pattern:

```solidity
function flashLoan(...) external nonReentrant {
    // CHECKS: Validate inputs
    if (amount == 0) revert ZeroAmount();
    if (!_supportedTokens[token]) revert TokenNotSupported(token);
    
    // EFFECTS: Update state
    uint256 premium = calculatePremium(amount);
    uint256 preBalance = getBalance();
    
    // INTERACTIONS: External calls last
    token.transfer(receiver, amount);
    receiver.executeOperation(...);
    token.transferFrom(receiver, address(this), amountOwed);
}
```

#### 3. Token Whitelist

Only verified tokens are supported to prevent malicious token attacks:

```solidity
mapping(address => bool) private _supportedTokens;

function whitelistToken(address token) external onlyOwner {
    _supportedTokens[token] = true;
}
```

#### 4. Balance Verification

Post-callback balance verification ensures repayment:

```solidity
uint256 postBalance = token.balanceOf(address(this));
if (postBalance < preBalance + premium) {
    revert FlashLoanRepaymentFailed(...);
}
```

#### 5. Access Control

Admin functions are protected with `Ownable`:

```solidity
function setFlashLoanFee(uint256 newFee) external onlyOwner { ... }
function whitelistToken(address token) external onlyOwner { ... }
function setFeeCollector(address collector) external onlyOwner { ... }
```

## Attack Vector Analysis

| Attack | Description | Mitigation |
|--------|-------------|------------|
| Reentrancy | Re-entering functions during execution | `nonReentrant` modifier |
| Flash Loan Chaining | Manipulating pool during callback | Balance verification |
| Malicious Token | Token with transfer hooks | Token whitelist |
| Integer Overflow | Arithmetic overflow | Solidity 0.8+ native checks |
| Unauthorized Access | Calling admin functions | `onlyOwner` modifier |
| Griefing | DOS through failed transactions | Gas-efficient design |

## Known Limitations

### 1. Oracle Dependency

JustFlash does not use price oracles for core functionality. Strategies using flash loans (arbitrage, liquidations) may depend on external oracles - this is the user's responsibility.

### 2. Admin Privileges

The owner can:
- Add/remove supported tokens
- Update flash loan fee (max 1%)
- Update fee collector address
- Update treasury address

Consider implementing a timelock or multi-sig for production.

### 3. Centralization Risk

Initial deployment is owner-controlled. Plan to transition to:
- Multi-signature wallet
- Governance contract
- Timelock for sensitive operations

## Audit Status

⚠️ **This protocol has NOT been professionally audited.**

### Recommended Audit Process

1. **Internal Review**: Completed ✅
2. **External Audit #1**: Pending
3. **External Audit #2**: Pending
4. **Formal Verification**: Pending
5. **Bug Bounty Program**: Pending

### Recommended Auditors

- Trail of Bits
- OpenZeppelin
- Consensys Diligence
- Certora (formal verification)

## Bug Bounty Program

### Proposed Bounty Structure

| Severity | Reward Range | Examples |
|----------|--------------|----------|
| Critical | $25,000 - $100,000 | Drain funds, bypass repayment |
| High | $10,000 - $25,000 | Steal fees, unauthorized admin |
| Medium | $2,500 - $10,000 | DOS, incorrect fee calculation |
| Low | $500 - $2,500 | Gas inefficiency, minor issues |

### Scope

In scope:
- FlashLoanPool.sol
- FeeCollector.sol
- PoolRegistry.sol
- All interface contracts

Out of scope:
- Frontend application
- Third-party integrations
- Issues in dependencies

## Security Best Practices for Integrators

### 1. Always Verify the Caller

```solidity
function executeOperation(...) external returns (bool) {
    require(msg.sender == FLASH_LOAN_POOL, "Unauthorized");
    // ...
}
```

### 2. Use SafeERC20

```solidity
using SafeERC20 for IERC20;

// Instead of
token.transfer(to, amount);

// Use
token.safeTransfer(to, amount);
```

### 3. Validate All Inputs

```solidity
require(amount > 0, "Zero amount");
require(receiver != address(0), "Zero address");
require(premium <= maxAcceptablePremium, "Premium too high");
```

### 4. Protect Against Slippage

```solidity
uint256 received = dex.swap(tokenIn, tokenOut, amountIn);
require(received >= minAmountOut, "Slippage exceeded");
```

### 5. Set Appropriate Gas Limits

```solidity
pool.flashLoan(...).send({ feeLimit: 500_000_000 }); // 500 TRX
```

## Emergency Procedures

### Circuit Breaker

The protocol can be paused by:
1. Delisting all tokens (prevents new flash loans)
2. Deploying upgraded contracts
3. Migrating liquidity

### Incident Response

1. **Detection**: Monitor events and balances
2. **Assessment**: Determine impact and scope
3. **Containment**: Delist affected tokens
4. **Remediation**: Deploy fix
5. **Communication**: Notify users
6. **Post-mortem**: Document lessons learned

## Contact

For security concerns, contact:
- **Security Email**: security@justflash.io
- **GitHub Security Advisory**: Submit privately on GitHub

---

*This document is for informational purposes only and does not constitute a security guarantee.*
