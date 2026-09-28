# AjoClub Agent — System Specification

> Autonomous AI-orchestrated Rotating Savings Clubs (Ajo/Chama) on Base

## Overview

AjoClub Agent is an autonomous coordination agent for onchain Rotating Savings and Credit Associations (ROSCAs). Traditional informal savings groups suffer from high coordination friction: organizers must track contributions, remind late payers, manage payouts, and deal with defaults manually.

AjoClub Agent automates this through Telegram and an autonomous LLM loop, while enforcing deterministic, non-custodial guardrails on the Base blockchain.

---

## 5-Layer Architecture

```
┌─────────────────────────────────────────────────────────┐
│  MEMBERS (Telegram)          ORGANIZER (Telegram/web)    │
└───────────────┬──────────────────────────┬──────────────┘
                │ messages                 │ approvals, config
                ▼                          ▼
┌─────────────────────────────────────────────────────────┐
│  1. MESSAGING LAYER  (grammY / Telegram Bot API)         │
│     inbound parsing, outbound reminders, approval cards  │
└───────────────┬─────────────────────────────────────────┘
                ▼
┌─────────────────────────────────────────────────────────┐
│  2. AGENT CORE  (LLM via adapter: Gemini ↔ Haiku)        │
│     reads circle state → picks a tool → drafts message   │
│     NEVER signs or sends funds directly                  │
└───────────────┬─────────────────────────────────────────┘
                ▼
┌─────────────────────────────────────────────────────────┐
│  3. TOOL LAYER  (typed, permissioned functions)          │
│     get_circle_status · send_reminder · flag_default     │
│     propose_payout · execute_payout (gated)              │
└───────────────┬─────────────────────────────────────────┘
                ▼
┌─────────────────────────────────────────────────────────┐
│  4. GUARDRAIL ENGINE  (plain code, no LLM)              │
│     per-circle caps · approval threshold · rate limits   │
│     allowlisted contract calls · audit log               │
└───────────────┬─────────────────────────────────────────┘
                ▼
┌─────────────────────────────────────────────────────────┐
│  5. CHAIN LAYER  (viem + Base)                           │
│     AjoClub contracts · USDC · event indexer             │
└─────────────────────────────────────────────────────────┘
```

---

## Layer Definitions

### 1. Messaging Layer (`bot/`)
- Powered by `grammY`.
- Group chat commands (`/status`, `/myround`, `/help`).
- Private messaging with members for payment reminders with deep payment links.
- Interactive Approval Cards with Telegram inline keyboard buttons sent to the Organizer for payout and administrative authorizations.

### 2. Agent Core (`agent/`)
- Dual LLM Adapter: Gemini (`gemini-2.0-flash` / `gemini-1.5-flash`) and Anthropic (`claude-3-haiku`).
- Autonomous loop (`agent/loop.ts`):
  - **Scheduled ticks**: Periodic checks for upcoming deadlines, due payments, and round transitions.
  - **Event-driven runs**: Immediate reactions to indexed onchain events (`ContributionMade`, `MemberJoined`, `PayoutSent`).
- Responsible for reasoning and communication drafting. **Invariant**: LLM never holds private keys or issues un-gated blockchain writes.

### 3. Tool Layer (`agent/tools/`)
- Type-safe tools declared with `zod`.
- Tools:
  - `get_circle_status(circleId)`
  - `send_reminder(circleId, memberAddress, reminderType)`
  - `flag_default(circleId, memberAddress)`
  - `propose_payout(circleId, round)`
  - `execute_payout(circleId, round, approvalId)`

### 4. Guardrail Engine (`agent/guardrails/`)
- Pure deterministic code without LLM dependencies.
- **Caps Engine (`caps.ts`)**: Enforces maximum pot sizes and single-cycle caps.
- **Approval Gate (`approvals.ts`)**: Dispatches Human-in-the-Loop approval requests for sensitive actions.
- **Rate Limiter (`rate_limits.ts`)**: Deduces reminder frequency and spam prevention.
- **Allowlist (`allowlist.ts`)**: Enforces contract addresses (AjoClub on Base, Base USDC).
- **Audit Logger (`audit.ts`)**: Structured SQLite audit records for all decisions and checks.

### 5. Chain Layer (`contracts/`, `indexer/`)
- Smart contracts deployed on **Base Sepolia** / **Base Mainnet**.
- Token: Native **USDC** (6 decimals).
- `viem` client handles contract calls, account abstraction / paymaster sponsorships, and event indexing into SQLite.
