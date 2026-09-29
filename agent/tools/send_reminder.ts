// ============================================================================
// Tool: send_reminder
// ============================================================================

import { z } from "zod";
import { circlesRepo, membersRepo, remindersRepo } from "../../db/index.js";
import { GuardrailEngine } from "../guardrails/index.js";

export const sendReminderSchema = z.object({
  circleId: z.number().int().describe("The internal ID of the circle"),
  memberAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/).describe("The Ethereum/Base wallet address of the member to remind"),
  reminderType: z.enum(["DUE_48H", "DUE_24H", "DUE_SOON", "GRACE_PERIOD"]).describe("Milestone stage of the reminder"),
  customNote: z.string().optional().describe("Optional personalized context or polite encouragement from the agent"),
});

export type ReminderDispatcher = (telegramUserId: string, message: string) => Promise<boolean>;
let reminderDispatcher: ReminderDispatcher | null = null;

export function registerReminderDispatcher(dispatcher: ReminderDispatcher): void {
  reminderDispatcher = dispatcher;
}

export type SendReminderInput = z.infer<typeof sendReminderSchema>;

export async function sendReminder(input: SendReminderInput) {
  const { circleId, memberAddress, reminderType, customNote } = input;
  const normalizedWallet = memberAddress.toLowerCase();

  // 1. Verify Circle & Member
  const circle = circlesRepo.getById(circleId);
  if (!circle) {
    return { success: false, error: `Circle #${circleId} does not exist.` };
  }

  if (circle.status !== "ACTIVE") {
    return { success: false, error: `Circle #${circleId} is currently ${circle.status}. Reminders are only sent for ACTIVE circles.` };
  }

  const member = membersRepo.getByWallet(circleId, normalizedWallet);
  if (!member) {
    return { success: false, error: `Address ${memberAddress} is not enrolled in circle #${circleId}.` };
  }

  if (member.has_paid_current_round === 1) {
    return { success: false, error: `Member ${member.basename ?? memberAddress} has already contributed for round #${circle.current_round}.` };
  }

  // 2. Layer 4 Guardrail: Rate Limiting & Anti-Spam Check
  const rateLimit = GuardrailEngine.checkReminderRateLimit(
    circleId,
    circle.current_round,
    normalizedWallet,
    reminderType
  );
  if (!rateLimit.allowed) {
    return { success: false, error: rateLimit.reason };
  }

  // 3. Draft Friendly Contextual Message
  const unitAmount = Number(circle.contribution_amount) / Math.pow(10, circle.token_decimals);
  const displayName = member.basename || `${normalizedWallet.slice(0, 6)}…${normalizedWallet.slice(-4)}`;

  let urgencyPrefix = "👋";
  let deadlineText = "";

  switch (reminderType) {
    case "DUE_48H":
      urgencyPrefix = "📅";
      deadlineText = "due in 48 hours";
      break;
    case "DUE_24H":
      urgencyPrefix = "⏳";
      deadlineText = "due tomorrow (24 hours left)";
      break;
    case "DUE_SOON":
      urgencyPrefix = "⚠️";
      deadlineText = "due very soon (< 6 hours left)";
      break;
    case "GRACE_PERIOD":
      urgencyPrefix = "🚨";
      deadlineText = "now in the Grace Period. Please pay urgently to avoid defaulting!";
      break;
  }

  const messageText = [
    `${urgencyPrefix} **Payment Reminder: ${circle.name}**`,
    ``,
    `Hi ${displayName}, your contribution of **${unitAmount} ${circle.token_symbol}** for Round #${circle.current_round + 1} is ${deadlineText}.`,
    customNote ? `\n💬 *Note from organizer:* ${customNote}` : "",
    ``,
    `👉 Open the MiniApp or transfer to the circle contract to maintain your good standing.`,
  ]
    .filter(Boolean)
    .join("\n");

  // 4. Record Reminder in DB (Prevents spamming)
  remindersRepo.record(circleId, circle.current_round, normalizedWallet, reminderType, member.telegram_user_id || undefined);

  // 5. Dispatch Telegram DM if dispatcher registered and member is linked
  if (member.telegram_user_id && reminderDispatcher) {
    reminderDispatcher(member.telegram_user_id, messageText).catch((err) => {
      console.warn(`[send_reminder] Dispatcher delivery failed for ${member.telegram_user_id}:`, err);
    });
  }

  // 6. Audit Log
  GuardrailEngine.audit(
    "TOOL_CALL",
    "agent_llm",
    {
      tool: "send_reminder",
      circleId,
      recipient: normalizedWallet,
      reminderType,
      telegramUser: member.telegram_username,
    },
    circleId,
    "INFO"
  );

  return {
    success: true,
    data: {
      recipientWallet: normalizedWallet,
      telegramUserId: member.telegram_user_id,
      telegramUsername: member.telegram_username,
      reminderType,
      draftedMessage: messageText,
      amountDue: `${unitAmount} ${circle.token_symbol}`,
    },
  };
}

