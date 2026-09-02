import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { swatchFor } from "./swatch.ts";
import { products } from "@/lib/catalog/data";

/* No product photography exists. Every placeholder is woven from the saree's
   own catalog colours — body from colors[0], selvedge from colors[1] — so a
   missing image reads as authored cloth rather than a missing asset. */

const HEX = /^#[0-9a-f]{6}$/i;

describe("swatchFor — colours come from the product, not a palette of one", () => {
  test("body colour is taken from colors[0]", () => {
    const s = swatchFor({ id: "x", name: "Test", colors: ["Green", "Yellow Border"] });
    assert.equal(s.body, "#3f7d4e");
  });

  test("selvedge colour is taken from colors[1], descriptor stripped", () => {
    const s = swatchFor({ id: "x", name: "Test", colors: ["Green", "Yellow Border"] });
    assert.equal(s.selvedge, "#d9a520");
  });

  test('"Navy Blue" resolves as navy, not as plain blue — longest match wins', () => {
    const navy = swatchFor({ id: "x", name: "T", colors: ["Navy Blue", "White Pattern"] });
    const blue = swatchFor({ id: "y", name: "T", colors: ["Blue", "White Pattern"] });
    assert.notEqual(navy.body, blue.body, "navy blue must not collapse into blue");
  });

  test('"Gold Asawali Border" finds the gold, ignoring the motif name', () => {
    const s = swatchFor({ id: "x", name: "T", colors: ["Red", "Gold Asawali Border"] });
    assert.equal(s.selvedge, "#c9a227", "should use the zari token");
  });

  test("an unrecognised colour degrades to a neutral, never to undefined", () => {
    const s = swatchFor({ id: "x", name: "T", colors: ["Chartreuse Nonsense"] });
    assert.match(s.body, HEX);
    assert.match(s.selvedge, HEX);
  });

  test("a product with no colours at all still produces a swatch", () => {
    const s = swatchFor({ id: "x", name: "T", colors: [] });
    assert.match(s.body, HEX);
    assert.match(s.selvedge, HEX);
  });

  test("the initial is the first letter of the English name", () => {
    const s = swatchFor({ id: "x", name: "Handloom Cotton Saree", colors: [] });
    assert.equal(s.initial, "H");
  });

  test("it is deterministic — the same product always gives the same swatch", () => {
    const p = { id: "x", name: "T", colors: ["Purple", "Gold Print"] };
    assert.deepEqual(swatchFor(p), swatchFor(p));
  });
});

describe("the whole catalog renders", () => {
  test("all 16 products resolve to two real hex colours and an initial", () => {
    /* This is the test that matters: if any one of the sixteen falls through
       to undefined, that card is a hole in the demo. */
    assert.equal(products.length, 16);
    for (const p of products) {
      const s = swatchFor(p);
      assert.match(s.body, HEX, `${p.id} body`);
      assert.match(s.selvedge, HEX, `${p.id} selvedge`);
      assert.ok(s.initial.length === 1, `${p.id} initial`);
    }
  });

  test("body and selvedge differ, so the band is actually visible", () => {
    for (const p of products) {
      const s = swatchFor(p);
      assert.notEqual(s.body, s.selvedge, `${p.id} would render as a flat block`);
    }
  });
});
