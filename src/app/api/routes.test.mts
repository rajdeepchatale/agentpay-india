import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { validateChatRequest } from "@/lib/agent/validate";

/* The chat route is the only endpoint the UI talks to. Its request validation
   is pure, so it is tested here without a running server. */

describe("chat request validation", () => {
  test("accepts a well-formed request", () => {
    const v = validateChatRequest({
      message: "cotton saree dikhao",
      session_id: "s1",
      guardrails: { max_spend: 1000 },
    });
    assert.equal(v.ok, true);
    if (v.ok) {
      assert.equal(v.message, "cotton saree dikhao");
      assert.equal(v.maxSpend, 1000);
    }
  });

  test("trims whitespace", () => {
    const v = validateChatRequest({ message: "  haan  ", session_id: " s1 " });
    assert.equal(v.ok, true);
    if (v.ok) assert.equal(v.message, "haan");
  });

  test("rejects an empty message", () => {
    const v = validateChatRequest({ message: "   ", session_id: "s1" });
    assert.equal(v.ok, false);
    if (!v.ok) assert.equal(v.status, 400);
  });

  test("rejects a missing session_id", () => {
    assert.equal(validateChatRequest({ message: "hi" }).ok, false);
  });

  test("rejects a non-string message", () => {
    assert.equal(validateChatRequest({ message: 42, session_id: "s1" }).ok, false);
  });

  test("rejects an absurdly long message", () => {
    const v = validateChatRequest({ message: "a".repeat(5000), session_id: "s1" });
    assert.equal(v.ok, false);
  });

  test("defaults the spending cap when none is sent", () => {
    const v = validateChatRequest({ message: "hi", session_id: "s1" });
    if (v.ok) assert.equal(v.maxSpend, 1000);
  });

  test("clamps a tampered cap — a client cannot raise its own ceiling", () => {
    const v = validateChatRequest({
      message: "hi",
      session_id: "s1",
      guardrails: { max_spend: 99_999_999 },
    });
    if (v.ok) assert.equal(v.maxSpend, 100_000);
  });

  test("ignores a negative or nonsense cap", () => {
    for (const bad of [-500, 0, "lots", null, NaN]) {
      const v = validateChatRequest({
        message: "hi",
        session_id: "s1",
        guardrails: { max_spend: bad },
      });
      if (v.ok) assert.equal(v.maxSpend, 1000, `cap ${String(bad)} should fall back`);
    }
  });

  test("passes an allowed-categories list through", () => {
    const v = validateChatRequest({
      message: "hi",
      session_id: "s1",
      guardrails: { max_spend: 1000, allowed_categories: ["sarees"] },
    });
    if (v.ok) assert.deepEqual(v.allowedCategories, ["sarees"]);
  });
});
