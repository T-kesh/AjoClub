// ============================================================================
// Layer 1: Telegram Message Card Templates (cards.ts)
// Formats rich Markdown cards and inline keyboards
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
        `  ${idx + 1}. ${m.basename ?? m.address.slice(0, 6) + "…" + m.address.slice(-4)} — ${
          m.hasPaidThisRound ? "✅ Paid" : "⏳ Pending"
        }`
    )
    .join("\n");

  return [
    `🫙 *AjoClub: ${name}*`,
    `Status: *${status}* | Round: *${cycle.currentRound + 1}/${cycle.totalRounds}*`,
    `⏱ Hours Remaining: *${cycle.hoursRemaining}h*`,
    ``,
    `💰 *Financials:*`,
    `• Pot Size: *${financials.potPerRound} USDC*`,
    `• Collected: *${financials.currentCollected} USDC* (${financials.completionRate})`,
    ``,
    recipientLine,
    ``,
    `👥 *Member Roster:*`,
    memberLines,
  ].join("\n");
}

export function formatCirclesList(
  userCircles: { circle: any; member?: any }[],
  allActiveCircles?: any[],
  isLinked: boolean = false
): string {
  if (userCircles.length > 0) {
    const list = userCircles
      .map(({ circle, member }, idx) => {
        const isOrganizer = member?.payout_order === 0;
        const role = isOrganizer ? "👑 Organizer" : "👤 Member";
        const unitAmount = Number(circle.contribution_amount) / Math.pow(10, circle.token_decimals);
        const pot = unitAmount * circle.max_members;

        return [
          `*${idx + 1}. ${circle.name}* (ID: \`${circle.id}\`)`,
          `   • Role: ${role}`,
          `   • Status: *${circle.status}* | Round: *${circle.current_round + 1}/${circle.max_members}*`,
          `   • Pot: *${pot} ${circle.token_symbol}* | Contribution: *${unitAmount} ${circle.token_symbol}*`,
          `   • View: \`/status ${circle.id}\``,
        ].join("\n");
      })
      .join("\n\n");

    return [
      `🫙 *Your Linked Ajo Circles*`,
      ``,
      list,
      ``,
      `💡 *Tip:* Use \`/status <id>\` for full round details, or \`/payout <id>\` to request payouts.`,
    ].join("\n");
  }

  // Not linked or no circles joined
  const header = isLinked
    ? `ℹ️ *No Circles Found for Linked Wallet*`
    : `⚠️ *Account Not Yet Linked*`;

  const linkTip = isLinked
    ? `Your wallet is linked, but you are not currently enrolled in any active circles.`
    : `You haven't linked your Telegram account to a circle wallet yet.\nOnce an organizer adds your Base wallet to a circle, use \`/link <your_wallet_address>\` to connect!`;

  let activeList = "";
  if (allActiveCircles && allActiveCircles.length > 0) {
    const items = allActiveCircles
      .map(
        (c, idx) =>
          `  ${idx + 1}. *${c.name}* (ID: \`${c.id}\`) — Round ${c.current_round + 1}/${c.max_members} [Use: \`/status ${c.id}\`]`
      )
      .join("\n");

    activeList = [
      ``,
      `🌐 *Active Circles on Base Sepolia:*`,
      items,
    ].join("\n");
  }

  return [header, ``, linkTip, activeList].join("\n");
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

