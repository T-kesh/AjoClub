// ============================================================================
// Layer 1: Telegram Message Card Templates (cards.ts)
// Formats rich MarkdownV2/HTML cards and inline keyboards
// ============================================================================

import { InlineKeyboard } from "grammy";

export function formatCircleStatusMessage(circle: any): string {
  const { name, status, cycle, financials, currentRoundRecipient, members } = circle;

  const recipientLine = currentRoundRecipient
    ? `🎁 *Next Payout Recipient:* ${currentRoundRecipient.basename ?? currentRoundRecipient.address}`
    : "🎁 *Next Payout Recipient:* Not assigned";

  const memberLines = members
    .map(
      (m: any, idx: number) =>
        `  ${idx + 1}\\. ${m.basename ?? m.address.slice(0, 6) + "…" + m.address.slice(-4)} — ${
          m.hasPaidThisRound ? "✅ Paid" : "⏳ Pending"
        }`
    )
    .join("\n");

  return [
    `🫙 *AjoClub: ${name}*`,
    `Status: *${status}* \\| Round: *${cycle.currentRound + 1}/${cycle.totalRounds}*`,
    `⏱ Hours Remaining: *${cycle.hoursRemaining}h*`,
    ``,
    `💰 *Financials:*`,
    `• Pot Size: *${financials.potPerRound} USDC*`,
    `• Collected: *${financials.currentCollected} USDC* \\(${financials.completionRate}\\)`,
    ``,
    recipientLine,
    ``,
    `👥 *Member Roster:*`,
    memberLines,
  ].join("\n");
}

export function formatApprovalCard(data: {
  approvalId: string;
  circleName: string;
  round: number;
  recipientText: string;
  amountText: string;
}): { text: string; keyboard: InlineKeyboard } {
  const text = [
    `🏛️ *Payout Approval Requested*`,
    ``,
    `*Circle:* ${data.circleName}`,
    `*Round:* #${data.round + 1}`,
    `*Recipient:* \`${data.recipientText}\``,
    `*Amount:* *${data.amountText}*`,
    ``,
    `⚠️ *Layer 4 Guardrail Notice:*`,
    `All cycle requirements are satisfied on Base. Please confirm to trigger the smart contract payout.`,
  ].join("\n");

  const keyboard = new InlineKeyboard()
    .text("✅ Approve Payout", `approve:${data.approvalId}`)
    .text("❌ Reject", `reject:${data.approvalId}`);

  return { text, keyboard };
}
