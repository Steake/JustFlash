require('dotenv').config();

const port = process.env.HOST_PORT || 9090;

module.exports = {
  networks: {
    // Local development network (Tron Quickstart)
    development: {
      privateKey: process.env.PRIVATE_KEY_DEV,
      userFeePercentage: 100,
      feeLimit: 1000 * 1e6,
      fullHost: `http://127.0.0.1:${port}`,
      network_id: '*'
    },

    // Nile Testnet
    nile: {
      privateKey: process.env.PRIVATE_KEY_NILE,
      userFeePercentage: 100,
      feeLimit: 1000 * 1e6,
      fullHost: 'https://nile.trongrid.io',
      network_id: '3'
    },

    // Shasta Testnet
    shasta: {
      privateKey: process.env.PRIVATE_KEY_SHASTA,
      userFeePercentage: 100,
      feeLimit: 1000 * 1e6,
      fullHost: 'https://api.shasta.trongrid.io',
      network_id: '2'
    },

    // Tron Mainnet
    mainnet: {
      privateKey: process.env.PRIVATE_KEY_MAINNET,
      userFeePercentage: 100,
      feeLimit: 1000 * 1e6,
      fullHost: 'https://api.trongrid.io',
      network_id: '1'
    }
  },

  compilers: {
    solc: {
      version: '0.8.20',
      settings: {
        optimizer: {
          enabled: true,
          runs: 200
        },
        evmVersion: 'shanghai'
      }
    }
  },

  // Plugin configuration
  plugins: [
    'tronbox-verify'
  ],

  // Contract directory
  contracts_directory: './contracts',
  contracts_build_directory: './build/contracts',
  migrations_directory: './migrations',
  test_directory: './test'
};
