import type { Product, SupportedLanguage } from "@/types";
import { speakableName } from "@/lib/catalog/name";

/**
 * What she asks when the buyer taps Select.
 *
 * Tapping Select used to send "Mujhe {name} chahiye" and leave it to the model
 * to call request_consent. It did not always: one real session produced
 * "shall I proceed with the order?" alongside a fresh grid of four sarees,
 * because the model narrated consent while calling search_products. The words
 * and the machinery disagreed, and the buyer was asked to confirm with no way
 * to confirm.
 *
 * The client already knows exactly which saree was tapped. Asking a model to
 * restate a known fact — and hoping it reaches for the right tool while doing
 * so — is a gamble taken immediately before money moves. The guardrail engine
 * still runs on the selection; only the sentence is fixed.
 */
const rupees = (n: number) => n.toLocaleString("en-IN");

const LINES: Record<SupportedLanguage, (name: string, price: string) => string> = {
  hinglish: (n, p) => `${n}, ₹${p}. Order confirm karun?`,
  hi: (n, p) => `${n}, ₹${p}। ऑर्डर कन्फर्म करूँ?`,
  mr: (n, p) => `${n}, ₹${p}. ऑर्डर कन्फर्म करू का?`,
  en: (n, p) => `${n}, ₹${p}. Shall I place the order?`,
};

export function confirmLine(product: Product, language: SupportedLanguage): string {
  /* Short name: the catalog qualifier after the dash becomes a pause in the
     middle of the most important sentence in the conversation. */
  return (LINES[language] ?? LINES.hinglish)(
    speakableName(product, language),
    rupees(product.price),
  );
}
