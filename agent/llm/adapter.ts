// ============================================================================
// Layer 2: LLM Adapter Interface (adapter.ts)
// Defines unified interface for Gemini, Anthropic Haiku, and Mock fallback
// ============================================================================

import { ToolDefinition } from "../tools/index.js";

export interface ToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
}

export interface LLMMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  toolCallId?: string;
  name?: string;
  toolCalls?: ToolCall[];
}

export interface LLMResponse {
  content: string;
  toolCalls?: ToolCall[];
  provider: string;
  model: string;
}

export interface LLMAdapter {
  name: string;
  model: string;
  chat(messages: LLMMessage[], tools?: ToolDefinition[]): Promise<LLMResponse>;
}
