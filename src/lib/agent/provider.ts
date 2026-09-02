// ============================================================
// LLM provider interface — the seam that makes the model swappable.
// ============================================================
// Everything that matters to this product — guardrails, consent gating, the
// audit trail, the API contract — sits ABOVE this line and never learns which
// model is underneath. Switching providers is an env var, not a rewrite.
//
//   AGENT_PROVIDER=gemini      (default, free tier)
//   AGENT_PROVIDER=anthropic   (if quality ever demands it)
// ============================================================

/** A tool the model may call. Provider-neutral JSON-Schema-ish shape. */
export interface ToolSpec {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

/** The model asked to run a tool. */
export interface ToolCall {
  /** Provider-assigned id, used to match the result back. May be synthesised. */
  id: string;
  name: string;
  args: Record<string, unknown>;
  /**
   * Opaque provider state that must be replayed verbatim when this call is
   * echoed back in history. Gemini 3.x rejects a function call resent without
   * its `thoughtSignature`; other providers may need their own bookkeeping.
   * Nothing above the provider layer should read this.
   */
  providerMeta?: Record<string, unknown>;
}

/** One entry in the conversation, in provider-neutral form. */
export type AgentMessage =
  | { role: "user"; content: string }
  | { role: "assistant"; content: string; toolCalls?: ToolCall[] }
  | { role: "tool"; toolCallId: string; name: string; content: string };

export interface CompletionRequest {
  system: string;
  messages: AgentMessage[];
  tools: ToolSpec[];
  /** Hard ceiling on generated tokens. Protects a finite credit balance. */
  maxTokens?: number;
}

export interface CompletionResult {
  /** Prose the model produced. May be empty when it only called a tool. */
  text: string;
  toolCalls: ToolCall[];
  /** Best-effort token accounting, for cost visibility. Not all providers report it. */
  usage?: { input: number; output: number };
}

export interface LlmProvider {
  /** Human-readable id, e.g. "gemini:gemini-3.6-flash". Logged to the audit trail. */
  readonly id: string;
  complete(request: CompletionRequest): Promise<CompletionResult>;
}

/**
 * Raised when a provider fails in a way the agent cannot recover from.
 * The chat route turns this into a `type: "error"` response rather than a 500,
 * so the buyer sees an ErrorCard instead of a blank screen.
 */
export class ProviderError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "ProviderError";
  }
}
