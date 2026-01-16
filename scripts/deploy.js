/**
 * @title TronFlash Protocol Deployment Script
 * @notice Alternative deployment using TronWeb directly
 *
 * Usage:
 *   node scripts/deploy.js --network <network>
 *
 * This script provides more control over deployment compared to TronBox migrations.
 */

require('dotenv').config();
const TronWeb = require('tronweb');
const fs = require('fs');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);
const network = getArg(args, '--network') || 'development';

// Network configurations
const networks = {
  development: {
    fullHost: `http://127.0.0.1:${process.env.HOST_PORT || 9090}`,
    privateKey: process.env.PRIVATE_KEY_DEV,
  },
  nile: {
    fullHost: 'https://nile.trongrid.io',
    privateKey: process.env.PRIVATE_KEY_NILE,
    headers: { 'TRON-PRO-API-KEY': process.env.TRONGRID_API_KEY },
  },
  shasta: {
    fullHost: 'https://api.shasta.trongrid.io',
    privateKey: process.env.PRIVATE_KEY_SHASTA,
  },
  mainnet: {
    fullHost: 'https://api.trongrid.io',
    privateKey: process.env.PRIVATE_KEY_MAINNET,
    headers: { 'TRON-PRO-API-KEY': process.env.TRONGRID_API_KEY },
  },
};

// Token addresses by network
const tokensByNetwork = {
  mainnet: {
    USDT: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
    USDC: 'TEkxiTehnzSmSe2XqrBj4w32RUN966rdz8',
    USDD: 'TPYmHEhy5n8TCEfYGqW2rPxsghSfzghPDn',
    WTRX: 'TNUC9Qb1rRpS5CbWLmNMxXBjyFoydXjWFR',
  },
  nile: {},
  shasta: {},
  development: {},
};

async function main() {
  console.log('========================================');
  console.log('TronFlash Protocol Deployment');
  console.log('========================================');
  console.log(`Network: ${network}`);
  console.log('========================================\n');

  // Validate network configuration
  if (!networks[network]) {
    console.error(`Unknown network: ${network}`);
    process.exit(1);
  }

  const config = networks[network];
  if (!config.privateKey) {
    console.error(`Private key not set for network: ${network}`);
    process.exit(1);
  }

  // Initialize TronWeb
  const tronWeb = new TronWeb({
    fullHost: config.fullHost,
    privateKey: config.privateKey,
    headers: config.headers,
  });

  const ownerAddress = tronWeb.address.fromPrivateKey(config.privateKey);
  const ownerAddressBase58 = tronWeb.address.fromHex(ownerAddress);
  console.log(`Deployer: ${ownerAddressBase58}`);

  // Load compiled contracts
  const contracts = loadContracts();

  // Configuration
  const flashLoanFeeBps = process.env.FLASH_LOAN_FEE_BPS || 5;
  const treasury = process.env.TREASURY_ADDRESS || ownerAddressBase58;

  console.log(`\nConfiguration:`);
  console.log(`  Flash Loan Fee: ${flashLoanFeeBps} bps`);
  console.log(`  Treasury: ${treasury}`);

  // Deploy contracts
  console.log('\n--- Deploying Contracts ---\n');

  // 1. Deploy FlashLoanPool
  console.log('1. Deploying FlashLoanPool...');
  const flashLoanPool = await deployContract(
    tronWeb,
    contracts.FlashLoanPool,
    [ownerAddress, flashLoanFeeBps]
  );
  console.log(`   FlashLoanPool: ${flashLoanPool.address}\n`);

  // 2. Deploy FeeCollector
  console.log('2. Deploying FeeCollector...');
  const feeCollector = await deployContract(
    tronWeb,
    contracts.FeeCollector,
    [ownerAddress, treasury, flashLoanPool.address]
  );
  console.log(`   FeeCollector: ${feeCollector.address}\n`);

  // 3. Deploy PoolRegistry
  console.log('3. Deploying PoolRegistry...');
  const poolRegistry = await deployContract(
    tronWeb,
    contracts.PoolRegistry,
    [ownerAddress, flashLoanPool.address]
  );
  console.log(`   PoolRegistry: ${poolRegistry.address}\n`);

  // 4. Configure contracts
  console.log('4. Configuring contracts...');

  // Link FeeCollector to FlashLoanPool
  const poolContract = await tronWeb.contract().at(flashLoanPool.address);
  await poolContract.setFeeCollector(feeCollector.address).send({
    feeLimit: 100_000_000,
  });
  console.log('   FeeCollector linked to FlashLoanPool');

  // 5. Whitelist tokens
  console.log('\n5. Whitelisting tokens...');
  const tokens = tokensByNetwork[network] || {};

  for (const [name, address] of Object.entries(tokens)) {
    try {
      await poolContract.whitelistToken(address).send({
        feeLimit: 100_000_000,
      });
      console.log(`   Whitelisted ${name}: ${address}`);
    } catch (error) {
      console.log(`   Warning: Could not whitelist ${name}: ${error.message}`);
    }
  }

  // Save deployment info
  const deployment = {
    network,
    timestamp: new Date().toISOString(),
    contracts: {
      FlashLoanPool: flashLoanPool.address,
      FeeCollector: feeCollector.address,
      PoolRegistry: poolRegistry.address,
    },
    config: {
      flashLoanFeeBps,
      treasury,
    },
    tokens,
  };

  const deploymentsDir = path.join(__dirname, '..', 'deployments');
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const deploymentPath = path.join(deploymentsDir, `${network}.json`);
  fs.writeFileSync(deploymentPath, JSON.stringify(deployment, null, 2));

  console.log('\n========================================');
  console.log('Deployment Complete!');
  console.log('========================================');
  console.log(`\nDeployment saved to: ${deploymentPath}`);
  console.log('\nDeployed Contracts:');
  console.log(`  FlashLoanPool: ${flashLoanPool.address}`);
  console.log(`  FeeCollector:  ${feeCollector.address}`);
  console.log(`  PoolRegistry:  ${poolRegistry.address}`);
  console.log('========================================\n');
}

async function deployContract(tronWeb, contractData, constructorArgs) {
  const transaction = await tronWeb.transactionBuilder.createSmartContract({
    abi: contractData.abi,
    bytecode: contractData.bytecode,
    feeLimit: 1_000_000_000,
    callValue: 0,
    userFeePercentage: 100,
    originEnergyLimit: 10_000_000,
    parameters: constructorArgs,
  });

  const signedTx = await tronWeb.trx.sign(transaction);
  const receipt = await tronWeb.trx.sendRawTransaction(signedTx);

  // Wait for confirmation
  await new Promise(resolve => setTimeout(resolve, 5000));

  return {
    address: tronWeb.address.fromHex(receipt.transaction.contract_address),
    txID: receipt.transaction.txID,
  };
}

function loadContracts() {
  const buildDir = path.join(__dirname, '..', 'build', 'contracts');

  const contractNames = ['FlashLoanPool', 'FeeCollector', 'PoolRegistry'];
  const contracts = {};

  for (const name of contractNames) {
    const contractPath = path.join(buildDir, `${name}.json`);
    if (fs.existsSync(contractPath)) {
      const data = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
      contracts[name] = {
        abi: data.abi,
        bytecode: data.bytecode,
      };
    } else {
      console.error(`Contract artifact not found: ${contractPath}`);
      console.error('Please run: npm run compile');
      process.exit(1);
    }
  }

  return contracts;
}

function getArg(args, flag) {
  const index = args.indexOf(flag);
  if (index === -1) return null;
  return args[index + 1];
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Deployment failed:', error);
    process.exit(1);
  });
