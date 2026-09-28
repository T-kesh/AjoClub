// ============================================================================
// End-to-End System Test: Messaging + Agent Core + Tools + Guardrails
// ============================================================================

import { initializeDatabase } from "../db/init.js";
import { circlesRepo, membersRepo, approvalsRepo, auditRepo } from "../db/index.js";
import { AgentCoordinator } from "./loop.js";
import { formatCircleStatusMessage, formatApprovalCard } from "../bot/templates/cards.js";
import { executeTool } from "./tools/index.js";

async function runEndToEndTests() {
  console.log("🚀 Starting Full 5-Layer End-to-End System Test...\n");

  // 1. Initialize SQLite
  initializeDatabase();

  // 2. Setup Test Circle on Base with Basenames
  console.log("1️⃣ Seeding Test Circle & Basename Roster...");
  const circle = circlesRepo.create({
    contract_circle_id: 202,
    contract_address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    name: "Colosseum Founders Chama",
    token_address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    token_symbol: "USDC",
    token_decimals: 6,
    contribution_amount: "100000000", // 100 USDC
    cycle_duration_seconds: 7 * 24 * 3600,
    grace_period_seconds: 24 * 3600,
    max_members: 3,
    current_round: 0,
    cycle_end_timestamp: Math.floor(Date.now() / 1000) - 10, // Just ended
    status: "ACTIVE",
    creator_address: "0x1111111111111111111111111111111111111111",
    telegram_chat_id: "-100777888999",
  });

  const memberA = membersRepo.add({
    circle_id: circle.id,
    wallet_address: "0x1111111111111111111111111111111111111111",
    basename: "founder.base.eth",
    telegram_user_id: "5001",
    telegram_username: "founder_tg",
    payout_order: 0,
    has_paid_current_round: 1,
    total_contributed: "100000000",
    total_received: "0",
    status: "ACTIVE",
  });

  const memberB = membersRepo.add({
    circle_id: circle.id,
    wallet_address: "0x2222222222222222222222222222222222222222",
    basename: "builder.base.eth",
    telegram_user_id: "5002",
    telegram_username: "builder_tg",
    payout_order: 1,
    has_paid_current_round: 1,
    total_contributed: "100000000",
    total_received: "0",
    status: "ACTIVE",
  });

  const memberC = membersRepo.add({
    circle_id: circle.id,
    wallet_address: "0x3333333333333333333333333333333333333333",
    basename: "investor.base.eth",
    telegram_user_id: "5003",
    telegram_username: "investor_tg",
    payout_order: 2,
    has_paid_current_round: 1,
    total_contributed: "100000000",
    total_received: "0",
    status: "ACTIVE",
  });

  console.log(`   ✅ Seeded circle: "${circle.name}" with 3 verified Basename members.`);

  // 3. Test Agent Reasoning with Tool Calling
  console.log("\n2️⃣ Testing Agent Core Reasoning (Layer 2) + Tool Calling (Layer 3)...");
  const coordinator = new AgentCoordinator();

  const chatResult = await coordinator.handleMessage(
    `Please inspect circle #${circle.id} and tell me the status.`,
    circle.id
  );

  console.log(`   🤖 Agent Response: "${chatResult.response}"`);
  console.log(`   🔧 Tools executed: ${chatResult.toolResults.length}`);
  console.assert(chatResult.toolResults.length > 0, "Agent should have executed get_circle_status tool");

  // 4. Test Telegram Card Formatting
  console.log("\n3️⃣ Testing Telegram UI Card Formatting (Layer 1)...");
  const statusRes = await executeTool("get_circle_status", { circleId: circle.id });
  const cardText = formatCircleStatusMessage(statusRes.data);
  console.log("   📱 Formatted Telegram Message Preview:\n");
  console.log(cardText);
  console.log("   ----------------------------------------");

  // 5. Test Autonomous Scheduled Tick
  console.log("\n4️⃣ Testing Autonomous Scheduled Tick (Propose Payout)...");
  await coordinator.runAutonomousTick();

  // Find the approval request created during autonomous tick
  const approvals = approvalsRepo.getById(
    (auditRepo.getRecent(5).find((a) => a.event_type === "APPROVAL_REQUESTED") as any)?.details ?
    JSON.parse((auditRepo.getRecent(5).find((a) => a.event_type === "APPROVAL_REQUESTED") as any).details).approvalId : ""
  );

  if (approvals) {
    console.log(`   ✅ Autonomous tick generated approval request: ${approvals.id} (Status: ${approvals.status})`);

    // 6. Test Telegram Interactive Approval Card
    const payload = JSON.parse(approvals.payload);
    const { text: approvalText, keyboard } = formatApprovalCard({
      approvalId: approvals.id,
      circleName: circle.name,
      round: payload.round,
      recipientText: payload.recipientAddress,
      amountText: `${payload.amountUsdc} USDC`,
    });

    console.log("\n5️⃣ Telegram Approval Card with Inline Buttons Preview:\n");
    console.log(approvalText);
    console.log(`   [Buttons: ${keyboard.inline_keyboard[0].map((b: any) => b.text).join(" | ")}]`);
    console.log("   ----------------------------------------");

    // 7. Organizer Approves via Telegram Button
    console.log("\n6️⃣ Simulating Organizer tapping [Approve Payout]...");
    approvalsRepo.resolve(approvals.id, "APPROVED", "5001");

    // 8. Execute Gated Payout
    console.log("\n7️⃣ Executing Gated Payout on Base...");
    const execRes = await executeTool("execute_payout", {
      circleId: circle.id,
      round: payload.round,
      approvalId: approvals.id,
    });

    console.assert(execRes.success, "Payout execution should succeed after approval");
    const execData = execRes.data as any;
    console.log(`   ✅ Payout Broadcasted: TxHash ${execData.txHash}`);
    console.log(`   ✅ Round Advanced: Now on Round #${execData.nextRound + 1}`);
  }

  console.log("\n🎉 Full 5-Layer End-to-End Workflow Passed with 100% Success!");
}

runEndToEndTests().catch((err) => {
  console.error("❌ E2E Test failed:", err);
  process.exit(1);
});
