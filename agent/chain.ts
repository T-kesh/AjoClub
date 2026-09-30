// ============================================================================
// Layer 5 / Blockchain Client: viem + Base
// ============================================================================

import {
  createPublicClient,
  createWalletClient,
  http,
  formatUnits,
  Hex,
  PublicClient,
  WalletClient,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base, baseSepolia } from "viem/chains";
import dotenv from "dotenv";
import { resolve } from "node:path";
import { createRequire } from "node:module";

dotenv.config();

export const AJO_CLUB_ABI = [
  {
    name: "getClub",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "clubId", type: "uint256" }],
    outputs: [
      { name: "name", type: "string" },
      { name: "token", type: "address" },
      { name: "contribution", type: "uint256" },
      { name: "cycleDuration", type: "uint256" },
      { name: "gracePeriod", type: "uint256" },
      { name: "maxMembers", type: "uint256" },
      { name: "currentRound", type: "uint256" },
      { name: "cycleEnd", type: "uint256" },
      { name: "status", type: "uint8" },
      { name: "members", type: "address[]" },
    ],
  },
  {
    name: "getMemberPaymentStatus",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "clubId", type: "uint256" }],
    outputs: [
      { name: "members", type: "address[]" },
      { name: "paid", type: "bool[]" },
    ],
  },
  {
    name: "triggerPayout",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "clubId", type: "uint256" }],
    outputs: [],
  },
  {
    name: "markDefaulted",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "clubId", type: "uint256" }],
    outputs: [],
  },
] as const;

const chainId = Number(process.env.BASE_CHAIN_ID || 84532);
const chain = chainId === 8453 ? base : baseSepolia;
const rpcUrl = process.env.BASE_RPC_URL || process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org";
const contractAddress = (process.env.AJO_CLUB_CONTRACT_ADDRESS || "0x0000000000000000000000000000000000000000") as `0x${string}`;

/**
 * Resolves the agent's private key securely from:
 * 1. process.env.AGENT_PRIVATE_KEY or process.env.PRIVATE_KEY
 * 2. Hardhat vars storage (BASE_SEPOLIA_AGENT_KEY)
 */
function resolveAgentPrivateKey(): Hex | undefined {
  const envKey = process.env.AGENT_PRIVATE_KEY || process.env.PRIVATE_KEY;
  if (envKey && envKey.startsWith("0x") && envKey.length === 66) {
    return envKey as Hex;
  }

  try {
    const req = createRequire(resolve(process.cwd(), "contracts"));
    const { getVarsFilePath } = req("hardhat/internal/util/global-dir");
    const { VarsManager } = req("hardhat/internal/core/vars/vars-manager");
    const vm = new VarsManager(getVarsFilePath());
    if (vm.has("BASE_SEPOLIA_AGENT_KEY")) {
      const storedKey = vm.get("BASE_SEPOLIA_AGENT_KEY");
      if (storedKey && storedKey.startsWith("0x") && storedKey.length === 66) {
        return storedKey as Hex;
      }
    }
  } catch {
    // Hardhat vars unavailable in current execution context
  }

  return undefined;
}

const privateKey = resolveAgentPrivateKey();

export const publicClient: PublicClient = createPublicClient({
  chain,
  transport: http(rpcUrl),
});

export const walletClient: WalletClient | null = privateKey
  ? createWalletClient({
      account: privateKeyToAccount(privateKey),
      chain,
      transport: http(rpcUrl),
    })
  : null;

/**
 * Triggers onchain payout for a completed round.
 */
export async function triggerOnchainPayout(clubId: number): Promise<{ txHash: string; simulated?: boolean }> {
  const isSimulationExplicit = process.env.SIMULATE_CHAIN === "true";

  if (isSimulationExplicit) {
    const mockHash = `0xmock${Date.now().toString(16)}${Math.random().toString(16).slice(2, 10)}`;
    return { txHash: mockHash, simulated: true };
  }

  if (!contractAddress || contractAddress === "0x0000000000000000000000000000000000000000") {
    throw new Error(
      "Onchain execution failed: AJO_CLUB_CONTRACT_ADDRESS is not configured in environment. Cannot execute payout."
    );
  }

  if (!walletClient) {
    throw new Error(
      "Onchain execution failed: AGENT_PRIVATE_KEY is not configured and SIMULATE_CHAIN is not enabled. Cannot broadcast transaction to Base Sepolia."
    );
  }

  const account = walletClient.account!;
  const hash = await walletClient.writeContract({
    address: contractAddress,
    abi: AJO_CLUB_ABI,
    functionName: "triggerPayout",
    args: [BigInt(clubId)],
    account,
  });

  // Wait for transaction confirmation on Base Sepolia
  await publicClient.waitForTransactionReceipt({ hash });

  return { txHash: hash, simulated: false };
}

/**
 * Triggers onchain default marking if grace period expired.
 */
export async function markOnchainDefault(clubId: number): Promise<{ txHash: string; simulated?: boolean }> {
  const isSimulationExplicit = process.env.SIMULATE_CHAIN === "true";

  if (isSimulationExplicit) {
    const mockHash = `0xmock${Date.now().toString(16)}${Math.random().toString(16).slice(2, 10)}`;
    return { txHash: mockHash, simulated: true };
  }

  if (!contractAddress || contractAddress === "0x0000000000000000000000000000000000000000") {
    throw new Error("Onchain execution failed: AJO_CLUB_CONTRACT_ADDRESS is not configured.");
  }

  if (!walletClient) {
    throw new Error(
      "Onchain execution failed: AGENT_PRIVATE_KEY is not configured and SIMULATE_CHAIN is not enabled."
    );
  }

  const account = walletClient.account!;
  const hash = await walletClient.writeContract({
    address: contractAddress,
    abi: AJO_CLUB_ABI,
    functionName: "markDefaulted",
    args: [BigInt(clubId)],
    account,
  });

  await publicClient.waitForTransactionReceipt({ hash });

  return { txHash: hash, simulated: false };
}
