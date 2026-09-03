// ============================================================
// Conversation state, per session.
// ============================================================
// In-memory on purpose. A hackathon demo runs on one Vercel instance for a
// few minutes; Postgres round-trips per turn would add latency to the thing
// judges actually watch. Sessions expire so a long-running instance cannot
// grow without bound.
//
// The consent set is the part that matters: it is the record the guardrails
// check before any order. The model cannot write to it — only the
// request_consent tool and an affirmative buyer reply can.
// ============================================================

import "server-only";
import type { AgentMessage } from "./provider.ts";

/** Turns kept per session. Older turns are dropped to bound cost. */
const MAX_TURNS = 12;
const SESSION_TTL_MS = 60 * 60 * 1000;

interface Session {
  messages: AgentMessage[];
  /**
   * The ONE product the buyer was last asked to confirm.
   *
   * Deliberately singular. If the agent asks about saree A, she hesitates,
   * and it then asks about saree B, "haan" means yes to B. Holding a set here
   * would let one yes authorise a purchase she never agreed to.
   */
  pendingConsent: string | null;
  /** Products the buyer has agreed to and which have not yet been ordered. */
  grantedConsent: Set<string>;
  lastSeen: number;
}

const sessions = new Map<string, Session>();

function sweep() {
  const cutoff = Date.now() - SESSION_TTL_MS;
  for (const [id, s] of sessions) {
    if (s.lastSeen < cutoff) sessions.delete(id);
  }
}

function get(sessionId: string): Session {
  sweep();
  let s = sessions.get(sessionId);
  if (!s) {
    s = {
      messages: [],
      pendingConsent: null,
      grantedConsent: new Set(),
      lastSeen: Date.now(),
    };
    sessions.set(sessionId, s);
  }
  s.lastSeen = Date.now();
  return s;
}

export function getHistory(sessionId: string): AgentMessage[] {
  return [...get(sessionId).messages];
}

export function appendMessages(sessionId: string, messages: AgentMessage[]) {
  const s = get(sessionId);
  s.messages.push(...messages);

  /* Trim from the front, but never start the history on a tool result —
     a dangling result with no matching call confuses every provider. */
  while (s.messages.length > MAX_TURNS) s.messages.shift();
  while (s.messages.length && s.messages[0].role === "tool") s.messages.shift();
}

/**
 * Record that the agent asked the buyer to confirm this product.
 * Replaces any earlier pending request — she can only be answering the
 * question she was last asked.
 */
export function markConsentRequested(sessionId: string, productId: string) {
  get(sessionId).pendingConsent = productId;
}

/** True once the buyer has affirmatively agreed to this exact product. */
export function hasConsent(sessionId: string, productId: string): boolean {
  return get(sessionId).grantedConsent.has(productId);
}

/**
 * Words that count as agreement, across the four supported languages.
 * Deliberately narrow: "haan" is consent, "haan lekin" is not handled here —
 * the model still has to pick the right product, and the guardrail engine
 * still checks the amount.
 */
/*
 * Longest alternatives first, and the boundary is a Unicode-aware lookahead
 * rather than \b — \b only recognises ASCII word characters, so "हो" (Marathi
 * for yes) never matched and a Marathi buyer could never complete an order.
 */
const AFFIRMATIVE =
  /^\s*(haan|haa|hoy|yeah|yep|yes|okay|okey|sure|confirm|kar do|karo|theek|thik|ok|ya|ha|ho|होय|हाँ|हों|हा|हो|ठीक|करा|करो)(?![\p{L}\p{N}])/iu;

/*
 * Saying plainly what she wants, rather than agreeing to what was offered.
 *
 * "order kara" was answered with "which saree would you like to see?" — the
 * pattern above is anchored to the start of the message, so a sentence that
 * BEGINS with "order" never matched, and roman "kara" was missing even though
 * Devanagari करा was there. She had said exactly what she wanted and was asked
 * again.
 *
 * This one is deliberately unanchored, which is only safe because negation is
 * checked first: matching "order" anywhere would otherwise turn "nahi order
 * karo" into a purchase.
 */
const ORDER_INTENT =
  /(order|ऑर्डर|आर्डर|book|place)\s*(kara|karo|kar\s*do|karein|karun|kar|de\s*do|it|the\s*order|करा|करो|कर\s*दो|करें|कर)/iu;

/*
 * Anything that turns a sentence into a refusal. Checked BEFORE consent, so a
 * message containing both loses — the safe direction when the outcome is
 * spending someone's money.
 */
const NEGATION =
  /(nahi|nahin|mat|nako|don'?t|do not|cancel|rehne do|ruko|abhi nahi|नाही|नको|नहीं|मत|रुको)/iu;

/** A question about ordering is not an instruction to order. */
const QUESTION = /[?？]\s*$|\b(kaise|kaisa|kya|how|कैसे|कसं)\b/iu;

export function isAffirmative(text: string): boolean {
  const trimmed = text.trim();
  /* Refusal wins outright. */
  if (NEGATION.test(trimmed)) return false;
  if (AFFIRMATIVE.test(trimmed)) return true;
  if (QUESTION.test(trimmed)) return false;
  return ORDER_INTENT.test(trimmed);
}

/**
 * Promote the pending request to granted. Called ONLY when the buyer's own
 * message reads as agreement — never by the model, and never for more than
 * the single saree she was actually asked about.
 */
export function grantPendingConsent(sessionId: string): string[] {
  const s = get(sessionId);
  if (!s.pendingConsent) return [];
  const granted = s.pendingConsent;
  s.grantedConsent.add(granted);
  s.pendingConsent = null;
  return [granted];
}

/**
 * Spend the consent for a product once its order exists.
 *
 * Consent is single-use. Without this, a second "haan" — or a model that
 * called create_order twice — would place two orders on one agreement.
 */
export function consumeConsent(sessionId: string, productId: string) {
  get(sessionId).grantedConsent.delete(productId);
}

/** Drop the pending request — the buyer declined or changed direction. */
export function clearPendingConsent(sessionId: string) {
  get(sessionId).pendingConsent = null;
}

/** Test/debug helper. Not used by the app. */
export function resetSession(sessionId: string) {
  sessions.delete(sessionId);
}
