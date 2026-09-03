import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { runTool } from "./tools.ts";

/* The blocked payload is what the guardrail card renders from. If it does not
   name the saree she asked for and carry real alternatives, the most important
   moment in the demo degrades to a sentence of prose. */

const ctx = {
  sessionId: "s1",
  maxSpend: 1000,
  hasConsentFor: () => false,
  recordConsentRequest: () => {},
};

describe("search_products — the blocked payload the UI renders", () => {
  test("names the saree she actually asked for", async () => {
    const out = await runTool("search_products", { query: "pure silk paithani" }, ctx);
    assert.ok(out.blocked, "should have blocked");
    assert.match(
      out.blocked.asked_for,
      /Paithani/i,
      "the card must be able to say which saree was refused",
    );
  });

  test("carries the price of that saree, read from the catalog", async () => {
    const out = await runTool("search_products", { query: "pure silk paithani" }, ctx);
    assert.equal(out.blocked?.attempted, 8999);
    assert.equal(out.blocked?.limit, 1000);
  });

  test("carries real alternative products, not just a sentence", async () => {
    const out = await runTool("search_products", { query: "pure silk paithani" }, ctx);
    assert.ok(out.products && out.products.length > 0, "must offer a way forward");
    assert.ok(
      out.products.every((p) => p.price <= 1000 && p.in_stock),
      "every alternative must be affordable and actually buyable",
    );
  });

  test("a category block also names what was refused", async () => {
    const out = await runTool("search_products", { query: "cotton saree" }, {
      ...ctx,
      allowedCategories: ["jewellery"],
    });
    assert.equal(out.blocked?.rule, "category_not_allowed");
    assert.ok(out.blocked?.asked_for.length > 0);
  });

  test("the happy path is untouched — no block, real products", async () => {
    const out = await runTool("search_products", { query: "cotton saree" }, ctx);
    assert.equal(out.blocked, undefined);
    assert.ok(out.products && out.products.length > 0);
  });
});


describe("search_products — the cap is hers, the filter may be the model's", () => {
  /* The guardrail cap was Math.min(model's max_price, her cap). The min meant
     the model could never raise the ceiling, so nothing could be overspent —
     but it could LOWER it, producing a spending_cap block citing a limit she
     never set, and writing that number into the audit trail as fact.

     A narrowing request is legitimate: "under 500" should show only sarees
     under 500. What it must not do is decide a refusal. */

  const ctx = (maxSpend: number) => ({
    sessionId: `cap-${Date.now()}-${Math.random()}`,
    maxSpend,
    hasConsentFor: () => false,
    recordConsentRequest: () => {},
  });

  test("a model-chosen max_price never becomes the guardrail limit", async () => {
    const out = await runTool(
      "search_products",
      { query: "paithani silk", max_price: 500 },
      ctx(25_000),
    );
    /* She can afford a ₹8,999 Paithani at ₹25,000, so nothing may block —
       and if anything ever did, the limit reported must be hers. */
    if (out.blocked) {
      assert.equal(out.blocked.limit, 25_000, "the limit must be the buyer's");
    }
    assert.equal(out.blocked, undefined, "must not block inside her real budget");
  });

  test("it still narrows what is shown, because that is what she asked for", async () => {
    const out = await runTool(
      "search_products",
      { query: "saree", max_price: 600 },
      ctx(25_000),
    );
    for (const p of out.products ?? []) {
      assert.ok(p.price <= 600, `${p.name} at ₹${p.price} is over the narrowing filter`);
    }
  });

  test("a block against her real cap still reports her number", async () => {
    const out = await runTool(
      "search_products",
      { query: "authentic paithani silk saree", max_price: 100_000 },
      ctx(1000),
    );
    assert.ok(out.blocked, "₹8,999 against a ₹1,000 cap must block");
    assert.equal(out.blocked?.limit, 1000);
  });
});
