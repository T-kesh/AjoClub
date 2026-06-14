# AjoClub 🫙

> Onchain rotating savings clubs (Ajo/Esusu/Chama) for MiniPay — built on Celo.

AjoClub lets communities create trustless savings circles where members contribute a fixed cUSD amount each cycle and one member receives the full pot per round. No banker. No trust required. Round-robin payout enforced by smart contract.

**Proof of Ship tracks:** MiniApps · Mento · Self Protocol

---

## Project Structure

```
ajo-club/
├── packages/
│   ├── hardhat/                        # Smart contracts
│   │   ├── contracts/
│   │   │   └── AjoClub.sol             # Core rotating savings contract
│   │   ├── deploy/
│   │   │   └── 00_deploy_ajoclub.ts    # Hardhat Ignition deploy script
│   │   ├── test/
│   │   │   └── AjoClub.test.ts         # Full test suite
│   │   ├── hardhat.config.ts
│   │   └── package.json
│   └── react-app/                      # Next.js MiniPay frontend
│       ├── app/
│       │   ├── layout.tsx
│       │   ├── page.tsx                # Home: Create Club / Join Club CTAs
│       │   ├── create/
│       │   │   └── page.tsx            # Create club form
│       │   ├── club/
│       │   │   └── [id]/
│       │   │       ├── page.tsx        # Club dashboard
│       │   │       └── contribute/
│       │   │           └── page.tsx    # One-tap contribute screen
│       │   └── verify/
│       │       └── page.tsx            # Self Protocol identity gate
│       ├── components/
│       │   ├── ClubCard.tsx            # Club summary card
│       │   ├── MemberList.tsx          # Member list with payout order
│       │   ├── ContributeButton.tsx    # MiniPay cUSD send button
│       │   ├── CountdownTimer.tsx      # Cycle end countdown
│       │   └── SelfVerifyButton.tsx    # Self Protocol verify widget
│       ├── hooks/
│       │   ├── useAjoClub.ts           # Contract read/write hooks
│       │   ├── useMiniPay.ts           # MiniPay wallet detection + connect
│       │   └── useSelfVerify.ts        # Self Protocol verification state
│       ├── lib/
│       │   ├── contract.ts             # ABI + deployed address constants
│       │   ├── celo.ts                 # Viem Celo chain config
│       │   └── self.ts                 # Self Protocol app config
│       ├── public/
│       ├── .env.example
│       ├── next.config.ts
│       └── package.json
├── .env.example
├── .gitignore
├── CHANGELOG.md
└── README.md                           # This file
```

---

## Smart Contract: `AjoClub.sol`

### Overview

Single contract managing multiple independent clubs. Each club is identified by a `clubId` (auto-incrementing uint).

### Data Structures

```solidity
enum ClubStatus { OPEN, ACTIVE, COMPLETE }

struct Club {
  string name;
  address token;           // cUSD, cEUR, or cKES (Mento stablecoins)
  uint256 contribution;    // fixed amount per cycle (in wei)
  uint256 cycleDuration;   // seconds per cycle (e.g. 604800 = 7 days)
  uint256 maxMembers;
  uint256 currentRound;    // index into members[] for who receives next
  uint256 cycleEnd;        // timestamp when current cycle closes
  ClubStatus status;
  address[] members;
  mapping(address => bool) hasPaid;     // paid this cycle?
  mapping(address => bool) isMember;
  mapping(address => bool) isVerified;  // Self Protocol verified
}
```

### Functions to implement

```solidity
// Club lifecycle
function createClub(string name, address token, uint256 contribution, uint256 cycleDuration, uint256 maxMembers) external returns (uint256 clubId)
function joinClub(uint256 clubId) external  // requires Self verification
function startClub(uint256 clubId) external  // creator only, once maxMembers joined

// Cycle mechanics
function contribute(uint256 clubId) external  // member sends contribution token
function triggerPayout(uint256 clubId) external  // callable by anyone after cycleEnd
function advanceCycle(uint256 clubId) internal   // increments round, resets hasPaid, sets new cycleEnd

// Self Protocol gate
function setVerified(uint256 clubId, address member) external  // called by Self verifier
function isVerified(uint256 clubId, address member) external view returns (bool)

// Views
function getClub(uint256 clubId) external view returns (name, token, contribution, cycleDuration, maxMembers, currentRound, cycleEnd, status, address[] members)
function getMemberPaymentStatus(uint256 clubId) external view returns (address[] members, bool[] paid)
function getActiveClubs() external view returns (uint256[] clubIds)
```

### Key logic rules

- `joinClub` reverts if club status is not `OPEN`, or member not Self-verified
- `contribute` reverts if club is not `ACTIVE`, member already paid, or cycle has ended
- `triggerPayout` reverts if not all members have paid this cycle, or cycleEnd not reached
- Payout sends `contribution * members.length` to `members[currentRound]`
- After final round, set status to `COMPLETE`
- Use OpenZeppelin `IERC20` for token transfers (no native CELO, stablecoins only)
- Emit events: `ClubCreated`, `MemberJoined`, `ContributionMade`, `PayoutSent`, `ClubComplete`

### Supported tokens (Mento stablecoins on Celo mainnet)

```
cUSD:  0x765DE816845861e75A25fCA122bb6898B8B1282a
cEUR:  0xD8763CBa276a3738E6DE85b4b3bF5FDed6D6cA73
cKES:  0x456a3D042C0DbD3db53D5489e98dFb038553B0d0
```

### Supported tokens (Celo Alfajores testnet)

```
cUSD:  0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1
cEUR:  0x10c892A6EC43a53E45D0B916B4b7D383B1b78d0F
```

---

## Frontend: React App

### Stack

- **Next.js 14** (App Router)
- **wagmi v2 + viem** — wallet connection and contract calls
- **Celo Composer MiniPay template** as base
- **Tailwind CSS** — mobile-first styling
- **Self Protocol SDK** — `@selfxyz/self-sdk` for identity verification

### MiniPay integration notes

- Detect MiniPay with `window.ethereum?.isMiniPay === true`
- Use `useMiniPay.ts` hook to auto-connect on load inside MiniPay
- All transactions use `feeCurrency: cUSD` (USDm address)
- Only legacy transactions — do NOT use EIP-1559 params
- Test locally with ngrok tunnel (MiniPay cannot open localhost)

### Pages

**`/` (Home)**
- If inside MiniPay: show "Create Club" + "Join Club" buttons
- If outside MiniPay: show "Open in MiniPay" prompt

**`/create`**
- Form fields: Club Name, Currency (cUSD/cEUR/cKES dropdown), Contribution Amount, Cycle Duration (7d/14d/30d), Max Members
- On submit: calls `createClub()` on contract
- Redirect to `/club/[id]` on success

**`/verify`**
- Renders Self Protocol verification widget
- On success: stores verified state, redirects back to club join flow
- Uses `SelfVerifyButton.tsx` component

**`/club/[id]`**
- Shows: club name, currency, contribution amount, cycle countdown, pot size
- Member list with payout order and payment status per cycle (`MemberList.tsx`)
- "Contribute" CTA button if user is member and hasn't paid this cycle
- "Trigger Payout" button visible if cycle has ended and all have paid
- "Join Club" button if club is OPEN and user not yet a member

**`/club/[id]/contribute`**
- Single screen: shows amount due, token, one big "Pay" button
- Calls `contribute()` via wagmi `useWriteContract`
- Success state with confetti / feedback

### `useMiniPay.ts` hook outline

```typescript
// Detects MiniPay environment
// Auto-connects wallet on mount
// Returns: { isMiniPay, address, isConnected, connect }
```

### `useAjoClub.ts` hook outline

```typescript
// Returns typed read/write functions for all AjoClub.sol functions
// Uses wagmi useReadContract / useWriteContract
// Handles loading + error states
// Returns: { createClub, joinClub, contribute, triggerPayout, getClub, getMemberPaymentStatus }
```

### `useSelfVerify.ts` hook outline

```typescript
// Reads Self Protocol verification status from contract
// Returns: { isVerified, startVerification, verificationStatus }
```

---

## Self Protocol Integration

Self Protocol lets users prove their humanity (passport / national ID scan) without revealing personal data. We use it to gate `joinClub` — each member must verify once before joining any club.

### How it works in AjoClub

1. User taps "Join Club"
2. If not verified → redirect to `/verify`
3. User completes Self Protocol flow (QR scan with Self app)
4. On success → Self calls our verifier callback → `setVerified()` on contract
5. User can now join clubs

### Self SDK setup (`lib/self.ts`)

```typescript
import { SelfAppBuilder } from '@selfxyz/self-sdk'

export const selfApp = new SelfAppBuilder({
  appName: 'AjoClub',
  scope: 'ajo-club-verify',
  endpoint: process.env.NEXT_PUBLIC_SELF_ENDPOINT!,
  // Minimum: prove uniqueness only, no personal data disclosed
  disclosures: { minimumAge: false, nationality: false }
}).build()
```

Self Protocol docs: https://docs.self.xyz

---

## Environment Variables

### `packages/react-app/.env.example`

```
NEXT_PUBLIC_AJO_CLUB_ADDRESS=           # deployed AjoClub contract address
NEXT_PUBLIC_CELO_RPC=https://forno.celo.org
NEXT_PUBLIC_SELF_ENDPOINT=              # your Self Protocol verifier endpoint
NEXT_PUBLIC_CHAIN_ID=42220              # 42220 mainnet, 44787 alfajores
```

### `packages/hardhat/.env.example`

```
PRIVATE_KEY=                            # deployer wallet private key
CELOSCAN_API_KEY=                       # for contract verification
```

---

## Deploy

### 1. Install dependencies

```bash
cd packages/hardhat && npm install
cd ../react-app && npm install
```

### 2. Deploy contract to Alfajores testnet

```bash
cd packages/hardhat
npx hardhat ignition deploy deploy/00_deploy_ajoclub.ts --network alfajores
```

### 3. Copy deployed address into react-app `.env`

```
NEXT_PUBLIC_AJO_CLUB_ADDRESS=0x...
```

### 4. Run frontend locally

```bash
cd packages/react-app
npm run dev
# then in another terminal:
ngrok http 3000
# paste the ngrok URL into MiniPay browser
```

### 5. Deploy to Vercel

```bash
vercel --prod
```

---

## Testing

```bash
cd packages/hardhat
npx hardhat test
```

Test coverage should include:
- `createClub` — happy path, invalid token reverts
- `joinClub` — unverified member reverts, full club reverts
- `contribute` — double payment reverts, wrong cycle reverts
- `triggerPayout` — not all paid reverts, correct recipient receives full pot
- Full 3-member club lifecycle end-to-end

---

## KarmaGAP Milestones

| # | Milestone | Target |
|---|-----------|--------|
| 1 | Contract deployed to Alfajores, create/join/contribute flow working | Week 1 |
| 2 | Self Protocol verification integrated, MiniPay frontend live on ngrok | Week 2 |
| 3 | Mainnet deploy, cEUR + cKES support added | Week 3 |
| 4 | Demo video recorded, README polished, Farcaster posts published | Week 4 |

---

## Proof of Ship Tracks

- ✅ **MiniApps** — mobile-first MiniPay Mini App
- ✅ **DeFi & Stablecoin Payments** — Mento cUSD/cEUR/cKES
- ✅ **Self Protocol bonus** — identity gate on club membership

---

## Resources

- [Celo Composer MiniPay Template](https://github.com/celo-org/minipay-template)
- [MiniPay Docs](https://docs.celo.org/build/build-on-minipay/overview)
- [Self Protocol Docs](https://docs.self.xyz)
- [Mento Stablecoin Addresses](https://docs.mento.org/mento/developers/deployments/addresses)
- [Celo Proof of Ship](https://github.com/celo-org/Proof-of-Ship)
- [KarmaGAP](https://gap.karmahq.xyz)
- [Hardhat Celo Plugin](https://docs.celo.org/developer/hardhat-deploy-on-celo)