import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { closingMessage, FEEDBACK_CHOICES } from "./closing.ts";
import type { Product, SupportedLanguage } from "@/types";

const LANGUAGES: SupportedLanguage[] = ["hi", "mr", "hinglish", "en"];

const saree = {
  id: "p1",
  name: "Khadi Cotton Saree",
  name_hindi: "खादी कॉटन साड़ी",
  price: 499,
} as unknown as Product;

/**
 * The last thing she says.
 *
 * Templated rather than model-generated on purpose: this is the closing beat
 * of the demo and of a real purchase. An LLM call here can be slow, drift, or
 * fail, and there is no recovering from the agent going quiet at the moment
 * money has just left the buyer's account.
 */

describe("closingMessage — payment received, what happens next, come again", () => {
  test("names the saree and the amount she actually paid", () => {
    const line = closingMessage(saree, "hinglish");
    assert.ok(line.includes("Khadi Cotton Saree"), line);
    assert.ok(line.includes("499"), line);
  });

  test("formats the amount the Indian way", () => {
    const dear = { ...saree, price: 125000 } as Product;
    assert.ok(closingMessage(dear, "en").includes("1,25,000"), "expected 1,25,000");
  });

  test("still closes warmly when the product cannot be resolved", () => {
    /* The callback carries a product id from a URL. A stale or edited link
       must still get a proper goodbye, not a broken sentence with a hole. */
    for (const lang of LANGUAGES) {
      const line = closingMessage(undefined, lang);
      assert.ok(line.length > 30, `${lang}: too thin`);
      assert.doesNotMatch(line, /undefined|NaN|\{|\}/, `${lang}: ${line}`);
    }
  });

  test("every language says all three things and asks for feedback", () => {
    for (const lang of LANGUAGES) {
      const line = closingMessage(saree, lang);
      assert.ok(line.length > 60, `${lang} too short: ${line}`);
      /* The question is part of what she SAYS, so it is spoken rather than
         rendered as a silent survey widget. */
      assert.match(line, /\?\s*$/, `${lang} must end by asking: ${line}`);
    }
  });

  test("Devanagari languages are in Devanagari, Hinglish stays roman", () => {
    assert.match(closingMessage(saree, "hi"), /[ऀ-ॿ]/u);
    assert.match(closingMessage(saree, "mr"), /[ऀ-ॿ]/u);
    assert.doesNotMatch(closingMessage(saree, "hinglish"), /[ऀ-ॿ]/u);
    assert.doesNotMatch(closingMessage(saree, "en"), /[ऀ-ॿ]/u);
  });

  test("never assumes the buyer's gender, in any language", () => {
    /* The same rule the rest of the copy follows: imperatives, or verbs that
       agree with her or with a noun — never with the buyer. */
    const banned = [
      /(सकती|सकते)\s+हैं/,
      /(रही|रहे)\s+हैं/,
      /\b(sakti|sakte)\s+hain\b/i,
      /\b(rahi|rahe)\s+hain\b/i,
    ];
    for (const lang of LANGUAGES) {
      for (const product of [saree, undefined]) {
        const line = closingMessage(product, lang);
        for (const re of banned) assert.doesNotMatch(line, re, `${lang}: ${line}`);
      }
    }
  });
});

describe("FEEDBACK_CHOICES", () => {
  test("offers three taps in each language, so no keyboard is needed", () => {
    for (const lang of LANGUAGES) {
      const choices = FEEDBACK_CHOICES[lang];
      assert.equal(choices.length, 3, `${lang} should offer exactly three`);
      for (const c of choices) assert.ok(c.label.trim().length > 0);
    }
  });

  test("ratings are stable identifiers, not translated labels", () => {
    /* The dashboard groups on these, so they must not change with the
       language the buyer happened to be using. */
    for (const lang of LANGUAGES) {
      assert.deepEqual(
        FEEDBACK_CHOICES[lang].map((c) => c.rating),
        ["good", "ok", "poor"],
        `${lang} ratings drifted`,
      );
    }
  });
});
