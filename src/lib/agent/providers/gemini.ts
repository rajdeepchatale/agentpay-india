// ============================================================
// Gemini provider — gemini-3.6-flash on the free tier.
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
  "gemini-3.7-flash",
  "gemini-3.1-flash-lite",
  "gemini-3.6-flash",
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
 * 400/403/404 are ours — a malformed request, a bad key, a wrong model name —
 * and they fail identically on every model, so retrying only burns time.
 * No status at all means a timeout or a dropped connection: worth one more.
 */
export function isRetryableStatus(status: number | undefined): boolean {
  if (status === undefined) return true;
  return status === 429 || status >= 500;
}

const MODELS = modelChain(process.env.GEMINI_MODEL);

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
      let lastError: ProviderError | undefined;
      for (const model of MODELS) {
        try {
          return await callModel(model, key, req);
        } catch (e) {
          const err =
            e instanceof ProviderError
              ? e
              : new ProviderError((e as Error).message);
          /* Ours, not theirs — the next model fails the same way. */
          if (!isRetryableStatus(err.status)) throw err;
          lastError = err;
          console.warn(
            `[gemini] ${model} unavailable (${err.status ?? "timeout"}); trying next model`,
          );
        }
      }
      throw (
        lastError ??
        new ProviderError("Every Gemini model in the chain was unavailable.")
      );
    },
  };
}

async function callModel(
  MODEL: string,
  key: string,
  req: CompletionRequest,
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
    res = await fetch(`${ENDPOINT}/${MODELS[0]}:generateContent`, {
      method: "POST",
      headers: { "x-goog-api-key": key, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      /* Warm, this model answers in ~300ms. Cold, the free tier can take
         ~30s to schedule the first request. warmUp() below hides that;
         this ceiling exists so a genuine stall still fails cleanly. */
      signal: AbortSignal.timeout(45_000),
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
