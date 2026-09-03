// ============================================================
// Razorpay webhook verification.
// ============================================================
// A webhook endpoint is a public, unauthenticated URL that changes payment
// state. Anyone on the internet can POST to it. The HMAC signature is the only
// thing separating "Razorpay says this order was paid" from "a stranger says
// this order was paid".
//
// Two rules this file exists to enforce:
//
//   1. VERIFY THE RAW BODY. Parsing and re-serializing JSON reorders keys and
//      drops whitespace, which changes the bytes and silently breaks the HMAC.
//      The route must hand us the exact text Razorpay sent.
//
//   2. FAIL CLOSED. A missing secret, a malformed signature, a wrong length —
//      every one of those is a rejection, never a pass.
// ============================================================

import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Is this body genuinely from Razorpay?
 *
 * Comparison is timing-safe: a plain `===` on a secret leaks its contents one
 * byte at a time to an attacker who can measure response latency.
 */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string | undefined | null,
  secret: string | undefined | null,
): boolean {
  /* No secret configured is not "allow everything". */
  if (!secret || !signature || !rawBody) return false;

  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");

  /* timingSafeEqual throws on a length mismatch, which would 500 the route and
     tell an attacker their guess was the wrong shape. Check length first. */
  if (signature.length !== expected.length) return false;

  try {
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

export interface PaymentEvent {
  status: "paid" | "failed";
  paymentId: string;
  /** Set by payment.* events — matches `orders.razorpay_order_id`. */
  razorpayOrderId?: string;
  /**
   * Set by payment_link.* events — matches `orders.payment_link`.
   *
   * Needed because our flow creates TWO Razorpay objects: an order via
   * orders.create, and a payment link carrying its own internal order.
   * Verified against the live API — a paid link reported
   * order_TXeGi1ZVFk7nHg while the row we stored held a different id. So a
   * payment.captured raised by a link payment can never match our order, and
   * the short_url is the only thing both sides share.
   */
  paymentLink?: string;
}

/** Events that change an order's status. Everything else is ignored. */
const HANDLED: Record<string, "paid" | "failed"> = {
  "payment.captured": "paid",
  "payment.failed": "failed",
  /* The buyer pays a LINK, not the order we created. Without this the order
     stays "created" forever and the conversation never learns the money
     arrived. */
  "payment_link.paid": "paid",
};

/**
 * Pull the order id and outcome out of a webhook body.
 *
 * Returns null for anything we do not act on — a different event type, a
 * payload with no order attached, or a body that is not the shape Razorpay
 * documents. A webhook we cannot understand is one we ignore, not one we
 * guess at.
 */
export function parsePaymentEvent(rawBody: string): PaymentEvent | null {
  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return null;
  }

  const b = body as {
    event?: string;
    payload?: {
      payment?: { entity?: { id?: string; order_id?: string } };
      payment_link?: { entity?: { short_url?: string } };
    };
  };

  const status = HANDLED[b?.event ?? ""];
  if (!status) return null;

  const payment = b?.payload?.payment?.entity;
  const paymentId = payment?.id ?? "";

  /* A link event identifies itself by its short_url, which is what we stored
     alongside the order. */
  const shortUrl = b?.payload?.payment_link?.entity?.short_url;
  if (shortUrl) return { status, paymentId, paymentLink: shortUrl };

  const razorpayOrderId = payment?.order_id;
  if (!razorpayOrderId) return null;

  return { status, paymentId, razorpayOrderId };
}
