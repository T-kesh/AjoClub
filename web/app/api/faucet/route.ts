import { NextResponse } from "next/server";
import {
  createPublicClient,
  createWalletClient,
  formatEther,
  http,
  isAddress,
  parseEther,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { resolve } from "path";
import { existsSync, readFileSync } from "fs";

export const dynamic = "force-dynamic";

const RPC_URL = process.env.NEXT_PUBLIC_BASE_RPC || "https://sepolia.base.org";
const DRIP_AMOUNT = "0.0001"; // 0.0001 Base Sepolia ETH (~50 transactions)
const MAX_USER_BALANCE_ETH = 0.005; // Ceiling to prevent hoarding
const CLAIM_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours

// In-memory rate limiting trackers
const addressClaims = new Map<string, number>();
const ipClaims = new Map<string, number>();

function resolveFaucetPrivateKey(): Hex | undefined {
  const envKey =
    process.env.BASE_SEPOLIA_FAUCET_KEY ||
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
    // Keystore lookup unavailable in this environment
  }

  return undefined;
}

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(RPC_URL),
});

function getClientIp(request: Request): string {
  const xForwardedFor = request.headers.get("x-forwarded-for");
  if (xForwardedFor) {
    return xForwardedFor.split(",")[0].trim();
  }
  return request.headers.get("x-real-ip") || "unknown-ip";
}

/**
 * GET /api/faucet?address=0x...
 * Returns faucet pool status and user eligibility.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get("address");

    const privateKey = resolveFaucetPrivateKey();
    if (!privateKey) {
      return NextResponse.json(
        {
          available: false,
          error: "Faucet signer is not configured on this server.",
        },
        { status: 503 }
      );
    }

    const faucetAccount = privateKeyToAccount(privateKey);
    const faucetBalWei = await publicClient.getBalance({
      address: faucetAccount.address,
    });
    const faucetBalEth = Number(formatEther(faucetBalWei));

    let userBalEth: number | null = null;
    let eligible = true;
    let reason: string | null = null;

    if (address && isAddress(address)) {
      const userBalWei = await publicClient.getBalance({
        address: address as `0x${string}`,
      });
      userBalEth = Number(formatEther(userBalWei));

      // Check balance ceiling
      if (userBalEth >= MAX_USER_BALANCE_ETH) {
        eligible = false;
        reason = `Your balance (${userBalEth.toFixed(4)} ETH) is already sufficient for network gas.`;
      }

      // Check cooldown
      const lastClaim = addressClaims.get(address.toLowerCase());
      if (lastClaim && Date.now() - lastClaim < CLAIM_COOLDOWN_MS) {
        eligible = false;
        const hoursLeft = Math.ceil(
          (CLAIM_COOLDOWN_MS - (Date.now() - lastClaim)) / (1000 * 60 * 60)
        );
        reason = `You have already claimed within the last 24 hours. Try again in ~${hoursLeft}h.`;
      }
    }

    return NextResponse.json({
      available: faucetBalEth >= Number(DRIP_AMOUNT),
      faucetAddress: faucetAccount.address,
      faucetBalance: faucetBalEth.toFixed(5),
      dripAmount: DRIP_AMOUNT,
      eligible,
      reason,
      userBalance: userBalEth !== null ? userBalEth.toFixed(5) : null,
      cooldownHours: 24,
      network: "Base Sepolia (84532)",
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to inspect faucet status." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/faucet
 * Dispenses DRIP_AMOUNT (0.0001 ETH) to the specified address on Base Sepolia.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { address } = body;

    if (!address || !isAddress(address)) {
      return NextResponse.json(
        { error: "A valid Ethereum recipient address is required." },
        { status: 400 }
      );
    }

    const targetAddress = address as `0x${string}`;
    const ip = getClientIp(request);
    const normalizedAddress = targetAddress.toLowerCase();

    // 1. Rate Limit Checks
    const now = Date.now();
    const lastAddressClaim = addressClaims.get(normalizedAddress);
    if (lastAddressClaim && now - lastAddressClaim < CLAIM_COOLDOWN_MS) {
      const hoursLeft = Math.ceil(
        (CLAIM_COOLDOWN_MS - (now - lastAddressClaim)) / (1000 * 60 * 60)
      );
      return NextResponse.json(
        {
          error: `This address has already claimed testnet gas within the last 24h. Please try again in ~${hoursLeft}h.`,
          code: "COOLDOWN_ACTIVE",
        },
        { status: 429 }
      );
    }

    const lastIpClaim = ipClaims.get(ip);
    if (
      ip !== "unknown-ip" &&
      lastIpClaim &&
      now - lastIpClaim < CLAIM_COOLDOWN_MS
    ) {
      return NextResponse.json(
        {
          error:
            "A claim was already issued from your network IP within the last 24h. Use our external zero-mainnet faucets if you need additional gas.",
          code: "IP_RATE_LIMITED",
        },
        { status: 429 }
      );
    }

    // 2. Balance Ceiling Check (prevent hoarding)
    const userBalWei = await publicClient.getBalance({
      address: targetAddress,
    });
    const userBalEth = Number(formatEther(userBalWei));
    if (userBalEth >= MAX_USER_BALANCE_ETH) {
      return NextResponse.json(
        {
          error: `Your wallet already holds ${userBalEth.toFixed(4)} ETH, which is sufficient for 500+ Base Sepolia transactions. Save faucet gas for others!`,
          code: "BALANCE_SUFFICIENT",
        },
        { status: 400 }
      );
    }

    // 3. Resolve Signer
    const privateKey = resolveFaucetPrivateKey();
    if (!privateKey) {
      return NextResponse.json(
        {
          error:
            "Faucet relayer is currently unconfigured. Please use the free external faucets below.",
          code: "RELAYER_UNAVAILABLE",
        },
        { status: 503 }
      );
    }

    const faucetAccount = privateKeyToAccount(privateKey);
    const faucetBalWei = await publicClient.getBalance({
      address: faucetAccount.address,
    });
    const faucetBalEth = Number(formatEther(faucetBalWei));

    // Ensure faucet has enough balance
    if (faucetBalEth < Number(DRIP_AMOUNT) + 0.00005) {
      return NextResponse.json(
        {
          error:
            "The community faucet pool is running low. Please use the zero-mainnet Superchain or Chainlink faucets below.",
          code: "POOL_DEPLETED",
        },
        { status: 503 }
      );
    }

    // 4. Send Transaction
    const walletClient = createWalletClient({
      account: faucetAccount,
      chain: baseSepolia,
      transport: http(RPC_URL),
    });

    const hash = await walletClient.sendTransaction({
      to: targetAddress,
      value: parseEther(DRIP_AMOUNT),
      account: faucetAccount,
    });

    // Await onchain inclusion
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    // Update rate limits
    addressClaims.set(normalizedAddress, now);
    if (ip !== "unknown-ip") {
      ipClaims.set(ip, now);
    }

    return NextResponse.json({
      success: true,
      recipient: targetAddress,
      amount: `${DRIP_AMOUNT} ETH`,
      txHash: hash,
      blockNumber: receipt.blockNumber.toString(),
      basescanUrl: `https://sepolia.basescan.org/tx/${hash}`,
      message: `Successfully sent ${DRIP_AMOUNT} Base Sepolia ETH to your wallet!`,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error?.message || "Failed to dispense testnet ETH.",
      },
      { status: 500 }
    );
  }
}
