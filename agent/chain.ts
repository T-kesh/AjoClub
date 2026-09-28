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
const rpcUrl = process.env.BASE_RPC_URL || "https://sepolia.base.org";
const contractAddress = (process.env.AJO_CLUB_CONTRACT_ADDRESS || "0x0000000000000000000000000000000000000000") as `0x${string}`;
const privateKey = (process.env.AGENT_PRIVATE_KEY || process.env.PRIVATE_KEY) as Hex | undefined;

export const publicClient: PublicClient = createPublicClient({
  chain,
  transport: http(rpcUrl),
});

export const walletClient: WalletClient | null = privateKey && privateKey.startsWith("0x") && privateKey.length === 66
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
  if (!walletClient || !contractAddress || contractAddress === "0x0000000000000000000000000000000000000000") {
    // Simulated mode for offline/test environments
    const mockHash = `0xmock${Date.now().toString(16)}${Math.random().toString(16).slice(2, 10)}`;
    return { txHash: mockHash, simulated: true };
  }

  const account = walletClient.account!;
  const hash = await walletClient.writeContract({
    address: contractAddress,
    abi: AJO_CLUB_ABI,
    functionName: "triggerPayout",
    args: [BigInt(clubId)],
    account,
  });

  return { txHash: hash, simulated: false };
}

/**
 * Triggers onchain default marking if grace period expired.
 */
export async function markOnchainDefault(clubId: number): Promise<{ txHash: string; simulated?: boolean }> {
  if (!walletClient || !contractAddress || contractAddress === "0x0000000000000000000000000000000000000000") {
    const mockHash = `0xmock${Date.now().toString(16)}${Math.random().toString(16).slice(2, 10)}`;
    return { txHash: mockHash, simulated: true };
  }

  const account = walletClient.account!;
  const hash = await walletClient.writeContract({
    address: contractAddress,
    abi: AJO_CLUB_ABI,
    functionName: "markDefaulted",
    args: [BigInt(clubId)],
    account,
  });

  return { txHash: hash, simulated: false };
}
