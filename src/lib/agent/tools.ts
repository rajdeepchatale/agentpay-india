// ============================================================
// Agent tools — what the model is allowed to ask for.
// ============================================================
// The model NAMES a tool. It does not execute one. Every call routes through
// runTool() below, which is where policy is applied. `create_order` in
// particular cannot fire without a consent token the model cannot forge.
// ============================================================

import "server-only";
import type { Product } from "@/types";
import type { ToolSpec } from "./provider.ts";
import { searchProducts, getProductById } from "@/lib/catalog/search";
import {
  checkOrderIntent,
  checkAffordability,
  checkSearchIntent,
  recordOrderPlaced,
} from "@/lib/guardrails/engine";
import { createOrder } from "@/lib/razorpay/orders";
import { createPaymentLink } from "@/lib/razorpay/payment-links";

export const TOOL_SPECS: ToolSpec[] = [
  {
    name: "search_products",
    description:
      "Search the saree catalog. Use the buyer's own words. Returns matching sarees with real prices.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            "What she is looking for, e.g. 'cotton', 'paithani', 'green silk'.",
        },
        max_price: {
          type: "number",
          description: "Maximum price in rupees, if she named a budget.",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "request_consent",
    description:
      "Ask the buyer to confirm before an order is created. Required before create_order. Call this when she has chosen a specific saree.",
    parameters: {
      type: "object",
      properties: {
        product_id: { type: "string", description: "The saree's catalog id." },
      },
      required: ["product_id"],
    },
  },
  {
    name: "create_order",
    description:
      "Create a real Razorpay order and payment link. ONLY after the buyer has explicitly agreed to the exact saree.",
    parameters: {
      type: "object",
      properties: {
        product_id: { type: "string", description: "The saree's catalog id." },
      },
      required: ["product_id"],
    },
  },
];

/** What the agent loop learns after a tool ran. */
export interface ToolOutcome {
  /** Fed back to the model as the tool result. */
  result: Record<string, unknown>;
  /** Products to surface in the UI, if this tool produced any. */
  products?: Product[];
  /** Set when this tool produced a finished response the UI must render. */
  order?: { razorpay_order_id: string; amount: number; payment_link: string };
  /** The product an order was actually created for. Authoritative. */
  orderedProduct?: Product;
  consent?: { product: Product };
  failure?: { type: string; recovery_action: string };
  /** Set when the guardrail engine refused this action. */
  blocked?: {
    rule: string;
    limit: number;
    attempted: number;
    suggestion: string;
    /** The saree that was refused, so the card can name it rather than
        making the buyer infer which one the rule fired on. */
    asked_for: string;
  };
  /** Reasoning recorded to the audit trail. */
  reasoning: string;
}

export interface ToolContext {
  sessionId: string;
  maxSpend: number;
  allowedCategories?: string[];
  /** True once the buyer has agreed to this exact product. */
  hasConsentFor: (productId: string) => boolean;
  /** Called when request_consent runs, so the next turn can honour it. */
  recordConsentRequest: (productId: string) => void;
}

const asString = (v: unknown) => (typeof v === "string" ? v : "");
const asNumber = (v: unknown) =>
  typeof v === "number" && Number.isFinite(v) ? v : undefined;

/**
 * Execute a tool the model named.
 *
 * Guardrail checks live in `@/lib/guardrails` (Step 5) and are applied by the
 * agent core before this runs. This function still refuses to create an order
 * without recorded consent — defence in depth, not a duplicate of that layer.
 */
export async function runTool(
  name: string,
  args: Record<string, unknown>,
  ctx: ToolContext,
): Promise<ToolOutcome> {
  switch (name) {
    case "search_products": {
      const query = asString(args.query);
      const cap = Math.min(asNumber(args.max_price) ?? ctx.maxSpend, ctx.maxSpend);

      /* The guardrail runs on INTENT, before the model sees any prices or
         stock flags. A rule that only fires when the model calls a tool
         never fires when a well-mannered model quietly changes the subject. */
      const verdict = checkSearchIntent(query, cap, ctx.allowedCategories);

      if (verdict.kind === "blocked") {
        return {
          products: verdict.alternatives,
          blocked: {
            rule: verdict.rule,
            limit: verdict.limit,
            attempted: verdict.attempted,
            suggestion: verdict.suggestion,
            asked_for: verdict.matched.name,
          },
          result: {
            blocked: true,
            rule: verdict.rule,
            limit: verdict.limit,
            asked_for: verdict.matched.name,
            its_price: verdict.attempted,
            tell_the_buyer: verdict.suggestion,
            alternatives: verdict.alternatives.map((p) => ({
              id: p.id,
              name: p.name,
              price: p.price,
            })),
          },
          reasoning: verdict.reasoning,
        };
      }

      if (verdict.kind === "out_of_stock") {
        return {
          products: verdict.alternatives,
          failure: {
            type: "out_of_stock",
            recovery_action: `Offered ${verdict.alternatives.length} in-stock alternative(s).`,
          },
          result: {
            out_of_stock: true,
            asked_for: verdict.matched.name,
            tell_the_buyer: verdict.suggestion,
            alternatives: verdict.alternatives.map((p) => ({
              id: p.id,
              name: p.name,
              price: p.price,
            })),
          },
          reasoning: verdict.reasoning,
        };
      }

      /* Not blocked — show only what she can actually buy, in stock and
         within the cap. Everything else is withheld here, in code. */
      const all = searchProducts({ q: query }).filter(
        (p) =>
          !ctx.allowedCategories?.length ||
          ctx.allowedCategories.some(
            (c) => c.toLowerCase() === p.category.toLowerCase(),
          ),
      );
      const affordable = all.filter((p) => p.price <= cap).slice(0, 4);
      const overCap = all.filter((p) => p.price > cap);

      return {
        products: affordable,
        result: {
          count: affordable.length,
          products: affordable.map((p) => ({
            id: p.id,
            name: p.name,
            name_marathi: p.name_hindi,
            price: p.price,
            colors: p.colors,
            in_stock: p.in_stock,
          })),
          ...(overCap.length
            ? { hidden_above_budget: overCap.length, budget: cap }
            : {}),
        },
        reasoning: `Searched for "${query}" within the ₹${cap} cap: ${affordable.length} shown${
          overCap.length ? `, ${overCap.length} withheld as above budget` : ""
        }.`,
      };
    }

    case "request_consent": {
      /* The guardrail engine runs HERE, before the buyer is even asked to
         confirm. Waiting for create_order would mean the cap only fires when
         a model misbehaves — and a well-behaved model would quietly steer
         away, leaving the guardrail unproven. Intent is the right trigger. */
      const verdict = checkAffordability(asString(args.product_id), {
        sessionId: ctx.sessionId,
        maxSpend: ctx.maxSpend,
        allowedCategories: ctx.allowedCategories,
        hasConsentFor: ctx.hasConsentFor,
      });

      if (!verdict.allowed) {
        const isStock = verdict.rule === "out_of_stock";
        return {
          ...(isStock
            ? {
                failure: {
                  type: "out_of_stock",
                  recovery_action: "Offered alternatives from the catalog.",
                },
              }
            : {
                blocked: {
                  rule: verdict.rule,
                  limit: verdict.limit,
                  attempted: verdict.attempted,
                  suggestion: verdict.suggestion,
                  asked_for: getProductById(asString(args.product_id))?.name ?? "",
                },
              }),
          result: {
            blocked: true,
            rule: verdict.rule,
            limit: verdict.limit,
            attempted: verdict.attempted,
            tell_the_buyer: verdict.suggestion,
          },
          reasoning: verdict.reasoning,
        };
      }

      const product = verdict.product;
      ctx.recordConsentRequest(product.id);
      return {
        consent: { product },
        result: {
          awaiting_confirmation: true,
          product: product.name,
          price: product.price,
        },
        reasoning: `Asked the buyer to confirm ${product.name} at ₹${product.price} before spending anything.`,
      };
    }

    case "create_order": {
      /* EVERY financial action passes through the guardrail engine first.
         The engine looks the price up in the catalog itself — the model
         supplies only an id, so it has no channel through which to propose
         an amount. */
      const verdict = checkOrderIntent(asString(args.product_id), {
        sessionId: ctx.sessionId,
        maxSpend: ctx.maxSpend,
        allowedCategories: ctx.allowedCategories,
        hasConsentFor: ctx.hasConsentFor,
      });

      if (!verdict.allowed) {
        return {
          blocked: {
            rule: verdict.rule,
            limit: verdict.limit,
            attempted: verdict.attempted,
            suggestion: verdict.suggestion,
            asked_for: getProductById(asString(args.product_id))?.name ?? "",
          },
          result: {
            blocked: true,
            rule: verdict.rule,
            limit: verdict.limit,
            attempted: verdict.attempted,
            tell_the_buyer: verdict.suggestion,
          },
          reasoning: verdict.reasoning,
        };
      }

      const product = verdict.product;

      try {
        const order = await createOrder({
          productId: product.id,
          productName: product.name,
          amountInr: product.price,
          sessionId: ctx.sessionId,
        });
        const link = await createPaymentLink({
          productId: product.id,
          productName: product.name,
          amountInr: product.price,
          sessionId: ctx.sessionId,
        });

        recordOrderPlaced(ctx.sessionId);

        return {
          order: {
            razorpay_order_id: order.razorpay_order_id,
            amount: order.amount,
            payment_link: link.payment_link,
          },
          orderedProduct: product,
          result: {
            created: true,
            order_id: order.razorpay_order_id,
            amount: order.amount,
          },
          reasoning: `Created Razorpay order ${order.razorpay_order_id} for ${product.name} at ₹${order.amount} after explicit consent.`,
        };
      } catch (e) {
        return {
          result: { error: "payment_failed" },
          failure: {
            type: "payment_failed",
            recovery_action: "Invited the buyer to try again.",
          },
          reasoning: `Razorpay order failed for ${product.name}: ${(e as Error).message}`,
        };
      }
    }

    default:
      return {
        result: { error: `unknown tool: ${name}` },
        reasoning: `Model asked for a tool that does not exist: ${name}.`,
      };
  }
}
