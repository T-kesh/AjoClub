// ============================================================================
// Layer 4 Guardrail: Address & Contract Allowlist (allowlist.ts)
// Protects against destination spoofing and malicious contracts
// ============================================================================

export interface AllowedNetworkAddresses {
  usdc: string;
  eurc?: string;
  ajoClub: string;
}

const ETH_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/i;
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export function isValidContractAddress(address: string | undefined | null): boolean {
  if (!address || typeof address !== "string") return false;
  return ETH_ADDRESS_REGEX.test(address) && address !== ZERO_ADDRESS;
}

// Startup check: Log clear security warning if contract address is unset or malformed.
// Does not throw to avoid crashing unrelated operations, but ensures loud misconfiguration reporting.
const startupContractAddress = process.env.AJO_CLUB_CONTRACT_ADDRESS?.trim();
if (!startupContractAddress) {
  console.warn(
    "⚠️  [SECURITY WARNING] AJO_CLUB_CONTRACT_ADDRESS is unset. Contract target allowlist is FAIL-CLOSED (all contract targets blocked)."
  );
} else if (!isValidContractAddress(startupContractAddress)) {
  console.warn(
    `⚠️  [SECURITY WARNING] AJO_CLUB_CONTRACT_ADDRESS '${startupContractAddress}' is malformed. Contract target allowlist is FAIL-CLOSED (all contract targets blocked).`
  );
}

export const BASE_SEPOLIA_ALLOWLIST: AllowedNetworkAddresses = {
  usdc: "0x036CbD53842c5426634e7929541eC2318f3dCF7e".toLowerCase(),
  get ajoClub(): string {
    return (process.env.AJO_CLUB_CONTRACT_ADDRESS || "").toLowerCase();
  },
};

export const BASE_MAINNET_ALLOWLIST: AllowedNetworkAddresses = {
  usdc: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913".toLowerCase(),
  eurc: "0x60a3E35Cc30DaA003233b8E5b12ef902bB871a2a".toLowerCase(),
  get ajoClub(): string {
    return (process.env.AJO_CLUB_CONTRACT_ADDRESS || "").toLowerCase();
  },
};

export function isTokenAllowed(tokenAddress: string, chainId: number = 84532): boolean {
  const normalized = tokenAddress.toLowerCase();
  const allowlist = chainId === 8453 ? BASE_MAINNET_ALLOWLIST : BASE_SEPOLIA_ALLOWLIST;

  return normalized === allowlist.usdc || (allowlist.eurc !== undefined && normalized === allowlist.eurc);
}

/**
 * Validates whether the target address is an allowed contract destination.
 * FAIL-CLOSED: If AJO_CLUB_CONTRACT_ADDRESS is unset, empty, or malformed,
 * all contract calls are denied (returns false).
 */
export function isContractTargetAllowed(targetAddress: string, chainId: number = 84532): boolean {
  // Target address must be a syntactically valid non-zero hex address
  if (!isValidContractAddress(targetAddress)) {
    return false;
  }

  const configuredAddress = process.env.AJO_CLUB_CONTRACT_ADDRESS?.trim();

  // Fail closed if the allowlist source is empty, undefined, or malformed
  if (!isValidContractAddress(configuredAddress)) {
    return false;
  }

  const normalized = targetAddress.toLowerCase();
  const configured = configuredAddress!.toLowerCase();

  return normalized === configured;
}
