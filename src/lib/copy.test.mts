import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * The buyer's gender is never assumed in shipped copy.
 *
 * Hindi and Marathi conjugate for the listener's gender, and a saree shop
 * invites the wrong default: anyone may be shopping — for herself, for his
 * wife, for a daughter. Addressing every buyer as female is wrong for a real
 * share of them, and visibly so to a judge opening the demo.
 *
 * This scans source rather than testing exported constants, because the copy
 * lives in several modules and the failure this guards against is a NEW string
 * added later, not the ones already fixed.
 *
 * Measured before writing: the model's own generated replies were neutral in
 * 14 of 14 samples. The hardcoded strings were not — which is why the guard
 * sits here, on our copy, rather than on the prompt.
 */

/* The honorific हैं / hain is what marks second person addressed to आप.
   "दिक्कत हो रही है" agrees with दिक्कत and is correct Hindi, so the singular
   है form is deliberately not matched. */
const BANNED: ReadonlyArray<readonly [RegExp, string]> = [
  [/(सकती|सकते)\s+हैं/g, "सकती/सकते हैं → use an imperative: बताइए, देखिए"],
  [/(रही|रहे)\s+हैं/g, "रही/रहे हैं → make the verb agree with her: मैं दिखाऊँ?"],
  [/(करती|करते)\s+हैं/g, "करती/करते हैं → use an imperative"],
  [/(चाहती|चाहते)\s+हैं/g, "चाहती/चाहते हैं → रephrase without the buyer's gender"],
  [/\b(sakti|sakte)\s+hain\b/gi, "sakti/sakte hain → use an imperative: bataiye"],
  [/\b(rahi|rahe)\s+hain\b/gi, "rahi/rahe hain → agree with her instead: Kya dikhaun?"],
  [/\b(chahti|chahte)\s+hain\b/gi, "chahti/chahte hain → rephrase"],
];

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      sourceFiles(full, out);
    } else if (/\.(ts|tsx)$/.test(entry) && !/\.test\.mts$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

describe("shipped copy never assumes the buyer's gender", () => {
  test("no second-person gendered verb form in any source file", () => {
    const offences: string[] = [];

    for (const file of sourceFiles("src")) {
      const lines = readFileSync(file, "utf8").split("\n");
      lines.forEach((line, i) => {
        for (const [re, fix] of BANNED) {
          /* .match, not .test: a /g regex carries lastIndex between .test()
             calls and silently skips matches. That bug made an earlier version
             of this detector miss a string it was written to catch. */
          if (line.match(re)) offences.push(`${file}:${i + 1}\n    ${line.trim()}\n    → ${fix}`);
        }
      });
    }

    assert.equal(
      offences.length,
      0,
      `Copy addresses the buyer as a specific gender:\n\n${offences.join("\n\n")}\n`,
    );
  });
});
