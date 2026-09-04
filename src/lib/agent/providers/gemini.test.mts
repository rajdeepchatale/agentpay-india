import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { modelChain, isRetryableStatus } from "./gemini.ts";

/* Sep 4: Google returned 503 UNAVAILABLE — "high demand" — on
   gemini-flash-lite-latest, and the chat died with a connection error four
   hours before a submission deadline. Measured across the key that afternoon:
   flash-lite 503, 3.5-flash-lite 503, 3.8-flash 503, flash-latest 503, while
   3.7-flash answered in 6.5s.

   One pinned model is a single point of failure against someone else's
   capacity. These two helpers are what let a blip fall through to the next
   model instead of ending a recording take. */

describe("modelChain", () => {
  test("falls back to a built-in chain when GEMINI_MODEL is unset", () => {
    const chain = modelChain(undefined);
    assert.ok(chain.length > 1, "a single model is the bug this fixes");
  });

  test("puts an explicitly configured model first", () => {
    assert.equal(modelChain("gemini-3.7-flash")[0], "gemini-3.7-flash");
  });

  test("keeps fallbacks after the configured model", () => {
    assert.ok(modelChain("gemini-3.7-flash").length > 1);
  });

  test("accepts a comma-separated chain and preserves its order", () => {
    assert.deepEqual(
      modelChain("a-model, b-model ,c-model").slice(0, 3),
      ["a-model", "b-model", "c-model"],
    );
  });

  test("never repeats a model, so a retry is never wasted on one just tried", () => {
    const chain = modelChain("gemini-3.7-flash");
    assert.equal(new Set(chain).size, chain.length);
  });

  test("ignores blank entries rather than requesting an empty model name", () => {
    assert.ok(!modelChain("a-model, ,b-model").includes(""));
  });
});

describe("isRetryableStatus", () => {
  test("503 is retryable — this is the exact failure that broke the demo", () => {
    assert.equal(isRetryableStatus(503), true);
  });

  test("429 is retryable — rate limit on one model, not on the next", () => {
    assert.equal(isRetryableStatus(429), true);
  });

  test("500 and 502 are retryable", () => {
    assert.equal(isRetryableStatus(500), true);
    assert.equal(isRetryableStatus(502), true);
  });

  test("404 is NOT retryable — a wrong model name fails the same way twice", () => {
    assert.equal(isRetryableStatus(404), false);
  });

  test("400 is NOT retryable — a malformed request is our bug, not theirs", () => {
    assert.equal(isRetryableStatus(400), false);
  });

  test("403 is NOT retryable — a bad key will not fix itself on model two", () => {
    assert.equal(isRetryableStatus(403), false);
  });

  test("a timeout, which has no status, is retryable", () => {
    assert.equal(isRetryableStatus(undefined), true);
  });
});
