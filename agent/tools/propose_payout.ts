// ============================================================================
// Tool: propose_payout
// ============================================================================

import { z } from "zod";
import { circlesRepo, membersRepo, payoutsRepo, approvalsRepo } from "../../db/index.js";
import { GuardrailEngine } from "../guardrails/index.js";

export const proposePayoutSchema = z.object({
  circleId: z.number().int().describe("The internal ID of the circle"),
  round: z.number().int().describe("The round number for which payout is proposed"),
  notes: z.string().optional().describe("Optional contextual explanation from the agent"),
});

export type ProposePayoutInput = z.infer<typeof proposePayoutSchema>;

export async function proposePayout(input: ProposePayoutInput) {
  const { circleId, round, notes } = input;

  // 1. Layer 4 Guardrail: Strict Mathematical & Cycle Prerequisites
  const check = GuardrailEngine.validatePayoutPrerequisites(circleId, round);
  if (!check.valid) {
    return { success: false, error: check.reason };
  }

  // 1b. Prevent double-firing: Check if an approval is already pending for this round
  const existingPending = approvalsRepo.getPendingForCircleAndRound(circleId, round);
  if (existingPending) {
    return {
      success: false,
      error: `A payout proposal is already pending approval for Round #${round + 1} (Approval ID: ${existingPending.id}).`,
    };
  }

  const circle = circlesRepo.getById(circleId)!;
  const recipientAddress = check.expectedRecipient!;
  const amountUsdc = check.totalPayoutFormatted!;

  // 2. Fetch Recipient Details (Basename if available)
  const member = membersRepo.getByWallet(circleId, recipientAddress);
  const recipientBasename = member?.basename;

  // 3. Record Proposed Payout in Database
  const payout = payoutsRepo.propose({
    circle_id: circleId,
    round,
    recipient_address: recipientAddress,
    amount: amountUsdc,
    status: "PROPOSED",
    proposed_by: "agent_core",
    approved_by: null,
  });

  // 4. Create Human-In-The-Loop Approval Request
  const approval = GuardrailEngine.createPayoutApprovalRequest(
    circleId,
    round,
    recipientAddress,
    amountUsdc
  );

  // 5. Layer 4 Audit Log
  GuardrailEngine.audit(
    "APPROVAL_REQUESTED",
    "agent_llm",
    {
      action: "propose_payout",
      circleId,
      round,
      recipientAddress,
      recipientBasename,
      amountUsdc,
      approvalId: approval.id,
      notes,
    },
    circleId,
    "INFO"
  );

  return {
    success: true,
    data: {
      payoutId: payout.id,
      approvalId: approval.id,
      circleId,
      round,
      recipient: {
        address: recipientAddress,
        basename: recipientBasename,
        order: round,
      },
      amount: `${amountUsdc} ${circle.token_symbol}`,
      payingMembersCount: check.payingMembersCount,
      requiresHumanApproval: true,
      approvalCard: {
        title: `🏛️ Round ${round + 1} Payout Approval`,
        circleName: circle.name,
        recipientText: recipientBasename ? `${recipientBasename} (${recipientAddress.slice(0, 6)}…${recipientAddress.slice(-4)})` : recipientAddress,
        amountText: `${amountUsdc} ${circle.token_symbol}`,
        callbackDataApprove: `approve:${approval.id}`,
        callbackDataReject: `reject:${approval.id}`,
      },
    },
  };
}
