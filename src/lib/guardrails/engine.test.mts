import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  checkOrderIntent,
  checkAffordability,
  checkSearchIntent,
  recordOrderPlaced,
  resetRateLimit,
  DEFAULTS,
} from "./engine.ts";

/* prod_001  Handloom Cotton Mango Motif  ₹599    in stock
   prod_011  Pure Silk Paithani           ₹8,999  in stock   ← the demo block
   prod_015  Nauvari                      ₹1,299  OUT OF STOCK */

const ctx = (over: Partial<Parameters<typeof checkOrderIntent>[1]> = {}) => ({
  sessionId: "s1",
  maxSpend: 1000,
  hasConsentFor: () => true,
  ...over,
});

beforeEach(() => resetRateLimit("s1"));

describe("spending cap", () => {
  test("allows a saree inside the cap", () => {
    const v = checkOrderIntent("prod_001", ctx());
    assert.equal(v.allowed, true);
  });

  test("blocks the ₹8,999 Paithani against a ₹1,000 cap", () => {
    const v = checkOrderIntent("prod_011", ctx());
    assert.equal(v.allowed, false);
    if (v.allowed) return;
    assert.equal(v.rule, "spending_cap");
    assert.equal(v.limit, 1000);
    assert.equal(v.attempted, 8999);
  });

  test("a block always offers real alternatives inside the budget", () => {
    const v = checkOrderIntent("prod_011", ctx());
    if (v.allowed) return assert.fail("should have blocked");
    assert.ok(v.suggestion.length > 0, "a block with no way forward is a dead end");
    assert.ok(/₹/.test(v.suggestion), `suggestion should name real prices: ${v.suggestion}`);
  });

  test("allows exactly at the cap, not just below it", () => {
    assert.equal(checkOrderIntent("prod_001", ctx({ maxSpend: 599 })).allowed, true);
  });
});

describe("the model cannot influence the price", () => {
  test("price comes from the catalog, never from the caller", () => {
    /* The whole tool surface accepts only a product_id. There is no parameter
       through which a prompt-injected "this costs ₹1" could travel. */
    const v = checkOrderIntent("prod_011", ctx());
    if (v.allowed) return assert.fail("should have blocked");
    assert.equal(v.attempted, 8999, "must use the catalog price");
  });

  test("an unknown product id is refused, not defaulted", () => {
    const v = checkOrderIntent("prod_does_not_exist", ctx());
    assert.equal(v.allowed, false);
    if (!v.allowed) assert.equal(v.rule, "unknown_product");
  });
});

describe("consent", () => {
  test("blocks when the buyer has not agreed", () => {
    const v = checkOrderIntent("prod_001", ctx({ hasConsentFor: () => false }));
    assert.equal(v.allowed, false);
    if (!v.allowed) assert.equal(v.rule, "consent_required");
  });

  test("consent is checked for the exact product, not any product", () => {
    const v = checkOrderIntent("prod_001", ctx({ hasConsentFor: (id) => id === "prod_002" }));
    assert.equal(v.allowed, false);
  });
});

describe("stock", () => {
  test("blocks an out-of-stock saree even when affordable and consented", () => {
    const v = checkOrderIntent("prod_015", ctx({ maxSpend: 5000 }));
    assert.equal(v.allowed, false);
    if (!v.allowed) assert.equal(v.rule, "out_of_stock");
  });
});

describe("category restriction", () => {
  test("allows a permitted category", () => {
    assert.equal(
      checkOrderIntent("prod_001", ctx({ allowedCategories: ["sarees"] })).allowed,
      true,
    );
  });

  test("blocks a category outside the allow-list", () => {
    const v = checkOrderIntent("prod_001", ctx({ allowedCategories: ["jewellery"] }));
    assert.equal(v.allowed, false);
    if (!v.allowed) assert.equal(v.rule, "category_not_allowed");
  });
});

describe("rate limit — stops a runaway autonomous loop", () => {
  test(`allows up to ${DEFAULTS.maxOrdersPerHour} orders in an hour`, () => {
    for (let i = 0; i < DEFAULTS.maxOrdersPerHour; i++) {
      assert.equal(checkOrderIntent("prod_001", ctx()).allowed, true, `order ${i + 1}`);
      recordOrderPlaced("s1");
    }
  });

  test("blocks the next one", () => {
    for (let i = 0; i < DEFAULTS.maxOrdersPerHour; i++) recordOrderPlaced("s1");
    const v = checkOrderIntent("prod_001", ctx());
    assert.equal(v.allowed, false);
    if (!v.allowed) assert.equal(v.rule, "rate_limit");
  });

  test("one session's spending does not throttle another", () => {
    for (let i = 0; i < DEFAULTS.maxOrdersPerHour; i++) recordOrderPlaced("s1");
    assert.equal(checkOrderIntent("prod_001", ctx({ sessionId: "s2" })).allowed, true);
    resetRateLimit("s2");
  });
});

describe("rule precedence", () => {
  test("consent is checked before price, so a block never leaks the catalog", () => {
    /* Asked to buy an unaffordable saree with no consent: the buyer never
       agreed to anything, so that is the honest reason to give. */
    const v = checkOrderIntent("prod_011", ctx({ hasConsentFor: () => false }));
    assert.equal(v.allowed, false);
    if (!v.allowed) assert.equal(v.rule, "consent_required");
  });

  test("stock is checked before price", () => {
    const v = checkOrderIntent("prod_015", ctx({ maxSpend: 100 }));
    if (!v.allowed) assert.equal(v.rule, "out_of_stock");
  });
});

describe("every verdict carries reasoning for the audit trail", () => {
  test("an allowed verdict explains itself", () => {
    const v = checkOrderIntent("prod_001", ctx());
    assert.ok(v.reasoning.length > 10);
  });

  test("a blocked verdict explains itself", () => {
    const v = checkOrderIntent("prod_011", ctx());
    assert.ok(v.reasoning.length > 10);
    assert.ok(/8999|8,999/.test(v.reasoning), `reasoning should cite the amount: ${v.reasoning}`);
  });
});

describe("checkAffordability — fires at the consent step, before she commits", () => {
  test("blocks an unaffordable saree even though consent has not been asked yet", () => {
    /* This is THE demo moment. She asks for the ₹8,999 Paithani; the engine
       must refuse at the point of intent, not wait for an order that a
       well-behaved model would never attempt. */
    const v = checkAffordability("prod_011", ctx());
    assert.equal(v.allowed, false);
    if (v.allowed) return;
    assert.equal(v.rule, "spending_cap");
    assert.equal(v.limit, 1000);
    assert.equal(v.attempted, 8999);
    assert.ok(v.suggestion.includes("₹"), "must offer real alternatives");
  });

  test("does NOT require consent — that is what it is about to ask for", () => {
    const v = checkAffordability("prod_001", ctx({ hasConsentFor: () => false }));
    assert.equal(v.allowed, true);
  });

  test("still blocks out-of-stock", () => {
    const v = checkAffordability("prod_015", ctx({ maxSpend: 5000 }));
    assert.equal(v.allowed, false);
    if (!v.allowed) assert.equal(v.rule, "out_of_stock");
  });

  test("still refuses an unknown product", () => {
    assert.equal(checkAffordability("nope", ctx()).allowed, false);
  });
});

describe("checkSearchIntent — blocks on what she actually asked for", () => {
  test('"pure silk paithani" blocks at the DEFAULT ₹1,000 cap', () => {
    /* The demo script depends on this. A loose match against the ₹899
       Paithani-PRINT must not rescue a query that clearly named pure silk. */
    const v = checkSearchIntent("pure silk paithani", 1000);
    assert.equal(v.kind, "blocked");
    if (v.kind !== "blocked") return;
    assert.equal(v.attempted, 8999);
    assert.equal(v.limit, 1000);
    assert.ok(v.alternatives.length > 0, "must offer real alternatives");
    assert.ok(v.alternatives.every((p) => p.price <= 1000));
  });

  test('"authentic Paithani silk saree" also blocks — the scripted wording', () => {
    assert.equal(checkSearchIntent("authentic Paithani silk saree", 1000).kind, "blocked");
  });

  test('"bridal paithani heavy zari" blocks and cites ₹78,000', () => {
    const v = checkSearchIntent("bridal paithani heavy zari", 1000);
    assert.equal(v.kind, "blocked");
    if (v.kind === "blocked") assert.equal(v.attempted, 78000);
  });

  test('"cotton saree dikhao" does NOT block — happy path must stay intact', () => {
    assert.equal(checkSearchIntent("cotton saree dikhao", 1000).kind, "ok");
  });

  test('a bare "paithani" shows the affordable print rather than blocking', () => {
    /* She did not specify silk. We stock a ₹899 Paithani print, so the honest
       answer is to show it, not to refuse her. */
    assert.equal(checkSearchIntent("paithani", 1000).kind, "ok");
  });

  test("a query matching nothing does not block", () => {
    assert.equal(checkSearchIntent("motorcycle helmet", 1000).kind, "ok");
  });

  test("a generous cap blocks nothing", () => {
    assert.equal(checkSearchIntent("pure silk paithani", 50000).kind, "ok");
  });
});

describe("checkSearchIntent — stock and category also fire on intent", () => {
  test("an out-of-stock top match reports out_of_stock, not a price block", () => {
    /* Nauvari ₹1,299 is out of stock. With a cap that affords it, the honest
       answer is "not available", never silence. */
    const v = checkSearchIntent("nauvari saree", 5000);
    assert.equal(v.kind, "out_of_stock");
    if (v.kind !== "out_of_stock") return;
    assert.equal(v.matched.id, "prod_015");
    assert.ok(v.alternatives.length > 0, "must offer something she can buy");
    assert.ok(v.alternatives.every((p) => p.in_stock));
  });

  test("price is judged before stock — she cannot afford it either way", () => {
    /* Nauvari is ₹1,299 against a ₹1,000 cap: the binding reason is money. */
    const v = checkSearchIntent("nauvari saree", 1000);
    assert.equal(v.kind, "blocked");
    if (v.kind === "blocked") assert.equal(v.rule, "spending_cap");
  });

  test("a category outside the allow-list is blocked at search time", () => {
    const v = checkSearchIntent("cotton saree", 1000, ["jewellery"]);
    assert.equal(v.kind, "blocked");
    if (v.kind === "blocked") assert.equal(v.rule, "category_not_allowed");
  });

  test("a permitted category passes", () => {
    assert.equal(checkSearchIntent("cotton saree", 1000, ["sarees"]).kind, "ok");
  });

  test("no allow-list means no category restriction", () => {
    assert.equal(checkSearchIntent("cotton saree", 1000).kind, "ok");
  });

  test("the happy path is still ok", () => {
    assert.equal(checkSearchIntent("cotton saree dikhao", 1000).kind, "ok");
  });

  test("the scripted Paithani block still blocks", () => {
    const v = checkSearchIntent("Authentic Paithani silk saree", 1000);
    assert.equal(v.kind, "blocked");
    if (v.kind === "blocked") assert.equal(v.attempted, 8999);
  });
});

describe("checkSearchIntent — the model cannot narrow its way past a rule", () => {
  /* Gemini rewrites a request before calling the tool. Roughly one run in
     seven it shortened "Authentic Paithani silk saree" to bare "paithani",
     which correctly matches the ₹899 print and correctly does not block — so
     the refusal silently stopped happening. The rule was being judged on the
     model's paraphrase rather than on what the buyer said. */

  test("blocks on the buyer's words even when the model's query would not", () => {
    const modelQuery = "paithani";
    const buyerSaid = "Authentic Paithani silk saree";

    /* On its own the shortened query is genuinely fine. */
    assert.equal(checkSearchIntent(modelQuery, 1000).kind, "ok");

    const v = checkSearchIntent(modelQuery, 1000, undefined, buyerSaid);
    assert.equal(v.kind, "blocked");
    if (v.kind === "blocked") assert.equal(v.attempted, 8999);
  });

  test("still blocks when only the model's query names the expensive saree", () => {
    /* The Marathi case: the raw Devanagari does not match the English catalog,
       and it is the model's translation that finds the silk Paithani. Both
       directions have to work. */
    const v = checkSearchIntent("Paithani silk saree", 1000, undefined, "मला पैठणी सिल्क साडी दाखवा");
    assert.equal(v.kind, "blocked");
  });

  test("does not block a buyer who is avoiding the expensive one", () => {
    const v = checkSearchIntent("cotton", 1000, undefined, "not the expensive paithani, something cheap");
    assert.equal(v.kind, "ok");
  });

  test("the happy path survives being checked twice", () => {
    assert.equal(
      checkSearchIntent("cotton", 1000, undefined, "1000 ke under cotton saree dikhao").kind,
      "ok",
    );
  });

  test("omitting the buyer's words changes nothing", () => {
    assert.equal(checkSearchIntent("paithani", 1000).kind, "ok");
    assert.equal(checkSearchIntent("pure silk paithani", 1000).kind, "blocked");
  });
});
