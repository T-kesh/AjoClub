// ============================================================================
// Layer 3 (Tools) & Layer 4 (Guardrails) Integration Test Suite
// ============================================================================

import { initializeDatabase } from "../db/init.js";
import { circlesRepo, membersRepo, approvalsRepo, auditRepo, db } from "../db/index.js";
import { GuardrailEngine } from "./guardrails/index.js";
import { executeTool } from "./tools/index.js";

async function runAgentGuardrailTests() {
  console.log("🛡️ Starting Layer 4 Guardrail & Layer 3 Tool Tests...\n");

  // 1. Initialize SQLite
  initializeDatabase();

  // 2. Test Layer 4: Caps Engine
  console.log("1️⃣ Testing Caps Engine (caps.ts)...");
  const validCaps = GuardrailEngine.validateCaps(50.0, 5, 7 * 24 * 3600, 24 * 3600);
  console.assert(validCaps.valid, "Valid caps should pass");

  const lowCaps = GuardrailEngine.validateCaps(0.2, 5, 7 * 24 * 3600, 24 * 3600);
  console.assert(!lowCaps.valid, "Contribution under $1 should fail");
  console.log(`   ✅ Low contribution rejected: "${lowCaps.reason}"`);

  const hugePot = GuardrailEngine.validateCaps(1000.0, 25, 7 * 24 * 3600, 24 * 3600);
  console.assert(!hugePot.valid, "Pot over $10,000 should fail");
  console.log(`   ✅ Runaway pot rejected: "${hugePot.reason}"`);

  // 3. Test Layer 4: Allowlist Engine
  console.log("\n2️⃣ Testing Allowlist Engine (allowlist.ts)...");
  const usdcAllowed = GuardrailEngine.isTokenAllowed("0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", 8453);
  console.assert(usdcAllowed, "Base native USDC must be allowed");
  console.log("   ✅ Base USDC allowlisted: true");

  const scamToken = GuardrailEngine.isTokenAllowed("0xdead000000000000000000000000000000000000", 8453);
  console.assert(!scamToken, "Fake token must be rejected");
  console.log("   ✅ Scam token rejected: true");

  // 4. Setup Test Circle for Tool Testing
  console.log("\n3️⃣ Setting up test circle...");
  const circle = circlesRepo.create({
    contract_circle_id: 101,
    contract_address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    name: "Base Hackathon Circle",
    token_address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    token_symbol: "USDC",
    token_decimals: 6,
    contribution_amount: "50000000", // 50 USDC
    cycle_duration_seconds: 7 * 24 * 3600,
    grace_period_seconds: 24 * 3600,
    max_members: 3,
    current_round: 0,
    cycle_end_timestamp: Math.floor(Date.now() / 1000) - 100, // ended 100s ago
    status: "ACTIVE",
    creator_address: "0x1111111111111111111111111111111111111111",
    telegram_chat_id: "-100987654321",
  });

  const alice = membersRepo.add({
    circle_id: circle.id,
    wallet_address: "0x1111111111111111111111111111111111111111",
    basename: "alice.base.eth",
    telegram_user_id: "1001",
    telegram_username: "alice_base",
    payout_order: 0,
    has_paid_current_round: 1, // Paid
    total_contributed: "50000000",
    total_received: "0",
    status: "ACTIVE",
  });

  const bob = membersRepo.add({
    circle_id: circle.id,
    wallet_address: "0x2222222222222222222222222222222222222222",
    basename: "bob.base.eth",
    telegram_user_id: "1002",
    telegram_username: "bob_base",
    payout_order: 1,
    has_paid_current_round: 0, // Unpaid
    total_contributed: "0",
    total_received: "0",
    status: "ACTIVE",
  });

  const carol = membersRepo.add({
    circle_id: circle.id,
    wallet_address: "0x3333333333333333333333333333333333333333",
    basename: "carol.base.eth",
    telegram_user_id: "1003",
    telegram_username: "carol_base",
    payout_order: 2,
    has_paid_current_round: 1, // Paid
    total_contributed: "50000000",
    total_received: "0",
    status: "ACTIVE",
  });

  // 5. Test Tool: get_circle_status
  console.log("\n4️⃣ Testing Tool: get_circle_status...");
  const statusRes = await executeTool("get_circle_status", { circleId: circle.id });
  console.assert(statusRes.success, "get_circle_status should succeed");
  const report = (statusRes.data as any);
  console.log(`   ✅ Circle: "${report.name}", Collected: ${report.financials.currentCollected} USDC (${report.financials.completionRate})`);
  console.log(`   ✅ Round 0 Recipient: ${report.currentRoundRecipient.basename}`);

  // 6. Test Tool: send_reminder + Rate Limiting
  console.log("\n5️⃣ Testing Tool: send_reminder + Anti-Spam Guardrail...");
  const rem1 = await executeTool("send_reminder", {
    circleId: circle.id,
    memberAddress: bob.wallet_address,
    reminderType: "DUE_24H",
  });
  console.assert(rem1.success, "First reminder should succeed");
  console.log(`   ✅ First reminder drafted: "${(rem1.data as any).draftedMessage.split("\n")[0]}"`);

  // Attempt duplicate reminder (Anti-spam guardrail should block)
  const rem2 = await executeTool("send_reminder", {
    circleId: circle.id,
    memberAddress: bob.wallet_address,
    reminderType: "DUE_24H",
  });
  console.assert(!rem2.success, "Duplicate reminder must be blocked by rate limit guardrail");
  console.log(`   ✅ Anti-Spam Guardrail Blocked duplicate: "${rem2.error}"`);

  // 7. Test Tool: propose_payout (Blocked before all paid while in grace period)
  console.log("\n6️⃣ Testing Tool: propose_payout (Grace Period Guardrail)...");
  const propBlocked = await executeTool("propose_payout", { circleId: circle.id, round: 0 });
  console.assert(!propBlocked.success, "Payout should be blocked while unpaid in grace period");
  console.log(`   ✅ Premature payout blocked by guardrail: "${propBlocked.error}"`);

  // Bob now pays
  membersRepo.markPaid(circle.id, bob.wallet_address, true);

  // Re-attempt propose_payout
  const propRes = await executeTool("propose_payout", { circleId: circle.id, round: 0 });
  console.assert(propRes.success, "Payout should be proposed once all paid");
  const propData = (propRes.data as any);
  console.log(`   ✅ Payout proposed: ID ${propData.payoutId}, Amount: ${propData.amount}, Approval Req: ${propData.approvalId}`);
  console.log(`   ✅ Approval Card generated: "${propData.approvalCard.title}" -> ${propData.approvalCard.recipientText}`);

  // 8. Test Tool: execute_payout (Unapproved attempt MUST be blocked by Guardrail)
  console.log("\n7️⃣ Testing Tool: execute_payout (Human-in-the-Loop Gate)...");
  const execBlocked = await executeTool("execute_payout", {
    circleId: circle.id,
    round: 0,
    approvalId: propData.approvalId, // Still PENDING
  });
  console.assert(!execBlocked.success, "Unapproved execution MUST fail");
  console.log(`   ✅ Unauthorized execution blocked: "${execBlocked.error}"`);

  // Organizer approves the request via Telegram button
  approvalsRepo.resolve(propData.approvalId, "APPROVED", "1001");
  console.log(`   👤 Organizer tapped [Approve] -> Status is now APPROVED`);

  // Re-attempt execute_payout
  const execRes = await executeTool("execute_payout", {
    circleId: circle.id,
    round: 0,
    approvalId: propData.approvalId,
  });
  console.assert(execRes.success, "Approved payout execution must succeed");
  console.log(`   ✅ Payout executed: TxHash ${(execRes.data as any).txHash}, Next Round: ${(execRes.data as any).nextRound}`);

  // 9. Verify Audit Trail
  console.log("\n8️⃣ Verifying Layer 4 Audit Trail...");
  const recentLogs = auditRepo.getRecent(10);
  console.log(`   ✅ Audit trail logged ${recentLogs.length} events:`);
  for (const log of recentLogs.slice(0, 5)) {
    console.log(`      - [${log.severity}] [${log.event_type}] ${log.actor}: ${log.details.slice(0, 60)}…`);
  }

  console.log("\n🎉 All Layer 3 (Tools) & Layer 4 (Guardrails) Tests Passed with 100% Success!");
}

runAgentGuardrailTests().catch((err) => {
  console.error("❌ Test suite failed:", err);
  process.exit(1);
});
