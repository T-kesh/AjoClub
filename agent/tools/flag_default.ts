// ============================================================================
// Tool: flag_default
// ============================================================================

import { z } from "zod";
import { circlesRepo, membersRepo, db } from "../../db/index.js";
import { GuardrailEngine } from "../guardrails/index.js";
import { markOnchainDefault } from "../chain.js";

export const flagDefaultSchema = z.object({
  circleId: z.number().int().describe("The internal ID of the circle"),
  memberAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/).describe("The wallet address of the delinquent member to flag"),
  reason: z.string().optional().describe("Optional note explaining the default determination"),
});

export type FlagDefaultInput = z.infer<typeof flagDefaultSchema>;

export async function flagDefault(input: FlagDefaultInput) {
  const { circleId, memberAddress, reason } = input;
  const normalizedWallet = memberAddress.toLowerCase();

  const circle = circlesRepo.getById(circleId);
  if (!circle) {
    return { success: false, error: `Circle #${circleId} was not found.` };
  }

  if (circle.status !== "ACTIVE") {
    return { success: false, error: `Circle #${circleId} is not in ACTIVE state.` };
  }

  const member = membersRepo.getByWallet(circleId, normalizedWallet);
  if (!member) {
    return { success: false, error: `Member ${memberAddress} is not enrolled in circle #${circleId}.` };
  }

  if (member.has_paid_current_round === 1) {
    return { success: false, error: `Member ${member.basename ?? memberAddress} has already paid for this cycle!` };
  }

  // Layer 4 Guardrail: Must ensure grace period has expired before flagging default
  const now = Math.floor(Date.now() / 1000);
  const cycleEnd = circle.cycle_end_timestamp ?? 0;
  const graceEnd = cycleEnd + circle.grace_period_seconds;

  if (now < graceEnd) {
    const secondsRemaining = graceEnd - now;
    return {
      success: false,
      error: `Cannot flag default prematurely. Grace period is active for another ${Math.ceil(secondsRemaining / 60)} minutes.`,
    };
  }

  // Update member status to DEFAULTED in SQLite
  db.run(
    `UPDATE members SET status = 'DEFAULTED' WHERE circle_id = ? AND wallet_address = ?`,
    [circleId, normalizedWallet]
  );

  // Trigger onchain default marker if contract circle ID is linked
  let onchainTx: { txHash: string; simulated?: boolean } | null = null;
  if (circle.contract_circle_id !== null) {
    try {
      onchainTx = await markOnchainDefault(circle.contract_circle_id);
    } catch (err) {
      console.warn("Onchain markDefaulted call skipped/failed:", err);
    }
  }

  GuardrailEngine.audit(
    "SECURITY_ALERT",
    "guardrail_engine",
    {
      action: "flag_default",
      circleId,
      delinquentMember: normalizedWallet,
      basename: member.basename,
      round: circle.current_round,
      reason: reason || "Grace period expired without contribution",
      onchainTxHash: onchainTx?.txHash,
    },
    circleId,
    "WARN"
  );

  return {
    success: true,
    data: {
      circleId,
      flaggedAddress: normalizedWallet,
      displayName: member.basename || normalizedWallet,
      round: circle.current_round,
      status: "DEFAULTED",
      onchainTxHash: onchainTx?.txHash,
      simulated: onchainTx?.simulated,
    },
  };
}
