import { initializeDatabase } from "./init.js";
import {
  circlesRepo,
  membersRepo,
  auditRepo,
  approvalsRepo,
  payoutsRepo,
} from "./index.js";

async function runDatabaseTests() {
  console.log("🧪 Starting SQLite database integration tests...\n");

  // 1. Initialize schema
  initializeDatabase();

  // 2. Test Circle Creation
  console.log("1️⃣ Testing Circle creation...");
  const circle = circlesRepo.create({
    contract_circle_id: 1,
    contract_address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // Base USDC
    name: "Base Builders Ajo #1",
    token_address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    token_symbol: "USDC",
    token_decimals: 6,
    contribution_amount: "50000000", // 50 USDC
    cycle_duration_seconds: 604800, // 7 days
    grace_period_seconds: 86400,    // 24 hours
    max_members: 3,
    current_round: 0,
    cycle_end_timestamp: Math.floor(Date.now() / 1000) + 604800,
    status: "ACTIVE",
    creator_address: "0x1111111111111111111111111111111111111111",
    telegram_chat_id: "-1001234567890",
  });
  console.log(`✅ Circle created: ID ${circle.id}, Name: "${circle.name}", Token: ${circle.token_symbol}`);

  // 3. Test Members
  console.log("\n2️⃣ Testing Member enrollment...");
  const member1 = membersRepo.add({
    circle_id: circle.id,
    wallet_address: "0x1111111111111111111111111111111111111111",
    basename: "alice.base.eth",
    telegram_user_id: "12345678",
    telegram_username: "alice_crypto",
    payout_order: 0,
    has_paid_current_round: 1,
    total_contributed: "50000000",
    total_received: "0",
    status: "ACTIVE",
  });

  const member2 = membersRepo.add({
    circle_id: circle.id,
    wallet_address: "0x2222222222222222222222222222222222222222",
    basename: "bob.base.eth",
    telegram_user_id: "87654321",
    telegram_username: "bob_builder",
    payout_order: 1,
    has_paid_current_round: 0,
    total_contributed: "0",
    total_received: "0",
    status: "ACTIVE",
  });

  const members = membersRepo.getByCircle(circle.id);
  console.log(`✅ Enrolled ${members.length} members:`);
  for (const m of members) {
    console.log(`   - Order ${m.payout_order}: ${m.basename ?? m.wallet_address} (Paid: ${m.has_paid_current_round ? "Yes" : "No"})`);
  }

  // 4. Test Audit Log
  console.log("\n3️⃣ Testing Audit Log...");
  const audit = auditRepo.log(
    "GUARDRAIL_CHECK",
    "guardrail_engine",
    { check: "per_circle_cap", maxCap: "500000000", requested: "50000000", result: "PASSED" },
    circle.id,
    "INFO"
  );
  console.log(`✅ Audit logged: [${audit.event_type}] ${audit.actor} - ID: ${audit.id}`);

  // 5. Test Approval Request (HITL)
  console.log("\n4️⃣ Testing Approval Request (Human-in-the-Loop)...");
  const approval = approvalsRepo.create({
    id: "req-" + Date.now(),
    circle_id: circle.id,
    action_type: "EXECUTE_PAYOUT",
    payload: JSON.stringify({
      recipient: member1.wallet_address,
      amount: "150000000", // 150 USDC
      round: 0,
    }),
    status: "PENDING",
    requester: "agent_llm",
    reviewer_telegram_id: "12345678",
    telegram_message_id: "9988",
    expires_at: Math.floor(Date.now() / 1000) + 3600,
  });
  console.log(`✅ Approval request created: ${approval.id} for action ${approval.action_type}`);

  // Resolve approval
  approvalsRepo.resolve(approval.id, "APPROVED", "12345678");
  const resolved = approvalsRepo.getById(approval.id);
  console.log(`✅ Approval request resolved: Status is now ${resolved?.status}`);

  console.log("\n🎉 All SQLite tests passed successfully!");
}

runDatabaseTests().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
