// ============================================================================
// Layer 2: Deterministic Mock LLM Adapter (mock.ts)
// Provides canned intelligent reasoning for testing and local demos
// ============================================================================

import { LLMAdapter, LLMMessage, LLMResponse } from "./adapter.js";
import { ToolDefinition } from "../tools/index.js";

export class MockLLMAdapter implements LLMAdapter {
  public name = "MockLLM (Simulated)";
  public model = "mock-reasoning-v1";

  public async chat(messages: LLMMessage[], tools?: ToolDefinition[]): Promise<LLMResponse> {
    const lastUserMessage = [...messages].reverse().find((m) => m.role === "user")?.content || "";

    // Simulated reasoning logic based on user prompt context
    if (/status|inspect|check circle/i.test(lastUserMessage)) {
      const circleMatch = lastUserMessage.match(/circle\s*#?(\d+)/i);
      const circleId = circleMatch ? parseInt(circleMatch[1], 10) : 1;

      return {
        content: `I will inspect the current state of Circle #${circleId}.`,
        toolCalls: [
          {
            id: "mock_call_status",
            name: "get_circle_status",
            args: { circleId },
          },
        ],
        provider: "MockLLM",
        model: this.model,
      };
    }

    if (/remind|unpaid|late/i.test(lastUserMessage)) {
      const circleMatch = lastUserMessage.match(/circle\s*#?(\d+)/i);
      const circleId = circleMatch ? parseInt(circleMatch[1], 10) : 1;
      const addressMatch = lastUserMessage.match(/0x[a-fA-F0-9]{40}/);
      const memberAddress = addressMatch ? addressMatch[0] : "0x2222222222222222222222222222222222222222";

      return {
        content: `I noticed member ${memberAddress} has not yet contributed. I will prepare a payment reminder.`,
        toolCalls: [
          {
            id: "mock_call_remind",
            name: "send_reminder",
            args: {
              circleId,
              memberAddress,
              reminderType: "DUE_24H",
              customNote: "Friendly reminder from the Ajo automated secretary!",
            },
          },
        ],
        provider: "MockLLM",
        model: this.model,
      };
    }

    if (/payout|trigger|distribute/i.test(lastUserMessage)) {
      const circleMatch = lastUserMessage.match(/circle\s*#?(\d+)/i);
      const circleId = circleMatch ? parseInt(circleMatch[1], 10) : 1;

      return {
        content: `All prerequisite conditions for Round payout appear satisfied. I will submit a payout proposal to the organizer.`,
        toolCalls: [
          {
            id: "mock_call_payout",
            name: "propose_payout",
            args: {
              circleId,
              round: 0,
              notes: "Cycle duration elapsed and required contributions collected.",
            },
          },
        ],
        provider: "MockLLM",
        model: this.model,
      };
    }

    return {
      content: `I am the AjoClub Autonomous Circle Coordinator on Base. How can I help you manage your savings circle today?`,
      provider: "MockLLM",
      model: this.model,
    };
  }
}
