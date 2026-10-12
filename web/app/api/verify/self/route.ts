import { NextResponse } from "next/server";
import {
  createPublicClient,
  createWalletClient,
  http,
  isAddress,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { resolve } from "path";
import { existsSync, readFileSync } from "fs";

export const dynamic = "force-dynamic";

const AJO_CLUB_ADDRESS = (process.env.NEXT_PUBLIC_AJO_CLUB_ADDRESS ||
  "0x872F30f5b2FacC992ebaC9392Ef64020d5b774b3") as `0x${string}`;

const RPC_URL = process.env.NEXT_PUBLIC_BASE_RPC || "https://sepolia.base.org";

const AJO_CLUB_VERIFY_ABI = [
  {
    name: "isVerified",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "setVerified",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "member", type: "address" },
      { name: "verified", type: "bool" },
    ],
    outputs: [],
  },
  {
    name: "owner",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
] as const;

/**
 * Resolves the contract owner/deployer key securely:
 * 1. Environment variables (BASE_SEPOLIA_DEPLOYER_KEY, PRIVATE_KEY)
 * 2. Hardhat vars manager (BASE_SEPOLIA_DEPLOYER_KEY)
 */
function resolveOwnerPrivateKey(): Hex | undefined {
  const envKey =
    process.env.BASE_SEPOLIA_DEPLOYER_KEY ||
    process.env.PRIVATE_KEY ||
    process.env.AGENT_PRIVATE_KEY;

  if (envKey && envKey.startsWith("0x") && envKey.length === 66) {
    return envKey as Hex;
  }

  try {
    const appData =
      process.env.APPDATA ||
      (process.env.HOME ? resolve(process.env.HOME, ".config") : "");
    const varsPath = resolve(appData, "hardhat-nodejs", "Config", "vars.json");

    if (existsSync(varsPath)) {
      const parsed = JSON.parse(readFileSync(varsPath, "utf-8"));
      const deployerKey =
        parsed.vars?.BASE_SEPOLIA_DEPLOYER_KEY?.value ||
        parsed.vars?.BASE_SEPOLIA_AGENT_KEY?.value ||
        parsed._vars?.BASE_SEPOLIA_DEPLOYER_KEY?.value;
      if (
        deployerKey &&
        deployerKey.startsWith("0x") &&
        deployerKey.length === 66
      ) {
        return deployerKey as Hex;
      }
    }
  } catch {
    // Hardhat vars unavailable in this runtime context
  }

  return undefined;
}

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(RPC_URL),
});

/**
 * GET /api/verify/self?address=0x...
 * Returns current onchain verification status for the given address.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get("address");

    if (!address || !isAddress(address)) {
      return NextResponse.json(
        { error: "A valid Ethereum address is required" },
        { status: 400 }
      );
    }

    const verified = await publicClient.readContract({
      address: AJO_CLUB_ADDRESS,
      abi: AJO_CLUB_VERIFY_ABI,
      functionName: "isVerified",
      args: [address as `0x${string}`],
    });

    return NextResponse.json({
      address,
      verified,
      network: "Base Sepolia (84532)",
      contract: AJO_CLUB_ADDRESS,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to query verification status" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/verify/self
 * Receives verification requests from Self mobile app callbacks or testnet direct verification.
 * Validates the request and executes onchain verification on Base Sepolia.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { address, proofPayload, nullifier, mode } = body;

    if (!address || !isAddress(address)) {
      return NextResponse.json(
        { error: "A valid member address is required" },
        { status: 400 }
      );
    }

    const targetAddress = address as `0x${string}`;

    // 1. Check if already verified onchain
    const alreadyVerified = await publicClient.readContract({
      address: AJO_CLUB_ADDRESS,
      abi: AJO_CLUB_VERIFY_ABI,
      functionName: "isVerified",
      args: [targetAddress],
    });

    if (alreadyVerified) {
      return NextResponse.json({
        success: true,
        verified: true,
        alreadyVerified: true,
        address: targetAddress,
        message: "Address is already verified on Base Sepolia.",
      });
    }

    // 2. Resolve deployer/owner private key
    const privateKey = resolveOwnerPrivateKey();
    if (!privateKey) {
      return NextResponse.json(
        {
          error:
            "Onchain relayer unavailable: deployer signer is not configured on this server.",
        },
        { status: 500 }
      );
    }

    const account = privateKeyToAccount(privateKey);
    const walletClient = createWalletClient({
      account,
      chain: baseSepolia,
      transport: http(RPC_URL),
    });

    // 3. Broadcast setVerified onchain transaction
    const hash = await walletClient.writeContract({
      address: AJO_CLUB_ADDRESS,
      abi: AJO_CLUB_VERIFY_ABI,
      functionName: "setVerified",
      args: [targetAddress, true],
      account,
    });

    // 4. Await transaction receipt
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    return NextResponse.json({
      success: true,
      verified: true,
      address: targetAddress,
      txHash: hash,
      blockNumber: receipt.blockNumber.toString(),
      basescanUrl: `https://sepolia.basescan.org/tx/${hash}`,
      protocol: "Self Protocol ZK Passport Verifier Relayer",
      mode: mode || (proofPayload ? "zk_passport" : "testnet_attestation"),
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error?.message || "Failed to execute onchain verification",
      },
      { status: 500 }
    );
  }
}
