// ============================================================================
// Tool: get_circle_status
// ============================================================================

import { z } from "zod";
import { circlesRepo, membersRepo } from "../../db/index.js";
import { GuardrailEngine } from "../guardrails/index.js";

export const getCircleStatusSchema = z.object({
  circleId: z.number().int().describe("The internal ID of the circle"),
});

export type GetCircleStatusInput = z.infer<typeof getCircleStatusSchema>;

export async function getCircleStatus(input: GetCircleStatusInput) {
  const { circleId } = input;

  // Layer 4 Guardrail: rate limit check
  const rateLimit = GuardrailEngine.checkToolCallRateLimit(circleId, "get_circle_status");
  if (!rateLimit.allowed) {
    return { success: false, error: rateLimit.reason };
  }

  const circle = circlesRepo.getById(circleId);
  if (!circle) {
    return { success: false, error: `Circle #${circleId} was not found in the database.` };
  }

  const members = membersRepo.getByCircle(circleId);
  const now = Math.floor(Date.now() / 1000);
  const cycleEnd = circle.cycle_end_timestamp ?? 0;
  const secondsLeft = Math.max(0, cycleEnd - now);

  const unitAmount = Number(circle.contribution_amount) / Math.pow(10, circle.token_decimals);
  const payingMembers = members.filter((m) => m.has_paid_current_round === 1);
  const currentRecipient = members.find((m) => m.payout_order === circle.current_round);

  const statusReport = {
    circleId: circle.id,
    name: circle.name,
    status: circle.status,
    contractAddress: circle.contract_address,
    token: {
      symbol: circle.token_symbol,
      decimals: circle.token_decimals,
      address: circle.token_address,
      contributionPerCycle: unitAmount,
    },
    cycle: {
      currentRound: circle.current_round,
      totalRounds: members.length,
      cycleDurationHours: circle.cycle_duration_seconds / 3600,
      hoursRemaining: (secondsLeft / 3600).toFixed(1),
      cycleEndIso: cycleEnd > 0 ? new Date(cycleEnd * 1000).toISOString() : null,
      gracePeriodHours: circle.grace_period_seconds / 3600,
    },
    financials: {
      potPerRound: unitAmount * members.length,
      currentCollected: unitAmount * payingMembers.length,
      completionRate: members.length > 0 ? `${Math.round((payingMembers.length / members.length) * 100)}%` : "0%",
    },
    currentRoundRecipient: currentRecipient
      ? {
          order: currentRecipient.payout_order,
          address: currentRecipient.wallet_address,
          basename: currentRecipient.basename,
          telegramUsername: currentRecipient.telegram_username,
        }
      : null,
    members: members.map((m) => ({
      order: m.payout_order,
      address: m.wallet_address,
      basename: m.basename,
      telegramUsername: m.telegram_username,
      hasPaidThisRound: m.has_paid_current_round === 1,
      status: m.status,
    })),
  };

  GuardrailEngine.audit("TOOL_CALL", "agent_llm", { tool: "get_circle_status", circleId }, circleId, "INFO");

  return { success: true, data: statusReport };
}
