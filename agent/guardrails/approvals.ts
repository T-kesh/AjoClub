// ============================================================================
// Layer 4 Guardrail: Human-In-The-Loop Approval Engine (approvals.ts)
// Strict mathematical gate for high-stakes actions like payouts
// ============================================================================

import { approvalsRepo, circlesRepo, membersRepo, CircleRow, MemberRow, ApprovalRequestRow } from "../../db/index.js";
import { randomUUID } from "node:crypto";

export interface PayoutPrerequisitesCheck {
  valid: boolean;
  reason?: string;
  expectedRecipient?: string;
  payingMembersCount?: number;
  totalPayoutFormatted?: string;
}

export const AUTO_PAYOUT_THRESHOLD_USDC = 50.0; // Payouts above 50 USDC require Human-in-the-Loop approval

/**
 * Validates that all mathematical and cycle rules for a round payout are met.
 * Sits directly between agent's propose_payout tool and the contract.
 */
export function validatePayoutPrerequisites(circleId: number, targetRound: number): PayoutPrerequisitesCheck {
  const circle = circlesRepo.getById(circleId);
  if (!circle) {
    return { valid: false, reason: `Circle with ID ${circleId} does not exist.` };
  }

  if (circle.status !== "ACTIVE") {
    return { valid: false, reason: `Circle is not active (current status: ${circle.status}).` };
  }

  if (circle.current_round !== targetRound) {
    return {
      valid: false,
      reason: `Target round ${targetRound} does not match current circle round ${circle.current_round}.`,
    };
  }

  const now = Math.floor(Date.now() / 1000);
  const cycleEnd = circle.cycle_end_timestamp ?? 0;

  if (now < cycleEnd) {
    const secondsRemaining = cycleEnd - now;
    return {
      valid: false,
      reason: `Cycle has not ended yet (${secondsRemaining}s remaining). Payout cannot be triggered prematurely.`,
    };
  }

  const members = membersRepo.getByCircle(circleId);
  if (members.length === 0) {
    return { valid: false, reason: `Circle has no enrolled members.` };
  }

  const recipientMember = members.find((m) => m.payout_order === targetRound);
  if (!recipientMember) {
    return { valid: false, reason: `No member assigned to payout round ${targetRound}.` };
  }

  const payingMembers = members.filter((m) => m.has_paid_current_round === 1);
  const graceEnd = cycleEnd + circle.grace_period_seconds;

  // Before grace period expires: 100% of members must have paid
  if (now < graceEnd && payingMembers.length < members.length) {
    const missingCount = members.length - payingMembers.length;
    return {
      valid: false,
      reason: `Grace period active until ${new Date(graceEnd * 1000).toISOString()}. ${missingCount} members haven't paid yet.`,
    };
  }

  // After grace period expires: at least 1 member must have paid
  if (payingMembers.length === 0) {
    return { valid: false, reason: `No members contributed to this round. Payout cannot be triggered.` };
  }

  const unitAmount = Number(circle.contribution_amount) / Math.pow(10, circle.token_decimals);
  const totalPayout = (unitAmount * payingMembers.length).toFixed(2);

  return {
    valid: true,
    expectedRecipient: recipientMember.wallet_address,
    payingMembersCount: payingMembers.length,
    totalPayoutFormatted: totalPayout,
  };
}

/**
 * Checks whether this payout action requires Human-in-the-Loop approval from the organizer.
 */
export function requiresHumanApproval(payoutAmountUsdc: number): boolean {
  // Any payout above threshold or by default requires organizer signature/tap
  return payoutAmountUsdc >= AUTO_PAYOUT_THRESHOLD_USDC;
}

/**
 * Creates an immutable Human-in-the-Loop approval request record.
 */
export function createPayoutApprovalRequest(
  circleId: number,
  round: number,
  recipientAddress: string,
  amountUsdc: string,
  reviewerTelegramId?: string
): ApprovalRequestRow {
  const approvalId = "req-" + randomUUID();
  const expiresAt = Math.floor(Date.now() / 1000) + 24 * 3600; // 24-hour validity

  const payload = JSON.stringify({
    action: "EXECUTE_PAYOUT",
    circleId,
    round,
    recipientAddress: recipientAddress.toLowerCase(),
    amountUsdc,
  });

  return approvalsRepo.create({
    id: approvalId,
    circle_id: circleId,
    action_type: "EXECUTE_PAYOUT",
    payload,
    status: "PENDING",
    requester: "agent_core",
    reviewer_telegram_id: reviewerTelegramId || null,
    telegram_message_id: null,
    expires_at: expiresAt,
  });
}

/**
 * Strict verification before any payout transaction is signed or broadcast.
 */
export function verifyApprovalForExecution(
  approvalId: string,
  circleId: number,
  round: number,
  expectedRecipient: string
): { authorized: boolean; reason?: string } {
  const approval = approvalsRepo.getById(approvalId);
  if (!approval) {
    return { authorized: false, reason: `Approval request '${approvalId}' not found.` };
  }

  if (approval.status !== "APPROVED") {
    return { authorized: false, reason: `Approval request '${approvalId}' is not approved (status: ${approval.status}).` };
  }

  const now = Math.floor(Date.now() / 1000);
  if (now > approval.expires_at) {
    return { authorized: false, reason: `Approval request '${approvalId}' has expired.` };
  }

  try {
    const payload = JSON.parse(approval.payload);
    if (payload.circleId !== circleId || payload.round !== round) {
      return { authorized: false, reason: `Approval payload circle/round mismatch.` };
    }
    if (payload.recipientAddress.toLowerCase() !== expectedRecipient.toLowerCase()) {
      return { authorized: false, reason: `Approval recipient ${payload.recipientAddress} does not match expected ${expectedRecipient}.` };
    }
  } catch {
    return { authorized: false, reason: `Failed to parse approval payload.` };
  }

  return { authorized: true };
}
