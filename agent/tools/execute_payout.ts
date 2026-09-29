// ============================================================================
// Tool: execute_payout (GATED by Layer 4 Guardrail)
// ============================================================================

import { z } from "zod";
import { circlesRepo, membersRepo, payoutsRepo, approvalsRepo, db } from "../../db/index.js";
import { GuardrailEngine } from "../guardrails/index.js";
import { triggerOnchainPayout } from "../chain.js";

export const executePayoutSchema = z.object({
  circleId: z.number().int().describe("The internal ID of the circle"),
  round: z.number().int().describe("The round number to execute payout for"),
  approvalId: z.string().describe("The cryptographic/database approval ID granted by the human organizer"),
});

export type ExecutePayoutInput = z.infer<typeof executePayoutSchema>;

export async function executePayout(input: ExecutePayoutInput) {
  const { circleId, round, approvalId } = input;

  const circle = circlesRepo.getById(circleId);
  if (!circle) {
    return { success: false, error: `Circle #${circleId} was not found.` };
  }

  const members = membersRepo.getByCircle(circleId);
  const recipient = members.find((m) => m.payout_order === round);
  if (!recipient) {
    return { success: false, error: `Recipient for round ${round} could not be resolved.` };
  }

  // 1. LAYER 4 GUARDRAIL: Strict Verification of Human Approval
  // Even a prompt-injected LLM CANNOT bypass this check.
  const approvalCheck = GuardrailEngine.verifyApprovalForExecution(
    approvalId,
    circleId,
    round,
    recipient.wallet_address
  );

  if (!approvalCheck.authorized) {
    GuardrailEngine.audit(
      "SECURITY_ALERT",
      "guardrail_engine",
      {
        attempt: "unauthorized_payout_execution",
        circleId,
        round,
        approvalId,
        reason: approvalCheck.reason,
      },
      circleId,
      "CRITICAL"
    );

    return {
      success: false,
      error: `Guardrail Gate Blocked: ${approvalCheck.reason}`,
    };
  }

  // 2. Execute Onchain Call via viem on Base
  const contractId = circle.contract_circle_id ?? circle.id;
  const onchainResult = await triggerOnchainPayout(contractId);

  // 3. Update Database State (Atomic Transaction)
  const isFinalRound = round + 1 >= members.length;
  db.transaction(() => {
    // Mark payout executed
    const pendingPayout = db.get<{ id: number }>(
      `SELECT id FROM payouts WHERE circle_id = ? AND round = ? AND status IN ('PROPOSED', 'APPROVED') ORDER BY id DESC LIMIT 1`,
      [circleId, round]
    );
    if (pendingPayout) {
      payoutsRepo.markExecuted(pendingPayout.id, onchainResult.txHash);
    }

    // Atomically mark approval as consumed (single-use gate enforcement)
    approvalsRepo.markConsumed(approvalId);

    // Check if this was the final round
    if (isFinalRound) {
      circlesRepo.updateStatus(circleId, "COMPLETE");
    } else {
      // Advance to next round and reset member payment status
      const nextRound = round + 1;
      const nextCycleEnd = Math.floor(Date.now() / 1000) + circle.cycle_duration_seconds;
      circlesRepo.updateCycle(circleId, nextRound, nextCycleEnd);
      membersRepo.resetRoundPaymentStatus(circleId);
    }
  });

  // 4. Audit Log
  GuardrailEngine.audit(
    "TX_SUBMITTED",
    "agent_llm",
    {
      action: "execute_payout",
      circleId,
      round,
      recipientAddress: recipient.wallet_address,
      recipientBasename: recipient.basename,
      txHash: onchainResult.txHash,
      simulated: onchainResult.simulated,
      isFinalRound,
    },
    circleId,
    "INFO"
  );

  return {
    success: true,
    data: {
      circleId,
      round,
      recipient: recipient.basename ?? recipient.wallet_address,
      txHash: onchainResult.txHash,
      simulated: onchainResult.simulated,
      isFinalRound,
      nextRound: isFinalRound ? null : round + 1,
      message: isFinalRound
        ? `🎉 Circle #${circleId} is now COMPLETE! All rounds have successfully paid out.`
        : `✅ Round #${round + 1} payout complete. Round #${round + 2} has started!`,
    },
  };
}
