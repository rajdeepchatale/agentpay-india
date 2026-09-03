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
import { searchProducts } from "@/lib/catalog/search";
import { confirmLine } from "@/lib/chat/confirm";

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
/* उपलब्ध was here and is now not: it is spelled identically in Hindi and
   Marathi, so "क्या यह उपलब्ध है?" — ordinary Hindi — was classified Marathi and
   both answered and spoken in Marathi. Every marker left is Marathi-only:
   दाखवा against Hindi दिखाओ, काय against क्या, किंमत against कीमत. */
const MARATHI_MARKERS =
  /(आहे|नाही|तुम्ही|तुमच|आपल|मला|दाखवा|आवडेल|नमस्कार|साड्या|छान|किंमत|काय)/u;
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
  /**
   * The thread as the client has it.
   *
   * Server memory is per-instance on a serverless platform, so the history
   * this process holds is often empty for a conversation that is several
   * turns old — which is why the agent kept asking what she wanted after she
   * had already said. The client's copy is the one that survives.
   */
  history?: AgentMessage[];
  /**
   * The saree the agent last asked her to confirm, as the client has it.
   *
   * Pending consent lived in the same per-instance Map as the history, so
   * "order kara" arrived at a process that had forgotten what it had offered
   * and asked her to confirm all over again. Already checked against the
   * catalog by the validator; the guardrail engine still re-reads the price.
   */
  pendingProductId?: string;
  /**
   * The saree she just tapped Select on.
   *
   * When the client knows exactly which one it is, asking the model to work
   * it out again is a gamble taken immediately before money moves — and one
   * that has already been lost: a real session answered a tap with "shall I
   * proceed with the order?" AND a fresh grid of four sarees, because the
   * model narrated consent while calling search_products.
   */
  selectedProductId?: string;
}

/** Fallback copy, in the buyer's own language. */
const FALLBACK = {
  confused: {
    hinglish: "Maaf kijiye, main samajh nahi payi. Dobara bataiye?",
    hi: "माफ़ कीजिए, मैं समझ नहीं पाई। दोबारा बताइए?",
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
  /* Restore what this instance never knew it had offered, so her agreement
     has something to attach to. Her WORDS are still what grants it, judged
     server-side — the model never asserts consent and neither does the
     client. */
  if (req.pendingProductId) markConsentRequested(sessionId, req.pendingProductId);

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

  /* This instance's memory first — it is the record we wrote ourselves — and
     the client's copy when this instance has none, which on a serverless
     platform is most of the time. */
  const remembered = getHistory(sessionId);
  const thread = remembered.length ? remembered : (req.history ?? []);
  const messages: AgentMessage[] = [...thread, { role: "user", content: message }];
  const turnMessages: AgentMessage[] = [{ role: "user", content: message }];

  let products: Product[] | undefined;
  let order: ToolOutcome["order"];
  let consent: ToolOutcome["consent"];
  let failure: ToolOutcome["failure"];
  let blocked: ToolOutcome["blocked"];
  let auditId = "";

  /* A tap on Select is not a question for the model. Run the consent tool
     directly — the SAME path the model would have taken, so the guardrail
     engine still decides whether this saree may be offered at all — and
     answer with a fixed sentence. The words and the machinery cannot
     disagree if only one of them is free to vary. */
  if (req.selectedProductId) {
    const outcome = await runTool(
      "request_consent",
      { product_id: req.selectedProductId },
      {
        sessionId,
        maxSpend,
        buyerSaid: message,
        ...(allowedCategories ? { allowedCategories } : {}),
        hasConsentFor: (id: string) => hasConsent(sessionId, id),
        recordConsentRequest: (id: string) => markConsentRequested(sessionId, id),
      },
    );

    auditId = await logDecision({
      sessionId,
      action: outcome.blocked ? "guardrail_check" : "consent_request",
      input: { product_id: req.selectedProductId, message },
      output: outcome.result as Record<string, unknown>,
      guardrailStatus: outcome.blocked ? "blocked" : "passed",
      reasoning: outcome.reasoning,
    });

    appendMessages(sessionId, [{ role: "user", content: message }]);

    if (outcome.blocked) {
      /* What she CAN have, at her own cap. A refusal carrying real, buyable
         options is protection; one carrying only a sentence is a dead end. */
      const alternatives = searchProducts({ max_price: maxSpend }).slice(0, 3);
      return {
        type: "guardrail_blocked",
        content: outcome.blocked.suggestion,
        data: {
          guardrail: {
            rule: outcome.blocked.rule,
            limit: outcome.blocked.limit,
            attempted: outcome.blocked.attempted,
            suggestion: outcome.blocked.suggestion,
            asked_for: outcome.blocked.asked_for,
          },
          products: alternatives,
        },
        language: lang,
        audit_id: auditId,
      };
    }

    if (outcome.consent) {
      const line = confirmLine(outcome.consent.product, lang);
      appendMessages(sessionId, [{ role: "assistant", content: line }]);
      return {
        type: "consent_required",
        content: line,
        data: { products: [outcome.consent.product] },
        language: lang,
        audit_id: auditId,
      };
    }
  }

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
