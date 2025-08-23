/**
 * Test suite for dynamic Web3 chain configuration
 * Verifies that the refactored web3.ts properly handles:
 * - Dynamic chain selection via environment variables
 * - Support for Anvil and local chains
 * - Backward compatibility
 * - Chain-specific RPC and contract configuration
 */

import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";

// Mock environment variables before importing the module
const originalEnv = process.env;

beforeEach(() => {
  jest.resetModules();
  process.env = { ...originalEnv };
});

afterEach(() => {
  process.env = originalEnv;
});

describe("Web3 Dynamic Chain Configuration", () => {
  describe("Chain Selection", () => {
    it("should use default chain ID from environment", async () => {
      process.env.NEXT_PUBLIC_KAIA_CHAIN_ID = "8217";

      const { DEFAULT_CHAIN_ID, SUPPORTED_CHAIN_IDS } = await import("../web3");

      expect(DEFAULT_CHAIN_ID).toBe(8217);
      expect(SUPPORTED_CHAIN_IDS).toContain(8217);
    });

    it("should support additional chain IDs from environment", async () => {
      process.env.NEXT_PUBLIC_KAIA_CHAIN_ID = "1001";
      process.env.NEXT_PUBLIC_ADDITIONAL_CHAIN_IDS = "8217,31337";

      const { SUPPORTED_CHAIN_IDS } = await import("../web3");

      expect(SUPPORTED_CHAIN_IDS).toContain(1001);
      expect(SUPPORTED_CHAIN_IDS).toContain(8217);
      expect(SUPPORTED_CHAIN_IDS).toContain(31337);
    });

    it("should fallback to Kaia testnet when no environment is set", async () => {
      delete process.env.NEXT_PUBLIC_KAIA_CHAIN_ID;

      const { DEFAULT_CHAIN_ID } = await import("../web3");

      expect(DEFAULT_CHAIN_ID).toBe(1001);
    });

    it("should include both Kaia networks as fallback", async () => {
      process.env.NEXT_PUBLIC_KAIA_CHAIN_ID = "31337";

      const { SUPPORTED_CHAIN_IDS } = await import("../web3");

      expect(SUPPORTED_CHAIN_IDS).toContain(31337);
      expect(SUPPORTED_CHAIN_IDS).toContain(1001);
      expect(SUPPORTED_CHAIN_IDS).toContain(8217);
    });
  });

  describe("Chain Configuration", () => {
    it("should provide chain config for all supported chains", async () => {
      const { CHAIN_CONFIG } = await import("../web3");

      expect(CHAIN_CONFIG[1001]).toBeDefined();
      expect(CHAIN_CONFIG[8217]).toBeDefined();
      expect(CHAIN_CONFIG[31337]).toBeDefined(); // Anvil
      expect(CHAIN_CONFIG[1337]).toBeDefined(); // Localhost
    });

    it("should support getting chain by ID", async () => {
      const { getChainById } = await import("../web3");

      const kaiaSepolia = getChainById(1001);
      expect(kaiaSepolia?.name).toContain("Baobab");

      const kaiaMainnet = getChainById(8217);
      expect(kaiaMainnet?.name).toContain("Klaytn");
    });

    it("should support adding custom chains", async () => {
      const { addCustomChain, getChainById } = await import("../web3");

      const customChain = {
        id: 12345,
        name: "Custom Test Chain",
        network: "custom",
        nativeCurrency: {
          name: "Test Token",
          symbol: "TEST",
          decimals: 18,
        },
        rpcUrls: {
          default: {
            http: ["http://localhost:8545"],
          },
        },
      };

      addCustomChain(12345, customChain);

      const retrievedChain = getChainById(12345);
      expect(retrievedChain).toEqual(customChain);
    });
  });

  describe("RPC Configuration", () => {
    it("should use chain-specific RPC URLs when available", async () => {
      process.env.NEXT_PUBLIC_RPC_URL_1001 =
        "https://custom-baobab.example.com";
      process.env.NEXT_PUBLIC_RPC_URL_31337 = "http://127.0.0.1:9545";

      const { RPC_URLS } = await import("../web3");

      expect(RPC_URLS[1001]).toBe("https://custom-baobab.example.com");
      expect(RPC_URLS[31337]).toBe("http://127.0.0.1:9545");
    });

    it("should fallback to generic RPC URL", async () => {
      process.env.NEXT_PUBLIC_RPC_URL = "https://generic-rpc.example.com";

      const { RPC_URLS } = await import("../web3");

      // Should use the generic URL for some chains
      expect(Object.values(RPC_URLS)).toContain(
        "https://generic-rpc.example.com",
      );
    });

    it("should have default RPC URLs for Anvil and localhost", async () => {
      const { RPC_URLS } = await import("../web3");

      expect(RPC_URLS[31337]).toBe("http://127.0.0.1:8545");
      expect(RPC_URLS[1337]).toBe("http://localhost:8545");
    });
  });

  describe("Contract Configuration", () => {
    it("should support chain-specific contract addresses", async () => {
      process.env.NEXT_PUBLIC_HACKATHON_REGISTRY_ADDRESS_1001 =
        "0x1001000000000000000000000000000000000000";
      process.env.NEXT_PUBLIC_HACKATHON_REGISTRY_ADDRESS_8217 =
        "0x8217000000000000000000000000000000000000";

      const { getContractAddress } = await import("../web3");

      expect(getContractAddress(1001, "hackathonRegistry")).toBe(
        "0x1001000000000000000000000000000000000000",
      );
      expect(getContractAddress(8217, "hackathonRegistry")).toBe(
        "0x8217000000000000000000000000000000000000",
      );
    });

    it("should fallback to generic contract address", async () => {
      process.env.NEXT_PUBLIC_HACKATHON_REGISTRY_ADDRESS =
        "0xgeneric0000000000000000000000000000000000";

      const { getContractAddress } = await import("../web3");

      // Should use generic address for chains without specific config
      expect(getContractAddress(1001, "hackathonRegistry")).toBe(
        "0xgeneric0000000000000000000000000000000000",
      );
    });

    it("should return undefined for unsupported chain", async () => {
      const { getContractAddress } = await import("../web3");

      expect(getContractAddress(99999, "hackathonRegistry")).toBeUndefined();
    });
  });

  describe("Network Names", () => {
    it("should provide names for all major chains", async () => {
      const { getNetworkName } = await import("../web3");

      expect(getNetworkName(8217)).toBe("Kaia Mainnet");
      expect(getNetworkName(1001)).toBe("Kaia Testnet (Baobab)");
      expect(getNetworkName(31337)).toBe("Anvil Local");
      expect(getNetworkName(1337)).toBe("Localhost");
    });

    it("should fallback to chain config name for unknown chains", async () => {
      const { getNetworkName } = await import("../web3");

      // Should use chain name from wagmi chains
      const ethereumName = getNetworkName(1);
      expect(ethereumName).toContain("Ethereum");
    });

    it("should provide generic name for completely unknown chains", async () => {
      const { getNetworkName } = await import("../web3");

      expect(getNetworkName(99999)).toBe("Chain 99999");
    });
  });

  describe("Helper Functions", () => {
    it("should correctly identify supported chains", async () => {
      process.env.NEXT_PUBLIC_KAIA_CHAIN_ID = "1001";
      process.env.NEXT_PUBLIC_ADDITIONAL_CHAIN_IDS = "31337";

      const { isSupportedChain } = await import("../web3");

      expect(isSupportedChain(1001)).toBe(true);
      expect(isSupportedChain(31337)).toBe(true);
      expect(isSupportedChain(8217)).toBe(true); // Fallback inclusion
      expect(isSupportedChain(99999)).toBe(false);
    });
  });

  describe("Backward Compatibility", () => {
    it("should maintain KAIA_NETWORKS legacy export", async () => {
      const { KAIA_NETWORKS } = await import("../web3");

      expect(KAIA_NETWORKS.mainnet).toBeDefined();
      expect(KAIA_NETWORKS.testnet).toBeDefined();
      expect(KAIA_NETWORKS.mainnet.id).toBe(8217);
      expect(KAIA_NETWORKS.testnet.id).toBe(1001);
    });
  });

  describe("Wagmi Configuration", () => {
    it("should create valid wagmi config with configured chains", async () => {
      process.env.NEXT_PUBLIC_KAIA_CHAIN_ID = "1001";

      const { wagmiConfig } = await import("../web3");

      expect(wagmiConfig).toBeDefined();
      expect(wagmiConfig.chains).toBeDefined();
      expect(wagmiConfig.chains.length).toBeGreaterThan(0);
      expect(wagmiConfig.transports).toBeDefined();
    });

    it("should include transports for all supported chains", async () => {
      process.env.NEXT_PUBLIC_KAIA_CHAIN_ID = "1001";
      process.env.NEXT_PUBLIC_ADDITIONAL_CHAIN_IDS = "31337";

      const { wagmiConfig } = await import("../web3");

      expect(wagmiConfig.transports[1001]).toBeDefined();
      expect(wagmiConfig.transports[31337]).toBeDefined();
    });
  });
});
