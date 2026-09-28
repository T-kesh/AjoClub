// ============================================================================
// Layer 4 Guardrail: Rate Limiter & Anti-Spam (rate_limits.ts)
// Protects members from notification spam and prevents RPC/API floods
// ============================================================================

import { remindersRepo } from "../../db/index.js";

export interface RateLimitResult {
  allowed: boolean;
  reason?: string;
}

// In-memory rate limiting for tool calls (sliding window per circle)
const toolCallHistory: Map<string, number[]> = new Map();
const MAX_CALLS_PER_MINUTE = 20;

/**
 * Validates whether a reminder can be dispatched to a member.
 * Ensures members are not reminded more than once per milestone per round.
 */
export function checkReminderRateLimit(
  circleId: number,
  round: number,
  memberAddress: string,
  reminderType: string
): RateLimitResult {
  const alreadySent = remindersRepo.hasSent(circleId, round, memberAddress, reminderType);
  if (alreadySent) {
    return {
      allowed: false,
      reason: `Reminder '${reminderType}' was already sent to ${memberAddress} for round ${round}`,
    };
  }

  return { allowed: true };
}

/**
 * Sliding window rate limit on agent tool executions per circle.
 */
export function checkToolCallRateLimit(circleId: number, toolName: string): RateLimitResult {
  const key = `${circleId}:${toolName}`;
  const now = Date.now();
  const oneMinuteAgo = now - 60000;

  const timestamps = (toolCallHistory.get(key) || []).filter((t) => t > oneMinuteAgo);
  if (timestamps.length >= MAX_CALLS_PER_MINUTE) {
    return {
      allowed: false,
      reason: `Tool '${toolName}' rate limit exceeded (${MAX_CALLS_PER_MINUTE} calls/min) for circle ${circleId}`,
    };
  }

  timestamps.push(now);
  toolCallHistory.set(key, timestamps);
  return { allowed: true };
}
