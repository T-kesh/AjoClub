// ============================================================================
// Layer 3: Tool Layer Registry & Dispatcher
// ============================================================================

import { getCircleStatus, getCircleStatusSchema } from "./get_circle_status.js";
import { sendReminder, sendReminderSchema } from "./send_reminder.js";
import { flagDefault, flagDefaultSchema } from "./flag_default.js";
import { proposePayout, proposePayoutSchema } from "./propose_payout.js";
import { executePayout, executePayoutSchema } from "./execute_payout.js";

export * from "./get_circle_status.js";
export * from "./send_reminder.js";
export * from "./flag_default.js";
export * from "./propose_payout.js";
export * from "./execute_payout.js";

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

/**
 * Standard tool specifications formatted for LLM Function Calling (Gemini & Anthropic)
 */
export const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    name: "get_circle_status",
    description: "Fetches full status report of an Ajo savings circle including round, pot collected, payment statuses, and next recipient.",
    parameters: {
      type: "object",
      properties: {
        circleId: {
          type: "integer",
          description: "The internal ID of the circle to inspect",
        },
      },
      required: ["circleId"],
    },
  },
  {
    name: "send_reminder",
    description: "Drafts and schedules a friendly, contextual payment reminder to an unpaid member. Anti-spam guardrails prevent duplicate reminders.",
    parameters: {
      type: "object",
      properties: {
        circleId: {
          type: "integer",
          description: "The internal ID of the circle",
        },
        memberAddress: {
          type: "string",
          description: "The 0x Base wallet address of the delinquent/unpaid member",
        },
        reminderType: {
          type: "string",
          enum: ["DUE_48H", "DUE_24H", "DUE_SOON", "GRACE_PERIOD"],
          description: "Milestone stage of the reminder",
        },
        customNote: {
          type: "string",
          description: "Optional personalized message from the organizer",
        },
      },
      required: ["circleId", "memberAddress", "reminderType"],
    },
  },
  {
    name: "flag_default",
    description: "Flags a member who failed to contribute after both the cycle duration and grace period expired. Sets status to DEFAULTED.",
    parameters: {
      type: "object",
      properties: {
        circleId: {
          type: "integer",
          description: "The internal ID of the circle",
        },
        memberAddress: {
          type: "string",
          description: "The 0x wallet address of the member who defaulted",
        },
        reason: {
          type: "string",
          description: "Optional explanation of the default determination",
        },
      },
      required: ["circleId", "memberAddress"],
    },
  },
  {
    name: "propose_payout",
    description: "Evaluates circle prerequisites and proposes a round payout. Creates a Human-In-The-Loop approval card for the organizer.",
    parameters: {
      type: "object",
      properties: {
        circleId: {
          type: "integer",
          description: "The internal ID of the circle",
        },
        round: {
          type: "integer",
          description: "The round number (0-indexed) to trigger payout for",
        },
        notes: {
          type: "string",
          description: "Optional notes explaining why the payout is ready",
        },
      },
      required: ["circleId", "round"],
    },
  },
  {
    name: "execute_payout",
    description: "Executes an onchain payout. GATED: strictly requires a valid, unexpired approvalId signed off by the human organizer.",
    parameters: {
      type: "object",
      properties: {
        circleId: {
          type: "integer",
          description: "The internal ID of the circle",
        },
        round: {
          type: "integer",
          description: "The round number to execute",
        },
        approvalId: {
          type: "string",
          description: "The cryptographic/database approval ID granted by the human organizer",
        },
      },
      required: ["circleId", "round", "approvalId"],
    },
  },
];

/**
 * Universal typed tool execution dispatcher
 */
export async function executeTool(name: string, args: Record<string, unknown>): Promise<{ success: boolean; data?: unknown; error?: string }> {
  try {
    switch (name) {
      case "get_circle_status": {
        const parsed = getCircleStatusSchema.parse(args);
        return await getCircleStatus(parsed);
      }
      case "send_reminder": {
        const parsed = sendReminderSchema.parse(args);
        return await sendReminder(parsed);
      }
      case "flag_default": {
        const parsed = flagDefaultSchema.parse(args);
        return await flagDefault(parsed);
      }
      case "propose_payout": {
        const parsed = proposePayoutSchema.parse(args);
        return await proposePayout(parsed);
      }
      case "execute_payout": {
        const parsed = executePayoutSchema.parse(args);
        return await executePayout(parsed);
      }
      default:
        return { success: false, error: `Unknown tool '${name}'` };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
