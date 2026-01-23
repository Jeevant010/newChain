import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config();

// Validate environment variables for production networks
const getPrivateKey = (): string[] => {
  const key = process.env.PRIVATE_KEY;
  if (!key || key === "your_private_key_here") {
    console.warn("⚠️ PRIVATE_KEY not set - only localhost available");
    return [];
  }
  // Remove 0x prefix if present
  const cleanKey = key.startsWith("0x") ? key.slice(2) : key;
  // Basic validation - private key should be 64 hex chars
  if (!/^[a-fA-F0-9]{64}$/.test(cleanKey)) {
    console.warn("⚠️ Invalid PRIVATE_KEY format - only localhost available");
    return [];
  }
  return [`0x${cleanKey}`];
};

const privateKeys = getPrivateKey();

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true,
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
      accounts: {
        mnemonic: "test test test test test test test test test test test junk",
        count: 20,
        accountsBalance: "10000000000000000000000", // 10000 ETH per account
      },
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
    ...(privateKeys.length > 0 && process.env.SEPOLIA_RPC_URL
      ? {
          sepolia: {
            url: process.env.SEPOLIA_RPC_URL,
            accounts: privateKeys,
            chainId: 11155111,
          },
        }
      : {}),
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS === "true",
    currency: "USD",
  },
};

export default config;
