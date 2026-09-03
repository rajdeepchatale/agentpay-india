import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { turnLanguage, SPOKEN_CONFIDENCE_FLOOR } from "./language.ts";

/**
 * Which language a turn is answered in.
 *
 * The bug this exists to fix: Sarvam's saarika reports the language it heard,
 * with a probability, and the client threw both away. The agent then re-derived
 * the language from the transcript with a fourteen-word regex — one that
 * contained उपलब्ध, spelled identically in Hindi and Marathi. A Hindi buyer
 * asking "क्या यह उपलब्ध है?" was answered, and spoken to, in Marathi.
 */

describe("turnLanguage — pinned beats heard beats guessed", () => {
  test("her explicit choice always wins", () => {
    /* She picked मराठी in the header. Nothing the microphone reports may
       override that — it is the one signal that is not an inference. */
    assert.equal(
      turnLanguage({ pinned: "mr", spoken: "hi", confidence: 1 }),
      "mr",
    );
  });

  test("what Sarvam heard is used when she has not pinned anything", () => {
    assert.equal(turnLanguage({ spoken: "hi", confidence: 1 }), "hi");
  });

  test("a low-confidence guess is discarded rather than trusted", () => {
    /* Below the floor, the server's own text detection is the better bet —
       so send nothing and let it decide, exactly as before. */
    assert.equal(turnLanguage({ spoken: "mr", confidence: 0.2 }), undefined);
  });

  test("the floor is a real gate, not a formality", () => {
    /* parseTranscript defaults confidence to 0.9 when saarika omits it, so a
       floor above 0.9 would silently reject every real transcript. */
    assert.ok(SPOKEN_CONFIDENCE_FLOOR > 0);
    assert.ok(
      SPOKEN_CONFIDENCE_FLOOR < 0.9,
      "floor must sit below the default confidence or nothing ever passes",
    );
    assert.equal(
      turnLanguage({ spoken: "hi", confidence: SPOKEN_CONFIDENCE_FLOOR }),
      "hi",
    );
  });

  test("a typed turn sends nothing, so the server detects as it always did", () => {
    assert.equal(turnLanguage({}), undefined);
  });

  test("a spoken language with no confidence reported is not trusted blindly", () => {
    assert.equal(turnLanguage({ spoken: "hi" }), undefined);
  });
});
