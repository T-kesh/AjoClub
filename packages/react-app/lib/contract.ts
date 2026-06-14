export const AJO_CLUB_ADDRESS = (process.env.NEXT_PUBLIC_AJO_CLUB_ADDRESS ?? "") as `0x${string}`;

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
] as const;

export const TOKENS = {
  mainnet: {
    cUSD: "0x765DE816845861e75A25fCA122bb6898B8B1282a" as `0x${string}`,
    cEUR: "0xD8763CBa276a3738E6DE85b4b3bF5FDed6D6cA73" as `0x${string}`,
    cKES: "0x456a3D042C0DbD3db53D5489e98dFb038553B0d0" as `0x${string}`,
  },
  testnet: {
    // Alfajores addresses — whitelisted in contract for testnet convenience
    cUSD: "0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1" as `0x${string}`,
    cEUR: "0x10C892a6ec43A53e45D0B916b4b7D383b1B78d0f" as `0x${string}`,
  },
} as const;

export const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 42220);
export const IS_TESTNET = CHAIN_ID !== 42220;
export const SUPPORTED_TOKENS: Record<string, `0x${string}`> = IS_TESTNET
  ? (TOKENS.testnet as Record<string, `0x${string}`>)
  : (TOKENS.mainnet as Record<string, `0x${string}`>);

export const TOKEN_LABELS: Record<string, string> = {
  [TOKENS.mainnet.cUSD.toLowerCase()]: "cUSD",
  [TOKENS.mainnet.cEUR.toLowerCase()]: "cEUR",
  [TOKENS.mainnet.cKES.toLowerCase()]: "cKES",
  [TOKENS.testnet.cUSD.toLowerCase()]: "cUSD",
  [TOKENS.testnet.cEUR.toLowerCase()]: "cEUR",
};

export function tokenLabel(address: string): string {
  return TOKEN_LABELS[address.toLowerCase()] ?? address.slice(0, 8) + "...";
}
