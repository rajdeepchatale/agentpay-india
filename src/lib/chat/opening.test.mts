import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { BUDGETS, budgetReply, isBudgetAnswer, welcomeMessage } from "./opening.ts";
import type { SupportedLanguage } from "@/types";

const LANGUAGES: SupportedLanguage[] = ["hi", "mr", "hinglish", "en"];

/**
 * She asks what the buyer wants to spend, before showing anything.
 *
 * This is the difference between a demo and an agent. The limit used to be a
 * number we chose and displayed; the refusal was then OUR rule enforced on a
 * stranger. When the buyer sets it herself, the same refusal is the agent
 * keeping her own word — which is the claim this project is actually making.
 */

describe("welcomeMessage — the first thing she says, in HER language", () => {
  test("answers in the language chosen, not always Hinglish", () => {
    /* The bug: the welcome was a hardcoded Hinglish constant, so choosing
       English in the header still opened with Hinglish. The picker looked
       broken because the very first line ignored it. */
    assert.doesNotMatch(welcomeMessage("en"), /[ऀ-ॿ]/u);
    assert.match(welcomeMessage("en"), /budget/i);
    assert.match(welcomeMessage("hi"), /[ऀ-ॿ]/u);
    assert.match(welcomeMessage("mr"), /[ऀ-ॿ]/u);
    assert.doesNotMatch(welcomeMessage("hinglish"), /[ऀ-ॿ]/u);
  });

  test("Hindi and Marathi are actually different, not the same string twice", () => {
    assert.notEqual(welcomeMessage("hi"), welcomeMessage("mr"));
  });

  test("is short — it is spoken before anything else happens", () => {
    /* Sarvam's latency scales with length. The old welcome ran to 210
       characters, which is four seconds of generation before a single word
       comes out, for a line whose only job is to ask one question. */
    for (const lang of LANGUAGES) {
      const w = welcomeMessage(lang);
      assert.ok(w.length <= 95, `${lang} is ${w.length} chars: ${w}`);
    }
  });

  test("ends by asking the budget, in every language", () => {
    for (const lang of LANGUAGES) {
      assert.match(welcomeMessage(lang), /\?\s*$/, `${lang}: ${welcomeMessage(lang)}`);
    }
  });

  test("never assumes the buyer's gender", () => {
    const banned = [/(सकती|सकते)\s+हैं/, /(रही|रहे)\s+हैं/, /\b(sakti|sakte)\s+hain\b/i, /\b(rahi|rahe)\s+hain\b/i];
    for (const lang of LANGUAGES) {
      for (const re of banned) assert.doesNotMatch(welcomeMessage(lang), re, `${lang}`);
    }
  });
});

describe("BUDGETS — the amounts she offers", () => {
  test("the lowest one blocks the Paithani, or the guardrail is never seen", () => {
    /* The cheapest real Paithani is ₹8,999. If every offered budget cleared
       it, a judge could walk the whole flow and never meet the guardrail —
       exactly the failure the scripted tour existed to prevent. */
    assert.ok(BUDGETS[0].amount < 8999, "lowest budget must sit under the Paithani");
  });

  test("offers a spread, so the choice is real rather than decorative", () => {
    assert.ok(BUDGETS.length >= 3);
    const amounts = BUDGETS.map((b) => b.amount);
    assert.deepEqual([...amounts].sort((a, b) => a - b), amounts, "should ascend");
    assert.ok(new Set(amounts).size === amounts.length, "no duplicates");
  });

  test("every amount is one the guardrail engine will accept", () => {
    /* Clamped server-side anyway; an offered amount that gets clamped would
       show her one number and enforce another. */
    for (const b of BUDGETS) {
      assert.ok(b.amount > 0 && b.amount <= 100000, `${b.amount} out of range`);
    }
  });

  test("labels are grouped the Indian way", () => {
    assert.ok(BUDGETS.some((b) => b.label.includes("1,000")), "expected ₹1,000 grouping");
  });
});

describe("budgetReply — she confirms the number back", () => {
  test("says the amount she just heard, in the buyer's language", () => {
    for (const lang of LANGUAGES) {
      const line = budgetReply(1000, lang);
      assert.ok(line.includes("1,000"), `${lang}: ${line}`);
      assert.ok(line.length > 15, `${lang} too thin: ${line}`);
    }
  });

  test("Devanagari languages answer in Devanagari, Hinglish stays roman", () => {
    assert.match(budgetReply(5000, "hi"), /[ऀ-ॿ]/u);
    assert.match(budgetReply(5000, "mr"), /[ऀ-ॿ]/u);
    assert.doesNotMatch(budgetReply(5000, "hinglish"), /[ऀ-ॿ]/u);
  });

  test("never assumes the buyer's gender", () => {
    const banned = [/(सकती|सकते)\s+हैं/, /(रही|रहे)\s+हैं/, /\b(sakti|sakte)\s+hain\b/i, /\b(rahi|rahe)\s+hain\b/i];
    for (const lang of LANGUAGES) {
      for (const re of banned) assert.doesNotMatch(budgetReply(1000, lang), re, `${lang}`);
    }
  });
});

describe("isBudgetAnswer — she may also just type a number", () => {
  test("reads plain and grouped amounts", () => {
    assert.equal(isBudgetAnswer("1000"), 1000);
    assert.equal(isBudgetAnswer("₹5,000"), 5000);
    assert.equal(isBudgetAnswer("mera budget 2000 hai"), 2000);
    assert.equal(isBudgetAnswer("२५०००"), 25000);
  });

  test("ignores text with no amount in it", () => {
    assert.equal(isBudgetAnswer("cotton saree dikhao"), null);
    assert.equal(isBudgetAnswer(""), null);
  });

  test("does not hijack a product request that happens to contain a number", () => {
    /* The failure this guards against: "1000 ke under cotton saree dikhao" is
       a request for SAREES, not an answer to the budget question. Reading it
       as a budget would swallow the buyer's actual message and answer a
       question she had already moved past. */
    assert.equal(isBudgetAnswer("1000 ke under cotton saree dikhao"), null);
    assert.equal(isBudgetAnswer("2000 wali paithani dikhao"), null);
    assert.equal(isBudgetAnswer("मला ५००० ची साडी दाखवा"), null);
  });

  test("still reads an answer that names the budget explicitly", () => {
    assert.equal(isBudgetAnswer("mera budget 2000 hai"), 2000);
    assert.equal(isBudgetAnswer("limit 5000"), 5000);
    assert.equal(isBudgetAnswer("मेरा बजट 3000 है"), 3000);
  });

  test("rejects an amount outside what the engine allows", () => {
    assert.equal(isBudgetAnswer("99999999"), null);
    assert.equal(isBudgetAnswer("0"), null);
  });
});
