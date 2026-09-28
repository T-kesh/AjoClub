// ============================================================================
// Layer 1: Telegram Command Handlers (commands.ts)
// ============================================================================

import { Context } from "grammy";
import { executeTool } from "../../agent/tools/index.js";
import { AgentCoordinator } from "../../agent/loop.js";
import { formatCircleStatusMessage, formatApprovalCard } from "../templates/cards.js";
import { circlesRepo } from "../../db/index.js";

const coordinator = new AgentCoordinator();

export async function handleStart(ctx: Context): Promise<void> {
  const welcomeText = [
    `🫙 *Welcome to AjoClub Coordinator on Base!*`,
    ``,
    `I am your autonomous onchain savings circle secretary. I track rounds, calculate pots, send timely reminders, and prepare safe, non-custodial payouts.`,
    ``,
    `📋 *Commands:*`,
    `• \`/status <circleId>\` — View round progress & member status`,
    `• \`/remind <circleId>\` — Check unpaid members and send payment reminders`,
    `• \`/payout <circleId>\` — Evaluate and propose round payout for approval`,
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
    `1. *Messaging Layer:* Interactive Telegram cards & notifications`,
    `2. *Agent Core:* LLM reasoning (Gemini / Claude Haiku)`,
    `3. *Tool Layer:* Typed Zod functions (status, reminder, payout)`,
    `4. *Guardrail Engine:* Plain deterministic code (caps, rate limits, allowlists, human-in-the-loop approvals)`,
    `5. *Chain Layer:* Base contracts & native USDC`,
    ``,
    `🔒 *Security Invariant:* Funds remain non-custodial inside the verified contract on Base. The agent cannot sign or divert funds.`,
  ].join("\n");

  await ctx.reply(helpText, { parse_mode: "Markdown" });
}

export async function handleStatus(ctx: Context): Promise<void> {
  const text = ctx.message?.text || "";
  const match = text.match(/\/status(?:\s+(\d+))?/i);
  const circleId = match && match[1] ? parseInt(match[1], 10) : 1;

  const result = await executeTool("get_circle_status", { circleId });
  if (!result.success) {
    await ctx.reply(`⚠️ ${result.error}`);
    return;
  }

  const cardText = formatCircleStatusMessage(result.data);
  await ctx.reply(cardText, { parse_mode: "Markdown" });
}

export async function handleRemind(ctx: Context): Promise<void> {
  const text = ctx.message?.text || "";
  const match = text.match(/\/remind(?:\s+(\d+))?/i);
  const circleId = match && match[1] ? parseInt(match[1], 10) : 1;

  const circle = circlesRepo.getById(circleId);
  if (!circle) {
    await ctx.reply(`⚠️ Circle #${circleId} not found.`);
    return;
  }

  const { response } = await coordinator.handleMessage(
    `Check circle #${circleId} for any unpaid members and send a 24-hour reminder if appropriate.`,
    circleId
  );

  await ctx.reply(response);
}

export async function handlePayout(ctx: Context): Promise<void> {
  const text = ctx.message?.text || "";
  const match = text.match(/\/payout(?:\s+(\d+))?/i);
  const circleId = match && match[1] ? parseInt(match[1], 10) : 1;

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
    const { response } = await coordinator.handleMessage(messageText);
    await ctx.reply(response);
  } catch (err) {
    await ctx.reply(`⚠️ Error processing request: ${err instanceof Error ? err.message : String(err)}`);
  }
}
