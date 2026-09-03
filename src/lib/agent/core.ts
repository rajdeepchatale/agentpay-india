// ============================================================
// Agent core — the loop.
// ============================================================
// Reads a buyer message, lets the model call tools, and returns exactly one
// AgentResponse. The model never touches money directly: it names a tool,
// this loop decides whether that tool may run, and every decision is logged.
// ============================================================

import "server-only";
import type { AgentResponse, Product, SupportedLanguage } from "@/types";
import type { AgentMessage, LlmProvider } from "./provider.ts";
import { ProviderError } from "./provider.ts";
import { geminiProvider } from "./providers/gemini.ts";
import { buildSystemPrompt } from "./system-prompt.ts";
import { TOOL_SPECS, runTool, type ToolOutcome } from "./tools.ts";
import {
  appendMessages,
  clearPendingConsent,
  consumeConsent,
  getHistory,
  grantPendingConsent,
  hasConsent,
  isAffirmative,
  markConsentRequested,
} from "./conversation.ts";
import { logDecision, recordOrder } from "@/lib/audit/logger";
import { toPaise } from "@/lib/razorpay/amounts";

const MERCHANT = { name: "Sakhi Sarees", city: "Pune" };
/** How many times the model may call tools before we force a text answer. */
const MAX_TOOL_ROUNDS = 4;

function provider(): LlmProvider {
  /* One switch, one env var. Anthropic slots in here when it earns its keep. */
  switch (process.env.AGENT_PROVIDER ?? "gemini") {
    case "gemini":
    default:
      return geminiProvider();
  }
}

/**
 * Which language the reply came out in — reported to the UI.
 *
 * No \b anywhere: it only recognises ASCII word characters, so every
 * Devanagari marker silently failed to match and correct Marathi was
 * reported as Hindi.
 */
const MARATHI_MARKERS =
  /(आहे|नाही|तुम्ही|तुमच|आपल|मला|दाखवा|आवडेल|उपलब्ध|नमस्कार|साड्या|छान|किंमत|काय)/u;
const HINGLISH_MARKERS =
  /(^|\s)(hai|hain|kya|aap|aapke|aapko|mujhe|dikhao|chahiye|karo|nahi|haan|mein|ke|ki|bahut|acch)/i;

function detectLanguage(text: string): SupportedLanguage {
  if (/[ऀ-ॿ]/u.test(text)) {
    return MARATHI_MARKERS.test(text) ? "mr" : "hi";
  }
  return HINGLISH_MARKERS.test(text) ? "hinglish" : "en";
}

export interface AgentRequest {
  message: string;
  sessionId: string;
  maxSpend: number;
  /** Optional category allow-list from the client. */
  allowedCategories?: string[];
  /**
   * The language she picked in the header. Absent means detect it.
   *
   * A choice outranks detection: a buyer who selects मराठी and then types
   * "ok" — four ASCII characters with no marker in them — must still be
   * answered in Marathi. Detection is a good default, not a better answer
   * than her own.
   */
  language?: SupportedLanguage;
}

/** Fallback copy, in the buyer's own language. */
const FALLBACK = {
  confused: {
    hinglish: "Maaf kijiye, main samajh nahi payi. Aap dobara bata sakti hain?",
    hi: "माफ़ कीजिए, मैं समझ नहीं पाई। आप दोबारा बता सकती हैं?",
    mr: "माफ करा, मला समजलं नाही. तुम्ही पुन्हा सांगाल का?",
    en: "Sorry, I didn't catch that. Could you say it again?",
  },
  stuck: {
    hinglish: "Ek minute — mujhe yeh dhundhne mein dikkat ho rahi hai. Dobara try karein?",
    hi: "एक मिनट — मुझे यह ढूँढने में दिक्कत हो रही है। दोबारा कोशिश करें?",
    mr: "एक मिनिट — मला हे शोधण्यात अडचण येत आहे. पुन्हा प्रयत्न कराल?",
    en: "One moment — I'm having trouble finding that. Could you try again?",
  },
  broken: {
    hinglish: "Maaf kijiye, abhi connection mein dikkat aa rahi hai. Thodi der baad try karein?",
    hi: "माफ़ कीजिए, अभी कनेक्शन में दिक्कत आ रही है। थोड़ी देर बाद कोशिश करें?",
    mr: "माफ करा, सध्या कनेक्शनमध्ये अडचण आहे. थोड्या वेळाने प्रयत्न कराल?",
    en: "Sorry, there's a connection problem right now. Could you try again shortly?",
  },
} as const;

export async function runAgent(req: AgentRequest): Promise<AgentResponse> {
  const { message, sessionId, maxSpend, allowedCategories } = req;
  /* Her choice first, detection second — and either way it is derived from
     HER, so a failure still answers in her language. */
  const lang = req.language ?? detectLanguage(message);

  /* The reply's own language is normally the most accurate signal — the model
     wrote it. But a pinned choice outranks that too, or a Marathi buyer whose
     agent slips into Hindi would be answered, and spoken to, in Hindi. */
  const replyLanguage = (text: string): SupportedLanguage =>
    req.language ?? detectLanguage(text);

  /* Consent is granted by the BUYER, never by the model. If her message reads
     as agreement, promote whatever the agent last asked her to confirm. */
  if (isAffirmative(message)) {
    const granted = grantPendingConsent(sessionId);
    if (granted.length) {
      await logDecision({
        sessionId,
        action: "consent_request",
        input: { message },
        output: { granted },
        guardrailStatus: "passed",
        reasoning: `Buyer agreed. Consent granted for: ${granted.join(", ")}.`,
      });
    }
  } else if (/\b(nahi|nako|no|nope|cancel|rehne do)\b/i.test(message)) {
    clearPendingConsent(sessionId);
  }

  const system = buildSystemPrompt({
    merchantName: MERCHANT.name,
    merchantCity: MERCHANT.city,
    maxSpend,
    ...(req.language ? { language: req.language } : {}),
  });

  const messages: AgentMessage[] = [
    ...getHistory(sessionId),
    { role: "user", content: message },
  ];
  const turnMessages: AgentMessage[] = [{ role: "user", content: message }];

  let products: Product[] | undefined;
  let order: ToolOutcome["order"];
  let consent: ToolOutcome["consent"];
  let failure: ToolOutcome["failure"];
  let blocked: ToolOutcome["blocked"];
  let auditId = "";

  const llm = provider();

  try {
    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const result = await llm.complete({
        system,
        messages,
        /* Once an order exists or consent is pending, stop offering tools —
           the agent should be talking to her, not calling more functions. */
        tools: order || consent || blocked ? [] : TOOL_SPECS,
        maxTokens: 1024,
      });

      if (result.toolCalls.length === 0) {
        const text = result.text || FALLBACK.confused[lang];

        appendMessages(sessionId, [
          ...turnMessages,
          { role: "assistant", content: text },
        ]);

        if (order) {
          return {
            type: "order_created",
            content: text,
            data: { order },
            language: replyLanguage(text),
            audit_id: auditId,
          };
        }
        if (consent) {
          return {
            type: "consent_required",
            content: text,
            data: { products: [consent.product] },
            language: replyLanguage(text),
            audit_id: auditId,
          };
        }
        if (blocked) {
          return {
            type: "guardrail_blocked",
            content: text,
            data: {
              guardrail: {
                rule: blocked.rule,
                limit: blocked.limit,
                attempted: blocked.attempted,
                suggestion: blocked.suggestion,
                asked_for: blocked.asked_for,
              },
              /* The affordable alternatives the engine already found. A
                 refusal that carries real, buyable options is protection;
                 one that carries only a sentence is a dead end. */
              products,
            },
            language: replyLanguage(text),
            audit_id: auditId,
          };
        }
        if (failure) {
          return {
            type: "failure_handled",
            content: text,
            data: { failure, products },
            language: replyLanguage(text),
            audit_id: auditId,
          };
        }
        return {
          type: products?.length ? "products" : "text",
          content: text,
          data: products?.length ? { products } : undefined,
          language: replyLanguage(text),
          audit_id: auditId,
        };
      }

      /* The model asked for tools. Run them under policy. */
      const assistantTurn: AgentMessage = {
        role: "assistant",
        content: result.text,
        toolCalls: result.toolCalls,
      };
      messages.push(assistantTurn);
      turnMessages.push(assistantTurn);

      for (const call of result.toolCalls) {
        const outcome = await runTool(call.name, call.args, {
          sessionId,
          maxSpend,
          allowedCategories,
          /* Her own words, so a rule is judged on what she asked for and not
             on how the model chose to paraphrase it. */
          buyerSaid: message,
          hasConsentFor: (id) => hasConsent(sessionId, id),
          recordConsentRequest: (id) => markConsentRequested(sessionId, id),
        });

        if (outcome.products) products = outcome.products;
        if (outcome.consent) consent = outcome.consent;
        if (outcome.failure) failure = outcome.failure;
        if (outcome.blocked) blocked = outcome.blocked;

        if (outcome.order) {
          order = outcome.order;

          /* THE ORDER NOW EXISTS AT RAZORPAY. Nothing below may throw.
             Bookkeeping that fails after money has been committed must not
             turn a successful purchase into an error the buyer sees — she
             would be charged for an order the UI told her had failed. */
          try {
            consumeConsent(sessionId, outcome.orderedProduct?.id ?? "");
            const p = outcome.orderedProduct;
            await recordOrder({
              sessionId,
              productId: p?.id ?? "",
              productName: p?.name ?? "",
              amount: outcome.order.amount,
              amountPaise: toPaise(outcome.order.amount),
              razorpayOrderId: outcome.order.razorpay_order_id,
              paymentLink: outcome.order.payment_link,
            });
          } catch (e) {
            console.error(
              "[order] created at Razorpay but not recorded locally:",
              outcome.order.razorpay_order_id,
              (e as Error).message,
            );
          }
        }

        auditId = await logDecision({
          sessionId,
          action: outcome.blocked
            ? "guardrail_check"
            : call.name === "search_products"
              ? "search_products"
              : call.name === "create_order"
                ? "create_order"
                : "consent_request",
          input: call.args,
          output: outcome.result,
          guardrailStatus: outcome.reasoning.startsWith("BLOCKED")
            ? "blocked"
            : "passed",
          reasoning: outcome.reasoning,
        });

        const toolTurn: AgentMessage = {
          role: "tool",
          toolCallId: call.id,
          name: call.name,
          content: JSON.stringify(outcome.result),
        };
        messages.push(toolTurn);
        turnMessages.push(toolTurn);
      }
    }

    /* Ran out of rounds without the model settling on an answer. */
    const text = FALLBACK.stuck[lang];
    appendMessages(sessionId, [
      ...turnMessages,
      { role: "assistant", content: text },
    ]);
    return {
      type: "text",
      content: text,
      language: lang,
      audit_id: auditId,
    };
  } catch (e) {
    const err = e instanceof ProviderError ? e.message : (e as Error).message;
    await logDecision({
      sessionId,
      action: "failure_recovery",
      input: { message },
      output: { error: err },
      guardrailStatus: "n/a",
      reasoning: `Agent failed: ${err}`,
    });

    return {
      type: "error",
      content: FALLBACK.broken[lang],
      language: lang,
      audit_id: auditId,
    };
  }
}
