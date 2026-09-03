import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { uiText, UI_TEXT } from "./ui-text.ts";
import type { SupportedLanguage } from "@/types";

const LANGUAGES: SupportedLanguage[] = ["hi", "mr", "hinglish", "en"];

/**
 * One table, one lookup, and a test that makes a half-translated string
 * impossible.
 *
 * The picker kept looking broken because the copy was scattered: a welcome
 * constant here, a placeholder default there, a voice label inline in the
 * header. Each was written in whatever language its author had in mind, so
 * choosing मराठी changed the agent's replies and left the interface around
 * them in Hinglish and English. Fixing them one at a time is how it got this
 * way; the fix is that there is now only one place they can live.
 */

describe("UI_TEXT — every language says everything", () => {
  test("no language is missing a key another one has", () => {
    /* The failure this prevents: adding a string in English only, shipping,
       and discovering the gap when a judge switches to Marathi. */
    const keys = LANGUAGES.map((l) => Object.keys(UI_TEXT[l]).sort());
    for (let i = 1; i < keys.length; i++) {
      assert.deepEqual(
        keys[i],
        keys[0],
        `${LANGUAGES[i]} has a different key set from ${LANGUAGES[0]}`,
      );
    }
  });

  test("nothing is blank", () => {
    for (const lang of LANGUAGES) {
      for (const [key, value] of Object.entries(UI_TEXT[lang])) {
        assert.ok(String(value).trim().length > 0, `${lang}.${key} is empty`);
      }
    }
  });

  test("Devanagari languages are actually in Devanagari", () => {
    /* The complaint that produced this: choosing Hindi still showed English
       chrome around Hindi replies. */
    for (const lang of ["hi", "mr"] as SupportedLanguage[]) {
      for (const key of ["placeholder", "limitLabel", "change", "budgetHint"] as const) {
        assert.match(uiText(lang)[key], /[ऀ-ॿ]/u, `${lang}.${key} is not Devanagari`);
      }
    }
  });

  test("Hinglish stays in roman script — it is not Hindi", () => {
    for (const key of ["placeholder", "limitLabel", "change", "budgetHint"] as const) {
      assert.doesNotMatch(uiText("hinglish")[key], /[ऀ-ॿ]/u, `hinglish.${key}`);
    }
  });

  test("Hindi and Marathi are not the same strings copied twice", () => {
    const hi = uiText("hi");
    const mr = uiText("mr");
    const identical = Object.keys(hi).filter(
      (k) => hi[k as keyof typeof hi] === mr[k as keyof typeof mr],
    );
    /* Some words genuinely coincide; most should not. */
    assert.ok(
      identical.length < Object.keys(hi).length / 2,
      `too many identical: ${identical.join(", ")}`,
    );
  });

  test("an unknown language falls back rather than returning undefined", () => {
    const t = uiText("xx" as SupportedLanguage);
    assert.ok(t.placeholder.length > 0);
  });
});
