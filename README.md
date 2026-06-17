# AjoClub 🫙

> Onchain rotating savings clubs (Ajo/Esusu/Chama) for MiniPay — built on Celo.

AjoClub lets communities create trustless savings circles where members contribute a fixed stablecoin amount each cycle and one member receives the full pot per round. No banker. No trust required. Round-robin payout enforced by smart contract.

**Proof of Ship tracks:** MiniApps · Mento · Self Protocol

---

## Live Deployment

| | |
|---|---|
| **Contract (Celo mainnet)** | [`0x95cB4aA0b634D02E218B2ae2b85B464007c3457c`](https://celoscan.io/address/0x95cB4aA0b634D02E218B2ae2b85B464007c3457c) |
| **Celoscan (verified)** | [View source + ABI](https://celoscan.io/address/0x95cB4aA0b634D02E218B2ae2b85B464007c3457c#code) |
| **Frontend** | https://react-app-psi-ten-23.vercel.app |
| **GitHub** | https://github.com/T-kesh/AjoClub |

---

## Project Structure

```
AjoClub/
├── packages/
│   ├── hardhat/                          # Smart contracts
│   │   ├── contracts/
│   │   │   ├── AjoClub.sol               # Core rotating savings contract
│   │   │   └── test/                     # MockERC20, AjoClubTest helpers
│   │   ├── ignition/modules/AjoClub.ts   # Hardhat Ignition deploy module
│   │   ├── scripts/                      # checkConfigId, transferOwnership
│   │   ├── test/AjoClub.test.ts          # Full test suite (15 tests)
│   │   └── hardhat.config.ts
│   └── react-app/                        # Next.js MiniPay frontend
│       ├── app/
│       │   ├── page.tsx                  # Home: Create Club / Browse Clubs CTAs
│       │   ├── create/page.tsx           # Create club form
│       │   ├── clubs/page.tsx            # Browse all clubs
│       │   ├── club/[id]/page.tsx        # Club dashboard
│       │   ├── club/[id]/contribute/     # One-tap contribute screen
│       │   └── verify/page.tsx           # Self Protocol identity gate
│       ├── components/
│       │   ├── ChainGuard.tsx            # Wrong-network blocker
│       │   ├── ClubCard.tsx              # Club summary card
│       │   ├── MemberList.tsx            # Member list with payout order
│       │   ├── ContributeButton.tsx      # Navigate to contribute page
│       │   ├── CountdownTimer.tsx        # Live cycle-end countdown
│       │   └── SelfVerifyButton.tsx      # Self Protocol QR widget
│       ├── hooks/
│       │   ├── useAjoClub.ts             # Contract read/write hooks
│       │   ├── useMiniPay.ts             # MiniPay wallet detection + connect
│       │   └── useSelfVerify.ts          # Self Protocol verification state
│       └── lib/
│           ├── contract.ts               # ABI + deployed address + token addresses
│           ├── celo.ts                   # Wagmi config for Celo mainnet/Sepolia
│           └── self.ts                   # Self Protocol app builder (per-user)
├── CHANGELOG.md
└── README.md
```

---

## Smart Contract

### Overview

Single contract manages multiple independent clubs. Each club is identified by an auto-incrementing `clubId`. Inherits `SelfVerificationRoot` from `@selfxyz/contracts` — Self Protocol's `IdentityVerificationHubV2` calls back into `customVerificationHook` after a valid ZK passport proof, marking the wallet address as verified globally.

### Self Protocol Integration

The contract registers a `VerificationConfigV2` atomically in the constructor — no post-deploy setup needed. `verificationConfigId` is stored and returned by `getConfigId()` for every proof validation.

```
Hub (Celo mainnet): 0xe57F4773bd9c9d8b6Cd70431117d353298B9f5BF
Scope seed: "ajo-club"
verificationConfigId: 0x7b6436b0c98f62380866d9432c2af0ee08ce16a171bda6951aecd95ee1307d61
```

### Key Functions

```solidity
// Club lifecycle
createClub(name, token, contribution, cycleDuration, maxMembers) → clubId
joinClub(clubId)        // requires isVerified[msg.sender]
startClub(clubId)       // creator only, club must be full

// Cycle mechanics
contribute(clubId)      // ERC20 transferFrom — approve first
triggerPayout(clubId)   // anyone, after cycleEnd + allPaid

// Self Protocol (called by IdentityVerificationHubV2)
verifySelfProof(proofPayload, userContextData)
customVerificationHook(output, userData)  // internal — marks wallet verified
```

### Supported Tokens (Mento stablecoins on Celo mainnet)

```
cUSD:  0x765DE816845861e75A25fCA122bb6898B8B1282a
cEUR:  0xD8763CBa276a3738E6DE85b4b3bF5FDed6D6cA73
cKES:  0x456a3D042C0DbD3db53D5489e98dFb038553B0d0
```

---

## Frontend

### Stack

- **Next.js 14** (App Router)
- **wagmi v2 + viem** — all writes use `type: "legacy"` (MiniPay requirement)
- **Tailwind CSS** — mobile-first
- **Self Protocol SDK** — `@selfxyz/qrcode` for identity verification

### MiniPay Notes

- Detects MiniPay via `window.ethereum?.isMiniPay`
- Auto-connects injected wallet on mount
- All txs are legacy (no EIP-1559) — required by MiniPay
- ERC20 approve reads existing allowance first, skips approve if already sufficient
- Test locally with ngrok (`ngrok http 3000`)

---

## Environment Variables

### `packages/react-app/.env.local`

```bash
NEXT_PUBLIC_AJO_CLUB_ADDRESS=0x95cB4aA0b634D02E218B2ae2b85B464007c3457c
NEXT_PUBLIC_CELO_RPC=https://forno.celo.org
NEXT_PUBLIC_SELF_ENDPOINT=0x95cB4aA0b634D02E218B2ae2b85B464007c3457c
NEXT_PUBLIC_CHAIN_ID=42220
```

### `packages/hardhat/.env`

```bash
PRIVATE_KEY=          # deployer wallet private key
CELOSCAN_API_KEY=     # for contract verification
```

---

## Local Development

```bash
# 1. Install
cd packages/hardhat && npm install
cd ../react-app && npm install

# 2. Run frontend
cd packages/react-app
npm run dev

# 3. Expose via ngrok (required for MiniPay)
ngrok http 3000
# Paste ngrok URL into MiniPay browser
```

## Deploy Contract

```bash
cd packages/hardhat

# Celo Sepolia testnet
npm run deploy:celo-sepolia

# Celo mainnet
HARDHAT_NETWORK=celo npx hardhat ignition deploy ignition/modules/AjoClub.ts --network celo

# Verify on Celoscan
npx hardhat verify --network celo <address> "<hub_address>" "ajo-club"
```

## Deploy Frontend

```bash
cd packages/react-app
vercel --prod
```

---

## Testing

```bash
cd packages/hardhat
npx hardhat test
```

**15 tests covering:**
- `createClub` — happy path, invalid token reverts, maxMembers < 2 reverts
- `joinClub` — unverified reverts, full club reverts, duplicate reverts
- `contribute` — double payment reverts, after cycleEnd reverts, non-member reverts
- `triggerPayout` — not all paid reverts, before cycleEnd reverts, correct recipient + amount
- Full 3-member lifecycle end-to-end with `ClubComplete` event

---

## KarmaGAP Milestones

| # | Milestone | Status |
|---|-----------|--------|
| 1 | Contract deployed, create/join/contribute flow working | ✅ Complete |
| 2 | Self Protocol verification integrated, MiniPay frontend live | ✅ Complete |
| 3 | Mainnet deploy, cEUR + cKES support, Celoscan verified | ✅ Complete |
| 4 | Demo video recorded, README polished, Farcaster posts published | 🔄 In progress |

---

## Proof of Ship Tracks

- ✅ **MiniApps** — mobile-first MiniPay Mini App
- ✅ **DeFi & Stablecoin Payments** — Mento cUSD/cEUR/cKES
- ✅ **Self Protocol bonus** — passport identity gate on club membership

---

## Resources

- [MiniPay Docs](https://docs.celo.org/build/build-on-minipay/overview)
- [Self Protocol Docs](https://docs.self.xyz)
- [Self Protocol Contracts](https://github.com/selfxyz/self)
- [Mento Stablecoin Addresses](https://docs.mento.org/mento/developers/deployments/addresses)
- [Celo Proof of Ship](https://github.com/celo-org/Proof-of-Ship)
- [KarmaGAP](https://gap.karmahq.xyz)
