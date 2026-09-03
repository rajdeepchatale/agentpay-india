import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { validateChatRequest } from "./validate.ts";

const base = { message: "cotton saree dikhao", session_id: "s1" };

describe("validateChatRequest — the buyer's chosen language", () => {
  test("accepts each supported language", () => {
    for (const language of ["hi", "mr", "hinglish", "en"]) {
      const v = validateChatRequest({ ...base, language });
      assert.ok(v.ok);
      assert.equal(v.language, language);
    }
  });

  test("omits the field when no preference is sent, so detection still runs", () => {
    const v = validateChatRequest(base);
    assert.ok(v.ok);
    assert.equal(v.language, undefined);
  });

  test("drops anything that is not a language we support", () => {
    /* This crosses the wire, so it is attacker-controlled like the spend cap.
       An unrecognised value must fall back to detection, never reach the
       prompt, and never index a phrase table with a key that isn't there. */
    for (const bad of ["ta", "", "HI", 42, null, { hi: 1 }, "__proto__"]) {
      const v = validateChatRequest({ ...base, language: bad });
      assert.ok(v.ok, `should still accept the request: ${String(bad)}`);
      assert.equal(v.language, undefined, `should reject language ${String(bad)}`);
    }
  });

  test("a language preference does not weaken the spend cap", () => {
    const v = validateChatRequest({
      ...base,
      language: "mr",
      guardrails: { max_spend: 99_999_999 },
    });
    assert.ok(v.ok);
    assert.ok(v.maxSpend < 99_999_999, "cap must still be clamped");
  });
});
