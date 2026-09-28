// ============================================================================
// Layer 2: LLM Adapter Factory (index.ts)
// Automatically selects Gemini, Anthropic Haiku, or Mock based on environment
// ============================================================================

import { LLMAdapter } from "./adapter.js";
import { GeminiAdapter } from "./gemini.js";
import { AnthropicAdapter } from "./anthropic.js";
import { MockLLMAdapter } from "./mock.js";
import dotenv from "dotenv";

dotenv.config();

export * from "./adapter.js";
export * from "./gemini.js";
export * from "./anthropic.js";
export * from "./mock.js";

export function getLLMAdapter(): LLMAdapter {
  const geminiKey = process.env.GEMINI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  if (geminiKey && geminiKey.trim().length > 0) {
    console.log("🤖 LLM Provider: Google Gemini (gemini-2.0-flash)");
    return new GeminiAdapter(geminiKey, "gemini-2.0-flash");
  }

  if (anthropicKey && anthropicKey.trim().length > 0) {
    console.log("🤖 LLM Provider: Anthropic Claude (claude-3-haiku-20240307)");
    return new AnthropicAdapter(anthropicKey, "claude-3-haiku-20240307");
  }

  console.log("🤖 LLM Provider: Mock LLM Adapter (Simulated / Local mode)");
  return new MockLLMAdapter();
}
