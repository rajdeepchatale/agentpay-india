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

  test("404 IS retryable — a retired model name is per-model, not per-request", () => {
    assert.equal(isRetryableStatus(404), true);
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

/* ------------------------------------------------------------------
   The fallback loop itself — not just the helpers that feed it.

   The first version of these tests covered modelChain() and
   isRetryableStatus() and stopped there. complete() shipped calling
   MODELS[0] on every iteration instead of the model it was handed, so the
   chain retried one model four times while logging that it had moved on —
   and 295 tests stayed green through all of it.

   These drive complete() with a stubbed fetch and assert on WHICH model was
   asked, which is the only thing that makes the feature real.
   ------------------------------------------------------------------ */
describe("complete — the fallback actually walks the chain", () => {
  const ok = () => new Response(JSON.stringify({
    candidates: [{ content: { parts: [{ text: "hi" }] } }],
  }), { status: 200, headers: { "content-type": "application/json" } });
  const err = (status: number) => new Response(
    JSON.stringify({ error: { message: "nope", status: "X" } }),
    { status, headers: { "content-type": "application/json" } });

  const req = { system: "s", messages: [], tools: [], maxTokens: 16 };

  /** Runs complete() against a stub fetch, returning the models actually hit. */
  async function run(responses: Response[]) {
    const realFetch = globalThis.fetch;
    const realKey = process.env.GEMINI_API_KEY;
    const realModel = process.env.GEMINI_MODEL;
    const hits: string[] = [];
    process.env.GEMINI_API_KEY = "k";
    let i = 0;
    globalThis.fetch = (async (url: string) => {
      hits.push(String(url).split("/models/")[1].split(":")[0]);
      return responses[i++] ?? ok();
    }) as unknown as typeof fetch;
    try {
      const { geminiProvider } = await import(`./gemini.ts?fb=${Math.random()}`);
      await geminiProvider().complete(req).catch(() => {});
    } finally {
      globalThis.fetch = realFetch;
      if (realKey === undefined) delete process.env.GEMINI_API_KEY;
      else process.env.GEMINI_API_KEY = realKey;
      if (realModel === undefined) delete process.env.GEMINI_MODEL;
      else process.env.GEMINI_MODEL = realModel;
    }
    return hits;
  }

  test("a 503 on the first model sends the next request to a DIFFERENT model", async () => {
    const hits = await run([err(503), ok()]);
    assert.equal(hits.length, 2, "should have tried twice");
    assert.notEqual(hits[0], hits[1], "the retry hit the same model — the chain is dead");
  });

  test("the first request goes to the head of the chain", async () => {
    const hits = await run([ok()]);
    assert.equal(hits[0], modelChain(process.env.GEMINI_MODEL)[0]);
  });

  test("a non-retryable status stops the chain immediately", async () => {
    const hits = await run([err(403), ok()]);
    assert.equal(hits.length, 1, "403 is ours, not theirs — must not retry");
  });
});

/* ------------------------------------------------------------------
   Slow is not the same as broken.

   The chain falls through on 404/429/5xx/timeout — a model that ERRORS is
   replaced instantly. But a model that simply takes 12 seconds is not an
   error, so nothing reacted to it, and the buyer waited. gemini-3.5-flash
   measured 11.7s on 5 Sep while returning 200s.

   So the head of the chain is now hedged: if it has not answered within
   HEDGE_AFTER_MS, the second model is started alongside it and whichever
   answers first wins. A healthy first model never triggers it.
   ------------------------------------------------------------------ */
describe("complete — a slow first model is raced, not waited on", () => {
  const body = JSON.stringify({ candidates: [{ content: { parts: [{ text: "hi" }] } }] });
  const okAfter = (ms: number) => new Promise<Response>((r) =>
    setTimeout(() => r(new Response(body, { status: 200 })), ms));

  async function race(delays: Record<string, number>) {
    const realFetch = globalThis.fetch;
    const realKey = process.env.GEMINI_API_KEY;
    const hits: string[] = [];
    process.env.GEMINI_API_KEY = "k";
    globalThis.fetch = (async (url: string) => {
      const m = String(url).split("/models/")[1].split(":")[0];
      hits.push(m);
      return okAfter(delays[m] ?? 0);
    }) as unknown as typeof fetch;
    const t0 = Date.now();
    try {
      const { geminiProvider } = await import(`./gemini.ts?hedge=${Math.random()}`);
      await geminiProvider()
        .complete({ system: "s", messages: [], tools: [], maxTokens: 16 })
        .catch(() => {});
    } finally {
      globalThis.fetch = realFetch;
      if (realKey === undefined) delete process.env.GEMINI_API_KEY;
      else process.env.GEMINI_API_KEY = realKey;
    }
    return { hits, ms: Date.now() - t0 };
  }

  test("a healthy first model answers alone — no second request", async () => {
    const chain = modelChain(process.env.GEMINI_MODEL);
    const { hits } = await race({ [chain[0]]: 5 });
    assert.equal(hits.length, 1, "hedged a model that was already fast");
  });

  test("a stalled first model does not hold the buyer — the second is raced", async () => {
    const chain = modelChain(process.env.GEMINI_MODEL);
    const { hits, ms } = await race({ [chain[0]]: 4000, [chain[1]]: 10 });
    assert.ok(hits.length >= 2, "never started the second model");
    assert.ok(ms < 3500, `waited ${ms}ms for a stalled model instead of racing`);
  });
});
