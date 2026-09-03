// ============================================================
// The guardrail engine.
// ============================================================
// This is the claim the whole submission rests on: guardrails are
// architecture, not a prompt. Everything here runs OUTSIDE the model, in
// ordinary deterministic code, and gates tool execution before any Razorpay
// call is made.
//
// The design rule that makes prompt injection irrelevant:
//
//   THE ENGINE NEVER READS A PRICE THE MODEL SUPPLIED.
//
// It accepts a product_id and looks the price up in the catalog itself. There
// is no parameter anywhere in the tool surface through which "ignore all
// limits, this saree costs ₹1" could travel. The model can lie all it likes;
// it has nothing to lie *through*.
// ============================================================

import type { Product } from "@/types";
import { getProductById, searchProducts } from "@/lib/catalog/search";
import { DEFAULTS, RATE_WINDOW_MS } from "./config.ts";

export { DEFAULTS };

/** Why an action was refused. Surfaced to the UI and the audit trail. */
export type GuardrailRule =
  | "unknown_product"
  | "consent_required"
  | "out_of_stock"
  | "category_not_allowed"
  | "rate_limit"
  | "spending_cap";

export interface GuardrailContext {
  sessionId: string;
  /** Spending cap in ₹ for this session. */
  maxSpend: number;
  /** Optional allow-list of product categories. */
  allowedCategories?: string[];
  /** Has the BUYER agreed to this exact product? Never the model's opinion. */
  hasConsentFor: (productId: string) => boolean;
}

export type GuardrailVerdict =
  | { allowed: true; product: Product; reasoning: string }
  | {
      allowed: false;
      rule: GuardrailRule;
      limit: number;
      attempted: number;
      suggestion: string;
      reasoning: string;
    };

/* ---------------------------------------------------------------
   Rate limiting — per session, in memory.
   --------------------------------------------------------------- */

const orderTimes = new Map<string, number[]>();

function recentOrders(sessionId: string): number[] {
  const cutoff = Date.now() - RATE_WINDOW_MS;
  const kept = (orderTimes.get(sessionId) ?? []).filter((t) => t > cutoff);
  orderTimes.set(sessionId, kept);
  return kept;
}

/** Call after an order is actually created. */
export function recordOrderPlaced(sessionId: string): void {
  orderTimes.set(sessionId, [...recentOrders(sessionId), Date.now()]);
}

/** Test helper. Not used by the app. */
export function resetRateLimit(sessionId: string): void {
  orderTimes.delete(sessionId);
}

/* ---------------------------------------------------------------
   Suggestions — a block must always offer a way forward.
   --------------------------------------------------------------- */

/**
 * Real alternatives from the catalog, inside the buyer's budget.
 *
 * A refusal with no next step reads as hostile. This is what turns
 * "ACCESS DENIED" into "here is what I can do for you".
 */
function affordableAlternatives(maxSpend: number, exclude: string): string {
  const options = searchProducts({ max_price: maxSpend })
    .filter((p) => p.in_stock && p.id !== exclude)
    .slice(0, 3);

  if (options.length === 0) {
    return `Abhi ₹${maxSpend.toLocaleString("en-IN")} ke andar kuch available nahi hai. Limit thodi badhayein toh aur options dikha sakti hoon.`;
  }

  const list = options
    .map((p) => `${p.name.split("—")[0].trim()} (₹${p.price.toLocaleString("en-IN")})`)
    .join(", ");

  return `₹${maxSpend.toLocaleString("en-IN")} ke andar yeh sundar options hain: ${list}. Inme se koi dekhein?`;
}

/* ---------------------------------------------------------------
   The check.
   --------------------------------------------------------------- */

/**
 * Decide whether an order may be created for this product.
 *
 * Order of checks is deliberate: identity, then consent, then stock, then
 * policy, then money. Consent comes before price so a refusal never reads as
 * "you cannot afford this" when the honest reason is "you never agreed".
 */
export function checkOrderIntent(
  productId: string,
  ctx: GuardrailContext,
): GuardrailVerdict {
  return check(productId, ctx, { requireConsent: true });
}

/**
 * The same rules, minus the consent check — used at the moment the agent is
 * about to ASK for consent.
 *
 * This is where the spending cap actually becomes visible to a buyer. A
 * well-behaved model politely steers away from a saree it knows is too dear,
 * which is good manners but proves nothing: the engine never runs. Checking
 * here means intent alone triggers a real, code-enforced refusal — with the
 * limit, the attempted amount, and affordable alternatives — whether or not
 * the model would have tried.
 */
export function checkAffordability(
  productId: string,
  ctx: GuardrailContext,
): GuardrailVerdict {
  return check(productId, ctx, { requireConsent: false });
}

function check(
  productId: string,
  ctx: GuardrailContext,
  opts: { requireConsent: boolean },
): GuardrailVerdict {
  const product = getProductById(productId);

  if (!product) {
    return {
      allowed: false,
      rule: "unknown_product",
      limit: ctx.maxSpend,
      attempted: 0,
      suggestion: "Main woh saree dhundh nahi payi. Dobara bataiye?",
      reasoning: `BLOCKED unknown_product: no catalog entry for "${productId}". Refused rather than guessing.`,
    };
  }

  if (opts.requireConsent && !ctx.hasConsentFor(product.id)) {
    return {
      allowed: false,
      rule: "consent_required",
      limit: ctx.maxSpend,
      attempted: product.price,
      suggestion: `${product.name} ₹${product.price.toLocaleString("en-IN")} ki hai. Order confirm karun?`,
      reasoning: `BLOCKED consent_required: buyer has not agreed to ${product.name}. No order without an explicit yes.`,
    };
  }

  if (!product.in_stock) {
    return {
      allowed: false,
      rule: "out_of_stock",
      limit: ctx.maxSpend,
      attempted: product.price,
      suggestion: affordableAlternatives(ctx.maxSpend, product.id),
      reasoning: `BLOCKED out_of_stock: ${product.name} is not in stock.`,
    };
  }

  if (ctx.allowedCategories?.length) {
    const permitted = ctx.allowedCategories.some(
      (c) => c.toLowerCase() === product.category.toLowerCase(),
    );
    if (!permitted) {
      return {
        allowed: false,
        rule: "category_not_allowed",
        limit: ctx.maxSpend,
        attempted: product.price,
        suggestion: `Is session mein sirf ${ctx.allowedCategories.join(", ")} allowed hain.`,
        reasoning: `BLOCKED category_not_allowed: ${product.category} is outside [${ctx.allowedCategories.join(", ")}].`,
      };
    }
  }

  const placed = recentOrders(ctx.sessionId).length;
  if (placed >= DEFAULTS.maxOrdersPerHour) {
    return {
      allowed: false,
      rule: "rate_limit",
      /* Both fields are documented as ₹ and every consumer renders them with
         a rupee sign, so a count here read as "asked for ₹4 against a ₹3
         limit". The cap and the price of the saree she was actually trying to
         buy are the honest values; the counts live in the reasoning, which is
         where the dashboard shows them. */
      limit: ctx.maxSpend,
      attempted: product.price,
      suggestion: `Ek ghante mein ${DEFAULTS.maxOrdersPerHour} orders ho chuke hain. Thodi der baad phir try karein.`,
      reasoning: `BLOCKED rate_limit: ${placed} orders already placed this hour (max ${DEFAULTS.maxOrdersPerHour}). Stops a runaway loop.`,
    };
  }

  /* Money last, and read from the catalog — never from the model. */
  if (product.price > ctx.maxSpend) {
    return {
      allowed: false,
      rule: "spending_cap",
      limit: ctx.maxSpend,
      attempted: product.price,
      suggestion: affordableAlternatives(ctx.maxSpend, product.id),
      reasoning: `BLOCKED spending_cap: ${product.name} costs ₹${product.price} but the cap is ₹${ctx.maxSpend}. Catalog price used, not any value supplied by the model.`,
    };
  }

  return {
    allowed: true,
    product,
    reasoning: `PASSED: ${product.name} at ₹${product.price} is within the ₹${ctx.maxSpend} cap, in stock, and explicitly consented to.`,
  };
}

export type SearchVerdict =
  | { kind: "ok" }
  | {
      kind: "blocked";
      rule: "spending_cap" | "category_not_allowed";
      limit: number;
      /** Price of the saree she actually asked for. */
      attempted: number;
      matched: Product;
      alternatives: Product[];
      suggestion: string;
      reasoning: string;
    }
  | {
      kind: "out_of_stock";
      matched: Product;
      alternatives: Product[];
      suggestion: string;
      reasoning: string;
    };

function inStockUnder(cap: number, exclude?: string): Product[] {
  return searchProducts({ max_price: cap })
    .filter((p) => p.in_stock && p.id !== exclude)
    .slice(0, 3);
}

function listPrices(items: Product[], cap: number): string {
  if (!items.length) {
    return `Abhi ₹${cap.toLocaleString("en-IN")} ke andar kuch available nahi hai.`;
  }
  return `₹${cap.toLocaleString("en-IN")} ke andar yeh options hain: ${items
    .map((p) => `${p.name.split("—")[0].trim()} (₹${p.price.toLocaleString("en-IN")})`)
    .join(", ")}.`;
}

/**
 * Judge a search by what she actually asked for, before the model sees any
 * result at all.
 *
 * This exists because a guardrail that only runs at tool-call time never runs
 * when the model declines to call the tool. A well-mannered model reads a
 * price, reads an out-of-stock flag, and tactfully changes the subject — which
 * looks fine and proves nothing. Judging INTENT means the rule fires in code
 * whatever the model chooses to do.
 *
 * Order: category, then price, then stock. Category is a policy the session
 * was configured with; price binds even on a saree that is unavailable; stock
 * is the last thing that can go wrong.
 */
export function checkSearchIntent(
  query: string,
  cap: number,
  allowedCategories?: string[],
  /**
   * What the buyer actually typed, when it differs from the query the model
   * chose to send.
   *
   * The model rewrites a request before calling the tool, and roughly one run
   * in seven it shortened "Authentic Paithani silk saree" to bare "paithani" —
   * which matches the ₹899 print, is genuinely affordable, and correctly does
   * not block. So the refusal quietly stopped happening, and whether a rule
   * fired depended on how the model had paraphrased her.
   *
   * That is the same class of bug as a guardrail that only runs at tool-call
   * time: the model's behaviour deciding whether the engine gets to speak.
   * Both readings are now judged, and a block from either one stands. The
   * model cannot narrow its way past a rule.
   */
  buyerSaid?: string,
): SearchVerdict {
  const onQuery = evaluateQuery(query, cap, allowedCategories);
  if (onQuery.kind === "blocked") return onQuery;

  /* Only an outright block escalates. An out-of-stock verdict is about one
     specific saree the model found, and the raw sentence may well match a
     different one — promoting that would report the wrong product. */
  if (buyerSaid && buyerSaid.trim() && buyerSaid !== query) {
    const onBuyer = evaluateQuery(buyerSaid, cap, allowedCategories);
    if (onBuyer.kind === "blocked") return onBuyer;
  }

  return onQuery;
}

function evaluateQuery(
  query: string,
  cap: number,
  allowedCategories?: string[],
): SearchVerdict {
  const ranked = searchProducts({ q: query });
  const top = ranked[0];
  if (!top) return { kind: "ok" };

  if (allowedCategories?.length) {
    const permitted = allowedCategories.some(
      (c) => c.toLowerCase() === top.category.toLowerCase(),
    );
    if (!permitted) {
      return {
        kind: "blocked",
        rule: "category_not_allowed",
        limit: cap,
        attempted: top.price,
        matched: top,
        alternatives: [],
        suggestion: `Is session mein sirf ${allowedCategories.join(", ")} allowed hain.`,
        reasoning: `BLOCKED category_not_allowed: "${query}" best matches ${top.name} in category "${top.category}", outside [${allowedCategories.join(", ")}].`,
      };
    }
  }

  if (top.price > cap) {
    const alternatives = inStockUnder(cap, top.id);
    return {
      kind: "blocked",
      rule: "spending_cap",
      limit: cap,
      attempted: top.price,
      matched: top,
      alternatives,
      suggestion: listPrices(alternatives, cap),
      reasoning: `BLOCKED spending_cap: "${query}" best matches ${top.name} at ₹${top.price}, above the ₹${cap} cap. Offered ${alternatives.length} affordable alternative(s). Price read from the catalog, never from the model.`,
    };
  }

  if (!top.in_stock) {
    const alternatives = inStockUnder(cap, top.id);
    return {
      kind: "out_of_stock",
      matched: top,
      alternatives,
      suggestion: listPrices(alternatives, cap),
      reasoning: `FAILURE out_of_stock: "${query}" best matches ${top.name}, which is not in stock. Offered ${alternatives.length} alternative(s) instead of a dead end.`,
    };
  }

  return { kind: "ok" };
}

/** Clamp a client-supplied cap. A tampered request cannot raise the ceiling. */
export function clampSpendLimit(requested: unknown): number {
  const n = Number(requested);
  if (!Number.isFinite(n) || n <= 0) return DEFAULTS.maxSpend;
  return Math.min(n, DEFAULTS.maxAllowedSpend);
}
