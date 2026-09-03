import type { SupportedLanguage } from "@/types";

/**
 * The first thing she asks: what do you want to spend?
 *
 * This is the difference between a demo and an agent. The spending limit used
 * to be a number we chose and displayed beside the composer, so the refusal
 * later was OUR rule imposed on a stranger. When the buyer names the figure
 * herself, the identical refusal becomes the agent keeping her word — which is
 * the claim this project is actually making, and it costs one question to
 * make it true.
 *
 * It also fixes the demo problem honestly. A guided tour with a step labelled
 * "watch it refuse" narrates the mechanism instead of being a shop. A budget
 * question is what a real shopkeeper opens with, and it sets the guardrail up
 * on its own.
 */

const rupees = (n: number) => n.toLocaleString("en-IN");

export interface Budget {
  amount: number;
  label: string;
}

/**
 * The amounts she offers, ascending.
 *
 * ₹1,000 sits deliberately below the cheapest real Paithani (₹8,999): a buyer
 * who takes the first option meets the guardrail on her very next request,
 * without anything being labelled or staged. The upper options are real
 * choices, not decoration — at ₹25,000 the same Paithani goes through, which
 * is the proof that the engine is reading a number and not refusing on
 * principle.
 */
export const BUDGETS: Budget[] = [
  { amount: 1000, label: `₹${rupees(1000)}` },
  { amount: 5000, label: `₹${rupees(5000)}` },
  { amount: 25000, label: `₹${rupees(25000)}` },
];

/* Follows the buyer-gender rule the rest of the copy follows: imperatives, or
   verbs that agree with her or with a noun — never with the buyer. */
const REPLIES: Record<SupportedLanguage, (amount: string) => string> = {
  hinglish: (a) => `Theek hai — ₹${a} tak. Ab bataiye, kaisi saree dikhaun?`,
  hi: (a) => `ठीक है — ₹${a} तक। अब बताइए, कैसी साड़ी दिखाऊँ?`,
  mr: (a) => `ठीक आहे — ₹${a} पर्यंत. आता सांगा, कशी साडी दाखवू?`,
  en: (a) => `Right — up to ₹${a}. Now tell me, what kind of saree shall I show you?`,
};

/** Her confirmation that she heard the number, in the buyer's language. */
export function budgetReply(amount: number, language: SupportedLanguage): string {
  return (REPLIES[language] ?? REPLIES.hinglish)(rupees(amount));
}

/* Matches the engine's own ceiling. An offered or typed amount that the engine
   would clamp must not be echoed back, or she confirms one number and the
   guardrail enforces another. */
const MIN_BUDGET = 1;
const MAX_BUDGET = 100000;

/** Devanagari digits, so "२५०००" is read as an amount too. */
const DEVANAGARI_DIGITS = "०१२३४५६७८९";
const toLatinDigits = (s: string) =>
  s.replace(/[०-९]/g, (d) => String(DEVANAGARI_DIGITS.indexOf(d)));

/* Words that make a number an answer about money rather than a shopping
   request. Split in two on purpose: \b matches only ASCII word characters, so
   a boundary after a Devanagari word never fires and "मेरा बजट 3000 है" was
   read as an ordinary message. The same trap is documented in the agent's
   language detection, which had to drop \b for exactly this reason. */
const BUDGET_WORDS_LATIN = /\b(budget|limit|tak|rupees|rs)\b/i;
const BUDGET_WORDS_DEVANAGARI = /(बजट|बजेट|मर्यादा|सीमा|पर्यंत|रुपये|रुपए)/u;
const namesMoney = (text: string) =>
  BUDGET_WORDS_LATIN.test(text) || BUDGET_WORDS_DEVANAGARI.test(text);

/**
 * The amount in a typed reply, if the reply is actually about the budget.
 *
 * She may tap a chip or simply write "mera budget 2000 hai" — the chips are a
 * shortcut, not the only way in.
 *
 * But a number alone is not consent to read a message as a budget.
 * "1000 ke under cotton saree dikhao" is a request for SAREES that happens to
 * contain a figure, and treating it as an answer would swallow her real
 * message and re-answer a question she had already moved past. So the text
 * must either be essentially just the amount, or say plainly that it is about
 * money.
 */
export function isBudgetAnswer(text: string): number | null {
  const raw = (text ?? "").trim();
  const cleaned = toLatinDigits(raw).replace(/[,\s₹]/g, "");
  const match = cleaned.match(/\d+/);
  if (!match) return null;

  const amount = Number(match[0]);
  if (!Number.isFinite(amount) || amount < MIN_BUDGET || amount > MAX_BUDGET) {
    return null;
  }

  /* Essentially just the number — "1000", "₹5,000", "25000". */
  const bare = /^[₹\s]*[\d,\s]+$/.test(toLatinDigits(raw));
  if (bare) return amount;

  /* Or it says what the number is FOR. */
  return namesMoney(raw) ? amount : null;
}
