// ============================================================================
// Layer 1: Telegram Bot Launcher (bot/index.ts)
// Powered by grammY
// ============================================================================

import { Bot } from "grammy";
import dotenv from "dotenv";
import {
  handleStart,
  handleHelp,
  handleStatus,
  handleCircles,
  handleLink,
  handleRemind,
  handlePayout,
  handleNaturalMessage,
} from "./handlers/commands.js";
import { handleApprovalCallbacks } from "./handlers/callbacks.js";
import { registerReminderDispatcher } from "../agent/tools/send_reminder.js";

dotenv.config();

const token = process.env.TELEGRAM_BOT_TOKEN;

import { registerActiveBot, sendTelegramNotification } from "./notifications.js";

let activeBot: Bot | null = null;

export function getBot(): Bot | null {
  return activeBot;
}

export async function sendTelegramDM(userId: string | number, message: string): Promise<boolean> {
  return sendTelegramNotification(userId, message);
}

// Hook dispatcher so agent loop and reminders send direct Telegram DMs
registerReminderDispatcher(sendTelegramDM);



export function createBot(): Bot | null {
  if (!token || token.trim().length === 0) {
    console.warn("⚠️ TELEGRAM_BOT_TOKEN is not set in .env. Bot is running in offline/dry-run mode.");
    return null;
  }

  const bot = new Bot(token);
  activeBot = bot;
  registerActiveBot(bot);

  // Command handlers
  bot.command("start", handleStart);
  bot.command("help", handleHelp);
  bot.command("status", handleStatus);
  bot.command("circles", handleCircles);
  bot.command("link", handleLink);
  bot.command("register", handleLink); // Alias for link
  bot.command("remind", handleRemind);
  bot.command("payout", handlePayout);

  // Interactive inline button callbacks
  bot.on("callback_query:data", handleApprovalCallbacks);

  // Natural language chat with Agent Core
  bot.on("message:text", handleNaturalMessage);

  return bot;
}

import { AjoClubIndexer } from "../indexer/index.js";
import { AgentCoordinator } from "../agent/loop.js";

let daemonIndexer: AjoClubIndexer | null = null;
let daemonCoordinator: AgentCoordinator | null = null;

export function getDaemonIndexer(): AjoClubIndexer | null {
  return daemonIndexer;
}

export function getDaemonCoordinator(): AgentCoordinator | null {
  return daemonCoordinator;
}

export async function startBot(): Promise<void> {
  const bot = createBot();
  if (!bot) {
    console.log("ℹ️ To activate live Telegram polling, add TELEGRAM_BOT_TOKEN to your .env file.");
    return;
  }

  console.log("==================================================");
  console.log("🤖 Starting AjoClub Unified Bot & Autonomous Daemon");
  console.log("==================================================");

  // 1. Initialize and launch on-chain event indexer in-process
  try {
    daemonIndexer = new AjoClubIndexer();
    await daemonIndexer.init();
    daemonIndexer.start();
    console.log("📡 [DAEMON] In-process on-chain indexer started (watching Base Sepolia)");
  } catch (err: any) {
    console.warn("⚠️ [DAEMON] Indexer initialization warning:", err.message);
  }

  // 2. Initialize and start autonomous agent loop in-process
  daemonCoordinator = new AgentCoordinator();
  daemonCoordinator.startScheduledLoop(15000);
  console.log("⏰ [DAEMON] Autonomous agent tick loop started in-process (interval: 15s)");

  // 3. Start Telegram Bot polling
  await bot.start({
    onStart: (info) => {
      console.log(`✅ [DAEMON] Bot @${info.username} is live and listening on Telegram!`);
      console.log("==================================================");
    },
  });
}

// Auto-run if executed directly via CLI
if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, "/")}` || process.argv[1]?.endsWith("index.ts")) {
  startBot().catch((err) => {
    console.error("❌ Failed to start bot:", err);
  });
}

