import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { confirmLine } from "./confirm.ts";
import type { Product, SupportedLanguage } from "@/types";

const LANGUAGES: SupportedLanguage[] = ["hi", "mr", "hinglish", "en"];
const saree = {
  id: "prod_001",
  name: "Handloom Cotton Saree — Mango Motif",
  name_hindi: "हातमाग कॉटन साडी — आंबा मोटिफ",
  price: 599,
} as unknown as Product;

/**
 * What she asks when the buyer taps Select.
 *
 * Reported from a real session: tapping Select produced "shall I proceed with
 * the order?" AND a fresh grid of four sarees. The model had narrated consent
 * while calling search_products, so the words and the machinery disagreed —
 * the buyer was asked to confirm with no way to confirm.
 *
 * Templated because the client already knows exactly which saree was tapped.
 * Asking a model to restate a known fact, and hoping it picks the right tool
 * while doing so, is a gamble taken immediately before money moves.
 */
describe("confirmLine — asking to place the order", () => {
  test("names the saree and the price, in her language", () => {
    for (const lang of LANGUAGES) {
      const line = confirmLine(saree, lang);
      assert.ok(line.includes("599"), `${lang}: ${line}`);
      assert.match(line, /\?\s*$/, `${lang} must ask: ${line}`);
    }
  });

  test("uses the short name — the qualifier is a spoken pause", () => {
    /* "Handloom Cotton Saree — Mango Motif" read aloud puts a beat in the
       middle of the most important sentence in the conversation. */
    const line = confirmLine(saree, "en");
    assert.ok(line.includes("Handloom Cotton Saree"), line);
    assert.ok(!line.includes("—"), `dash survived: ${line}`);
  });

  test("Devanagari languages in Devanagari, Hinglish in roman", () => {
    assert.match(confirmLine(saree, "hi"), /[ऀ-ॿ]/u);
    assert.match(confirmLine(saree, "mr"), /[ऀ-ॿ]/u);
    assert.doesNotMatch(confirmLine(saree, "hinglish"), /[ऀ-ॿ]/u);
  });

  test("never assumes the buyer's gender", () => {
    const banned = [/(सकती|सकते)\s+हैं/, /(रही|रहे)\s+हैं/, /\b(sakti|sakte)\s+hain\b/i];
    for (const lang of LANGUAGES) {
      for (const re of banned) assert.doesNotMatch(confirmLine(saree, lang), re, lang);
    }
  });
});
