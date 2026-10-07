# AjoClub — Immunefi Bug Bounty Program Policy

> **Platform Standard:** Immunefi v2.2 Bug Bounty Framework  
> **Program Status:** Active / Pre-Launch  
> **Target Asset:** AjoClub Smart Contracts on Base  

---

## 1. Program Overview

AjoClub invites security researchers and white-hat hackers to inspect our smart contracts and autonomous coordinator architecture. The goal of this program is to uncover vulnerabilities that could compromise protocol solvency, lead to theft or locking of user funds, or allow unauthorized execution of round disbursements.

---

## 2. Rewards by Severity

Rewards are distributed according to the **Immunefi Vulnerability Severity Classification System**:

| Severity | Payout Range (USD) | Max Payout (% of TVL at Risk) |
|:---|:---|:---|
| **Critical** | $10,000 – $25,000 | Up to 10% of affected TVL |
| **High** | $2,500 – $5,000 | Up to 5% of affected TVL |
| **Medium** | $1,000 | Flat reward |
| **Low** | $250 | Flat reward |

*Rewards are denominated and paid in native Base USDC or ETH.*

---

## 3. Scope & Target Assets

| Target Asset | Type | Location |
|:---|:---|:---|
| **AjoClub Smart Contract** | Smart Contract | [`contracts/src/AjoClub.sol`](../contracts/src/AjoClub.sol) |
| **Layer 4 Guardrail Engine** | TypeScript | [`agent/guardrails/`](../agent/guardrails/) |

---

## 4. Impacts in Scope

### Critical Severity
- Direct theft of user deposits or accumulated pot funds without prerequisite conditions.
- Permanent freezing or bricking of active circle funds (unrecoverable loss of capital).
- Insolvency manipulation where payout claims exceed deposited token reserves.

### High Severity
- Unauthorized round advancement or diversion of pot payouts to an arbitrary recipient.
- Circumvention of rotational turn order allowing a member to claim multiple payouts in a single lifecycle.
- Sybil bypass enabling a single physical identity to claim multiple circle slots with duplicate nullifiers.

### Medium Severity
- Griefing attacks causing temporary denial of service to round triggers without permanent loss of funds.
- Unbounded gas consumption causing transaction reverts under standard network parameters.

### Low Severity
- Minor state inconsistency that self-corrects without financial impact.
- Contract event omission or parameter misalignment affecting off-chain indexers.

---

## 5. Out of Scope

The following vulnerabilities are strictly excluded from reward eligibility:
- Attacks requiring physical access, compromised private keys of privileged roles, or social engineering.
- Theoretical issues without an executable Proof of Concept (PoC).
- Issues already cataloged in [`docs/threat_model.md`](../docs/threat_model.md) or [`docs/audit_preparation.md`](../docs/audit_preparation.md).
- Front-end bugs, RPC rate-limiting, or third-party infrastructure outages (e.g. Base sequencer pause).
- Zero-value or economic attacks requiring an unprofitable expenditure of capital greater than the potential extraction.

---

## 6. Submission Guidelines & SLA

- **Reporting Channel:** Submit detailed vulnerability reports with an executable Foundry PoC to `security@ajoclub.xyz` (or via the Immunefi dashboard once live).
- **First Response Time:** Within 24 hours of receipt.
- **Triage & Validation:** Within 48 hours.
- **Bounty Disbursement:** Within 7 business days following fix validation.
