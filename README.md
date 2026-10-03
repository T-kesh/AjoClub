# AjoClub 🫙

> Autonomous, AI-orchestrated Onchain Rotating Savings Circles (Ajo/Esusu/Chama) on Base.

AjoClub modernizes informal rotating savings clubs (ROSCAs) by pairing trustless, non-custodial smart contracts with an autonomous AI Agent Coordinator on Telegram ([@Ajoclub_bot](https://t.me/Ajoclub_bot)).

The smart contract enforces round-robin payouts and pot distribution without intermediaries. The AI Agent acts as an autonomous secretary: monitoring round timelines, calculating pots, sending personalized payment reminders to late contributors via direct messages, and preparing Human-in-the-Loop (HITL) payout proposals guarded by deterministic safety invariants.

---

## 🚀 Live Deployments & Network Details

### Base Sepolia (Testnet)

| Component | Target / Value | Links |
|:---|:---|:---|
| **AjoClub Contract** | `0x872F30f5b2FacC992ebaC9392Ef64020d5b774b3` | [Basescan (Verified)](https://sepolia.basescan.org/address/0x872F30f5b2FacC992ebaC9392Ef64020d5b774b3#code) |
| **Native USDC Token** | `0x036CbD53842c5426634e7929541eC2318f3dCF7e` | [Basescan USDC](https://sepolia.basescan.org/address/0x036CbD53842c5426634e7929541eC2318f3dCF7e) |
| **Agent Signer Wallet** | `0xBdE64B467969fC491674EE69f5C8cEA43fecA744` | [Basescan Address](https://sepolia.basescan.org/address/0xBdE64B467969fC491674EE69f5C8cEA43fecA744) |
| **Telegram Coordinator** | `@Ajoclub_bot` | [Open in Telegram](https://t.me/Ajoclub_bot) |
| **Chain ID** | `84532` (Base Sepolia) | [Base Docs](https://docs.base.org) |

### Base Mainnet (Production Ready)

| Parameter | Configuration |
|:---|:---|
| **Network** | Base Mainnet (`Chain ID: 8453`) |
| **USDC Token** | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` |
| **RPC** | `https://mainnet.base.org` |

*(Legacy Celo mainnet deployment preserved at `0x95cB4aA0b634D02E218B2ae2b85B464007c3457c`)*

---

## 🏛️ 5-Layer Autonomous System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│     MEMBERS (Telegram)            ORGANIZER (Telegram / Web)    │
└────────────────┬────────────────────────────────┬───────────────┘
                 │ Commands & Chat                │ Approvals (/payout)
                 ▼                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  Layer 1: MESSAGING & INTERACTION (grammY Telegram Bot)         │
│  • Natural language routing · Command handlers · Session memory │
│  • Interactive approval cards with inline action keyboards      │
└────────────────┬────────────────────────────────────────────────┘
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│  Layer 2: AUTONOMOUS AGENT CORE (Google Gemini 3.5 Flash)       │
│  • Proactive cycle tracking · Natural language query synthesis  │
│  • Exponential backoff retry loop (503 / 429 resiliency)        │
│  • Strict Invariant: LLM never holds keys or executes directly  │
└────────────────┬────────────────────────────────────────────────┘
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│  Layer 3: TYPE-SAFE TOOL REGISTRY (Zod Schema Validation)       │
│  • get_circle_status · send_reminder · flag_default             │
│  • propose_payout · execute_payout                              │
└────────────────┬────────────────────────────────────────────────┘
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│  Layer 4: DETERMINISTIC GUARDRAIL ENGINE (Pure TypeScript Code) │
│  • Financial Caps: Min/max contribution & pot caps              │
│  • Rotation Integrity: Strict round sequencing & timing checks  │
│  • Single-Use HITL Approvals: Non-reusable approval records     │
│  • Allowlist & Rate Limits: 20 req/min, token/contract checks   │
│  • Tamper-Evident Audit Log: SQLite-backed audit trails         │
└────────────────┬────────────────────────────────────────────────┘
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│  Layer 5: BLOCKCHAIN INTEGRATION (viem + Base Sepolia)          │
│  • AjoClub Smart Contract (0x872F...4b3) · USDC transfers       │
│  • Autonomous Agent Signer via secure Hardhat vars storage      │
│  • Fail-closed execution: Simulation allowed ONLY when explicit │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🤖 Telegram Bot Commands & Capabilities

The bot coordinates circle activities directly in group chats or direct messages:

| Command | Description | Example |
|:---|:---|:---|
| `/start` | Welcome guide, overview, and quick command reference. | `/start` |
| `/circles` | Lists all circles you belong to or organize. | `/circles` |
| `/status <id>` | Detailed circle status: current round, countdown, financials, and member roster. | `/status 1` |
| `/link <wallet>` | Securely links your Telegram account to your Base wallet (protected by roster validation & takeover protection). | `/link 0xFD84...2F5` |
| `/remind <id>` | Identifies unpaid members for the active round and dispatches friendly DM reminders. | `/remind 1` |
| `/payout <id>` | Generates a Human-in-the-Loop approval card for organizers to review and trigger round payouts. | `/payout 1` |
| `/help` | Security architecture, smart contract details, and safety invariants. | `/help` |
| **Natural Language** | Conversational queries powered by Gemini 3.5 Flash with multi-turn memory. | *"How is circle 1 doing?"* or *"Who hasn't paid round 1?"* |

---

## 🛡️ Security Invariants & Guardrails

1. **Secret Handling Invariant:**
   * Private keys, API keys, and sensitive tokens are **never** logged, printed, or committed to version control.
   * Agent execution keys are resolved securely from Hardhat vars (`BASE_SEPOLIA_AGENT_KEY`) or protected environment managers.
2. **Fail-Closed Execution:**
   * Mock transaction hashes are strictly disabled by default.
   * Simulation is permitted **only** when `SIMULATE_CHAIN=true` is explicitly set for unit testing.
   * If onchain credentials or contract addresses are missing in production mode, executions immediately fail with a descriptive error.
3. **Single-Use Human-in-the-Loop (HITL) Approvals:**
   * Payouts at or above the threshold require explicit organizer approval via Telegram inline keyboard buttons (`[ ✅ Approve Payout ]`).
   * Each approval token is marked `consumed_at` atomically upon execution to prevent replay attacks.
4. **Takeover Protection & Roster Verification:**
   * `/link <walletAddress>` verifies that the address belongs to an existing circle roster.
   * Addresses already linked to a different Telegram user ID are rejected to prevent identity hijacking.
5. **Deterministic Financial Caps:**
   * Hard limits on individual contributions (1 – 1,000 USDC) and total pot size (up to 10,000 USDC).
   * Cycle durations must be at least 1 hour; grace periods capped at 14 days.

---

## 📂 Project Structure

```
AjoClub/
├── agent/                          # Autonomous AI Agent Core
│   ├── chain.ts                    # viem client, Base Sepolia signer & fail-closed execution
│   ├── loop.ts                     # Coordinator loop, conversation memory & event reactor
│   ├── guardrails/                 # Deterministic Layer 4 safety gates
│   │   ├── allowlist.ts            # Token & contract target allowlists
│   │   ├── approvals.ts            # HITL approval verification & single-use tracking
│   │   ├── audit.ts                # Structured audit logging
│   │   ├── caps.ts                 # Contribution and pot caps
│   │   └── rate_limits.ts          # Tool rate limits & reminder deduplication
│   ├── llm/                        # Multi-provider LLM adapters (Gemini 3.5 Flash, Anthropic, Mock)
│   ├── tools/                      # Zod-validated tool contracts (status, reminder, payout, default)
│   └── test_adversarial.ts         # 63 comprehensive adversarial security tests
├── bot/                            # Layer 1 Telegram Bot (grammY)
│   ├── handlers/                   # Command handlers, callbacks & message routing
│   ├── templates/                  # Markdown status cards & interactive approval cards
│   └── index.ts                    # Bot process entrypoint
├── contracts/                      # Base Sepolia Smart Contracts (Hardhat)
│   ├── src/
│   │   └── AjoClub.sol             # Core rotating savings contract
│   ├── scripts/
│   │   ├── generateAgentWallet.ts  # Secure agent wallet generation utility
│   │   └── proveContribute.ts      # End-to-end onchain contribution validation
│   └── hardhat.config.ts           # Hardhat config with Base Sepolia network definition
├── db/                             # SQLite Storage Layer
│   ├── client.ts                   # Fast WAL-mode SQLite client
│   ├── schema.sql                  # Relational schema (circles, members, approvals, audit logs)
│   └── repositories/               # Repository pattern data access
├── docs/                           # Specifications & threat modeling
│   ├── spec.md                     # 5-Layer architecture specification
│   ├── threat_model.md             # Threat vectors & guardrail mitigations
│   └── demo_script.md              # Live demonstration walkthrough
└── package.json
```

---

## 🛠️ Getting Started

### Prerequisites

- Node.js (v20+ recommended)
- Telegram Bot Token from [@BotFather](https://t.me/BotFather)
- Google Gemini API Key from Google AI Studio (or Anthropic API key)
- Funded Base Sepolia wallet (for deployer and agent)

### 1. Installation

```bash
# Clone the repository
git clone https://github.com/T-kesh/AjoClub.git
cd AjoClub

# Install root dependencies
npm install

# Install contract dependencies
cd contracts && npm install && cd ..
```

### 2. Environment Configuration

Create a `.env` file in the project root:

```bash
# Telegram Bot
TELEGRAM_BOT_TOKEN="your_telegram_bot_token"

# LLM Providers (Gemini 3.5 Flash recommended)
GEMINI_API_KEY="your_gemini_api_key"

# Base Network & Contract
BASE_CHAIN_ID=84532
BASE_SEPOLIA_RPC_URL="https://sepolia.base.org"
AJO_CLUB_CONTRACT_ADDRESS="0x872F30f5b2FacC992ebaC9392Ef64020d5b774b3"
USDC_TOKEN_ADDRESS="0x036CbD53842c5426634e7929541eC2318f3dCF7e"

# Database
DATABASE_PATH="./db/ajo.db"

# Optional: Run in offline simulation mode
# SIMULATE_CHAIN=true
```

### 3. Setup Agent Signer Key

Store the agent wallet's private key securely in Hardhat vars storage:

```bash
cd contracts
npx hardhat vars set BASE_SEPOLIA_AGENT_KEY
# Enter your private key when prompted
cd ..
```

### 4. Initialize Database & Seed

```bash
# Initialize SQLite schema
npm run db:init
```

### 5. Launch the Unified Coordinator Daemon

Run the complete autonomous coordinator daemon in a single process. This boots the Telegram bot, starts the Base Sepolia on-chain event indexer, and kicks off the in-process autonomous tick loop (monitoring deadlines, dispatching payment reminders, and proposing payouts):

```bash
# Launch unified bot, indexer & autonomous agent loop
npm run bot
```

> **Standalone Indexer Option:** If you prefer running the on-chain event indexer in a dedicated worker process, run `npm run indexer`. SQLite WAL mode provides concurrent access safely.

---

## 🌐 Web Application (Base Sepolia + OnchainKit)

AjoClub provides a modern, responsive web application (`web/`) built with Next.js 14, React 18, Wagmi 2, and `@coinbase/onchainkit`:

### Key Features
- **Custom Multi-Wallet Connect Modal:** Streamlined wallet connection with dedicated MetaMask and Base (Coinbase Smart Wallet passkeys & extension) options, live network-switching guard, and connected account dropdown with copy address and Basescan link.
- **Testnet USDC Faucet Helper & 1-Click Asset Watch:** Zero-friction testnet onboarding displaying live Base Sepolia USDC balance, 1-click token addition to wallet (`wallet_watchAsset`), and direct faucet access to Circle's Base Sepolia USDC faucet. Strictly conditional on testnet so no code changes are required when switching to Base Mainnet.
- **Visual ROSCA Payout Timeline & Turn Order Queue:** Interactive cycle timeline and member turn sequence on `/club/[id]` displaying completed round disbursements, active round spotlight with recipient identity, live countdown timer, and pot collection progress bar (`X of Y contributed`), with personalized "Your Turn" position indicators.
- **Coinbase Smart Wallet Passkeys:** 1-tap onboarding using biometric passkeys (FaceID / TouchID / Windows Hello) with zero seed-phrase friction.
- **Paymaster-Sponsored Gasless Contributions:** Uses ERC-5792 batched calls (`wallet_sendCalls`) via Coinbase Developer Platform (CDP) Paymaster to sponsor gas fees and execute token `approve` + `contribute` in a single atomic tap.
- **Basename & Identity Resolution:** Roster displays utilize OnchainKit's `<Identity>`, `<Avatar>`, `<Name>`, and `<Address>` components to automatically resolve member `.base.eth` names and verified avatars.
- **Injected Wallet Support:** Seamless fallback to standard browser wallets (MetaMask, Rainbow, Coinbase Wallet extension) with a robust 2-step approve & contribute flow.
- **Native 6-Decimal USDC:** Fully calibrated for Circle's native USDC on Base Sepolia (`0x036CbD53842c5426634e7929541eC2318f3dCF7e`).

### Running the Web Application

```bash
# Navigate to web directory
cd web

# Set your environment variables in .env.local
NEXT_PUBLIC_CHAIN_ID=84532
NEXT_PUBLIC_AJO_CLUB_ADDRESS=0x872F30f5b2FacC992ebaC9392Ef64020d5b774b3
NEXT_PUBLIC_BASE_RPC=https://sepolia.base.org
NEXT_PUBLIC_CDP_API_KEY=your_cdp_api_key

# Launch development server
npm run dev

# Or build for production
npm run build
```

---

## 🧪 Testing & Verification

### Adversarial Security Test Suite (63 Tests)

Runs the comprehensive guardrail test suite verifying cap enforcement, rotation integrity, HITL approvals, allowlists, rate limiting, and identity linking:

```bash
npm run test:adversarial
```

### Smart Contract Tests

Runs the Solidity contract unit tests covering round lifecycles, payments, and payout distributions:

```bash
npm run test:contracts
```

---

## 📜 License

MIT License. See [LICENSE](LICENSE) for details.
