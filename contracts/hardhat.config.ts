import { HardhatUserConfig, vars } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-ignition-ethers";
import * as dotenv from "dotenv";
import { resolve } from "path";

// Load environment variables from root .env and local contracts/.env
dotenv.config({ path: resolve(__dirname, "../.env") });
dotenv.config();

const BASE_SEPOLIA_DEPLOYER_KEY =
  (vars.has("BASE_SEPOLIA_DEPLOYER_KEY") ? vars.get("BASE_SEPOLIA_DEPLOYER_KEY") : undefined) ??
  process.env.BASE_SEPOLIA_DEPLOYER_KEY ??
  process.env.PRIVATE_KEY ??
  process.env.AGENT_PRIVATE_KEY ??
  "0x" + "0".repeat(64);

const BASE_SEPOLIA_RPC_URL =
  process.env.BASE_SEPOLIA_RPC_URL ??
  process.env.BASE_RPC_URL ??
  (vars.has("BASE_SEPOLIA_RPC_URL") ? vars.get("BASE_SEPOLIA_RPC_URL") : undefined) ??
  "https://sepolia.base.org";

const BASE_MAINNET_DEPLOYER_KEY =
  (vars.has("BASE_MAINNET_DEPLOYER_KEY") ? vars.get("BASE_MAINNET_DEPLOYER_KEY") : undefined) ??
  process.env.BASE_MAINNET_DEPLOYER_KEY ??
  process.env.PRIVATE_KEY ??
  BASE_SEPOLIA_DEPLOYER_KEY;

const PRIVATE_KEY = process.env.PRIVATE_KEY ?? BASE_SEPOLIA_DEPLOYER_KEY;
const BASESCAN_API_KEY = process.env.BASESCAN_API_KEY ?? "";
const CELOSCAN_API_KEY = process.env.CELOSCAN_API_KEY ?? "";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      evmVersion: "cancun",
    },
  },
  paths: {
    sources: "./src",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
    // Base Sepolia Testnet
    baseSepolia: {
      url: BASE_SEPOLIA_RPC_URL,
      accounts: [BASE_SEPOLIA_DEPLOYER_KEY],
      chainId: 84532,
    },
    "base-sepolia": {
      url: BASE_SEPOLIA_RPC_URL,
      accounts: [BASE_SEPOLIA_DEPLOYER_KEY],
      chainId: 84532,
    },
    // Base Mainnet
    base: {
      url: process.env.BASE_MAINNET_RPC ?? "https://mainnet.base.org",
      accounts: [BASE_MAINNET_DEPLOYER_KEY],
      chainId: 8453,
    },
    // Celo Networks (coexisting as separate named networks)
    celo: {
      url: process.env.CELO_RPC_URL ?? "https://forno.celo.org",
      accounts: [PRIVATE_KEY],
      chainId: 42220,
    },
    alfajores: {
      url: "https://alfajores-forno.celo-testnet.org",
      accounts: [PRIVATE_KEY],
      chainId: 44787,
    },
    "celo-sepolia": {
      url: "https://forno.celo-sepolia.celo-testnet.org",
      accounts: [PRIVATE_KEY],
      chainId: 11142220,
    },
  },
  etherscan: {
    apiKey: BASESCAN_API_KEY,
    customChains: [
      {
        network: "baseSepolia",
        chainId: 84532,
        urls: {
          apiURL: "https://api.etherscan.io/v2/api?chainid=84532",
          browserURL: "https://sepolia.basescan.org",
        },
      },
      {
        network: "base-sepolia",
        chainId: 84532,
        urls: {
          apiURL: "https://api.etherscan.io/v2/api?chainid=84532",
          browserURL: "https://sepolia.basescan.org",
        },
      },
      {
        network: "base",
        chainId: 8453,
        urls: {
          apiURL: "https://api.etherscan.io/v2/api?chainid=8453",
          browserURL: "https://basescan.org",
        },
      },
      {
        network: "celo",
        chainId: 42220,
        urls: {
          apiURL: "https://api.etherscan.io/v2/api?chainid=42220",
          browserURL: "https://celoscan.io",
        },
      },
      {
        network: "alfajores",
        chainId: 44787,
        urls: {
          apiURL: "https://api.etherscan.io/v2/api?chainid=44787",
          browserURL: "https://alfajores.celoscan.io",
        },
      },
      {
        network: "celo-sepolia",
        chainId: 11142220,
        urls: {
          apiURL: "https://api.etherscan.io/v2/api?chainid=11142220",
          browserURL: "https://celo-sepolia.blockscout.com",
        },
      },
    ],
  },
  sourcify: {
    enabled: false,
  },
};

export default config;
