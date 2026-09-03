import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { speakableName } from "./name.ts";
import type { Product } from "@/types";

const p = (name: string, hindi = "") =>
  ({ name, name_hindi: hindi }) as unknown as Product;

/**
 * Catalog names carry a qualifier after an em dash — "Khadi Cotton Saree —
 * Block Print". Precise on a card, clumsy in a sentence and clumsier still
 * read aloud: the dash becomes a pause and the qualifier adds a beat nobody
 * asked for. A shopkeeper says "the Khadi cotton saree".
 */
describe("speakableName — what she calls a saree out loud", () => {
  test("drops the qualifier after the dash", () => {
    assert.equal(speakableName(p("Khadi Cotton Saree — Block Print")), "Khadi Cotton Saree");
    assert.equal(speakableName(p("Yeola Paithani — Asawali Motif")), "Yeola Paithani");
    assert.equal(speakableName(p("Nauvari Saree — Maharashtrian Drape")), "Nauvari Saree");
  });

  test("leaves a name that has no qualifier untouched", () => {
    assert.equal(speakableName(p("Gadwal Silk Saree")), "Gadwal Silk Saree");
    assert.equal(speakableName(p("Paithani Print Cotton Saree")), "Paithani Print Cotton Saree");
  });

  test("handles the hyphen and en dash too, not only the em dash", () => {
    /* The catalog uses —, but a name added later may not. */
    assert.equal(speakableName(p("Ikat Cotton Saree - Double Weave")), "Ikat Cotton Saree");
    assert.equal(speakableName(p("Tussar Silk Saree – Keri Border")), "Tussar Silk Saree");
  });

  test("uses the Devanagari name when asked for one", () => {
    const saree = p("Khadi Cotton Saree — Block Print", "खादी कॉटन साड़ी — ब्लॉक प्रिंट");
    assert.equal(speakableName(saree, "hi"), "खादी कॉटन साड़ी");
    assert.equal(speakableName(saree, "mr"), "खादी कॉटन साड़ी");
  });

  test("falls back to the Latin name when no Devanagari one exists", () => {
    assert.equal(speakableName(p("Gadwal Silk Saree", ""), "hi"), "Gadwal Silk Saree");
  });

  test("never returns a dangling dash from a lopsided name", () => {
    for (const name of ["— Block Print", "Saree —", "  Saree  "]) {
      const out = speakableName(p(name));
      assert.ok(out.length > 0, `empty for "${name}"`);
      assert.doesNotMatch(out, /^[—–-]|[—–-]$/, `dangling dash: "${out}"`);
    }
  });

  test("a name that is only punctuation yields nothing, so callers can fall back", () => {
    /* Not a real catalog input. The honest contract is an empty string rather
       than an invented name — closingMessage already has a product-less
       version to fall back to, and "—" in the middle of a spoken sentence
       would be worse than either. */
    assert.equal(speakableName(p("—")), "");
    assert.equal(speakableName(p("   ")), "");
  });
});
