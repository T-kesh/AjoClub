// ============================================================================
// Layer 1: Telegram Callback Query Handlers (callbacks.ts)
// Handles interactive button taps for Human-in-the-Loop approvals
// ============================================================================

import { Context } from "grammy";
import { approvalsRepo } from "../../db/index.js";
import { executeTool } from "../../agent/tools/index.js";

export async function handleApprovalCallbacks(ctx: Context): Promise<void> {
  const data = ctx.callbackQuery?.data;
  if (!data) return;

  const [action, approvalId] = data.split(":");
  if (!action || !approvalId) return;

  const approval = approvalsRepo.getById(approvalId);
  if (!approval) {
    await ctx.answerCallbackQuery({ text: "Approval request not found.", show_alert: true });
    return;
  }

  if (approval.status !== "PENDING") {
    await ctx.answerCallbackQuery({
      text: `This request has already been ${approval.status.toLowerCase()}.`,
      show_alert: true,
    });
    return;
  }

  const reviewerId = ctx.from?.id ? String(ctx.from.id) : "unknown";

  if (action === "approve") {
    await ctx.answerCallbackQuery({ text: "Processing approved payout on Base..." });

    // 1. Resolve approval in SQLite
    approvalsRepo.resolve(approvalId, "APPROVED", reviewerId);

    // 2. Execute gated payout tool
    const payload = JSON.parse(approval.payload);
    const result = await executeTool("execute_payout", {
      circleId: payload.circleId,
      round: payload.round,
      approvalId,
    });

    if (result.success) {
      const resData = result.data as any;
      await ctx.editMessageText(
        `✅ *Payout Approved & Broadcasted on Base!*\n\n` +
        `• *Recipient:* ${resData.recipient}\n` +
        `• *Transaction:* \`${resData.txHash}\` ${resData.simulated ? "(simulated)" : ""}\n` +
        `• *Status:* ${resData.message}`,
        { parse_mode: "Markdown" }
      );
    } else {
      await ctx.editMessageText(
        `❌ *Payout Execution Failed:*\n\n${result.error}`,
        { parse_mode: "Markdown" }
      );
    }
  } else if (action === "reject") {
    approvalsRepo.resolve(approvalId, "REJECTED", reviewerId);
    await ctx.answerCallbackQuery({ text: "Payout request rejected." });
    await ctx.editMessageText(
      `❌ *Payout Request Rejected by Organizer.*`,
      { parse_mode: "Markdown" }
    );
  }
}
