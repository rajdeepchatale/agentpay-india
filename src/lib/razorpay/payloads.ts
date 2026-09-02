// ============================================================
// Razorpay request payloads — pure, so they can be tested without network.
// ============================================================
// Kept separate from the SDK calls in orders.ts / payment-links.ts so the
// money maths and the traceability fields are unit-testable. Every amount
// goes through toPaise(); nothing here multiplies by 100.
// ============================================================

import { toPaise, orderReceipt } from "./amounts.ts";

/** Razorpay caps payment-link descriptions at 2048 characters. */
const MAX_DESCRIPTION = 2048;

export interface OrderInput {
  productId: string;
  productName: string;
  /** Price in ₹, exactly as it appears in the catalog. */
  amountInr: number;
  sessionId: string;
}

export interface RazorpayOrderPayload {
  amount: number;
  currency: "INR";
  receipt: string;
  notes: Record<string, string>;
}

export interface RazorpayPaymentLinkPayload {
  amount: number;
  currency: "INR";
  description: string;
  notify: { sms: boolean; email: boolean };
  reminder_enable: boolean;
  notes: Record<string, string>;
  /** Where Razorpay sends the buyer once she has paid. Omitted if unset. */
  callback_url?: string;
  callback_method?: "get";
}

/**
 * The public origin of this deployment, for the post-payment return trip.
 *
 * Vercel sets VERCEL_PROJECT_PRODUCTION_URL on every deployment, so the
 * production URL does not have to be hard-coded or kept in sync by hand.
 * Returns undefined locally, which is correct — Razorpay cannot redirect a
 * buyer to localhost, and a callback_url pointing there would strand her on
 * a dead page.
 */
function publicOrigin(): string | undefined {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");

  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return `https://${vercel}`;

  return undefined;
}

function traceNotes(input: OrderInput): Record<string, string> {
  return {
    product_id: input.productId,
    product_name: input.productName,
    session_id: input.sessionId,
    amount_inr: String(input.amountInr),
    source: "agentpay",
  };
}

/** Build the body for `razorpay.orders.create`. */
export function buildOrderPayload(input: OrderInput): RazorpayOrderPayload {
  return {
    amount: toPaise(input.amountInr),
    currency: "INR",
    receipt: orderReceipt(),
    notes: traceNotes(input),
  };
}

/** Build the body for `razorpay.paymentLink.create`. */
export function buildPaymentLinkPayload(
  input: OrderInput,
): RazorpayPaymentLinkPayload {
  const description = `${input.productName} — Sakhi Sarees, Pune`.slice(
    0,
    MAX_DESCRIPTION,
  );

  const origin = publicOrigin();

  return {
    amount: toPaise(input.amountInr),
    currency: "INR",
    description,
    /* The demo must not send SMS or email to anyone. */
    notify: { sms: false, email: false },
    reminder_enable: false,
    notes: traceNotes(input),
    /* Bring her back to the conversation she was already in, rather than
       leaving her on Razorpay's receipt page wondering what happened. Only
       set when a real public origin exists — see publicOrigin(). */
    ...(origin
      ? {
          callback_url: `${origin}/chat?paid=${encodeURIComponent(input.productId)}`,
          callback_method: "get" as const,
        }
      : {}),
  };
}
