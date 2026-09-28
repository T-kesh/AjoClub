# AjoClub Agent — Colosseum Hackathon Demo Script (Base Track)

## Video Pitch & Demo Walkthrough (3 Minutes)

### 0:00 - 0:30 — The Hook & Problem Statement
- **Narrative**: Over 1 billion people worldwide rely on informal rotating savings clubs (*Ajo, Chama, Esusu, Tanda*). But human organizers face massive friction: chasing delinquent members, tracking contributions across chats, manual payouts, and social awkwardness around missed deadlines.
- **Solution**: **AjoClub Agent** — an autonomous AI Treasury Coordinator on Base that brings trustless rotating savings straight into Telegram with zero-friction Basenames, USDC payments, and deterministic safety guardrails.

---

### 0:30 - 1:00 — Architecture & Security Pitch (The Differentiator)
- **Show the 5-Layer Diagram**:
  ```
  1. Telegram UI (grammY) -> 2. Agent Core (Gemini / Claude Haiku) -> 3. Typed Tools -> 4. Guardrail Engine -> 5. Base Contracts
  ```
- **Key Safety Highlight**:
  > *"Notice Layer 4: The Guardrail Engine sits between the LLM and the blockchain. The agent proposes; the deterministic engine decides. Even if an attacker jailbreaks the agent via Telegram, prompt injection cannot bypass financial caps, cannot divert payouts, and cannot sign unauthorized transactions."*

---

### 1:00 - 2:00 — Live Demonstration
1. **Inspecting Circle Status (`/status`)**:
   - Show Telegram bot responding with the live circle report:
     - Basenames: `founder.base.eth`, `builder.base.eth`, `investor.base.eth`.
     - Round 1/3, Pot: 300 USDC, 100% collected.
2. **Contextual Payment Reminders (`/remind`)**:
   - Show the agent detecting that a member has not contributed and drafting an urgency-calibrated reminder.
   - Show the Anti-Spam Guardrail blocking duplicate spam attempts.
3. **Autonomous Cycle Tick & Human-in-the-Loop Payout (`/payout`)**:
   - The autonomous loop detects that the cycle duration has elapsed and all members contributed.
   - The agent calls `propose_payout`.
   - The organizer receives an interactive **Telegram Payout Approval Card** with `[✅ Approve Payout]` and `[❌ Reject]`.
4. **Instant Onchain Execution on Base**:
   - The organizer taps **Approve Payout**.
   - The gated `execute_payout` tool verifies the cryptographic approval token, executes the smart contract payout on Base, logs the immutable audit trail, and advances the circle to Round 2!

---

### 2:00 - 2:45 — Under the Hood & Tech Stack
- **Base Native**: Native USDC (6 decimals), Basescan verification, ready for Coinbase Smart Wallet & Basenames.
- **Contracts**: Solidity 0.8.28 with Cancun EVM, 30/30 unit tests passing.
- **Zero-Friction Local Run**: SQLite (zero Docker / zero database servers needed to test or evaluate).

---

### 2:45 - 3:00 — Vision & Roadmap
- Expanding to Coinbase Paymasters (gasless sponsored contributions).
- Direct peer-to-peer micro-credit scoring based on onchain Chama completion history.
- Built for the Colosseum Crypto World's Fair — Base Track.
