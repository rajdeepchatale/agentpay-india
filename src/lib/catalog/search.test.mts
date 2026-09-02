import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { searchProducts } from "./search.ts";

const names = (q: string) => searchProducts({ q }).map((p) => p.name);

describe("searchProducts — conversational queries", () => {
  /* The agent passes what the buyer actually typed. Requiring EVERY token to
     match meant "cotton saree dikhao" returned nothing, because no saree
     contains the word "dikhao". */

  test('"cotton saree dikhao" finds cotton sarees', () => {
    const r = names("cotton saree dikhao");
    assert.ok(r.length > 0, "expected results, got none");
    assert.ok(r.some((n) => n.includes("Cotton")), `got: ${r.join(", ")}`);
  });

  test('"1000 ke under cotton saree" finds cotton sarees', () => {
    assert.ok(names("1000 ke under cotton saree").length > 0);
  });

  test('"mujhe paithani chahiye" finds Paithani', () => {
    const r = names("mujhe paithani chahiye");
    assert.ok(r.some((n) => n.includes("Paithani")), `got: ${r.join(", ")}`);
  });

  test("Devanagari still works", () => {
    assert.ok(names("पैठणी").length > 0);
  });

  test("a plain keyword still works (no regression)", () => {
    assert.ok(names("cotton").length > 0);
  });
});

describe("searchProducts — relevance", () => {
  test("ranks a name match above a mere description mention", () => {
    /* Gadwal is a SILK saree whose description happens to say "cotton border".
       It must not outrank actual cotton sarees. */
    const r = names("cotton");
    const gadwal = r.indexOf("Gadwal Silk Saree");
    const realCotton = r.findIndex((n) => n.includes("Cotton"));
    assert.ok(realCotton !== -1, "expected a cotton saree in results");
    if (gadwal !== -1) {
      assert.ok(realCotton < gadwal, "a real cotton saree must rank above Gadwal silk");
    }
  });

  test("a query of only stopwords returns everything rather than nothing", () => {
    assert.equal(searchProducts({ q: "mujhe chahiye dikhao" }).length, 16);
  });

  test("a genuinely unmatched query returns nothing", () => {
    assert.equal(searchProducts({ q: "motorcycle helmet" }).length, 0);
  });
});

describe("searchProducts — filters still apply", () => {
  test("max_price excludes dearer sarees", () => {
    const r = searchProducts({ max_price: 1000 });
    assert.ok(r.length > 0);
    assert.ok(r.every((p) => p.price <= 1000));
  });

  test("combines a conversational query with a price filter", () => {
    const r = searchProducts({ q: "cotton saree dikhao", max_price: 1000 });
    assert.ok(r.length > 0, "expected cotton sarees under ₹1000");
    assert.ok(r.every((p) => p.price <= 1000));
  });

  test("min_price finds the Paithani that triggers the guardrail", () => {
    const r = searchProducts({ q: "paithani", min_price: 8000 });
    assert.ok(r.length > 0);
    assert.ok(r.every((p) => p.price >= 8000));
  });

  test("category filter is case-insensitive", () => {
    assert.equal(searchProducts({ category: "SAREES" }).length, 16);
  });
});
