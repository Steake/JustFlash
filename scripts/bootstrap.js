/**
 * @title JustFlash Protocol Bootstrap Script
 * @notice Seeds initial liquidity and configures protocol parameters
 *
 * Usage:
 *   node scripts/bootstrap.js [--network <network>] [--amount <amount>]
 *
 * Options:
 *   --network  Target network (development, nile, shasta, mainnet)
 *   --amount   Initial liquidity amount in token decimals
 */

require('dotenv').config();
const TronWeb = require('tronweb');

// Parse command line arguments
const args = process.argv.slice(2);
const network = getArg(args, '--network') || 'development';
const liquidityAmount = getArg(args, '--amount') || process.env.INITIAL_LIQUIDITY || '1000000000000';

// Network configurations
const networks = {
  development: {
    fullHost: `http://127.0.0.1:${process.env.HOST_PORT || 9090}`,
    privateKey: process.env.PRIVATE_KEY_DEV,
  },
  nile: {
    fullHost: 'https://nile.trongrid.io',
    privateKey: process.env.PRIVATE_KEY_NILE,
  },
  shasta: {
    fullHost: 'https://api.shasta.trongrid.io',
    privateKey: process.env.PRIVATE_KEY_SHASTA,
  },
  mainnet: {
    fullHost: 'https://api.trongrid.io',
    privateKey: process.env.PRIVATE_KEY_MAINNET,
  },
};

// Contract ABIs (simplified for bootstrap)
const IERC20_ABI = [
  {
    inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }],
    name: 'approve',
    outputs: [{ name: '', type: 'bool' }],
    type: 'function',
  },
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    type: 'function',
  },
];

const FLASH_LOAN_POOL_ABI = [
  {
    inputs: [{ name: 'token', type: 'address' }, { name: 'amount', type: 'uint256' }],
    name: 'deposit',
    outputs: [{ name: 'shares', type: 'uint256' }],
    type: 'function',
  },
  {
    inputs: [{ name: 'token', type: 'address' }],
    name: 'getAvailableLiquidity',
    outputs: [{ name: '', type: 'uint256' }],
    type: 'function',
  },
  {
    inputs: [{ name: 'token', type: 'address' }],
    name: 'whitelistToken',
    outputs: [],
    type: 'function',
  },
];

async function main() {
  console.log('========================================');
  console.log('JustFlash Protocol Bootstrap');
  console.log('========================================');
  console.log(`Network: ${network}`);
  console.log(`Liquidity Amount: ${liquidityAmount}`);
  console.log('========================================\n');

  // Validate network configuration
  if (!networks[network]) {
    console.error(`Unknown network: ${network}`);
    process.exit(1);
  }

  const config = networks[network];
  if (!config.privateKey) {
    console.error(`Private key not set for network: ${network}`);
    console.error('Please set the appropriate PRIVATE_KEY_* environment variable');
    process.exit(1);
  }

  // Initialize TronWeb
  const tronWeb = new TronWeb({
    fullHost: config.fullHost,
    privateKey: config.privateKey,
  });

  const address = tronWeb.address.fromPrivateKey(config.privateKey);
  console.log(`Operator Address: ${tronWeb.address.fromHex(address)}`);

  // Load deployment info (from migration output)
  const deploymentPath = `./deployments/${network}.json`;
  let deployment;
  try {
    deployment = require(deploymentPath);
  } catch (error) {
    console.log('\nNo deployment file found. Please provide contract addresses:');
    console.log('Create deployments/<network>.json with:');
    console.log(JSON.stringify({
      contracts: {
        FlashLoanPool: '<address>',
        FeeCollector: '<address>',
        PoolRegistry: '<address>',
      },
      tokens: {
        USDT: '<address>',
      },
    }, null, 2));
    process.exit(1);
  }

  console.log(`\nLoaded deployment: ${deploymentPath}`);

  // Get contract instances
  const flashLoanPool = await tronWeb.contract(
    FLASH_LOAN_POOL_ABI,
    deployment.contracts.FlashLoanPool
  );

  console.log('\n--- Seeding Liquidity ---');

  // Process each token
  for (const [tokenName, tokenAddress] of Object.entries(deployment.tokens)) {
    if (!tokenAddress) continue;

    console.log(`\nProcessing ${tokenName}...`);

    try {
      // Get token contract
      const token = await tronWeb.contract(IERC20_ABI, tokenAddress);

      // Check balance
      const balance = await token.balanceOf(address).call();
      console.log(`  Balance: ${balance.toString()}`);

      if (BigInt(balance) < BigInt(liquidityAmount)) {
        console.log(`  Insufficient balance for ${tokenName}, skipping...`);
        continue;
      }

      // Approve pool
      console.log(`  Approving FlashLoanPool...`);
      await token.approve(deployment.contracts.FlashLoanPool, liquidityAmount).send({
        feeLimit: 100_000_000,
      });
      console.log(`  Approved ${liquidityAmount} ${tokenName}`);

      // Deposit to pool
      console.log(`  Depositing to pool...`);
      const tx = await flashLoanPool.deposit(tokenAddress, liquidityAmount).send({
        feeLimit: 200_000_000,
      });
      console.log(`  Deposited! TX: ${tx}`);

      // Verify liquidity
      const liquidity = await flashLoanPool.getAvailableLiquidity(tokenAddress).call();
      console.log(`  Pool Liquidity: ${liquidity.toString()}`);
    } catch (error) {
      console.log(`  Error processing ${tokenName}: ${error.message}`);
    }
  }

  console.log('\n========================================');
  console.log('Bootstrap Complete!');
  console.log('========================================\n');
}

function getArg(args, flag) {
  const index = args.indexOf(flag);
  if (index === -1) return null;
  return args[index + 1];
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Bootstrap failed:', error);
    process.exit(1);
  });
