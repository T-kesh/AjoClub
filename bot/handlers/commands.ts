// ============================================================================
// Layer 1: Telegram Command Handlers (commands.ts)
// ============================================================================

import { Context } from "grammy";
import { executeTool } from "../../agent/tools/index.js";
import { AgentCoordinator } from "../../agent/loop.js";
import { GuardrailEngine } from "../../agent/guardrails/index.js";
import {
  formatCircleStatusMessage,
  formatApprovalCard,
  formatCirclesList,
} from "../templates/cards.js";
import { circlesRepo, membersRepo } from "../../db/index.js";
import { sendTelegramDM } from "../index.js";

const coordinator = new AgentCoordinator();

export async function handleStart(ctx: Context): Promise<void> {
  const welcomeText = [
    `🫙 *Welcome to AjoClub Coordinator on Base!*`,
    ``,
    `I am your autonomous onchain savings circle secretary. I track rounds, calculate pots, send timely reminders, and prepare safe, non-custodial payouts.`,
    ``,
    `📋 *Commands:*`,
    `• \`/status <id or name>\` — View round progress & member payment status`,
    `• \`/circles\` — List circles you are enrolled in or organizing`,
    `• \`/link <walletAddress>\` — Link your Telegram account to your Base wallet`,
    `• \`/remind <id>\` — Check unpaid members and dispatch payment reminders`,
    `• \`/payout <id>\` — Propose round payout for organizer approval`,
    `• \`/help\` — System architecture & security invariants`,
    ``,
    `💡 *Or just ask me anything naturally!* e.g., *"How is circle 1 doing?"*`,
  ].join("\n");

  await ctx.reply(welcomeText, { parse_mode: "Markdown" });
}

export async function handleHelp(ctx: Context): Promise<void> {
  const helpText = [
    `🛡️ *AjoClub 5-Layer Autonomous Architecture*`,
    ``,
    `1. *Messaging Layer:* Interactive Telegram cards, reminders & approval gates`,
    `2. *Agent Core:* LLM reasoning (Gemini / Claude Haiku)`,
    `3. *Tool Layer:* Typed Zod functions (status, reminder, payout)`,
    `4. *Guardrail Engine:* Plain deterministic code (caps, rate limits, allowlists, human-in-the-loop approvals)`,
    `5. *Chain Layer:* Base contracts & native USDC`,
    ``,
    `🔒 *Security Invariant:* Funds remain strictly non-custodial inside the verified contract on Base. The agent cannot sign or divert funds. Every action is gated by Layer 4 Guardrails.`,
  ].join("\n");

  await ctx.reply(helpText, { parse_mode: "Markdown" });
}

export async function handleStatus(ctx: Context): Promise<void> {
  const text = ctx.message?.text || "";
  const arg = text.replace(/^\/status\s*/i, "").trim();

  let circleId: number | undefined;

  if (!arg) {
    // Default to user's linked circle if available, else first active circle
    const telegramUserId = ctx.from?.id ? String(ctx.from.id) : null;
    if (telegramUserId) {
      const userCircles = circlesRepo.getByMemberTelegramUserId(telegramUserId);
      if (userCircles.length > 0) {
        circleId = userCircles[0].circle.id;
      }
    }
    if (!circleId) {
      const active = circlesRepo.getActive();
      circleId = active.length > 0 ? active[0].id : 1;
    }
  } else if (/^\d+$/.test(arg)) {
    circleId = parseInt(arg, 10);
  } else {
    // Search circle by name
    const found = circlesRepo.getByName(arg);
    if (found) {
      circleId = found.id;
    } else {
      await ctx.reply(`⚠️ Circle matching "${arg}" not found. Use \`/circles\` to view available circles.`);
      return;
    }
  }

  const result = await executeTool("get_circle_status", { circleId });
  if (!result.success) {
    await ctx.reply(`⚠️ ${result.error}`);
    return;
  }

  const cardText = formatCircleStatusMessage(result.data);
  await ctx.reply(cardText, { parse_mode: "Markdown" });
}

export async function handleCircles(ctx: Context): Promise<void> {
  const telegramUserId = ctx.from?.id ? String(ctx.from.id) : "";
  const userCircles = telegramUserId ? circlesRepo.getByMemberTelegramUserId(telegramUserId) : [];
  const linkedMembers = telegramUserId ? membersRepo.getByTelegramUserId(telegramUserId) : [];
  const isLinked = linkedMembers.length > 0;
  const allActive = circlesRepo.getActive();

  const cardText = formatCirclesList(userCircles, allActive, isLinked);
  await ctx.reply(cardText, { parse_mode: "Markdown" });
}

export async function handleLink(ctx: Context): Promise<void> {
  const text = ctx.message?.text || "";
  const match = text.match(/\/(?:link|register)\s+(0x[a-fA-F0-9]{40})/i);

  if (!match || !match[1]) {
    const usage = [
      `⚠️ *Wallet Address Missing or Invalid*`,
      ``,
      `Please provide your 42-character Base wallet address:`,
      `👉 \`/link 0xYourWalletAddress\``,
      ``,
      `*Example:*`,
      `\`/link 0x1111111111111111111111111111111111111111\``,
    ].join("\n");
    await ctx.reply(usage, { parse_mode: "Markdown" });
    return;
  }

  const walletAddress = match[1].toLowerCase();
  const telegramUserId = ctx.from?.id ? String(ctx.from.id) : "";
  const telegramUsername = ctx.from?.username || undefined;

  if (!telegramUserId) {
    await ctx.reply("⚠️ Could not detect your Telegram user ID.");
    return;
  }

  // Enforce member-list restriction & prevent overwriting existing member links
  const linkResult = membersRepo.linkWallet(walletAddress, telegramUserId, telegramUsername);

  if (!linkResult.success) {
    // Audit rejected link attempt via Layer 4 Guardrail
    GuardrailEngine.audit(
      "SECURITY_ALERT",
      "organizer",
      {
        action: "identity_link_rejected",
        wallet: walletAddress,
        telegramUserId,
        telegramUsername,
        reason: linkResult.error,
      },
      null,
      "WARN"
    );

    const errorCard = [
      `❌ *Wallet Link Rejected*`,
      ``,
      linkResult.message,
    ].join("\n");
    await ctx.reply(errorCard, { parse_mode: "Markdown" });
    return;
  }

  // Audit successful identity mapping via Layer 4 Guardrail
  GuardrailEngine.audit(
    "TOOL_CALL",
    "organizer",
    {
      action: "identity_link",
      wallet: walletAddress,
      telegramUserId,
      telegramUsername,
      circlesLinked: linkResult.circlesLinked,
    },
    null,
    "INFO"
  );

  const confirmation = [
    `✅ *Wallet Linked Successfully!*`,
    ``,
    `• *Wallet:* \`${walletAddress}\``,
    `• *Telegram ID:* \`${telegramUserId}\``,
    `• *Circles Enrolled:* ${linkResult.circlesLinked}`,
    ``,
    `🎉 You are verified as an enrolled member! You will receive timely payment reminders and payout notices here.`,
    `Use \`/circles\` to view your circles, or \`/status\` to check round progress.`,
  ].join("\n");
  await ctx.reply(confirmation, { parse_mode: "Markdown" });
}

export async function handleRemind(ctx: Context): Promise<void> {
  const text = ctx.message?.text || "";
  const arg = text.replace(/^\/remind\s*/i, "").trim();

  let circleId = 1;
  if (/^\d+$/.test(arg)) {
    circleId = parseInt(arg, 10);
  } else if (arg) {
    const found = circlesRepo.getByName(arg);
    if (found) circleId = found.id;
  }

  const circle = circlesRepo.getById(circleId);
  if (!circle) {
    await ctx.reply(`⚠️ Circle #${circleId} not found.`);
    return;
  }

  const members = membersRepo.getByCircle(circleId);
  const unpaid = members.filter((m) => m.has_paid_current_round === 0);

  if (unpaid.length === 0) {
    await ctx.reply(
      `🎉 All members in Circle #${circleId} (*${circle.name}*) have already contributed for Round #${circle.current_round + 1}!`,
      { parse_mode: "Markdown" }
    );
    return;
  }

  const reminderLogs: string[] = [];
  for (const member of unpaid) {
    const result = await executeTool("send_reminder", {
      circleId,
      memberAddress: member.wallet_address,
      reminderType: "DUE_24H",
    });

    const memberName = member.basename ?? `${member.wallet_address.slice(0, 6)}…${member.wallet_address.slice(-4)}`;

    if (result.success) {
      const data = (result as any).data;
      let dmStatus = "no Telegram ID linked";
      if (data.telegramUserId) {
        const sent = await sendTelegramDM(data.telegramUserId, data.draftedMessage);
        dmStatus = sent ? "✅ DM delivered" : "⚠️ DM delivery failed";
      }
      reminderLogs.push(`• *${memberName}*: ⏳ Reminder drafted (${dmStatus})`);
    } else {
      reminderLogs.push(`• *${memberName}*: ⚠️ ${result.error}`);
    }
  }

  const summary = [
    `🔔 *Payment Reminder Dispatch — Circle #${circleId}*`,
    `*${circle.name}* (Round #${circle.current_round + 1})`,
    ``,
    ...reminderLogs,
  ].join("\n");

  await ctx.reply(summary, { parse_mode: "Markdown" });
}

export async function handlePayout(ctx: Context): Promise<void> {
  const text = ctx.message?.text || "";
  const arg = text.replace(/^\/payout\s*/i, "").trim();

  let circleId = 1;
  if (/^\d+$/.test(arg)) {
    circleId = parseInt(arg, 10);
  } else if (arg) {
    const found = circlesRepo.getByName(arg);
    if (found) circleId = found.id;
  }

  const circle = circlesRepo.getById(circleId);
  if (!circle) {
    await ctx.reply(`⚠️ Circle #${circleId} not found.`);
    return;
  }

  const result = await executeTool("propose_payout", {
    circleId,
    round: circle.current_round,
    notes: "Triggered manually via Telegram command",
  });

  if (!result.success) {
    await ctx.reply(`⚠️ *Payout Blocked by Guardrail:*\n${result.error}`, { parse_mode: "Markdown" });
    return;
  }

  const data = result.data as any;
  const { text: cardText, keyboard } = formatApprovalCard({
    approvalId: data.approvalId,
    circleName: data.approvalCard.circleName,
    round: data.round,
    recipientText: data.approvalCard.recipientText,
    amountText: data.approvalCard.amountText,
  });

  await ctx.reply(cardText, {
    parse_mode: "Markdown",
    reply_markup: keyboard,
  });
}

export async function handleNaturalMessage(ctx: Context): Promise<void> {
  const messageText = ctx.message?.text;
  if (!messageText || messageText.startsWith("/")) return;

  await ctx.replyWithChatAction("typing");

  try {
    const sessionId = String(ctx.chat?.id || ctx.from?.id || "default");
    const { response } = await coordinator.handleMessage(messageText, undefined, sessionId);
    await ctx.reply(response);
  } catch (err: any) {
    if (err?.message?.includes("503") || err?.message?.includes("high demand") || err?.message?.includes("UNAVAILABLE")) {
      await ctx.reply("⏳ *Google Gemini is currently handling a temporary traffic spike.* Please wait a few seconds and ask again!", { parse_mode: "Markdown" });
    } else {
      await ctx.reply(`⚠️ Error processing request: ${err?.message || String(err)}`);
    }
  }
}

