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
