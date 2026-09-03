import type { Product, SupportedLanguage } from "@/types";

/**
 * What she calls a saree in a sentence.
 *
 * Catalog names carry a qualifier after an em dash — "Khadi Cotton Saree —
 * Block Print". That is right on a product card, where the detail helps her
 * choose. It is wrong in a spoken sentence: the dash becomes a pause and the
 * qualifier adds a beat nobody asked for, so the reply takes longer to say and
 * lands less naturally. A shopkeeper says "the Khadi cotton saree" and lets
 * the card carry the rest.
 *
 * The full name stays on the card. This is only for prose and speech.
 */
export function speakableName(
  product: Product,
  language?: SupportedLanguage,
): string {
  const devanagari = language === "hi" || language === "mr";
  const raw = (devanagari && product.name_hindi) || product.name || "";

  /* Split on em dash, en dash or hyphen — the catalog uses —, but a name added
     later may not, and this should not quietly stop working for it. */
  const head = raw.split(/\s*[—–-]\s*/)[0]?.trim() ?? "";

  /* A lopsided name like "— Block Print" still has a usable half. A name that
     is only punctuation has none, and returns "" — an empty string a caller
     can fall back from beats a lone dash read aloud mid-sentence. */
  return head || raw.replace(/[—–-]/g, "").trim();
}
