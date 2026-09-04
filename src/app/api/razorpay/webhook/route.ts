// ============================================================
// POST /api/razorpay/webhook
// ============================================================
// Razorpay calls this when a payment succeeds or fails. It is the only thing
// that moves an order from `created` to `paid` — without it, every order in
// the database stays `created` forever regardless of what the buyer actually
// did.
//
// This endpoint is public and unauthenticated. Its entire security rests on
// the HMAC signature, so:
//
//   - the RAW body is read before any parsing, because re-serializing JSON
//     changes the bytes and breaks the HMAC
//   - an unset secret rejects everything rather than accepting everything
//   - a bad signature returns 400 and touches nothing
//
// Razorpay retries on non-2xx, so anything we cannot act on returns 200 with
// an explanation rather than an error it would redeliver forever.
// ============================================================

import { NextResponse, type NextRequest } from "next/server";
import { verifyWebhookSignature, parsePaymentEvent } from "@/lib/razorpay/webhook";
import {
  markOrderStatus,
  markOrderStatusByLink,
  markOrderStatusBySession,
  logDecision,
} from "@/lib/audit/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  /* Raw text, not request.json(). The signature is over these exact bytes. */
  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature");
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (!verifyWebhookSignature(rawBody, signature, secret)) {
    /* Deliberately vague. Telling a caller *why* verification failed helps
       them find a signature that works. */
    console.warn("[webhook] rejected: signature verification failed");
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  const event = parsePaymentEvent(rawBody);
  if (!event) {
    /* A valid Razorpay event we simply do not act on — a refund, a settlement.
       200, or Razorpay redelivers it indefinitely. */
    return NextResponse.json({ ok: true, ignored: true });
  }

  /* A link event identifies the order by the link the buyer opened; a payment
     event identifies it by the order id. Both end at the same row. */
  const subject = event.razorpayOrderId ?? event.paymentLink ?? "";
  let result = event.paymentLink
    ? await markOrderStatusByLink(event.paymentLink, event.status)
    : await markOrderStatus(event.razorpayOrderId!, event.status);

  /* Neither id matched a row we hold. That is the normal case, not an edge
     one: the buyer paid a payment link, so the order id on this event is the
     link's internal order and never ours. The session in our own notes is the
     one identifier that survives, so try it before giving up — otherwise the
     money arrives and the conversation never learns. */
  if (result === "unchanged" && event.sessionId) {
    result = await markOrderStatusBySession(event.sessionId, event.status);
  }

  /* The audit trail is the point of this project, so a payment outcome belongs
     in it as much as a guardrail decision does. Never let logging break the
     acknowledgement. */
  try {
    await logDecision({
      sessionId: `webhook:${subject}`,
      action: "create_order",
      input: {
        ...(event.razorpayOrderId ? { razorpay_order_id: event.razorpayOrderId } : {}),
        ...(event.paymentLink ? { payment_link: event.paymentLink } : {}),
        ...(event.sessionId ? { buyer_session_id: event.sessionId } : {}),
        payment_id: event.paymentId,
      },
      output: { status: event.status, db: result },
      guardrailStatus: "n/a",
      reasoning:
        result === "updated"
          ? `Razorpay confirmed payment ${event.status} for ${subject}. Order moved created → ${event.status}.`
          : `Razorpay reported ${event.status} for ${subject}, but no order was in 'created' state (${result}). Likely a retry of an event already handled.`,
    });
  } catch (e) {
    console.error("[webhook] audit write failed:", e);
  }

  return NextResponse.json({ ok: true, status: event.status, result });
}
