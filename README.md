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

> [!IMPORTANT]
> **Wallet Compatibility Notice (Base Sepolia Testnet):**  
> Native Base / Coinbase Smart Wallet connection is currently not functional due to the testnet deployment on **Base Sepolia**. Testers and reviewers should connect using **MetaMask** (or another standard injected browser wallet) configured for Base Sepolia instead.

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
| `/earnings` | Live protocol monetization report: 1.0% take-rate fees, 10% slashing liquidation revenue, and total earned USDC. | `/earnings` |
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

Prerequisites depend on how you want to interact with AjoClub:

- **1. Offline Automated Testing (Zero setup & $0 required):**
  - **Node.js** (v20+ recommended)
  - No wallet, no mainnet ETH, no testnet gas, and no API keys required (built-in in-memory SQLite, simulated chain mode, and mock LLM reasoning).
  - *(Optional)* [Foundry (`forge`)](https://getfoundry.sh/) if running property-based invariant fuzz tests (`npm run test:invariant`).

- **2. Interactive Web Application (Base Sepolia Testnet):**
  - **MetaMask** (or any injected browser wallet) connected to **Base Sepolia** (Network ID: `84532`, RPC: `https://sepolia.base.org`).
  - **Free Base Sepolia ETH** for gas *(see zero-mainnet faucet guide below)*.
  - **Free Base Sepolia USDC** (`0x036CbD53842c5426634e7929541eC2318f3dCF7e`) to join and fund savings circles.

- **3. Autonomous Telegram Daemon (`bot/`):**
  - **Telegram Bot Token** from [@BotFather](https://t.me/BotFather).
  - **Google Gemini API Key** from [Google AI Studio](https://aistudio.google.com/) (or Anthropic API key).
  - Agent wallet private key configured in Hardhat vars storage (`BASE_SEPOLIA_AGENT_KEY`).

---

### 🚰 Free Testnet Faucets (No Mainnet ETH Required)

> [!NOTE]
> **Overcoming the "0.001 Mainnet ETH" Faucet Trap:**  
> Standard commercial faucets (such as Alchemy or Google Cloud Web3) require holding **at least 0.001 ETH on Ethereum Mainnet** (~$3 USD) to prevent bot sybils.  
> **You do NOT need any Ethereum Mainnet funds to test AjoClub.** Use any of the verified zero-balance faucets below to claim free testnet ETH and USDC:

| Faucet | What it Dispenses | Requirement / Verification | Mainnet ETH Needed? | Link |
|:---|:---|:---|:---|:---|
| **Superchain Faucet** *(Recommended)* | 0.05 – 0.1 Base Sepolia ETH | GitHub login (account > 30 days) | ❌ **No (0 ETH)** | [console.optimism.io/faucet](https://console.optimism.io/faucet) |
| **Chainlink Faucets** | 0.1 Base Sepolia ETH + testnet LINK | GitHub sign-in | ❌ **No (0 ETH)** | [faucets.chain.link/base-sepolia](https://faucets.chain.link/base-sepolia) |
| **PoW Sepolia Miner + Base Bridge** | Up to 1.0 Sepolia ETH | Browser CPU mining (2 mins, zero login) | ❌ **No (0 ETH)** | [sepolia-faucet.pk910.de](https://sepolia-faucet.pk910.de/) → bridge to Base via [bridge.base.org](https://bridge.base.org/deposit) |
| **LearnWeb3 Faucet** | 0.05 Base Sepolia ETH | Discord or GitHub login | ❌ **No (0 ETH)** | [learnweb3.io/faucets/base_sepolia](https://learnweb3.io/faucets/base_sepolia/) |
| **Circle USDC Faucet** | 10 Testnet USDC on Base Sepolia | Simple Captcha verification | ❌ **No (0 ETH)** | [faucet.circle.com](https://faucet.circle.com/) |

> [!TIP]
> **Fastest 2-Minute Onboarding:**
> 1. Claim free Base Sepolia ETH from the **[Superchain Faucet](https://console.optimism.io/faucet)** via GitHub.
> 2. Claim free testnet USDC from **[faucet.circle.com](https://faucet.circle.com/)** (select *Base Sepolia*).
> 3. Connect MetaMask to `http://localhost:3000` — your wallet is instantly ready to verify with Self Protocol and join rotating circles!

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

> [!NOTE]
> **Daemon Architecture & Cloud Deployment:**  
> The Telegram bot and agent coordinator run as a **persistent background daemon** (grammY long-polling `bot.start()`, in-process Base Sepolia indexer, scheduled autonomous tick loop, and local SQLite database).  
> Serverless platforms like **Vercel** cannot run long-polling daemons or background intervals because serverless function invocations terminate after ~10–15 seconds and have ephemeral, read-only filesystems.  
> 
> ### 🚀 Free Render Deployment (Zero Credit Card)
> AjoClub includes an embedded HTTP health-check server (`GET /health`) in [`bot/index.ts`](bot/index.ts) and a pre-configured [`render.yaml`](render.yaml) blueprint:
> 1. In **[Render Dashboard](https://dashboard.render.com/)**, click **New + > Blueprint** and connect your AjoClub repository.
> 2. Render automatically reads [`render.yaml`](render.yaml) and sets up the Free Web Service.
> 3. Provide your secret keys in the Render web UI (`TELEGRAM_BOT_TOKEN`, `GEMINI_API_KEY`, `BASE_SEPOLIA_AGENT_KEY`).
> 4. **Keep-Alive Ping (Prevent Hibernation):** Free Render web services spin down after 15 minutes of inactivity. To keep your bot listening 24/7, set up a free monitor on **[UptimeRobot](https://uptimerobot.com/)** or **[cron-job.org](https://cron-job.org/)** to send a `GET` request to `https://your-service.onrender.com/health` every 5–10 minutes.
> 
> *(For permanent Linux VM hosting with guaranteed disk persistence, see the Oracle Cloud Always Free migration plan in `future_plans/`).*

---

## 🌐 Web Application (Base Sepolia + OnchainKit)

AjoClub provides a modern, responsive web application (`web/`) built with Next.js 14, React 18, Wagmi 2, and `@coinbase/onchainkit`:

> [!NOTE]
> **Wallet Connection Notice:**  
> Native Base (Coinbase Smart Wallet / passkey) connection is currently not functional due to the project being built and deployed on the **Base Sepolia testnet**. Users and reviewers should use **MetaMask** (or standard injected browser extension) connected to Base Sepolia instead.

### Key Features
- **Custom Multi-Wallet Connect Modal:** Streamlined wallet connection with dedicated MetaMask and Base options, live network-switching guard, and connected account dropdown with copy address and Basescan link. *(Note: Base native connection is temporarily unavailable on Base Sepolia testnet; please connect using MetaMask).*
- **In-App Base Sepolia ETH Faucet (`/faucet` & `/api/faucet`):** Instant 1-click testnet gas dispenser directly on the site providing 0.0001 Base Sepolia ETH with zero mainnet ETH required. Features onchain relayer transfer, 24-hour rate limiting, balance ceiling guardrails, and an embedded zero-mainnet alternative faucet hub (Superchain, Chainlink, Circle USDC).
- **Testnet USDC Faucet Helper & 1-Click Asset Watch:** Zero-friction testnet onboarding displaying live Base Sepolia USDC balance, 1-click token addition to wallet (`wallet_watchAsset`), and direct faucet access to Circle's Base Sepolia USDC faucet. Strictly conditional on testnet so no code changes are required when switching to Base Mainnet.
- **Visual ROSCA Payout Timeline & Turn Order Queue:** Interactive cycle timeline and member turn sequence on `/club/[id]` displaying completed round disbursements, active round spotlight with recipient identity, live countdown timer, and pot collection progress bar (`X of Y contributed`), with personalized "Your Turn" position indicators.
- **Coinbase Smart Wallet Passkeys:** 1-tap onboarding using biometric passkeys (FaceID / TouchID / Windows Hello) with zero seed-phrase friction.
- **Paymaster-Sponsored Gasless Contributions:** Uses ERC-5792 batched calls (`wallet_sendCalls`) via Coinbase Developer Platform (CDP) Paymaster to sponsor gas fees and execute token `approve` + `contribute` in a single atomic tap.
- **Basename & Identity Resolution:** Roster displays utilize OnchainKit's `<Identity>`, `<Avatar>`, `<Name>`, and `<Address>` components to automatically resolve member `.base.eth` names and verified avatars.
- **Injected Wallet Support:** Seamless fallback to standard browser wallets (MetaMask, Rainbow, Coinbase Wallet extension) with a robust 2-step approve & contribute flow.
- **Self Protocol Zero-Knowledge Identity Verification:** Complete Sybil-resistance gate on `/verify` integrating `@selfxyz/qrcode` for client-side biometric e-Passport NFC zero-knowledge proofs. Powered by a Next.js onchain relayer API (`/api/verify/self`) with live polling and a testnet developer fast-path for instant QA on Base Sepolia.
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

> [!NOTE]
> **Deterministic Local Execution (Zero Gas & Zero Funds Needed):**  
> All test suites below run entirely in local, self-contained environments (in-memory SQLite, local Hardhat network, and local Foundry EVM). You do **not** need a funded wallet, mainnet ETH, testnet gas, or live API keys to run any of these tests.

### Adversarial Security Test Suite (63 Tests)

Runs the comprehensive guardrail test suite verifying cap enforcement, rotation integrity, HITL approvals, allowlists, rate limiting, and identity linking:

```bash
npm run test:adversarial
```

### Smart Contract Unit Tests (Hardhat)

Runs the Hardhat Solidity contract unit tests covering round lifecycles, payments, cancellation refunds, collateral deposits, slashing distribution, protocol take-rates, and payout distributions (36 tests):

```bash
npm run test:contracts
```

### Stateful Invariant & Fuzz Testing (Foundry)

Enterprise-grade property-based and invariant testing using Foundry (`forge-std`), asserting mathematical safety under randomized multi-actor conditions:

| Category | Test | Specification & Invariant | Runs / Depth |
|:---|:---|:---|:---|
| **Invariant** | `invariant_solvency` | Escrow balance &ge; `totalDeposited - totalPaidOut` across all clubs | 500 runs &times; 100 depth (50k calls) |
| **Invariant** | `invariant_turnOrder` | No member receives payout disproportionate to their round share | 500 runs &times; 100 depth (50k calls) |
| **Invariant** | `invariant_strictAccounting` | No residual funds trapped in completed clubs (`hasPaid` fully cleared) | 500 runs &times; 100 depth (50k calls) |
| **Invariant** | `invariant_reentrancyGuard` | Reentrancy locks cannot be bypassed under malicious callback tokens | 500 runs &times; 100 depth (50k calls) |
| **Fuzz** | `testFuzz_fullLifecycle` | Parametric N-member cycles maintain exact zero residual balance upon completion | 10,000 runs |
| **Fuzz** | `testFuzz_partialDefault` | Random defaulter configurations correctly calculate reduced pots and grace timing | 10,000 runs |
| **Fuzz** | `testFuzz_reentrancyOnPayout` | Hostile ERC-20 with `armReentrancy()` hook fails reentrancy against payout transfer | 10,000 runs |

```bash
# Run Foundry invariant & fuzz test suite (dev profile: 500 runs x 100 depth)
npm run test:invariant

# Run extended CI profile (5,000 runs x 200 depth = 1M calls)
npm run test:invariant:ci
```

---

## 💰 Collateral Security Bond, Slashing, & Protocol Monetization

AjoClub features an onchain economic security model and sustainable protocol monetization:

1. **1× Upfront Collateral Bond**: Each verified member deposits an upfront security bond equal to exactly 1× round contribution upon joining a circle (`joinClub()`).
2. **1.0% Protocol Take-Rate (100 bps)**: Deducted automatically from every round pot when payouts are triggered (`triggerPayout()`) and routed to the protocol treasury (`feeRecipient`).
3. **90/10 Default Slashing Mechanism**: If a member fails to contribute before the grace period ends, their 1× collateral is automatically liquidated:
   - **90% of collateral** covers the missing contribution to keep the recipient's pot intact.
   - **10% of collateral** is collected as a protocol liquidation penalty by `feeRecipient`.
4. **100% Honest Member Refund**: Non-defaulted members withdraw their full collateral deposit upon circle completion via `claimCollateral(clubId)`.
5. **Live Earning Verification**: Revenue is tracked in real-time in SQLite and viewable directly via `/earnings` on Telegram. Mainnet deployment is strictly held until monetization is proven on Base Sepolia.

---

## 🔮 Future Roadmap & Architectural Evolution

Detailed roadmap documentation is cataloged in [`future_plans/`](future_plans/):
- **[01. Near-Term Core Improvements](future_plans/01_near_term_improvements.md)** — Event indexer, Basenames, automated keepers, Oracle Cloud VPS migration
- **[02. Product Expansion & Protocol Features](future_plans/02_product_expansion_and_features.md)** — Collateral bond & slashing, ERC-4626 vault yield, EAS credit attestations, PWA push alerts
- **[03. Ecosystem Distribution & Mini Apps](future_plans/03_ecosystem_and_distribution.md)** — Telegram Mini App (TMA), Farcaster Frames, autonomous coordinator
- **[04. Base Mainnet Production & Security](future_plans/04_mainnet_launch_and_security.md)** — Invariant fuzzing, external audit, Safe multi-sig, mainnet deployment

> [!IMPORTANT]
> **MANDATORY DIRECTIVE**:
> > **NONE OF THESE PLANS CAN BE CARRIED OUT WITHOUT APPROVAL OF THE MASTER (JOSEPH)**
> 
> Base Mainnet deployment will not proceed until protocol revenue and earning capabilities are conclusively proven on testnet.

---

## 🛡️ Security Audit & Bug Bounty (Phase 4.2)

AjoClub contracts are hardened with OpenZeppelin `ReentrancyGuard`, strict Checks-Effects-Interactions (CEI) state ordering, and mathematically verified across 50,000 stateful invariant calls.

- **Competitive Audit Scope**: [`audit/CONTEST_SCOPE.md`](audit/CONTEST_SCOPE.md) (Code4rena / Sherlock / Cantina ready)
- **Bug Bounty Program Policy**: [`audit/BUG_BOUNTY_POLICY.md`](audit/BUG_BOUNTY_POLICY.md) (Immunefi v2.2 framework, rewards up to $25,000)
- **Protocol Threat Model**: [`docs/threat_model.md`](docs/threat_model.md)
- **Formal Invariants Specification**: [`docs/formal_invariants_spec.md`](docs/formal_invariants_spec.md)
- **Technical Remediation Plan**: [`docs/audit_remediation_plan.md`](docs/audit_remediation_plan.md)

---

## 📜 License

MIT License. See [LICENSE](LICENSE) for details.
