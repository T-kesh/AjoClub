# AjoClub — Competitive Audit Contest Scope (Code4rena / Sherlock / Cantina)

> **Contest Title:** AjoClub Smart Contract Security Contest  
> **Repository:** https://github.com/T-kesh/AjoClub  
> **Primary Target:** [`contracts/src/AjoClub.sol`](../contracts/src/AjoClub.sol)  
> **Commit Hash:** Latest Master  
> **EVM Target:** `cancun` (Solidity `0.8.28`)  
> **Target Networks:** Base Mainnet (`8453`), Base Sepolia (`84532`)  

---

## 1. Protocol Summary

AjoClub is an autonomous, AI-orchestrated Rotating Savings and Credit Association (ROSCA / Esusu / Ajo) on Base. It modernizes informal communal savings groups by pairing non-custodial smart contracts with an autonomous AI agent coordinator.

### Core Lifecycle:
1. **Creation (`createClub`)**: A creator creates a club with parameters (`contribution`, `cycleDuration`, `gracePeriod`, `maxMembers`, `token`).
2. **Onboarding & Sybil Check (`joinClub`)**: Members join after verifying uniqueness via Self Protocol zero-knowledge passport proofs (preventing multiple accounts per identity).
3. **Execution (`startClub`, `contribute`)**: Once full, the club activates. In each cycle, all members contribute `contribution` amount in the allowed ERC-20 token (e.g. USDC).
4. **Round-Robin Payout (`triggerPayout`)**: When the cycle concludes and all members have paid (or the grace period expires with defaults marked), the accumulated pot is paid out to `members[currentRound]`, and the cycle automatically advances.
5. **Completion (`_advanceCycle`)**: When all members have taken their turn, the club reaches `COMPLETE`.
6. **Cancellation / Leave (`cancelClub`, `leaveClub`)**: Open clubs can be cancelled with refunds, and members can leave prior to start.

---

## 2. In-Scope Contracts

| Contract | File Path | nSLOC | Purpose | External Dependencies |
|:---|:---|:---|:---|:---|
| **AjoClub** | [`contracts/src/AjoClub.sol`](../contracts/src/AjoClub.sol) | ~265 | Main rotational savings, escrow, verification, and disbursement engine | OpenZeppelin (`IERC20`, `Ownable`, `ReentrancyGuard`), Self Protocol (`SelfVerificationRoot`) |

### Out-of-Scope Contracts
- `@selfxyz/contracts/*` (External audited dependency)
- `@openzeppelin/contracts/*` (Standard OpenZeppelin 5.0 libraries)
- Test harnesses and scripts in `contracts/test/` and `contracts/scripts/`

---

## 3. Privileged Roles & Trust Model

| Role | Controlled By | Capabilities | Security Boundary |
|:---|:---|:---|:---|
| **Owner** | Safe Multi-Sig / Deployer | `setAllowedToken(token, allowed)`, `setVerified(member, verified)` | Cannot withdraw funds, cannot alter active circle parameters, cannot modify member rosters. |
| **Club Creator** | End user EOA / Wallet | `createClub(...)`, `startClub(clubId)`, `cancelClub(clubId)` | Can only cancel while club is `OPEN`. Cannot cancel or withdraw once `ACTIVE`. |
| **Agent / Caller** | Autonomous Agent / Anyone | `triggerPayout(clubId)`, `markDefaulted(clubId)` | `triggerPayout` and `markDefaulted` are permissionless once timing/payment requirements are satisfied onchain. |
| **Club Member** | End user wallet | `joinClub`, `contribute`, `leaveClub` | Can contribute only once per cycle; can leave only while `OPEN`. |

---

## 4. Key Invariants & Properties to Assert

Auditors should focus on potential violations of these core invariants:

1. **Protocol Solvency**:
   `ERC20(token).balanceOf(AjoClub) >= sum(unpaid_contributions)` across all active clubs at any block height.
2. **Monotonic Turn Order**:
   No member can receive more than 1 pot disbursement per full circle rotation. The recipient of round $r$ must strictly be `members[r]`.
3. **Strict Accounting**:
   When `status == COMPLETE`, zero residual funds remain trapped, and all payment flags are false.
4. **Non-Custodial Invariance**:
   No administrative function (including `onlyOwner`) can transfer, seize, or divert member deposits.
5. **Reentrancy Immunity**:
   Callbacks via hostile tokens cannot drain escrow, re-enter payout, or manipulate roster state.

---

## 5. Known Issues & Accepted Trade-offs

Auditors should not submit findings for the following accepted architectural decisions:
1. **L2 Sequencer Timestamps**: The protocol uses `block.timestamp` for cycle deadlines (`>= 3600 seconds`). Minor sequencer drift (&plusmn;15 seconds) is accepted on Base L2.
2. **Push vs. Pull on Club Cancellation**: In `cancelClub`, the creator loop issues refunds. A planned migration to `claimRefund()` is cataloged in `docs/audit_remediation_plan.md`.
3. **Self Protocol Oracle Assumption**: The protocol trusts the Self Protocol verification hub (`0x6758c0c2...92977` on Base Mainnet) for zero-knowledge passport uniqueness.

---

## 6. How to Build & Run Tests

```bash
# Clone and setup
git clone https://github.com/T-kesh/AjoClub.git
cd AjoClub/contracts
npm install

# Run Hardhat unit test suite (30 tests)
npm run test

# Run Foundry stateful invariant & fuzz test suite (50,000 handler calls)
npm run test:invariant

# Run extended CI profile (5,000 runs x 200 depth = 1M calls)
npm run test:invariant:ci
```
