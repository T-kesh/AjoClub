// ============================================================================
// Layer 2: Google Gemini Adapter (gemini.ts)
// Supports gemini-2.0-flash and gemini-1.5-flash with native Tool Calling
// ============================================================================

import { LLMAdapter, LLMMessage, LLMResponse, ToolCall } from "./adapter.js";
import { ToolDefinition } from "../tools/index.js";

export class GeminiAdapter implements LLMAdapter {
  public name = "Gemini";
  public model: string;
  private apiKey: string;
  private baseUrl = "https://generativelanguage.googleapis.com/v1beta/models";

  constructor(apiKey: string, model: string = "gemini-2.0-flash") {
    this.apiKey = apiKey;
    this.model = model;
  }

  public async chat(messages: LLMMessage[], tools?: ToolDefinition[]): Promise<LLMResponse> {
    const url = `${this.baseUrl}/${this.model}:generateContent?key=${this.apiKey}`;

    // Separate system instructions from conversation history
    const systemMsg = messages.find((m) => m.role === "system");
    const conversation = messages.filter((m) => m.role !== "system");

    const contents = conversation.map((msg) => {
      if (msg.role === "tool") {
        return {
          role: "function",
          parts: [
            {
              functionResponse: {
                name: msg.name || "tool_result",
                response: { content: msg.content },
              },
            },
          ],
        };
      }

      if (msg.toolCalls && msg.toolCalls.length > 0) {
        return {
          role: "model",
          parts: msg.toolCalls.map((tc) => ({
            functionCall: {
              name: tc.name,
              args: tc.args,
            },
          })),
        };
      }

      return {
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }],
      };
    });

    const body: Record<string, unknown> = {
      contents,
    };

    if (systemMsg) {
      body.systemInstruction = {
        parts: [{ text: systemMsg.content }],
      };
    }

    if (tools && tools.length > 0) {
      body.tools = [
        {
          functionDeclarations: tools.map((t) => ({
            name: t.name,
            description: t.description,
            parameters: t.parameters,
          })),
        },
      ];
    }

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API Error [${response.status}]: ${errorText}`);
    }

    const data = await response.json();
    const candidate = data.candidates?.[0];
    const parts = candidate?.content?.parts || [];

    let textContent = "";
    const toolCalls: ToolCall[] = [];

    for (const part of parts) {
      if (part.text) {
        textContent += part.text;
      }
      if (part.functionCall) {
        toolCalls.push({
          id: `call_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          name: part.functionCall.name,
          args: part.functionCall.args || {},
        });
      }
    }

    return {
      content: textContent,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      provider: "Gemini",
      model: this.model,
    };
  }
}
