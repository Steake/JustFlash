const FlashLoanPool = artifacts.require("FlashLoanPool");
const FeeCollector = artifacts.require("FeeCollector");
const PoolRegistry = artifacts.require("PoolRegistry");

/**
 * @title JustFlash Protocol Deployment
 * @notice Deploys core protocol contracts
 *
 * Deployment Order:
 * 1. FlashLoanPool (core flash loan functionality)
 * 2. FeeCollector (fee distribution)
 * 3. PoolRegistry (token management)
 * 4. Configure contracts (link together, whitelist tokens)
 */
module.exports = async function (deployer, network, accounts) {
  const owner = accounts[0];

  // Configuration
  const config = {
    flashLoanFeeBps: process.env.FLASH_LOAN_FEE_BPS || 5, // 0.05%
    treasury: process.env.TREASURY_ADDRESS || owner,
  };

  console.log('========================================');
  console.log('JustFlash Protocol Deployment');
  console.log('========================================');
  console.log(`Network: ${network}`);
  console.log(`Deployer: ${owner}`);
  console.log(`Flash Loan Fee: ${config.flashLoanFeeBps} bps`);
  console.log(`Treasury: ${config.treasury}`);
  console.log('========================================\n');

  // 1. Deploy FlashLoanPool
  console.log('1. Deploying FlashLoanPool...');
  await deployer.deploy(FlashLoanPool, owner, config.flashLoanFeeBps);
  const flashLoanPool = await FlashLoanPool.deployed();
  console.log(`   FlashLoanPool deployed at: ${flashLoanPool.address}\n`);

  // 2. Deploy FeeCollector
  console.log('2. Deploying FeeCollector...');
  await deployer.deploy(
    FeeCollector,
    owner,
    config.treasury,
    flashLoanPool.address
  );
  const feeCollector = await FeeCollector.deployed();
  console.log(`   FeeCollector deployed at: ${feeCollector.address}\n`);

  // 3. Deploy PoolRegistry
  console.log('3. Deploying PoolRegistry...');
  await deployer.deploy(PoolRegistry, owner, flashLoanPool.address);
  const poolRegistry = await PoolRegistry.deployed();
  console.log(`   PoolRegistry deployed at: ${poolRegistry.address}\n`);

  // 4. Configure FlashLoanPool with FeeCollector
  console.log('4. Configuring FlashLoanPool...');
  await flashLoanPool.setFeeCollector(feeCollector.address);
  console.log(`   FeeCollector linked to FlashLoanPool\n`);

  // 5. Whitelist tokens based on network
  console.log('5. Whitelisting tokens...');
  const tokenAddresses = getTokenAddresses(network);

  for (const [name, address] of Object.entries(tokenAddresses)) {
    if (address) {
      try {
        await flashLoanPool.whitelistToken(address);
        await poolRegistry.registerToken(address);
        console.log(`   Whitelisted ${name}: ${address}`);
      } catch (error) {
        console.log(`   Warning: Could not whitelist ${name}: ${error.message}`);
      }
    }
  }

  console.log('\n========================================');
  console.log('Deployment Complete!');
  console.log('========================================');
  console.log('\nDeployed Contracts:');
  console.log(`  FlashLoanPool: ${flashLoanPool.address}`);
  console.log(`  FeeCollector:  ${feeCollector.address}`);
  console.log(`  PoolRegistry:  ${poolRegistry.address}`);
  console.log('========================================\n');

  // Save deployment info
  const deploymentInfo = {
    network,
    timestamp: new Date().toISOString(),
    contracts: {
      FlashLoanPool: flashLoanPool.address,
      FeeCollector: feeCollector.address,
      PoolRegistry: poolRegistry.address,
    },
    config,
    tokens: tokenAddresses,
  };

  console.log('Deployment Info (save this):');
  console.log(JSON.stringify(deploymentInfo, null, 2));
};

/**
 * Returns token addresses based on network
 */
function getTokenAddresses(network) {
  const mainnetTokens = {
    USDT: process.env.USDT_ADDRESS || 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
    USDC: process.env.USDC_ADDRESS || 'TEkxiTehnzSmSe2XqrBj4w32RUN966rdz8',
    USDD: process.env.USDD_ADDRESS || 'TPYmHEhy5n8TCEfYGqW2rPxsghSfzghPDn',
    WTRX: process.env.WTRX_ADDRESS || 'TNUC9Qb1rRpS5CbWLmNMxXBjyFoydXjWFR',
  };

  const testnetTokens = {
    USDT: process.env.NILE_USDT_ADDRESS || null,
    USDC: process.env.NILE_USDC_ADDRESS || null,
  };

  switch (network) {
    case 'mainnet':
      return mainnetTokens;
    case 'nile':
    case 'shasta':
      return testnetTokens;
    default:
      // Development - no real tokens
      return {};
  }
}
