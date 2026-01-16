# TronFlash Protocol

<p align="center">
  <strong>First Production-Grade Flash Loan Infrastructure for TRON</strong>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#smart-contracts">Smart Contracts</a> •
  <a href="#integration-guide">Integration Guide</a> •
  <a href="#deployment">Deployment</a> •
  <a href="#security">Security</a>
</p>

---

## Overview

TronFlash is a native flash loan protocol for the TRON blockchain, enabling zero-capital DeFi strategies including arbitrage, liquidations, and collateral swaps. Built with security-first principles and optimized for TVM's energy model.

### Why TronFlash?

- **First Mover**: No production-grade flash loan infrastructure exists on TRON ($8.25B TVL)
- **Zero Capital Required**: Execute complex DeFi strategies without upfront capital
- **Low Fees**: 0.05% flash loan premium (5 basis points)
- **High Throughput**: Leverage TRON's ~2,000 TPS capacity
- **Energy Optimized**: Designed for TVM's dual-resource model (Energy + Bandwidth)

---

## Features

- ✅ **Atomic Flash Loans** - Borrow any supported TRC-20 token within a single transaction
- ✅ **ERC-4626 Vault Pattern** - LP shares accrue value from flash loan fees
- ✅ **Multi-Token Support** - USDT, USDC, USDD, WTRX, and more
- ✅ **Fee Distribution** - 80% to depositors, 20% to protocol treasury
- ✅ **Security Guards** - ReentrancyGuard, CEI pattern, token whitelist
- ✅ **JustLend Integration** - Ready-to-use liquidation adapter
- ✅ **SunSwap Integration** - Arbitrage adapter for DEX trading

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        TronFlash Protocol                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────┐    ┌──────────────────┐                   │
│  │  FlashLoanPool   │◄───│  FeeCollector    │                   │
│  │                  │    │                  │                   │
│  │  • flashLoan()   │    │  • collectFees() │                   │
│  │  • deposit()     │    │  • 80/20 split   │                   │
│  │  • withdraw()    │    │                  │                   │
│  └────────┬─────────┘    └──────────────────┘                   │
│           │                                                      │
│           ▼                                                      │
│  ┌──────────────────┐    ┌──────────────────┐                   │
│  │  PoolRegistry    │    │  Your Contract   │                   │
│  │                  │    │                  │                   │
│  │  • Token mgmt    │    │  Implements      │                   │
│  │  • Whitelist     │    │  IFlashLoan      │                   │
│  │                  │    │  Receiver        │                   │
│  └──────────────────┘    └──────────────────┘                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Flash Loan Execution Flow

```
1. Your Contract calls flashLoan(receiver, token, amount, params)
2. Pool validates liquidity and calculates premium (amount × 0.05%)
3. Pool transfers tokens to receiver
4. Pool calls receiver.executeOperation(token, amount, premium, initiator, params)
5. Receiver executes strategy (arbitrage, liquidation, etc.)
6. Receiver approves Pool for amount + premium
7. Pool pulls repayment via transferFrom()
8. Pool verifies balance and distributes fees
9. Transaction completes (or reverts entirely if repayment fails)
```

---

## Quick Start

### Prerequisites

- Node.js 18+
- Docker & Docker Compose (for local development)
- TronLink wallet (for testnet/mainnet)

### Installation

```bash
# Clone the repository
git clone https://github.com/Steake/JustFlash.git
cd JustFlash

# Install dependencies
npm install

# Copy environment configuration
cp .env.example .env
```

### Local Development

```bash
# Start local TRON node (Tron Quickstart)
docker-compose up -d tron-quickstart

# Wait for node to be ready (~30 seconds)
docker-compose logs -f tron-quickstart

# Compile contracts
npm run compile

# Run tests
npm run test

# Deploy to local network
npm run migrate
```

### Deploy to Testnet (Nile)

```bash
# Set your private key in .env
PRIVATE_KEY_NILE=your_private_key_here

# Get testnet TRX from faucet: https://nileex.io/join/getJoinPage

# Deploy
npm run migrate:nile

# Bootstrap liquidity (if you have test tokens)
npm run bootstrap:nile
```

---

## Smart Contracts

### Core Contracts

| Contract | Description |
|----------|-------------|
| `FlashLoanPool` | Core pool managing deposits, withdrawals, and flash loans |
| `FeeCollector` | Handles fee accumulation and distribution (80/20 split) |
| `PoolRegistry` | Token whitelist and pool discovery |

### Interfaces

| Interface | Description |
|-----------|-------------|
| `IFlashLoanReceiver` | Must be implemented by flash loan receivers |
| `IFlashLoanPool` | Flash loan pool interface |
| `IFeeCollector` | Fee collector interface |
| `IPoolRegistry` | Registry interface |

### Adapters

| Adapter | Description |
|---------|-------------|
| `FlashLoanReceiverBase` | Abstract base for custom receivers |
| `JustLendLiquidator` | JustLend liquidation integration |
| `SunSwapArbitrage` | SunSwap DEX arbitrage |

### Supported Tokens (Mainnet)

| Token | Address |
|-------|---------|
| USDT | `TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t` |
| USDC | `TEkxiTehnzSmSe2XqrBj4w32RUN966rdz8` |
| USDD | `TPYmHEhy5n8TCEfYGqW2rPxsghSfzghPDn` |
| WTRX | `TNUC9Qb1rRpS5CbWLmNMxXBjyFoydXjWFR` |

---

## Integration Guide

### Implementing a Flash Loan Receiver

To receive flash loans, your contract must implement the `IFlashLoanReceiver` interface:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./interfaces/IFlashLoanReceiver.sol";
import "./interfaces/IFlashLoanPool.sol";

contract MyFlashLoanStrategy is IFlashLoanReceiver {
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
        // Ensure caller is the pool
        require(msg.sender == address(pool), "Unauthorized");

        // ============================================
        // Your custom logic here
        // Example: arbitrage, liquidation, collateral swap
        // ============================================

        // Calculate total owed
        uint256 amountOwed = amount + premium;

        // Approve pool to pull repayment
        IERC20(token).approve(address(pool), amountOwed);

        return true;
    }

    function initiateFlashLoan(
        address token,
        uint256 amount,
        bytes calldata params
    ) external {
        pool.flashLoan(address(this), token, amount, params);
    }
}
```

### Using the Base Receiver

For convenience, inherit from `FlashLoanReceiverBase`:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

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
        // Your strategy logic here
        // Base contract handles approval automatically
        return true;
    }
}
```

### JavaScript Integration (TronWeb)

```javascript
const TronWeb = require('tronweb');

// Initialize TronWeb
const tronWeb = new TronWeb({
    fullHost: 'https://api.trongrid.io',
    privateKey: 'your_private_key'
});

// Get pool contract
const pool = await tronWeb.contract().at('POOL_ADDRESS');

// Check available liquidity
const liquidity = await pool.getAvailableLiquidity('TOKEN_ADDRESS').call();
console.log('Available:', liquidity.toString());

// Deposit liquidity
await pool.deposit('TOKEN_ADDRESS', '1000000000000').send({
    feeLimit: 200_000_000
});

// Initiate flash loan (from receiver contract)
const receiver = await tronWeb.contract().at('YOUR_RECEIVER_ADDRESS');
await receiver.requestFlashLoan(
    'TOKEN_ADDRESS',
    '1000000000000',
    '0x' // params
).send({ feeLimit: 500_000_000 });
```

---

## Deployment

### Network Configuration

| Network | RPC Endpoint | Chain ID |
|---------|--------------|----------|
| Mainnet | `https://api.trongrid.io` | 1 |
| Nile Testnet | `https://nile.trongrid.io` | 3 |
| Shasta Testnet | `https://api.shasta.trongrid.io` | 2 |

### Deploy Commands

```bash
# Local development
npm run migrate

# Nile Testnet
npm run migrate:nile

# Shasta Testnet
npm run migrate:shasta

# Mainnet (CAUTION!)
npm run migrate:mainnet
```

### Post-Deployment Checklist

1. ✅ Verify contract source code on TronScan
2. ✅ Configure FeeCollector with treasury address
3. ✅ Whitelist supported tokens
4. ✅ Seed initial liquidity
5. ✅ Test flash loan with small amount
6. ✅ Enable monitoring and alerts

---

## Security

### Security Features

- **ReentrancyGuard**: All external entry points protected against reentrancy
- **CEI Pattern**: Checks-Effects-Interactions ordering
- **Token Whitelist**: Only verified TRC-20 tokens supported
- **Balance Verification**: Post-callback balance checks
- **Ownable Access Control**: Admin functions protected

### Attack Mitigations

| Attack Vector | Mitigation |
|---------------|------------|
| Reentrancy | `nonReentrant` modifier on all entry points |
| Flash Loan Chaining | Balance verification post-callback |
| Integer Overflow | Solidity 0.8+ native overflow checks |
| Malicious Tokens | Token whitelist, `nonReentrant` on all entries |

### Audit Status

⚠️ **This protocol has not been audited.** Use at your own risk.

Recommended before mainnet:
- [ ] Trail of Bits audit
- [ ] OpenZeppelin audit
- [ ] Certora formal verification
- [ ] Immunefi bug bounty program

---

## Fee Structure

| Fee Type | Rate | Recipient |
|----------|------|-----------|
| Flash Loan Premium | 0.05% (5 bps) | 80% Depositors, 20% Treasury |
| Deposit Fee | 0% | N/A |
| Withdrawal Fee | 0% | N/A |

### Revenue Example

With $50M TVL and $50M daily flash loan volume (100% utilization):
- Daily fees: $50M × 0.05% = $25,000
- Depositor share: $25,000 × 80% = $20,000
- Treasury share: $25,000 × 20% = $5,000
- Depositor APY: ~14.6%

---

## Development

### Project Structure

```
JustFlash/
├── contracts/
│   ├── interfaces/         # Contract interfaces
│   │   ├── IFlashLoanReceiver.sol
│   │   ├── IFlashLoanPool.sol
│   │   ├── IFeeCollector.sol
│   │   └── IPoolRegistry.sol
│   ├── core/               # Core protocol contracts
│   │   ├── FlashLoanPool.sol
│   │   ├── FeeCollector.sol
│   │   └── PoolRegistry.sol
│   └── adapters/           # Integration adapters
│       ├── FlashLoanReceiverBase.sol
│       ├── JustLendLiquidator.sol
│       └── SunSwapArbitrage.sol
├── frontend/               # SvelteKit dashboard
├── scripts/                # Deployment & bootstrap scripts
├── test/                   # Contract tests
├── migrations/             # TronBox migrations
├── docs/                   # Documentation
├── docker-compose.yml      # Local development setup
├── tronbox.js              # TronBox configuration
└── package.json
```

### Commands

```bash
npm run compile      # Compile contracts
npm run test         # Run tests
npm run lint         # Lint Solidity files
npm run migrate      # Deploy contracts
npm run bootstrap    # Seed liquidity
npm run console      # TronBox console
```

---

## External Integrations

### JustLend ($5.95B TVL)

Flash loan-powered liquidations on JustLend:

1. Flash loan debt token (e.g., USDT)
2. Repay underwater position
3. Seize collateral (jTokens)
4. Redeem underlying
5. Swap to debt token
6. Repay flash loan + profit

### SunSwap DEX

Arbitrage between SunSwap pools:

1. Flash loan base token
2. Swap on Pool A
3. Swap back on Pool B (better rate)
4. Repay flash loan + profit

---

## Resources

- [TRON Developer Hub](https://developers.tron.network/)
- [TronWeb Documentation](https://tronweb.network/)
- [TronBox Documentation](https://github.com/AmbitionLover/tronbox)
- [JustLend Protocol](https://justlend.org/)
- [SunSwap DEX](https://sunswap.com/)

---

## License

MIT License - see [LICENSE](LICENSE) for details.

---

## Disclaimer

This software is provided "as is", without warranty of any kind. Use at your own risk. The authors are not responsible for any losses incurred through the use of this protocol.

**Flash loans are powerful financial instruments that can result in significant losses if used improperly.** Ensure you fully understand the risks before interacting with this protocol.
