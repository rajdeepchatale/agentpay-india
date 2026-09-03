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

/**
 * What she says once the order exists but nothing is paid.
 *
 * An order is a request to pay. Saying it is confirmed, or that the saree is
 * on its way, is a lie the buyer can disprove by looking at the Pay now
 * button still sitting there — which is exactly what the model used to do,
 * three times out of three, before the prompt was given a section about it.
 * Templated here because this line now comes from the deterministic path.
 */
const READY: Record<SupportedLanguage, (name: string, price: string) => string> = {
  hinglish: (n, p) => `${n} ka order ready hai, ₹${p}. Pay now dabaiye aur saree aapki.`,
  hi: (n, p) => `${n} का ऑर्डर तैयार है, ₹${p}। पेमेंट पूरा कीजिए और साड़ी आपकी।`,
  mr: (n, p) => `${n} ची ऑर्डर तयार आहे, ₹${p}. पेमेंट पूर्ण करा आणि साडी तुमची.`,
  en: (n, p) => `Your ${n} order is ready, ₹${p}. Complete the payment and it's yours.`,
};

export function orderReadyLine(product: Product, language: SupportedLanguage): string {
  return (READY[language] ?? READY.hinglish)(
    speakableName(product, language),
    rupees(product.price),
  );
}
