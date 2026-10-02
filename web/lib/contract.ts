export const AJO_CLUB_ADDRESS = (process.env.NEXT_PUBLIC_AJO_CLUB_ADDRESS || "0x872F30f5b2FacC992ebaC9392Ef64020d5b774b3") as `0x${string}`;

export const AJO_CLUB_ABI = [
  // ── Club lifecycle ──────────────────────────────────────────────────────────
  {
    name: "createClub",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "name", type: "string" },
      { name: "token", type: "address" },
      { name: "contribution", type: "uint256" },
      { name: "cycleDuration", type: "uint256" },
      { name: "gracePeriod", type: "uint256" },
      { name: "maxMembers", type: "uint256" },
    ],
    outputs: [{ name: "clubId", type: "uint256" }],
  },
  {
    name: "joinClub",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "clubId", type: "uint256" }],
    outputs: [],
  },
  {
    name: "startClub",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "clubId", type: "uint256" }],
    outputs: [],
  },
  {
    name: "cancelClub",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "clubId", type: "uint256" }],
    outputs: [],
  },
  {
    name: "leaveClub",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "clubId", type: "uint256" }],
    outputs: [],
  },
  // ── Cycle mechanics ─────────────────────────────────────────────────────────
  {
    name: "contribute",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "clubId", type: "uint256" }],
    outputs: [],
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
  // ── Admin / Verifier ────────────────────────────────────────────────────────
  {
    name: "setAllowedToken",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "token", type: "address" },
      { name: "allowed", type: "bool" },
    ],
    outputs: [],
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
  // ── Self Protocol ────────────────────────────────────────────────────────────
  {
    name: "verifySelfProof",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "proofPayload", type: "bytes" },
      { name: "userContextData", type: "bytes" },
    ],
    outputs: [],
  },
  {
    name: "isVerified",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "member", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "allowedTokens",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "token", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "verificationConfigId",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "bytes32" }],
  },
  // ── Views ────────────────────────────────────────────────────────────────────
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
    name: "getActiveClubs",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "clubIds", type: "uint256[]" }],
  },
  {
    name: "clubCount",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  // ── Events ───────────────────────────────────────────────────────────────────
  {
    name: "ClubCreated",
    type: "event",
    inputs: [
      { name: "clubId", type: "uint256", indexed: true },
      { name: "creator", type: "address", indexed: true },
      { name: "name", type: "string", indexed: false },
      { name: "token", type: "address", indexed: false },
      { name: "contribution", type: "uint256", indexed: false },
    ],
  },
  {
    name: "MemberJoined",
    type: "event",
    inputs: [
      { name: "clubId", type: "uint256", indexed: true },
      { name: "member", type: "address", indexed: true },
    ],
  },
  {
    name: "ContributionMade",
    type: "event",
    inputs: [
      { name: "clubId", type: "uint256", indexed: true },
      { name: "member", type: "address", indexed: true },
      { name: "round", type: "uint256", indexed: false },
    ],
  },
  {
    name: "PayoutSent",
    type: "event",
    inputs: [
      { name: "clubId", type: "uint256", indexed: true },
      { name: "recipient", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
      { name: "round", type: "uint256", indexed: false },
    ],
  },
  {
    name: "ClubComplete",
    type: "event",
    inputs: [{ name: "clubId", type: "uint256", indexed: true }],
  },
  {
    name: "MemberVerified",
    type: "event",
    inputs: [{ name: "member", type: "address", indexed: true }],
  },
  {
    name: "MemberDefaulted",
    type: "event",
    inputs: [
      { name: "clubId", type: "uint256", indexed: true },
      { name: "member", type: "address", indexed: true },
      { name: "round", type: "uint256", indexed: false },
    ],
  },
  {
    name: "ClubCancelled",
    type: "event",
    inputs: [
      { name: "clubId", type: "uint256", indexed: true },
      { name: "cancelledBy", type: "address", indexed: true },
    ],
  },
  {
    name: "MemberLeft",
    type: "event",
    inputs: [
      { name: "clubId", type: "uint256", indexed: true },
      { name: "member", type: "address", indexed: true },
    ],
  },
  {
    name: "TokenAllowed",
    type: "event",
    inputs: [
      { name: "token", type: "address", indexed: true },
      { name: "allowed", type: "bool", indexed: false },
    ],
  },
] as const;

export const TOKENS = {
  base: {
    USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as `0x${string}`,
    EURC: "0x60a3E35Cc30DaA003233b8E5b12ef902bB871a2a" as `0x${string}`,
  },
  baseSepolia: {
    USDC: "0x036CbD53842c5426634e7929541eC2318f3dCF7e" as `0x${string}`,
  },
  celo: {
    cUSD: "0x765DE816845861e75A25fCA122bb6898B8B1282a" as `0x${string}`,
    cEUR: "0xD8763CBa276a3738E6DE85b4b3bF5FDed6D6cA73" as `0x${string}`,
  },
} as const;

export const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 84532);
export const IS_TESTNET = CHAIN_ID === 84532 || CHAIN_ID === 44787;

export const SUPPORTED_TOKENS: Record<string, `0x${string}`> =
  CHAIN_ID === 8453
    ? (TOKENS.base as unknown as Record<string, `0x${string}`>)
    : CHAIN_ID === 84532
    ? (TOKENS.baseSepolia as unknown as Record<string, `0x${string}`>)
    : (TOKENS.celo as unknown as Record<string, `0x${string}`>);

export const TOKEN_LABELS: Record<string, string> = {
  [TOKENS.base.USDC.toLowerCase()]: "USDC",
  [TOKENS.base.EURC.toLowerCase()]: "EURC",
  [TOKENS.baseSepolia.USDC.toLowerCase()]: "USDC",
  [TOKENS.celo.cUSD.toLowerCase()]: "cUSD",
  [TOKENS.celo.cEUR.toLowerCase()]: "cEUR",
};

export const TOKEN_DECIMALS: Record<string, number> = {
  [TOKENS.base.USDC.toLowerCase()]: 6,
  [TOKENS.base.EURC.toLowerCase()]: 6,
  [TOKENS.baseSepolia.USDC.toLowerCase()]: 6,
  [TOKENS.celo.cUSD.toLowerCase()]: 18,
  [TOKENS.celo.cEUR.toLowerCase()]: 18,
};

export function tokenLabel(address: string): string {
  return TOKEN_LABELS[address.toLowerCase()] ?? address.slice(0, 8) + "...";
}

export function tokenDecimals(address: string): number {
  return TOKEN_DECIMALS[address.toLowerCase()] ?? 6;
}
