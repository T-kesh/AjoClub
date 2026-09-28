// ============================================================================
// Layer 4 Guardrail: Address & Contract Allowlist (allowlist.ts)
// Protects against destination spoofing and malicious contracts
// ============================================================================

export interface AllowedNetworkAddresses {
  usdc: string;
  eurc?: string;
  ajoClub: string;
}

export const BASE_SEPOLIA_ALLOWLIST: AllowedNetworkAddresses = {
  usdc: "0x036CbD53842c5426634e7929541eC2318f3dCF7e".toLowerCase(),
  ajoClub: (process.env.AJO_CLUB_CONTRACT_ADDRESS || "").toLowerCase(),
};

export const BASE_MAINNET_ALLOWLIST: AllowedNetworkAddresses = {
  usdc: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913".toLowerCase(),
  eurc: "0x60a3E35Cc30DaA003233b8E5b12ef902bB871a2a".toLowerCase(),
  ajoClub: (process.env.AJO_CLUB_CONTRACT_ADDRESS || "").toLowerCase(),
};

export function isTokenAllowed(tokenAddress: string, chainId: number = 84532): boolean {
  const normalized = tokenAddress.toLowerCase();
  const allowlist = chainId === 8453 ? BASE_MAINNET_ALLOWLIST : BASE_SEPOLIA_ALLOWLIST;

  return normalized === allowlist.usdc || (allowlist.eurc !== undefined && normalized === allowlist.eurc);
}

export function isContractTargetAllowed(targetAddress: string, chainId: number = 84532): boolean {
  const normalized = targetAddress.toLowerCase();
  const allowlist = chainId === 8453 ? BASE_MAINNET_ALLOWLIST : BASE_SEPOLIA_ALLOWLIST;

  if (!allowlist.ajoClub) {
    // If not yet deployed/configured, allow if it's a valid 40-char hex address (non-zero)
    return /^0x[a-fA-F0-9]{40}$/.test(targetAddress) && targetAddress !== "0x0000000000000000000000000000000000000000";
  }

  return normalized === allowlist.ajoClub;
}
