// ============================================================
// Chat request validation — pure, so it can be tested without a server.
// ============================================================
// Everything arriving here is attacker-controlled: the session id, the
// message, and especially the spending cap. Nothing is trusted as sent.
// ============================================================

import { clampSpendLimit } from "@/lib/guardrails/engine";

const MAX_MESSAGE_LENGTH = 2000;

export type ChatValidation =
  | {
      ok: true;
      message: string;
      sessionId: string;
      maxSpend: number;
      allowedCategories?: string[];
    }
  | { ok: false; status: number; error: string; message: string };

export function validateChatRequest(body: unknown): ChatValidation {
  const b = (body ?? {}) as Record<string, unknown>;

  const message = typeof b.message === "string" ? b.message.trim() : "";
  const sessionId = typeof b.session_id === "string" ? b.session_id.trim() : "";

  if (!message) {
    return {
      ok: false,
      status: 400,
      error: "missing_message",
      message: "message is required.",
    };
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    return {
      ok: false,
      status: 400,
      error: "message_too_long",
      message: `message must be under ${MAX_MESSAGE_LENGTH} characters.`,
    };
  }
  if (!sessionId) {
    return {
      ok: false,
      status: 400,
      error: "missing_session",
      message: "session_id is required.",
    };
  }

  const guardrails = (b.guardrails ?? {}) as Record<string, unknown>;

  /* The cap is clamped, never taken at face value: a tampered request must
     not be able to raise its own ceiling. */
  const maxSpend = clampSpendLimit(guardrails.max_spend);

  const rawCategories = guardrails.allowed_categories;
  const allowedCategories = Array.isArray(rawCategories)
    ? rawCategories.filter((c): c is string => typeof c === "string")
    : undefined;

  return {
    ok: true,
    message,
    sessionId,
    maxSpend,
    ...(allowedCategories?.length ? { allowedCategories } : {}),
  };
}
