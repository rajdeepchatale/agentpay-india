// ============================================================
// Chat request validation — pure, so it can be tested without a server.
// ============================================================
// Everything arriving here is attacker-controlled: the session id, the
// message, and especially the spending cap. Nothing is trusted as sent.
// ============================================================

import { clampSpendLimit } from "@/lib/guardrails/engine";
import type { SupportedLanguage } from "@/types";
import { getProductById } from "@/lib/catalog/search";

const MAX_MESSAGE_LENGTH = 2000;

/* An explicit list, not a cast. The value indexes phrase tables and reaches
   the system prompt, so "__proto__" or an unknown tag must fall through to
   detection rather than either of those. */
const LANGUAGES: readonly SupportedLanguage[] = ["hi", "mr", "hinglish", "en"];

function readLanguage(raw: unknown): SupportedLanguage | undefined {
  return typeof raw === "string" && LANGUAGES.includes(raw as SupportedLanguage)
    ? (raw as SupportedLanguage)
    : undefined;
}

export type ChatValidation =
  | {
      ok: true;
      message: string;
      sessionId: string;
      maxSpend: number;
      allowedCategories?: string[];
      /** Her explicit choice. Absent means detect it from what she wrote. */
      language?: SupportedLanguage;
      /** The thread so far, carried by the client. See readHistory. */
      history?: Array<{ role: "user" | "assistant"; content: string }>;
      /** The saree the agent last asked her to confirm. Catalog-checked. */
      pendingProductId?: string;
      /** The saree she just tapped Select on. Catalog-checked. */
      selectedProductId?: string;
    }
  | { ok: false; status: number; error: string; message: string };

/* How much of the thread is worth carrying, and how much of one turn.
   Enough for the model to follow "pehli wali" and "order kara"; not enough
   for a caller to push a novel through the context window on our budget. */
const MAX_HISTORY_TURNS = 20;
const MAX_HISTORY_CHARS = 2000;

/**
 * The conversation so far, as sent by the client.
 *
 * It has to come from the client because the server has nowhere to keep it:
 * history lived in a module-scope Map, which on a serverless platform is
 * per-INSTANCE. Turn one is written into one container's memory and turn two
 * can be served by another, so the model is handed a blank slate and asks
 * what she wants all over again.
 *
 * Untrusted like everything else that crosses this boundary. Only the two
 * roles a conversation actually has are allowed — a forged "system" turn is
 * the obvious way to try to rewrite the agent's instructions — and the
 * guardrail engine still re-reads every price from the catalog, so nothing
 * here can move money.
 */
function readHistory(
  raw: unknown,
): Array<{ role: "user" | "assistant"; content: string }> | undefined {
  if (!Array.isArray(raw)) return undefined;

  const turns = raw
    .filter(
      (t): t is { role: string; content: string } =>
        !!t &&
        typeof t === "object" &&
        typeof (t as { content?: unknown }).content === "string" &&
        ((t as { role?: unknown }).role === "user" ||
          (t as { role?: unknown }).role === "assistant"),
    )
    .map((t) => ({
      role: t.role as "user" | "assistant",
      content: t.content.slice(0, MAX_HISTORY_CHARS),
    }))
    /* The most recent turns are the ones that carry the thread. */
    .slice(-MAX_HISTORY_TURNS);

  return turns.length ? turns : undefined;
}

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

  const language = readLanguage(b.language);
  const history = readHistory(b.history);

  /* Which saree the agent last asked about. Carried for the same reason the
     history is — pending consent lived in the same per-instance Map, so on a
     later turn the server had forgotten what it had offered and asked again.
     
     Checked against the catalog here, and the engine still re-reads the price
     and the cap, so the worst a forged id can do is name a real saree the
     buyer must still agree to in her own words. */
  const rawPending = b.pending_product_id;
  const pendingProductId =
    typeof rawPending === "string" && getProductById(rawPending.trim())
      ? rawPending.trim()
      : undefined;

  const rawSelected = b.selected_product_id;
  const selectedProductId =
    typeof rawSelected === "string" && getProductById(rawSelected.trim())
      ? rawSelected.trim()
      : undefined;

  return {
    ok: true,
    message,
    sessionId,
    maxSpend,
    ...(allowedCategories?.length ? { allowedCategories } : {}),
    ...(language ? { language } : {}),
    ...(history ? { history } : {}),
    ...(pendingProductId ? { pendingProductId } : {}),
    ...(selectedProductId ? { selectedProductId } : {}),
  };
}
