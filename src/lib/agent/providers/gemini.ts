// ============================================================
// Gemini provider — a chain of models on the free tier, first healthy wins.
// ============================================================
// Verified Sep 2: function calling works, Marathi in → Marathi out, and the
// guardrail refusal reads warm rather than robotic.
//
// Gemini's wire format differs from the neutral shape in provider.ts:
//   - "assistant" is called "model"
//   - tool results are functionResponse parts on a "user" turn
//   - tool calls carry no id, so ids are synthesised for matching
// ============================================================

import type {
  AgentMessage,
  CompletionRequest,
  CompletionResult,
  LlmProvider,
  ToolCall,
  ToolSpec,
} from "../provider.ts";
import { ProviderError } from "../provider.ts";

const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";

/* Tried in order when one is unavailable.

   On 4 Sep, four hours before the deadline, Google returned 503 UNAVAILABLE —
   "this model is currently experiencing high demand" — on the pinned model,
   and the chat answered every buyer with a connection error. Measured on the
   key that afternoon: flash-lite 503, 3.5-flash-lite 503, 3.8-flash 503,
   flash-latest 503, 3.6-flash up but ~30s, 3.7-flash 6.5s.

   Pinning one model makes someone else's capacity a single point of failure.
   Ordered fastest-measured first. */
const FALLBACK_MODELS = [
  "gemini-3.1-flash-lite", // 1.9s measured — fastest of the six
  "gemini-3.7-flash", //     6.5s
  "gemini-3.6-flash", //     ~30s, but up when the others were not
  "gemini-3.5-flash",
];

/**
 * The models to try, in order. `GEMINI_MODEL` may name one or a
 * comma-separated chain; whatever it names is tried first, then the
 * built-in fallbacks. Never repeats a model — a retry against one that just
 * failed is a wasted second on camera.
 */
export function modelChain(configured: string | undefined): string[] {
  const preferred = (configured ?? "")
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);
  return [...new Set([...preferred, ...FALLBACK_MODELS])];
}

/**
 * Is this worth trying on the next model?
 *
 * 429 and 5xx are Google's capacity, and the next model may well be fine.
 * 400/401/403 are ours — a malformed request or a bad key — and they fail
 * identically on every model, so retrying only burns time.
 *
 * 404 IS retryable, which the first version got wrong. A 404 means *this
 * model name* does not exist: Google retires and renames models, and a
 * retired head-of-chain is precisely the case the chain exists to survive.
 * Treating it as ours aborted the whole chain over one dead name.
 *
 * No status at all means a timeout or a dropped connection: worth one more.
 */
export function isRetryableStatus(status: number | undefined): boolean {
  if (status === undefined) return true;
  return status === 404 || status === 429 || status >= 500;
}

const MODELS = modelChain(process.env.GEMINI_MODEL);

/* How long the head of the chain gets before the next model is started
   alongside it.

   The chain already replaces a model that ERRORS. It could not react to one
   that was merely slow — and slow is the failure a buyer actually feels.
   gemini-3.5-flash returned healthy 200s at 11.7s on 5 Sep; nothing in the
   chain noticed, because nothing was wrong.

   2.5s is chosen from measurement, not taste: the head answers in ~1.1s and
   a whole turn is ~1.9s, so a healthy model is never hedged and the second
   request is never sent. It only fires when something has genuinely stalled. */
const HEDGE_AFTER_MS = 2_500;

type Settled =
  | { ok: true; value: CompletionResult }
  | { ok: false; error: unknown };

const settle = (p: Promise<CompletionResult>): Promise<Settled> =>
  p.then(
    (value) => ({ ok: true, value }) as Settled,
    (error) => ({ ok: false, error }) as Settled,
  );

const asProviderError = (e: unknown): ProviderError =>
  e instanceof ProviderError ? e : new ProviderError((e as Error).message);

/**
 * Run the head of the chain, hedged against the model behind it.
 *
 * A healthy head answers well inside HEDGE_AFTER_MS and `second` is never
 * called. A stalled head is overtaken: both run, and the first SUCCESS wins.
 * A head that fails fast throws straight away, so the caller's sequential
 * walk picks up from `second` as it always did.
 */
async function raceHead(
  head: string,
  second: string | undefined,
  key: string,
  req: CompletionRequest,
): Promise<CompletionResult> {
  if (!second) return callModel(head, key, req, true);

  const a = settle(callModel(head, key, req, true));
  const slow = Symbol("slow");
  const firstUp = await Promise.race([
    a,
    new Promise<typeof slow>((r) => setTimeout(() => r(slow), HEDGE_AFTER_MS)),
  ]);

  /* The head resolved on its own — success or failure, that is the answer. */
  if (firstUp !== slow) {
    if (firstUp.ok) return firstUp.value;
    throw firstUp.error;
  }

  /* Stalled. Start the second alongside and take whichever succeeds first;
     the loser is left to settle and ignored. */
  const b = settle(callModel(second, key, req, false));
  const winner = await Promise.race([a, b]);
  if (winner.ok) return winner.value;

  const both = await Promise.all([a, b]);
  const good = both.find((r) => r.ok);
  if (good?.ok) return good.value;
  throw (both[1] as { error: unknown }).error;
}

/* Gemini wants SCREAMING type names in its schema dialect. */
function toGeminiSchema(spec: ToolSpec) {
  const upper = (node: unknown): unknown => {
    if (Array.isArray(node)) return node.map(upper);
    if (node && typeof node === "object") {
      return Object.fromEntries(
        Object.entries(node as Record<string, unknown>).map(([k, v]) =>
          k === "type" && typeof v === "string"
            ? [k, v.toUpperCase()]
            : [k, upper(v)],
        ),
      );
    }
    return node;
  };
  return {
    name: spec.name,
    description: spec.description,
    parameters: upper(spec.parameters),
  };
}

interface GeminiPart {
  text?: string;
  functionCall?: { name: string; args?: Record<string, unknown> };
  functionResponse?: { name: string; response: Record<string, unknown> };
  /* Gemini 3.x is a thinking model: it signs each function call and REJECTS
     the call if it is replayed without the signature. Captured on the way
     out, replayed on the way back in. */
  thoughtSignature?: string;
}

function toGeminiContents(messages: AgentMessage[]) {
  const contents: { role: "user" | "model"; parts: GeminiPart[] }[] = [];

  for (const m of messages) {
    if (m.role === "user") {
      contents.push({ role: "user", parts: [{ text: m.content }] });
      continue;
    }

    if (m.role === "assistant") {
      const parts: GeminiPart[] = [];
      if (m.content) parts.push({ text: m.content });
      for (const c of m.toolCalls ?? []) {
        const part: GeminiPart = {
          functionCall: { name: c.name, args: c.args },
        };
        const sig = c.providerMeta?.thoughtSignature;
        if (typeof sig === "string") part.thoughtSignature = sig;
        parts.push(part);
      }
      if (parts.length) contents.push({ role: "model", parts });
      continue;
    }

    /* A tool result. Gemini expects it as a functionResponse on a user turn,
       and merges consecutive results into one turn. */
    const part: GeminiPart = {
      functionResponse: {
        name: m.name,
        response: { result: safeParse(m.content) },
      },
    };
    const last = contents[contents.length - 1];
    if (last?.role === "user" && last.parts.every((p) => p.functionResponse)) {
      last.parts.push(part);
    } else {
      contents.push({ role: "user", parts: [part] });
    }
  }

  return contents;
}

function safeParse(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return s;
  }
}

/**
 * Fire a throwaway request so the free tier schedules capacity.
 *
 * Measured Sep 2: the first two calls to a cold model took 27s and 29s; the
 * next three took 199ms, 330ms and 258ms. The model is not slow — the free
 * tier is slow to *start*. Calling this when the chat page loads means the
 * buyer's first real message lands on a warm path.
 *
 * Never throws: a failed warm-up must not break anything.
 */
export async function warmUp(): Promise<void> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return;
  try {
    await fetch(`${ENDPOINT}/${MODELS[0]}:generateContent`, {
      method: "POST",
      headers: { "x-goog-api-key": key, "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: "hi" }] }],
        generationConfig: { maxOutputTokens: 1, temperature: 0 },
      }),
      signal: AbortSignal.timeout(40_000),
    });
  } catch {
    /* Warming is an optimisation, never a requirement. */
  }
}

export function geminiProvider(): LlmProvider {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new ProviderError(
      "GEMINI_API_KEY is not set. Add it to .env.local.",
    );
  }

  return {
    id: `gemini:${MODELS[0]}`,

    async complete(req: CompletionRequest): Promise<CompletionResult> {
      const [head, second, ...rest] = MODELS;
      let lastError: ProviderError | undefined;

      /* The head, hedged against the model behind it. */
      try {
        return await raceHead(head, second, key, req);
      } catch (e) {
        const err = asProviderError(e);
        if (!isRetryableStatus(err.status)) throw err;
        lastError = err;
        console.warn(
          `[gemini] ${head} unavailable (${err.status ?? "timeout"}); trying next model`,
        );
      }

      /* Everything behind it, one at a time. `second` is retried here when the
         head failed fast — the hedge never started it in that case — and the
         repeat when it did is a rare, cheap price for never skipping a model. */
      for (const model of [second, ...rest].filter(Boolean)) {
        try {
          return await callModel(model, key, req, false);
        } catch (e) {
          const err = asProviderError(e);
          if (!isRetryableStatus(err.status)) throw err;
          lastError = err;
          console.warn(
            `[gemini] ${model} unavailable (${err.status ?? "timeout"}); trying next model`,
          );
        }
      }
      /* Non-null: MODELS always holds at least the four fallbacks, so the loop
         body runs and assigns lastError before we ever get here. */
      throw lastError!;
    },
  };
}

async function callModel(
  model: string,
  key: string,
  req: CompletionRequest,
  isFirst = true,
): Promise<CompletionResult> {
  const body = {
    systemInstruction: { parts: [{ text: req.system }] },
    contents: toGeminiContents(req.messages),
    tools: req.tools.length
      ? [{ functionDeclarations: req.tools.map(toGeminiSchema) }]
      : undefined,
    generationConfig: {
      /* Deterministic: the same buyer question should not produce a
         different shop every time. */
      temperature: 0,
      maxOutputTokens: req.maxTokens ?? 2048,
    },
  };

  let res: Response;
  try {
    /* `model`, NOT MODELS[0].
       This line read MODELS[0] for one release: the extraction that created
       this function renamed the parameter to match the deleted module
       constant, a sed rewrote both call sites, and the loop above then
       retried the same model on every pass while logging that it had moved
       on. tsc passed, 295 tests passed, and the fallback never once worked. */
    res = await fetch(`${ENDPOINT}/${model}:generateContent`, {
      method: "POST",
      headers: { "x-goog-api-key": key, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      /* First model gets the full ceiling. Later ones get less, because the
         client aborts the whole turn at 30s — a chain that spends 45s per
         model can never rescue anything. */
      signal: AbortSignal.timeout(isFirst ? 20_000 : 8_000),
    });
  } catch (e) {
    throw new ProviderError(
      e instanceof Error && e.name === "TimeoutError"
        ? "The model took too long to respond."
        : `Could not reach Gemini: ${(e as Error).message}`,
    );
  }

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg =
      (json as { error?: { message?: string } })?.error?.message ??
      `Gemini returned ${res.status}`;
    throw new ProviderError(msg, res.status);
  }

  const candidate = (
    json as { candidates?: { content?: { parts?: GeminiPart[] } }[] }
  ).candidates?.[0];
  const parts = candidate?.content?.parts ?? [];

  const text = parts
    .map((p) => p.text ?? "")
    .join("")
    .trim();

  const toolCalls: ToolCall[] = parts
    .filter((p) => p.functionCall)
    .map((p, i) => ({
      /* Gemini does not return call ids; synthesise one so results can be
         matched back in the neutral message format. */
      id: `call_${Date.now()}_${i}`,
      name: p.functionCall!.name,
      args: p.functionCall!.args ?? {},
      /* Carry the signature so the next turn can replay it. Without this
         Gemini 3.x rejects the whole request. */
      ...(p.thoughtSignature
        ? { providerMeta: { thoughtSignature: p.thoughtSignature } }
        : {}),
    }));

  const um = (
    json as {
      usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
    }
  ).usageMetadata;

  return {
    text,
    toolCalls,
    usage: um
      ? { input: um.promptTokenCount ?? 0, output: um.candidatesTokenCount ?? 0 }
      : undefined,
  };
}
