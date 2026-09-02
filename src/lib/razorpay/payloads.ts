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

  return {
    amount: toPaise(input.amountInr),
    currency: "INR",
    description,
    /* The demo must not send SMS or email to anyone. */
    notify: { sms: false, email: false },
    reminder_enable: false,
    notes: traceNotes(input),
  };
}
