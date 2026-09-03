import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { spokenLine, SPOKEN_LIMIT } from "./speech.ts";
import type { AgentResponse, Product } from "@/types";

/* Sarvam's TTS cost scales with text length — measured against the live API:
     48 chars → 1.0s      133 chars → 2.8s      267 chars → 4.8s
   Reading a whole reply aloud is what made her answer arrive seconds after
   the text. She should say the short thing a shopkeeper says and let the
   buyer read the detail, which is already on screen. */

const product = (id: string): Product =>
  ({ id, name: "Paithani", price: 900 }) as unknown as Product;

const res = (over: Partial<AgentResponse>): AgentResponse => ({
  type: "text",
  content: "",
  language: "hi",
  audit_id: "a1",
  ...over,
});

describe("spokenLine — what she actually says out loud", () => {
  test("announces the sarees instead of reading the whole reply", () => {
    const line = spokenLine(
      res({
        type: "products",
        language: "hi",
        content:
          "नमस्ते! आपके एक हज़ार रुपये के बजट में हमारे पास बहुत ही सुंदर हैंडलूम कॉटन साड़ियाँ हैं, जो रोज़ पहनने के लिए एकदम सही हैं और गर्मियों में बेहद आरामदायक रहती हैं।",
        data: { products: [product("p1"), product("p2"), product("p3")] },
      }),
    );
    assert.match(line, /साड़ियाँ/);
    assert.ok(line.includes("3"), `expected the count in: ${line}`);
    assert.ok(line.length < 60, `too long to be quick: ${line.length}`);
  });

  test("counts one saree as one, not as a plural", () => {
    const line = spokenLine(
      res({ type: "products", language: "hi", data: { products: [product("p1")] } }),
    );
    assert.doesNotMatch(line, /1 साड़ियाँ/);
  });

  test("speaks each language in its own script", () => {
    const products = { products: [product("p1"), product("p2")] };
    const mr = spokenLine(res({ type: "products", language: "mr", data: products }));
    const en = spokenLine(res({ type: "products", language: "en", data: products }));
    const hinglish = spokenLine(
      res({ type: "products", language: "hinglish", data: products }),
    );

    assert.match(mr, /साड्या/, `Marathi: ${mr}`);
    assert.match(en, /sarees/i, `English: ${en}`);
    /* Hinglish is roman script — Devanagari here would be the exact bug the
       system prompt spends a whole section preventing. */
    assert.doesNotMatch(hinglish, /[ऀ-ॿ]/u, `Hinglish must stay roman: ${hinglish}`);
  });

  test("a block is spoken as the limit holding, and never invents alternatives", () => {
    const withAlts = spokenLine(
      res({
        type: "guardrail_blocked",
        language: "en",
        data: { products: [product("p1")] },
      }),
    );
    const without = spokenLine(res({ type: "guardrail_blocked", language: "en" }));

    assert.match(withAlts, /limit/i);
    assert.match(without, /limit/i);
    /* Offering "here's what fits" with nothing on screen would be a lie the
       buyer can see through immediately. */
    assert.ok(
      without.length < withAlts.length,
      "must not promise alternatives that were not returned",
    );
  });

  test("falls back to her first sentence when there is nothing structured to announce", () => {
    const line = spokenLine(
      res({
        type: "consent_required",
        language: "en",
        content:
          "That Paithani is ₹4,500. Shall I create the order for you? I can have the payment link ready in a moment.",
      }),
    );
    assert.match(line, /^That Paithani is ₹4,500\./);
    assert.ok(line.length <= SPOKEN_LIMIT);
  });

  test("never returns something longer than a quick line", () => {
    const line = spokenLine(
      res({ type: "text", language: "en", content: "word ".repeat(200) }),
    );
    assert.ok(line.length <= SPOKEN_LIMIT, `${line.length} > ${SPOKEN_LIMIT}`);
  });

  test("an empty reply is silence, not a spoken empty string", () => {
    assert.equal(spokenLine(res({ type: "text", content: "   " })), "");
  });
});
