// ============================================================================
// Layer 1: Telegram Notifications Dispatcher
// Unified messaging dispatcher usable across bot daemon and worker processes
// ============================================================================

import { Bot } from "grammy";
import dotenv from "dotenv";

dotenv.config();

let activeBotInstance: Bot | null = null;
let standaloneBotInstance: Bot | null = null;

export function registerActiveBot(bot: Bot): void {
  activeBotInstance = bot;
}

/**
 * Sends a formatted Markdown message to a Telegram chat or direct user.
 * Reuses the active bot instance when running in-process, or falls back to
 * a standalone GrammY Bot API client if running in an independent process.
 */
export async function sendTelegramNotification(
  targetChatOrUserId: string | number,
  message: string
): Promise<boolean> {
  // 1. Try active in-process bot first
  if (activeBotInstance) {
    try {
      await activeBotInstance.api.sendMessage(targetChatOrUserId, message, {
        parse_mode: "Markdown",
        link_preview_options: { is_disabled: true },
      });
      return true;
    } catch (err: any) {
      console.warn(`⚠️ [Telegram Notification] Active bot failed to deliver to ${targetChatOrUserId}: ${err.message}`);
      return false;
    }
  }

  // 2. Standalone client for separate worker processes (e.g. standalone indexer)
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || token.trim().length === 0) {
    return false;
  }

  try {
    if (!standaloneBotInstance) {
      standaloneBotInstance = new Bot(token);
    }
    await standaloneBotInstance.api.sendMessage(targetChatOrUserId, message, {
      parse_mode: "Markdown",
      link_preview_options: { is_disabled: true },
    });
    return true;
  } catch (err: any) {
    console.warn(`⚠️ [Telegram Notification] Standalone client failed to deliver to ${targetChatOrUserId}: ${err.message}`);
    return false;
  }
}
