// ============================================================================
// Layer 2: Anthropic Claude Haiku Adapter (anthropic.ts)
// Supports claude-3-haiku and claude-3-5-haiku with native Tool Calling
// ============================================================================

import { LLMAdapter, LLMMessage, LLMResponse, ToolCall } from "./adapter.js";
import { ToolDefinition } from "../tools/index.js";

export class AnthropicAdapter implements LLMAdapter {
  public name = "Anthropic";
  public model: string;
  private apiKey: string;
  private baseUrl = "https://api.anthropic.com/v1/messages";

  constructor(apiKey: string, model: string = "claude-3-haiku-20240307") {
    this.apiKey = apiKey;
    this.model = model;
  }

  public async chat(messages: LLMMessage[], tools?: ToolDefinition[]): Promise<LLMResponse> {
    const systemMsg = messages.find((m) => m.role === "system");
    const conversation = messages.filter((m) => m.role !== "system");

    const anthropicMessages = conversation.map((msg) => {
      if (msg.role === "tool") {
        return {
          role: "user",
          content: [
            {
              type: "tool_result",
              tool_use_id: msg.toolCallId || "unknown_id",
              content: msg.content,
            },
          ],
        };
      }

      if (msg.toolCalls && msg.toolCalls.length > 0) {
        return {
          role: "assistant",
          content: msg.toolCalls.map((tc) => ({
            type: "tool_use",
            id: tc.id,
            name: tc.name,
            input: tc.args,
          })),
        };
      }

      return {
        role: msg.role === "assistant" ? "assistant" : "user",
        content: msg.content,
      };
    });

    const body: Record<string, unknown> = {
      model: this.model,
      max_tokens: 1024,
      messages: anthropicMessages,
    };

    if (systemMsg) {
      body.system = systemMsg.content;
    }

    if (tools && tools.length > 0) {
      body.tools = tools.map((t) => ({
        name: t.name,
        description: t.description,
        input_schema: t.parameters,
      }));
    }

    const response = await fetch(this.baseUrl, {
      method: "POST",
      headers: {
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Anthropic API Error [${response.status}]: ${errorText}`);
    }

    const data = await response.json();
    let textContent = "";
    const toolCalls: ToolCall[] = [];

    for (const block of data.content || []) {
      if (block.type === "text") {
        textContent += block.text;
      }
      if (block.type === "tool_use") {
        toolCalls.push({
          id: block.id,
          name: block.name,
          args: block.input || {},
        });
      }
    }

    return {
      content: textContent,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      provider: "Anthropic",
      model: this.model,
    };
  }
}
