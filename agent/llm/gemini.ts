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

  constructor(apiKey: string, model: string = "gemini-3.5-flash") {
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
          role: "user",
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

      if (msg.rawParts && msg.rawParts.length > 0) {
        return {
          role: "model",
          parts: msg.rawParts,
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

    const maxRetries = 3;
    let data: any = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          const errorText = await response.text();
          if ((response.status === 503 || response.status === 429) && attempt < maxRetries - 1) {
            console.warn(`⚠️ [Gemini ${this.model}] Status ${response.status} on attempt ${attempt + 1}. Retrying in ${(attempt + 1) * 1.5}s...`);
            await new Promise((res) => setTimeout(res, (attempt + 1) * 1500));
            continue;
          }
          throw new Error(`Gemini API Error [${response.status}]: ${errorText}`);
        }

        data = await response.json();
        break;
      } catch (err: any) {
        if (attempt === maxRetries - 1) {
          throw err;
        }
        if (err.message?.includes("503") || err.message?.includes("429")) {
          await new Promise((res) => setTimeout(res, (attempt + 1) * 1500));
          continue;
        }
        throw err;
      }
    }
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
      rawParts: parts,
      provider: "Gemini",
      model: this.model,
    };
  }
}
