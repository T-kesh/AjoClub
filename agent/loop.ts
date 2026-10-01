// ============================================================================
// Layer 2: Autonomous Agent Loop (loop.ts)
// Executes scheduled cycle ticks & natural language reasoning with tool calling
// ============================================================================

import { circlesRepo, membersRepo, approvalsRepo, CircleRow } from "../db/index.js";
import { getLLMAdapter, LLMAdapter, LLMMessage } from "./llm/index.js";
import { TOOL_DEFINITIONS, executeTool } from "./tools/index.js";
import { GuardrailEngine } from "./guardrails/index.js";
import { formatApprovalCard } from "../bot/templates/cards.js";
import { sendTelegramApprovalCard } from "../bot/notifications.js";

export class AgentCoordinator {
  private llm: LLMAdapter;

  private sessionHistory: Map<string, LLMMessage[]> = new Map();

  constructor(llm?: LLMAdapter) {
    this.llm = llm || getLLMAdapter();
  }

  /**
   * Conversational reasoning loop:
   * Prompt -> LLM -> Tool Call -> Guardrail Engine -> Tool Output -> Natural Language Answer
   */
  public async handleMessage(prompt: string, circleId?: number, sessionId?: string): Promise<{ response: string; toolResults: unknown[] }> {
    const systemPrompt = `You are the autonomous AjoClub Circle Coordinator on Base.
Your job is to assist members and organizers in managing rotating savings circles (Ajos/Chamas).
You have access to tools for inspecting circle status, sending friendly payment reminders, proposing payouts, and gating executions.
CRITICAL INVARIANT: You NEVER sign transactions directly. You only propose actions or call gated tools.
Always be polite, encouraging, transparent, and concise.`;

    const history = sessionId ? (this.sessionHistory.get(sessionId) || []) : [];

    const messages: LLMMessage[] = [
      { role: "system", content: systemPrompt },
      ...history,
      { role: "user", content: circleId ? `[Context Circle #${circleId}] ${prompt}` : prompt },
    ];

    const toolResults: unknown[] = [];
    const firstResponse = await this.llm.chat(messages, TOOL_DEFINITIONS);

    let finalResponseText = firstResponse.content;

    // If LLM decided to call tools
    if (firstResponse.toolCalls && firstResponse.toolCalls.length > 0) {
      messages.push({
        role: "assistant",
        content: firstResponse.content || "",
        toolCalls: firstResponse.toolCalls,
        rawParts: firstResponse.rawParts,
      });

      for (const call of firstResponse.toolCalls) {
        console.log(`🔧 Agent calling tool: ${call.name} with args: ${JSON.stringify(call.args)}`);
        const result = await executeTool(call.name, call.args);
        toolResults.push(result);

        messages.push({
          role: "tool",
          toolCallId: call.id,
          name: call.name,
          content: JSON.stringify(result),
        });
      }

      // Ask LLM to synthesize final response from tool outputs
      const secondResponse = await this.llm.chat(messages);
      finalResponseText = secondResponse.content || firstResponse.content;
    }

    if (sessionId) {
      const updatedHistory: LLMMessage[] = [
        ...history,
        { role: "user", content: circleId ? `[Context Circle #${circleId}] ${prompt}` : prompt },
        { role: "assistant", content: finalResponseText },
      ].slice(-8);
      this.sessionHistory.set(sessionId, updatedHistory);
    }

    return {
      response: finalResponseText,
      toolResults,
    };
  }

  /**
   * Autonomous Scheduled Tick:
   * Evaluates all active circles on Base, triggers reminders for unpaid members,
   * proposes payouts when cycles finish, and flags defaults after grace period.
   */
  public async runAutonomousTick(): Promise<void> {
    const activeCircles = circlesRepo.getActive();
    console.log(`⏰ [AUTONOMOUS TICK] Evaluating ${activeCircles.length} active circles...`);

    const now = Math.floor(Date.now() / 1000);

    for (const circle of activeCircles) {
      const cycleEnd = circle.cycle_end_timestamp ?? 0;
      const graceEnd = cycleEnd + circle.grace_period_seconds;
      const members = membersRepo.getByCircle(circle.id);
      const unpaidMembers = members.filter((m) => m.has_paid_current_round === 0);

      // Case 1: Cycle has ended
      if (now >= cycleEnd) {
        // Can we propose payout?
        const check = GuardrailEngine.validatePayoutPrerequisites(circle.id, circle.current_round);
        if (check.valid) {
          // Prevent double-firing: Check if an approval is already pending
          const existingPending = approvalsRepo.getPendingForCircleAndRound(circle.id, circle.current_round);
          if (existingPending) {
            console.log(`ℹ️ [AUTONOMOUS TICK] Payout for Circle #${circle.id} Round #${circle.current_round + 1} already pending approval (${existingPending.id}). Skipping.`);
            continue;
          }

          console.log(`🎯 [AUTONOMOUS TICK] Circle #${circle.id} Round #${circle.current_round + 1} ready for payout! Proposing...`);
          const result = await executeTool("propose_payout", {
            circleId: circle.id,
            round: circle.current_round,
            notes: "Autonomous tick detected completed round with all requirements satisfied.",
          });

          if (result.success) {
            const data = (result as any).data;
            const { text: cardText, keyboard } = formatApprovalCard({
              approvalId: data.approvalId,
              circleName: data.approvalCard.circleName,
              round: data.round,
              recipientText: data.approvalCard.recipientText,
              amountText: data.approvalCard.amountText,
            });

            // Target destination: circle's Telegram chat or organizer's Telegram user ID
            const targetChatId = circle.telegram_chat_id;
            const organizer = members.find((m) => m.payout_order === 0 || m.wallet_address.toLowerCase() === circle.creator_address.toLowerCase());
            const organizerTgId = organizer?.telegram_user_id;

            let sent = false;
            if (targetChatId) {
              sent = await sendTelegramApprovalCard(targetChatId, cardText, keyboard);
              if (sent) {
                console.log(`📬 [AUTONOMOUS TICK] Dispatched payout approval card to group ${targetChatId} for Circle #${circle.id}`);
              }
            }
            if (!sent && organizerTgId) {
              sent = await sendTelegramApprovalCard(organizerTgId, cardText, keyboard);
              if (sent) {
                console.log(`📬 [AUTONOMOUS TICK] Dispatched payout approval card to organizer DM (${organizerTgId}) for Circle #${circle.id}`);
              }
            }

            if (!sent) {
              console.log(`ℹ️ [AUTONOMOUS TICK] Payout proposed for Circle #${circle.id} (Approval ID: ${data.approvalId}), but no valid Telegram destination reachable.`);
            }
          }
        } else if (now >= graceEnd && unpaidMembers.length > 0) {
          // Grace period expired and unpaid members exist -> flag default
          for (const delinquent of unpaidMembers) {
            console.log(`🚨 Grace period expired for member ${delinquent.wallet_address} in circle #${circle.id}`);
            await executeTool("flag_default", {
              circleId: circle.id,
              memberAddress: delinquent.wallet_address,
              reason: "Unpaid after cycle end and grace period",
            });
          }
        }
      } else {
        // Case 2: Cycle is active (Check reminder thresholds)
        const secondsRemaining = cycleEnd - now;
        const hoursRemaining = secondsRemaining / 3600;

        for (const unpaid of unpaidMembers) {
          let reminderType: "DUE_48H" | "DUE_24H" | "DUE_SOON" | null = null;
          if (hoursRemaining <= 6) {
            reminderType = "DUE_SOON";
          } else if (hoursRemaining <= 24) {
            reminderType = "DUE_24H";
          } else if (hoursRemaining <= 48) {
            reminderType = "DUE_48H";
          }

          if (reminderType) {
            const res = await executeTool("send_reminder", {
              circleId: circle.id,
              memberAddress: unpaid.wallet_address,
              reminderType,
            });
            if (res.success) {
              console.log(`📨 [AUTONOMOUS TICK] Dispatched ${reminderType} reminder to ${unpaid.wallet_address} for Circle #${circle.id}`);
            }
          }
        }
      }
    }
  }

  /**
   * Starts periodic polling tick (e.g. every 60 seconds)
   */
  public startScheduledLoop(intervalMs: number = 60000): NodeJS.Timeout {
    console.log(`🚀 Starting Autonomous Agent loop (interval: ${intervalMs / 1000}s)`);
    this.runAutonomousTick().catch(console.error);

    return setInterval(() => {
      this.runAutonomousTick().catch(console.error);
    }, intervalMs);
  }
}

// CLI runner if executed directly
if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, "/")}` || process.argv[1]?.endsWith("loop.ts")) {
  const agent = new AgentCoordinator();
  agent.startScheduledLoop(30000);
}
