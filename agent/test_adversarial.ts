// ============================================================================
// AjoClub Guardrail Engine — Adversarial Test Harness
// ============================================================================
//
// Framework : node:test (built-in, Node >= 18, confirmed Node 24)
// Runner    : npm run test:adversarial   OR:
//             DATABASE_PATH=./db/ajo_test_adversarial.db npx tsx --test agent/test_adversarial.ts
// Chain     : FULLY MOCKED — chain.ts detects no AGENT_PRIVATE_KEY and no
//             AJO_CLUB_CONTRACT_ADDRESS, returning simulated mock hashes
// DB        : Isolated test-only SQLite file set via DATABASE_PATH env var.
//             The npm script uses cross-env to set this before tsx loads.
//             Production ajo.db is NEVER touched.
// Telegram  : NOT wired — guardrails are plain TypeScript, tested directly
//
// Scenarios
//  1. CAP BYPASS                (8 tests — including aggregate gap doc)
//  2. ROTATION INTEGRITY        (8 tests — wrong round, recipient, single-use consumed enforcement)
//  3. APPROVAL THRESHOLD        (9 tests — PENDING/expired/forged/cross-circle)
//  4. ALLOWLIST                 (9 tests — scam token, zero addr, fail-closed unset/malformed, fn-level gap)
//  5. RATE LIMITS               (7 tests — 50-call flood, scoping, reminder dedup, restart gap)
//  6. AUDIT LOG INTEGRITY       (7 tests — SECURITY_ALERT, TX_SUBMITTED, TOOL_CALL, deletion gap)
//  7. INPUT MALFORMATION        (11 tests — missing fields, SQL injection, bad types, bad enums)
//  8. IDENTITY LINKING ACCESS   (4 tests — member check, rejection, conflict rejection, multi-circle)
// ============================================================================

// ---------------------------------------------------------------------------
// 0. DB isolation
// ---------------------------------------------------------------------------
// DATABASE_PATH must be set to a test-only path BEFORE this process starts.
// The npm script `test:adversarial` does this via cross-env. If you run tsx
// directly, prefix the command with:
//   DATABASE_PATH=./db/ajo_test_adversarial.db tsx --test agent/test_adversarial.ts
//
// db/client.ts reads the env var at module evaluation time (line 8), so
// all repos and guardrails will use the test DB automatically.
// ---------------------------------------------------------------------------

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { rmSync, existsSync } from "node:fs";
import { resolve } from "node:path";

// Safety guard: refuse to run if DATABASE_PATH is not set to a test-specific path
if (!process.env.DATABASE_PATH || !process.env.DATABASE_PATH.includes("test_adversarial")) {
  console.error(
    "ERROR: DATABASE_PATH must be set to a test-specific path before running this harness.\n" +
    "  Use: npm run test:adversarial\n" +
    "  Or:  DATABASE_PATH=./db/ajo_test_adversarial.db tsx --test agent/test_adversarial.ts",
  );
  process.exit(1);
}

import { db } from "../db/client.js";
import {
  circlesRepo,
  membersRepo,
  approvalsRepo,
  auditRepo,
} from "../db/index.js";
import { initializeDatabase } from "../db/init.js";

// Initialise schema on the test DB file
initializeDatabase();

// Clean up the test DB file after all tests complete
// Note: the test DB file is left on disk after the run (SQLite is still open
// so rmSync would fail on Windows with EPERM). The next test run deletes it
// at process start via: if (existsSync(TEST_DB_PATH)) rmSync(TEST_DB_PATH)
// in the npm script's pre-test hook — or just leave it; it is overwritten.

import {
  validateCircleCaps,
  isTokenAllowed,
  isContractTargetAllowed,
  checkToolCallRateLimit,
  validatePayoutPrerequisites,
  requiresHumanApproval,
  verifyApprovalForExecution,
  DEFAULT_CAPS,
} from "./guardrails/index.js";

import { executeTool } from "./tools/index.js";

// ---------------------------------------------------------------------------
// Deterministic test addresses
// ---------------------------------------------------------------------------
const ADDR = {
  alice:    "0xaA00000000000000000000000000000000000001",
  bob:      "0xbB00000000000000000000000000000000000002",
  carol:    "0xCC00000000000000000000000000000000000003",
  outsider: "0xDd00000000000000000000000000000000000099",
};

// ---------------------------------------------------------------------------
// Helper: seed a standard ACTIVE circle with 3 members
// ---------------------------------------------------------------------------
function seedCircle(opts?: {
  contributionAmount?: string;
  cycleEndOffset?: number;
  gracePeriodSeconds?: number;
  status?: "OPEN" | "ACTIVE" | "COMPLETE" | "CANCELLED";
  alicePaid?: boolean;
  bobPaid?: boolean;
  carolPaid?: boolean;
}) {
  const o = {
    contributionAmount: opts?.contributionAmount ?? "50000000",
    cycleEndOffset:     opts?.cycleEndOffset     ?? -200,
    gracePeriodSeconds: opts?.gracePeriodSeconds  ?? 3600,
    status:             opts?.status              ?? "ACTIVE",
    alicePaid:          opts?.alicePaid           ?? true,
    bobPaid:            opts?.bobPaid             ?? true,
    carolPaid:          opts?.carolPaid           ?? true,
  };
  const now = Math.floor(Date.now() / 1000);
  const circle = circlesRepo.create({
    contract_circle_id:     Math.floor(Math.random() * 90000) + 10000,
    contract_address:       "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    name:                   `TC-${randomUUID().slice(0, 8)}`,
    token_address:          "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    token_symbol:           "USDC",
    token_decimals:         6,
    contribution_amount:    o.contributionAmount,
    cycle_duration_seconds: 7 * 24 * 3600,
    grace_period_seconds:   o.gracePeriodSeconds,
    max_members:            3,
    current_round:          0,
    cycle_end_timestamp:    now + o.cycleEndOffset,
    status:                 o.status as "OPEN" | "ACTIVE" | "COMPLETE" | "CANCELLED",
    creator_address:        ADDR.alice,
    telegram_chat_id:       null,
  });
  const add = (addr: string, order: number, paid: boolean) =>
    membersRepo.add({
      circle_id:              circle.id,
      wallet_address:         addr,
      basename:               null,
      telegram_user_id:       null,
      telegram_username:      null,
      payout_order:           order,
      has_paid_current_round: paid ? 1 : 0,
      total_contributed:      paid ? o.contributionAmount : "0",
      total_received:         "0",
      status:                 "ACTIVE",
    });
  return {
    circle,
    alice: add(ADDR.alice, 0, o.alicePaid),
    bob:   add(ADDR.bob,   1, o.bobPaid),
    carol: add(ADDR.carol, 2, o.carolPaid),
  };
}

// ---------------------------------------------------------------------------
// Helper: create an APPROVED approval record
// ---------------------------------------------------------------------------
function seedApproved(
  circleId: number,
  round: number,
  recipient: string,
  amount = "150.00",
): string {
  const id  = "req-" + randomUUID();
  const now = Math.floor(Date.now() / 1000);
  approvalsRepo.create({
    id,
    circle_id:            circleId,
    action_type:          "EXECUTE_PAYOUT",
    payload:              JSON.stringify({
      action: "EXECUTE_PAYOUT", circleId, round,
      recipientAddress: recipient.toLowerCase(), amountUsdc: amount,
    }),
    status:               "PENDING",
    requester:            "agent_core",
    reviewer_telegram_id: null,
    telegram_message_id:  null,
    expires_at:           now + 24 * 3600,
  });
  approvalsRepo.resolve(id, "APPROVED", "test-organizer");
  return id;
}

// ============================================================================
// 1. CAP BYPASS
// ============================================================================
describe("1. CAP BYPASS — validateCircleCaps()", () => {

  test("1a: Contribution at maxContributionUsdc (1000 USDC) is ALLOWED", () => {
    // Guardrail: caps.ts — boundary at max
    const r = validateCircleCaps(1000.0, 5, 7 * 24 * 3600, 3600);
    assert.equal(r.valid, true, `Valid at cap, got: ${r.reason}`);
  });

  test("1b: Contribution above maxContributionUsdc (1000.01 USDC) is REJECTED", () => {
    // Guardrail: caps.ts — > cap
    const r = validateCircleCaps(1000.01, 5, 7 * 24 * 3600, 3600);
    assert.equal(r.valid, false);
    assert.ok(
      r.reason?.toLowerCase().includes("exceed") || r.reason?.toLowerCase().includes("cap"),
      `Reason: "${r.reason}"`,
    );
  });

  test("1c: Contribution below minContributionUsdc (0.99 USDC) is REJECTED", () => {
    // Guardrail: caps.ts — < min
    const r = validateCircleCaps(0.99, 5, 7 * 24 * 3600, 3600);
    assert.equal(r.valid, false);
    assert.ok(
      r.reason?.toLowerCase().includes("minimum") || r.reason?.toLowerCase().includes("below"),
      `Reason: "${r.reason}"`,
    );
  });

  test("1d: Total pot (1000 USDC x 11 = 11,000) above maxTotalPotUsdc is REJECTED", () => {
    // Guardrail: caps.ts — potSize > 10,000
    const r = validateCircleCaps(1000.0, 11, 7 * 24 * 3600, 3600);
    assert.equal(r.valid, false);
    assert.ok(
      r.reason?.toLowerCase().includes("pot") || r.reason?.toLowerCase().includes("limit"),
      `Reason: "${r.reason}"`,
    );
  });

  test("1e: Total pot exactly at maxTotalPotUsdc (1000 x 10 = 10,000) is ALLOWED", () => {
    const r = validateCircleCaps(1000.0, 10, 7 * 24 * 3600, 3600);
    assert.equal(r.valid, true, `Valid at pot limit, got: ${r.reason}`);
  });

  test("1f: Cycle duration below minCycleSeconds (3599s < 1h) is REJECTED", () => {
    // Guardrail: caps.ts
    const r = validateCircleCaps(50, 5, 3599, 3600);
    assert.equal(r.valid, false);
    assert.ok(r.reason?.toLowerCase().includes("cycle"), `Reason: "${r.reason}"`);
  });

  test("1g: Grace period above maxGraceSeconds (14 days + 1s) is REJECTED", () => {
    // Guardrail: caps.ts
    const r = validateCircleCaps(50, 5, 7 * 24 * 3600, DEFAULT_CAPS.maxGraceSeconds + 1);
    assert.equal(r.valid, false);
    assert.ok(r.reason?.toLowerCase().includes("grace"), `Reason: "${r.reason}"`);
  });

  test("1h: [GAP] No aggregate daily cap — 20 per-circle payouts each pass individually", () => {
    // FINDING: validateCircleCaps checks per-circle parameters only.
    // There is no cross-circle or daily/weekly aggregate spend limit.
    // An attacker with organizer access could process N circles * M payouts.
    // Expected behaviour if an aggregate cap existed: fail after combined spend
    // exceeds threshold. Currently no such check exists.
    for (let i = 0; i < 20; i++) {
      assert.equal(validateCircleCaps(500, 2, 7 * 24 * 3600, 3600).valid, true);
    }
    console.log("    WARNING GAP: No aggregate daily/weekly payout cap across circles.");
  });
});

// ============================================================================
// 2. ROTATION INTEGRITY
// ============================================================================
describe("2. ROTATION INTEGRITY — validatePayoutPrerequisites()", () => {

  test("2a: Payout for round != current_round is REJECTED", () => {
    // Guardrail: approvals.ts — round mismatch
    const { circle } = seedCircle();
    const r = validatePayoutPrerequisites(circle.id, 1); // current=0
    assert.equal(r.valid, false);
    assert.ok(r.reason?.includes("does not match current circle round"), `Reason: "${r.reason}"`);
  });

  test("2b: Payout before cycle ends is REJECTED", () => {
    // Guardrail: approvals.ts — now < cycleEnd
    const { circle } = seedCircle({ cycleEndOffset: 9999 });
    const r = validatePayoutPrerequisites(circle.id, 0);
    assert.equal(r.valid, false);
    assert.ok(r.reason?.includes("Cycle has not ended yet"), `Reason: "${r.reason}"`);
  });

  test("2c: Correct round, all paid, past cycle + grace — prerequisites PASS", () => {
    // Guardrail: approvals.ts — all checks pass
    const { circle } = seedCircle({ gracePeriodSeconds: 1, cycleEndOffset: -200 });
    const r = validatePayoutPrerequisites(circle.id, 0);
    assert.equal(r.valid, true, `Failed: ${r.reason}`);
    assert.equal(r.expectedRecipient?.toLowerCase(), ADDR.alice.toLowerCase());
  });

  test("2d: Same approvalId cannot be replayed after being consumed (single-use enforcement)", async () => {
    // Guardrail: approvals.ts + execute_payout.ts — single-use consumed flag enforcement
    const { circle } = seedCircle({ gracePeriodSeconds: 1, cycleEndOffset: -200 });
    const approvalId = seedApproved(circle.id, 0, ADDR.alice);

    const first = verifyApprovalForExecution(approvalId, circle.id, 0, ADDR.alice);
    assert.equal(first.authorized, true);

    // Execute payout, consuming the approval atomically
    const execRes = await executeTool("execute_payout", { circleId: circle.id, round: 0, approvalId });
    assert.equal((execRes as any).success, true, `First execution should succeed: ${(execRes as any).error}`);

    // Replay attempt on verifyApprovalForExecution must be rejected
    const replay = verifyApprovalForExecution(approvalId, circle.id, 0, ADDR.alice);
    assert.equal(replay.authorized, false, "Replayed approval must be rejected (consumed_at set)");
    assert.ok(
      replay.reason?.toLowerCase().includes("consumed"),
      `Expected consumed reason, got: "${replay.reason}"`,
    );

    // Replay attempt on executeTool must also be blocked by the guardrail
    const replayExec = await executeTool("execute_payout", { circleId: circle.id, round: 0, approvalId });
    assert.equal((replayExec as any).success, false, "Replayed execute_payout must fail");
    assert.ok(
      (replayExec as any).error?.toLowerCase().includes("consumed"),
      `Expected consumed error, got: "${(replayExec as any).error}"`,
    );
  });

  test("2e: Approval with outsider recipient is REJECTED (recipient mismatch)", () => {
    // Guardrail: approvals.ts — payload.recipientAddress !== expectedRecipient
    const { circle } = seedCircle({ gracePeriodSeconds: 1, cycleEndOffset: -200 });
    const id = "req-" + randomUUID();
    const now = Math.floor(Date.now() / 1000);
    approvalsRepo.create({
      id, circle_id: circle.id, action_type: "EXECUTE_PAYOUT",
      payload: JSON.stringify({
        action: "EXECUTE_PAYOUT", circleId: circle.id, round: 0,
        recipientAddress: ADDR.outsider.toLowerCase(), amountUsdc: "150.00",
      }),
      status: "PENDING", requester: "agent_core",
      reviewer_telegram_id: null, telegram_message_id: null,
      expires_at: now + 3600,
    });
    approvalsRepo.resolve(id, "APPROVED", "attacker");

    const r = verifyApprovalForExecution(id, circle.id, 0, ADDR.alice);
    assert.equal(r.authorized, false);
    assert.ok(r.reason?.toLowerCase().includes("recipient"), `Reason: "${r.reason}"`);
  });

  test("2f: Payout blocked while grace period active with unpaid members", () => {
    // Guardrail: approvals.ts — now < graceEnd && payingMembers < members
    const { circle } = seedCircle({
      cycleEndOffset: -60, gracePeriodSeconds: 7200, bobPaid: false,
    });
    const r = validatePayoutPrerequisites(circle.id, 0);
    assert.equal(r.valid, false);
    assert.ok(
      r.reason?.toLowerCase().includes("grace period") ||
      r.reason?.toLowerCase().includes("haven't paid"),
      `Reason: "${r.reason}"`,
    );
  });

  test("2g: After grace expires with 1 payer, payout ALLOWED (partial pot)", () => {
    // Guardrail: approvals.ts — post-grace, >= 1 paying member suffices
    const { circle } = seedCircle({
      cycleEndOffset: -200, gracePeriodSeconds: 60,
      alicePaid: true, bobPaid: false, carolPaid: false,
    });
    const r = validatePayoutPrerequisites(circle.id, 0);
    assert.equal(r.valid, true, `Post-grace with 1 payer should pass: ${r.reason}`);
    assert.equal(r.payingMembersCount, 1);
  });

  test("2h: Consumed approval cannot be reused for a different payout in the same round", async () => {
    // Scenario: Approval is granted and consumed for Alice in round 0.
    // An attacker attempts to reuse that same approvalId to authorize a payout to Bob in the same round.
    const { circle } = seedCircle({ gracePeriodSeconds: 1, cycleEndOffset: -200 });
    const approvalId = seedApproved(circle.id, 0, ADDR.alice);

    // Consume approval once via execute_payout
    const firstExec = await executeTool("execute_payout", { circleId: circle.id, round: 0, approvalId });
    assert.equal((firstExec as any).success, true, `First execution should succeed: ${(firstExec as any).error}`);

    // Verify it is now consumed in DB
    const stored = approvalsRepo.getById(approvalId);
    assert.ok(stored?.consumed_at, "Approval record must have consumed_at timestamp populated");

    // Reset round to 0 to simulate active round state
    db.exec(`UPDATE circles SET current_round = 0 WHERE id = ${circle.id}`);

    // Attempt to reuse approval for Bob (different payout attempt in same round)
    const reuseCheck = verifyApprovalForExecution(approvalId, circle.id, 0, ADDR.bob);
    assert.equal(reuseCheck.authorized, false, "Consumed approval must not authorize different payout");
    assert.ok(
      reuseCheck.reason?.toLowerCase().includes("consumed"),
      `Reason must be consumed, got: "${reuseCheck.reason}"`,
    );

    // Attempting execution also blocked
    const reuseExec = await executeTool("execute_payout", { circleId: circle.id, round: 0, approvalId });
    assert.equal((reuseExec as any).success, false, "Execution must fail on consumed approval");
    assert.ok(
      (reuseExec as any).error?.toLowerCase().includes("consumed"),
      `Error must be consumed, got: "${(reuseExec as any).error}"`,
    );
  });
});

// ============================================================================
// 3. APPROVAL THRESHOLD
// ============================================================================
describe("3. APPROVAL THRESHOLD — requiresHumanApproval() + verifyApprovalForExecution()", () => {

  test("3a: requiresHumanApproval true at and above 50 USDC threshold", () => {
    // Guardrail: approvals.ts — >= AUTO_PAYOUT_THRESHOLD_USDC
    assert.equal(requiresHumanApproval(50.0),  true);
    assert.equal(requiresHumanApproval(50.01), true);
    assert.equal(requiresHumanApproval(1000),  true);
  });

  test("3b: requiresHumanApproval false below 50 USDC threshold", () => {
    // Guardrail: approvals.ts — < threshold
    assert.equal(requiresHumanApproval(49.99), false);
    assert.equal(requiresHumanApproval(1.0),   false);
  });

  test("3c: execute_payout blocked when approval status is PENDING", async () => {
    // Guardrail: execute_payout → verifyApprovalForExecution — must be APPROVED
    const { circle } = seedCircle({ gracePeriodSeconds: 1, cycleEndOffset: -200 });
    const id  = "req-" + randomUUID();
    const now = Math.floor(Date.now() / 1000);
    approvalsRepo.create({
      id, circle_id: circle.id, action_type: "EXECUTE_PAYOUT",
      payload: JSON.stringify({
        action: "EXECUTE_PAYOUT", circleId: circle.id, round: 0,
        recipientAddress: ADDR.alice.toLowerCase(), amountUsdc: "150.00",
      }),
      status: "PENDING", requester: "agent_core",
      reviewer_telegram_id: null, telegram_message_id: null,
      expires_at: now + 3600,
    });
    const r = await executeTool("execute_payout", { circleId: circle.id, round: 0, approvalId: id });
    assert.equal(r.success, false);
    assert.ok(
      r.error?.toLowerCase().includes("not approved") || r.error?.toLowerCase().includes("pending"),
      `Error: "${r.error}"`,
    );
  });

  test("3d: execute_payout SUCCEEDS after approval resolved to APPROVED", async () => {
    // Guardrail: execute_payout → verifyApprovalForExecution — happy path
    const { circle } = seedCircle({ gracePeriodSeconds: 1, cycleEndOffset: -200 });
    const approvalId = seedApproved(circle.id, 0, ADDR.alice);
    const r = await executeTool("execute_payout", { circleId: circle.id, round: 0, approvalId });
    assert.equal(r.success, true, `Should succeed with valid approval: ${r.error}`);
  });

  test("3e: Expired approval (expires_at in past) is REJECTED even if status=APPROVED", () => {
    // Guardrail: approvals.ts — now > expires_at
    const { circle } = seedCircle({ gracePeriodSeconds: 1, cycleEndOffset: -200 });
    const id  = "req-" + randomUUID();
    const past = Math.floor(Date.now() / 1000) - 3600;
    approvalsRepo.create({
      id, circle_id: circle.id, action_type: "EXECUTE_PAYOUT",
      payload: JSON.stringify({
        action: "EXECUTE_PAYOUT", circleId: circle.id, round: 0,
        recipientAddress: ADDR.alice.toLowerCase(), amountUsdc: "150.00",
      }),
      status: "PENDING", requester: "agent_core",
      reviewer_telegram_id: null, telegram_message_id: null,
      expires_at: past,
    });
    approvalsRepo.resolve(id, "APPROVED", "organizer");
    const r = verifyApprovalForExecution(id, circle.id, 0, ADDR.alice);
    assert.equal(r.authorized, false);
    assert.ok(r.reason?.toLowerCase().includes("expired"), `Reason: "${r.reason}"`);
  });

  test("3f: Cross-circle approval replay (wrong circleId in payload) is REJECTED", () => {
    // Guardrail: approvals.ts — payload.circleId !== circleId
    const { circle: c1 } = seedCircle({ gracePeriodSeconds: 1, cycleEndOffset: -200 });
    const { circle: c2 } = seedCircle({ gracePeriodSeconds: 1, cycleEndOffset: -200 });
    const approvalId = seedApproved(c1.id, 0, ADDR.alice);
    const r = verifyApprovalForExecution(approvalId, c2.id, 0, ADDR.alice);
    assert.equal(r.authorized, false);
    assert.ok(r.reason?.toLowerCase().includes("mismatch"), `Reason: "${r.reason}"`);
  });

  test("3g: Cross-round approval replay (correct circle, wrong round) is REJECTED", () => {
    // Guardrail: approvals.ts — payload.round !== round
    const { circle } = seedCircle({ gracePeriodSeconds: 1, cycleEndOffset: -200 });
    const approvalId = seedApproved(circle.id, 0, ADDR.alice);
    const r = verifyApprovalForExecution(approvalId, circle.id, 1, ADDR.bob);
    assert.equal(r.authorized, false);
    assert.ok(r.reason?.toLowerCase().includes("mismatch"), `Reason: "${r.reason}"`);
  });

  test("3h: REJECTED approval status is not authorized", () => {
    // Guardrail: approvals.ts — status check
    const { circle } = seedCircle({ gracePeriodSeconds: 1, cycleEndOffset: -200 });
    const id  = "req-" + randomUUID();
    const now = Math.floor(Date.now() / 1000);
    approvalsRepo.create({
      id, circle_id: circle.id, action_type: "EXECUTE_PAYOUT",
      payload: JSON.stringify({
        action: "EXECUTE_PAYOUT", circleId: circle.id, round: 0,
        recipientAddress: ADDR.alice.toLowerCase(), amountUsdc: "150.00",
      }),
      status: "PENDING", requester: "agent_core",
      reviewer_telegram_id: null, telegram_message_id: null,
      expires_at: now + 3600,
    });
    approvalsRepo.resolve(id, "REJECTED", "organizer");
    const r = verifyApprovalForExecution(id, circle.id, 0, ADDR.alice);
    assert.equal(r.authorized, false);
    assert.ok(
      r.reason?.toLowerCase().includes("rejected") || r.reason?.toLowerCase().includes("not approved"),
      `Reason: "${r.reason}"`,
    );
  });

  test("3i: Non-existent approvalId returns not-found rejection", () => {
    // Guardrail: approvals.ts — DB lookup fails
    const { circle } = seedCircle({ gracePeriodSeconds: 1, cycleEndOffset: -200 });
    const r = verifyApprovalForExecution("req-totally-fake", circle.id, 0, ADDR.alice);
    assert.equal(r.authorized, false);
    assert.ok(r.reason?.toLowerCase().includes("not found"), `Reason: "${r.reason}"`);
  });
});

// ============================================================================
// 4. ALLOWLIST
// ============================================================================
describe("4. ALLOWLIST — isTokenAllowed() + isContractTargetAllowed()", () => {

  test("4a: Arbitrary token on Base mainnet (chainId=8453) is REJECTED", () => {
    // Guardrail: allowlist.ts
    assert.equal(
      isTokenAllowed("0xdead000000000000000000000000000000000000", 8453),
      false,
    );
  });

  test("4b: Base mainnet USDC (0x833589…) is ALLOWED on chainId=8453", () => {
    assert.equal(isTokenAllowed("0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", 8453), true);
  });

  test("4c: Base Sepolia USDC (0x036CbD…) is ALLOWED on chainId=84532", () => {
    assert.equal(isTokenAllowed("0x036CbD53842c5426634e7929541eC2318f3dCF7e", 84532), true);
  });

  test("4d: Allowlist check is case-insensitive (uppercase address accepted)", () => {
    // Guardrail: allowlist.ts — .toLowerCase() normalisation
    const upper = "0x833589FCD6EDB6E08F4C7C32D4F71B54BDA02913";
    assert.equal(isTokenAllowed(upper, 8453), true);
  });

  test("4e: Mainnet USDC address is REJECTED on Sepolia context (wrong chain)", () => {
    // Guardrail: allowlist.ts — chainId selects the correct allowlist
    assert.equal(
      isTokenAllowed("0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", 84532),
      false,
    );
  });

  test("4f: Zero address is REJECTED as contract target", () => {
    // Guardrail: allowlist.ts — explicit exclusion
    assert.equal(
      isContractTargetAllowed("0x0000000000000000000000000000000000000000", 84532),
      false,
    );
  });

  test("4g: Unset AJO_CLUB_CONTRACT_ADDRESS fails closed (all contract targets rejected)", () => {
    // Guardrail: allowlist.ts — fail closed when AJO_CLUB_CONTRACT_ADDRESS is empty or unset
    const prev = process.env.AJO_CLUB_CONTRACT_ADDRESS;
    try {
      const arbitrary = "0xaBcD123456789012345678901234567890123456";

      // When undefined
      delete process.env.AJO_CLUB_CONTRACT_ADDRESS;
      assert.equal(
        isContractTargetAllowed(arbitrary, 84532),
        false,
        "Undefined AJO_CLUB_CONTRACT_ADDRESS must fail closed"
      );

      // When empty string
      process.env.AJO_CLUB_CONTRACT_ADDRESS = "";
      assert.equal(
        isContractTargetAllowed(arbitrary, 84532),
        false,
        "Empty AJO_CLUB_CONTRACT_ADDRESS must fail closed"
      );

      // When whitespace only
      process.env.AJO_CLUB_CONTRACT_ADDRESS = "   ";
      assert.equal(
        isContractTargetAllowed(arbitrary, 84532),
        false,
        "Whitespace AJO_CLUB_CONTRACT_ADDRESS must fail closed"
      );
    } finally {
      if (prev !== undefined) {
        process.env.AJO_CLUB_CONTRACT_ADDRESS = prev;
      } else {
        delete process.env.AJO_CLUB_CONTRACT_ADDRESS;
      }
    }
  });

  test("4h: [GAP] No function-level allowlist — any function on allowlisted contract can be called", () => {
    // FINDING: isContractTargetAllowed checks the target address but NOT the function
    // name. A compromised agent could call transferOwnership / renounceOwnership on
    // the AjoClub contract and the allowlist guard would not stop it.
    console.log(
      "    WARNING GAP: No isCallAllowed(address, functionName) guard.\n" +
      "    Any function on the allowlisted AjoClub contract is reachable by the agent.",
    );
    assert.ok(true, "Gap documented — no function-level allowlist");
  });

  test("4i: Malformed AJO_CLUB_CONTRACT_ADDRESS fails closed (all targets rejected)", () => {
    // Guardrail: allowlist.ts — fail closed when AJO_CLUB_CONTRACT_ADDRESS is malformed
    const prev = process.env.AJO_CLUB_CONTRACT_ADDRESS;
    try {
      const validTarget = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

      // Short hex (wrong length)
      process.env.AJO_CLUB_CONTRACT_ADDRESS = "0xDEAD";
      assert.equal(
        isContractTargetAllowed(validTarget, 84532),
        false,
        "Short hex address in env must fail closed"
      );

      // Non-hex characters
      process.env.AJO_CLUB_CONTRACT_ADDRESS = "not-a-valid-hex-contract-address";
      assert.equal(
        isContractTargetAllowed(validTarget, 84532),
        false,
        "Non-hex address in env must fail closed"
      );

      // Zero address
      process.env.AJO_CLUB_CONTRACT_ADDRESS = "0x0000000000000000000000000000000000000000";
      assert.equal(
        isContractTargetAllowed(validTarget, 84532),
        false,
        "Zero address in env must fail closed"
      );
    } finally {
      if (prev !== undefined) {
        process.env.AJO_CLUB_CONTRACT_ADDRESS = prev;
      } else {
        delete process.env.AJO_CLUB_CONTRACT_ADDRESS;
      }
    }
  });
});

// ============================================================================
// 5. RATE LIMITS
// ============================================================================
describe("5. RATE LIMITS — checkToolCallRateLimit() + send_reminder dedup", () => {

  test("5a: 25 rapid tool calls exceed 20/min limit — 25th call is BLOCKED", () => {
    // Guardrail: rate_limits.ts — MAX_CALLS_PER_MINUTE = 20, sliding window
    const cid = 99_001;
    let last = { allowed: true, reason: undefined as string | undefined };
    for (let i = 0; i < 25; i++) last = checkToolCallRateLimit(cid, "get_circle_status");
    assert.equal(last.allowed, false, "25th call must be rate-limited");
    assert.ok(last.reason?.toLowerCase().includes("rate limit"), `Reason: "${last.reason}"`);
  });

  test("5b: Rate limit is per (circleId, toolName) — exhausting one tool doesn't block another", () => {
    // Guardrail: rate_limits.ts — key = circleId:toolName
    const cid = 99_002;
    for (let i = 0; i < 25; i++) checkToolCallRateLimit(cid, "get_circle_status");
    assert.equal(checkToolCallRateLimit(cid, "send_reminder").allowed, true);
  });

  test("5c: Rate limit is per circleId — exhausting circle A doesn't block circle B", () => {
    const tool = "propose_payout";
    for (let i = 0; i < 25; i++) checkToolCallRateLimit(99_003, tool);
    assert.equal(checkToolCallRateLimit(99_004, tool).allowed, true);
  });

  test("5d: 50 rapid calls blocked at least 30 times (flood test)", () => {
    // Guardrail: rate_limits.ts — in-memory sliding window
    let blocked = 0;
    for (let i = 0; i < 50; i++) {
      if (!checkToolCallRateLimit(99_005, "execute_payout").allowed) blocked++;
    }
    assert.ok(blocked >= 30, `Expected >=30 blocked out of 50, got ${blocked}`);
  });

  test("5e: Duplicate reminder (same circle/round/member/type) is BLOCKED", async () => {
    // Guardrail: send_reminder.ts → checkReminderRateLimit → remindersRepo.hasSent()
    const { circle } = seedCircle({ bobPaid: false });
    const r1 = await executeTool("send_reminder", {
      circleId: circle.id, memberAddress: ADDR.bob, reminderType: "DUE_48H",
    });
    assert.equal(r1.success, true, `First reminder should succeed: ${r1.error}`);

    const r2 = await executeTool("send_reminder", {
      circleId: circle.id, memberAddress: ADDR.bob, reminderType: "DUE_48H",
    });
    assert.equal(r2.success, false, "Duplicate must be blocked");
    assert.ok(
      r2.error?.toLowerCase().includes("already sent") ||
      r2.error?.toLowerCase().includes("rate limit"),
      `Error: "${r2.error}"`,
    );
  });

  test("5f: Different reminder type for same member is ALLOWED (DUE_48H then DUE_SOON)", async () => {
    // Guardrail: rate_limits.ts — key includes reminderType
    const { circle } = seedCircle({ carolPaid: false });
    await executeTool("send_reminder", {
      circleId: circle.id, memberAddress: ADDR.carol, reminderType: "DUE_48H",
    });
    const r2 = await executeTool("send_reminder", {
      circleId: circle.id, memberAddress: ADDR.carol, reminderType: "DUE_SOON",
    });
    assert.equal(r2.success, true, "Different type must be allowed");
  });

  test("5g: [GAP] In-memory tool-call rate limit resets on process restart", () => {
    // FINDING: checkToolCallRateLimit uses a module-level Map<string,number[]>.
    // A crash+restart resets the map, enabling rate-limit bypass.
    // The per-reminder rate limit IS durable (SQLite via remindersRepo).
    console.log(
      "    WARNING GAP: checkToolCallRateLimit uses in-memory state.\n" +
      "    Process restart resets the sliding window — bypass via crash/restart.",
    );
    assert.ok(true, "Gap documented");
  });
});

// ============================================================================
// 6. AUDIT LOG INTEGRITY
// ============================================================================
describe("6. AUDIT LOG INTEGRITY — recordAuditLog() + auditRepo", () => {

  test("6a: Blocked execute_payout writes CRITICAL SECURITY_ALERT audit entry", async () => {
    // Guardrail: execute_payout.ts → GuardrailEngine.audit('SECURITY_ALERT',…,'CRITICAL')
    const { circle } = seedCircle({ gracePeriodSeconds: 1, cycleEndOffset: -200 });
    const before = auditRepo.getRecent(1000).length;
    const r = await executeTool("execute_payout", {
      circleId: circle.id, round: 0, approvalId: "req-fake-id",
    });
    assert.equal(r.success, false);
    const after  = auditRepo.getRecent(1000);
    const newOnes = after.slice(0, after.length - before);
    const alert   = newOnes.find((e) => e.event_type === "SECURITY_ALERT");
    assert.ok(alert, "SECURITY_ALERT must be written for blocked payout");
    assert.equal(alert!.severity, "CRITICAL");
  });

  test("6b: Successful execute_payout writes TX_SUBMITTED with txHash, circleId, recipientAddress", async () => {
    // Guardrail: execute_payout.ts → GuardrailEngine.audit('TX_SUBMITTED',…)
    const { circle } = seedCircle({ gracePeriodSeconds: 1, cycleEndOffset: -200 });
    const approvalId = seedApproved(circle.id, 0, ADDR.alice);
    const before = auditRepo.getRecent(1000).length;
    const r = await executeTool("execute_payout", { circleId: circle.id, round: 0, approvalId });
    assert.equal(r.success, true, `Should succeed: ${r.error}`);
    const after   = auditRepo.getRecent(1000);
    const newOnes  = after.slice(0, after.length - before);
    const tx       = newOnes.find((e) => e.event_type === "TX_SUBMITTED");
    assert.ok(tx, "TX_SUBMITTED must be logged");
    const d = JSON.parse(tx!.details);
    assert.ok(d.txHash,           "Audit must contain txHash");
    assert.ok(d.circleId          !== undefined, "Audit must contain circleId");
    assert.ok(d.recipientAddress  !== undefined, "Audit must contain recipientAddress");
  });

  test("6c: send_reminder writes TOOL_CALL with tool, circleId, reminderType", async () => {
    // Guardrail: send_reminder.ts → GuardrailEngine.audit('TOOL_CALL',…)
    const { circle } = seedCircle({ carolPaid: false });
    const before = auditRepo.getRecent(1000).length;
    const r = await executeTool("send_reminder", {
      circleId: circle.id, memberAddress: ADDR.carol, reminderType: "DUE_24H",
    });
    assert.equal(r.success, true);
    const after   = auditRepo.getRecent(1000);
    const newOnes  = after.slice(0, after.length - before);
    const entry    = newOnes.find((e) => e.event_type === "TOOL_CALL");
    assert.ok(entry, "TOOL_CALL must be logged for send_reminder");
    const d = JSON.parse(entry!.details);
    assert.equal(d.tool, "send_reminder");
    assert.ok(d.circleId     !== undefined);
    assert.ok(d.reminderType !== undefined);
  });

  test("6d: get_circle_status writes a TOOL_CALL audit entry", async () => {
    const { circle } = seedCircle();
    const before = auditRepo.getRecent(1000).length;
    await executeTool("get_circle_status", { circleId: circle.id });
    const after   = auditRepo.getRecent(1000);
    const newOnes  = after.slice(0, after.length - before);
    assert.ok(newOnes.some((e) => e.event_type === "TOOL_CALL"), "TOOL_CALL must be logged");
  });

  test("6e: flag_default writes WARN SECURITY_ALERT with delinquentMember and reason", async () => {
    // Guardrail: flag_default.ts → GuardrailEngine.audit('SECURITY_ALERT',…,'WARN')
    const { circle } = seedCircle({
      cycleEndOffset: -7200, gracePeriodSeconds: 60, alicePaid: false,
    });
    const before = auditRepo.getRecent(1000).length;
    const r = await executeTool("flag_default", {
      circleId: circle.id, memberAddress: ADDR.alice, reason: "adversarial-test",
    });
    assert.equal(r.success, true, `flag_default should succeed: ${r.error}`);
    const after   = auditRepo.getRecent(1000);
    const newOnes  = after.slice(0, after.length - before);
    const alert    = newOnes.find((e) => e.event_type === "SECURITY_ALERT");
    assert.ok(alert, "flag_default must write SECURITY_ALERT");
    assert.equal(alert!.severity, "WARN");
    const d = JSON.parse(alert!.details);
    assert.ok(d.delinquentMember !== undefined, "Must record delinquent wallet");
    assert.ok(d.reason           !== undefined, "Must record reason");
  });

  test("6f: TX_SUBMITTED audit entry is scoped to the correct circle_id", async () => {
    const { circle } = seedCircle({ gracePeriodSeconds: 1, cycleEndOffset: -200 });
    const approvalId = seedApproved(circle.id, 0, ADDR.alice);
    await executeTool("execute_payout", { circleId: circle.id, round: 0, approvalId });
    const logs   = auditRepo.getRecent(50);
    const scoped = logs.filter((e) => e.circle_id === circle.id && e.event_type === "TX_SUBMITTED");
    assert.ok(scoped.length > 0, "TX_SUBMITTED must be scoped to the circle");
    assert.equal(scoped[0]!.circle_id, circle.id);
  });

  test("6g: [GAP] Audit log has no delete protection at the application layer", () => {
    // FINDING: audit_log has no SQL trigger preventing DELETE. A single
    // db.exec("DELETE FROM audit_log") call would silently erase the entire
    // audit trail. No write-only connection or append-only trigger exists.
    console.log(
      "    WARNING GAP: No application-layer protection prevents audit log deletion.\n" +
      "    Recommend: dedicated write-only audit DB connection or BEFORE DELETE trigger.",
    );
    assert.ok(true, "Gap documented");
  });
});

// ============================================================================
// 7. INPUT MALFORMATION
// ============================================================================
describe("7. INPUT MALFORMATION — Zod schema validation before guardrails run", () => {

  test("7a: send_reminder with missing memberAddress fails Zod (not a crash)", async () => {
    // Guardrail: sendReminderSchema — required field
    const r = await executeTool("send_reminder", { circleId: 1, reminderType: "DUE_24H" });
    assert.equal(r.success, false);
    assert.ok(r.error, "Error must be present");
    assert.ok(
      r.error!.toLowerCase().includes("required") ||
      r.error!.toLowerCase().includes("invalid_type") ||
      r.error!.toLowerCase().includes("expected"),
      `Error: "${r.error}"`,
    );
  });

  test("7b: send_reminder with malformed wallet address fails Zod regex", async () => {
    // Guardrail: sendReminderSchema — /^0x[a-fA-F0-9]{40}$/
    const r = await executeTool("send_reminder", {
      circleId: 1, memberAddress: "not-an-address", reminderType: "DUE_24H",
    });
    assert.equal(r.success, false);
    assert.ok(
      r.error?.toLowerCase().includes("invalid") ||
      r.error?.toLowerCase().includes("regex") ||
      r.error?.toLowerCase().includes("string"),
      `Error: "${r.error}"`,
    );
  });

  test("7c: send_reminder with short hex address (38 chars) fails Zod regex", async () => {
    // Guardrail: sendReminderSchema — regex requires exactly 40 hex chars after 0x
    const r = await executeTool("send_reminder", {
      circleId: 1, memberAddress: "0x" + "a".repeat(38), reminderType: "DUE_24H",
    });
    assert.equal(r.success, false);
  });

  test("7d: execute_payout with string circleId ('abc') fails Zod z.number().int()", async () => {
    // Guardrail: executePayoutSchema — type coercion attack
    const r = await executeTool("execute_payout", { circleId: "abc", round: 0, approvalId: "x" });
    assert.equal(r.success, false);
    assert.ok(r.error, "Zod type error expected");
  });

  test("7e: propose_payout with negative round (-1) ultimately fails", async () => {
    // Guardrail: proposePayoutSchema — z.number().int() accepts negatives (gap)
    const r = await executeTool("propose_payout", { circleId: 1, round: -1 });
    if (r.success) {
      console.log(
        "    WARNING GAP: proposePayoutSchema accepts negative round.\n" +
        "    Add .nonnegative() or .min(0) to the Zod round field.",
      );
    } else {
      console.log("    INFO: Negative round rejected by Zod or business logic.");
    }
    // Net result must be failure — no circle has round -1
    assert.equal(r.success, false, "Negative round must be rejected");
  });

  test("7f: flag_default with missing memberAddress fails Zod validation", async () => {
    // Guardrail: flagDefaultSchema — required field
    const r = await executeTool("flag_default", { circleId: 1 });
    assert.equal(r.success, false);
    assert.ok(r.error);
  });

  test("7g: flag_default with SQL injection string fails Zod regex (not executed)", async () => {
    // Guardrail: flagDefaultSchema — /^0x[a-fA-F0-9]{40}$/ blocks SQL injection
    const r = await executeTool("flag_default", {
      circleId: 1, memberAddress: "'; DROP TABLE members; --",
    });
    assert.equal(r.success, false);
    assert.ok(
      r.error?.toLowerCase().includes("invalid") ||
      r.error?.toLowerCase().includes("regex") ||
      r.error?.toLowerCase().includes("string"),
      `Error: "${r.error}"`,
    );
  });

  test("7h: execute_payout with missing approvalId fails Zod validation", async () => {
    // Guardrail: executePayoutSchema — approvalId is required
    const r = await executeTool("execute_payout", { circleId: 1, round: 0 });
    assert.equal(r.success, false);
    assert.ok(r.error);
  });

  test("7i: get_circle_status with float circleId (1.5) fails Zod z.number().int()", async () => {
    // Guardrail: getCircleStatusSchema — .int() rejects non-integers
    const r = await executeTool("get_circle_status", { circleId: 1.5 });
    assert.equal(r.success, false);
    assert.ok(r.error);
  });

  test("7j: send_reminder with unknown reminderType ('SPAM_NOW') fails Zod z.enum()", async () => {
    // Guardrail: sendReminderSchema — z.enum([...])
    const r = await executeTool("send_reminder", {
      circleId: 1, memberAddress: ADDR.alice, reminderType: "SPAM_NOW",
    });
    assert.equal(r.success, false);
    assert.ok(
      r.error?.toLowerCase().includes("invalid") || r.error?.toLowerCase().includes("enum"),
      `Error: "${r.error}"`,
    );
  });

  test("7k: [GAP] contribution_amount stored as raw string — no Zod sign enforcement upstream", () => {
    // FINDING: contribution_amount is TEXT in SQLite with no upstream Zod schema.
    // caps.ts catches negative values via the minContributionUsdc check, BUT only
    // if the caller correctly converts the string to a float before calling
    // validateCircleCaps. A caller that passes the raw string to caps incorrectly
    // could bypass the check.
    const r = validateCircleCaps(-50, 3, 3600, 3600);
    assert.equal(r.valid, false, "caps.ts must catch negative contribution");
    console.log(
      "    WARNING GAP: No Zod schema on circle creation prevents negative contribution_amount strings.\n" +
      "    caps.ts catches it only if caller converts string → number correctly.",
    );
  });
});

// ============================================================================
// 8. IDENTITY LINKING ACCESS CONTROL — membersRepo.linkWallet()
// ============================================================================
describe("8. IDENTITY LINKING ACCESS CONTROL — membersRepo.linkWallet()", () => {
  test("8a: Linking a real circle member's address succeeds", () => {
    const { circle } = seedCircle();
    const addr = "0x1111000000000000000000000000000000000001";
    membersRepo.add({
      circle_id: circle.id,
      wallet_address: addr,
      basename: "alice8a.base.eth",
      telegram_user_id: null,
      telegram_username: null,
      payout_order: 3,
      has_paid_current_round: 0,
      total_contributed: "0",
      total_received: "0",
      status: "ACTIVE",
    });

    const result = membersRepo.linkWallet(addr, "tg-user-111", "alice_crypto");
    assert.equal(result.success, true);
    assert.ok(result.circlesLinked && result.circlesLinked >= 1);

    const member = membersRepo.getByWallet(circle.id, addr);
    assert.equal(member?.telegram_user_id, "tg-user-111");
    assert.equal(member?.telegram_username, "alice_crypto");
  });

  test("8b: Linking a random/non-member address is rejected", () => {
    const nonMember = "0x9999000000000000000000000000000000000099";
    const result = membersRepo.linkWallet(nonMember, "tg-user-999", "outsider");
    assert.equal(result.success, false);
    assert.equal(result.error, "NOT_A_MEMBER");
    assert.ok(result.message.includes("not enrolled in any circles"));
  });

  test("8c: Linking an address already linked to a different Telegram user is rejected", () => {
    const { circle } = seedCircle();
    const addr = "0x3333000000000000000000000000000000000003";
    membersRepo.add({
      circle_id: circle.id,
      wallet_address: addr,
      basename: "alice8c.base.eth",
      telegram_user_id: null,
      telegram_username: null,
      payout_order: 3,
      has_paid_current_round: 0,
      total_contributed: "0",
      total_received: "0",
      status: "ACTIVE",
    });

    // Legitimate user links their wallet
    const firstResult = membersRepo.linkWallet(addr, "tg-user-legit", "alice_real");
    assert.equal(firstResult.success, true);

    // Impersonator / attacker tries to link the same address with a different Telegram ID
    const attackResult = membersRepo.linkWallet(addr, "tg-user-attacker", "impersonator");
    assert.equal(attackResult.success, false);
    assert.equal(attackResult.error, "ALREADY_LINKED_TO_OTHER");
    assert.ok(attackResult.message.includes("already linked to another Telegram account"));

    // Ensure the original link is preserved and not overwritten
    const member = membersRepo.getByWallet(circle.id, addr);
    assert.equal(member?.telegram_user_id, "tg-user-legit");
    assert.equal(member?.telegram_username, "alice_real");
  });

  test("8d: The same address linking across multiple circles they belong to works without needing to relink each time", () => {
    const multAddr = "0x8888000000000000000000000000000000000088";
    const { circle: circleA } = seedCircle();
    const { circle: circleB } = seedCircle();

    // Enroll multAddr in Circle A
    membersRepo.add({
      circle_id: circleA.id,
      wallet_address: multAddr,
      basename: "multi.base.eth",
      telegram_user_id: null,
      telegram_username: null,
      payout_order: 3,
      has_paid_current_round: 0,
      total_contributed: "0",
      total_received: "0",
      status: "ACTIVE",
    });

    // Enroll multAddr in Circle B
    membersRepo.add({
      circle_id: circleB.id,
      wallet_address: multAddr,
      basename: "multi.base.eth",
      telegram_user_id: null,
      telegram_username: null,
      payout_order: 3,
      has_paid_current_round: 0,
      total_contributed: "0",
      total_received: "0",
      status: "ACTIVE",
    });

    // Perform one-time linking
    const result = membersRepo.linkWallet(multAddr, "tg-user-multi", "multi_member");
    assert.equal(result.success, true);
    assert.equal(result.circlesLinked, 2);

    // Check both circles reflect the linked Telegram ID
    const memberA = membersRepo.getByWallet(circleA.id, multAddr);
    const memberB = membersRepo.getByWallet(circleB.id, multAddr);
    assert.equal(memberA?.telegram_user_id, "tg-user-multi");
    assert.equal(memberB?.telegram_user_id, "tg-user-multi");
  });
});


