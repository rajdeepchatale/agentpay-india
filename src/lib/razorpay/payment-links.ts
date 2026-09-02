// ============================================================
// Razorpay payment links — SERVER ONLY.
// ============================================================
// An order ID is for the Checkout SDK. A buyer in a chat needs a URL she can
// tap, which is what makes this work in a WhatsApp/Instagram-shaped flow.
// ============================================================

import "server-only";
import type { PaymentLinks } from "razorpay/dist/types/paymentLink";
import { razorpay } from "./client.ts";
import { buildPaymentLinkPayload, type OrderInput } from "./payloads.ts";
import { fromPaise } from "./amounts.ts";

export interface CreatedPaymentLink {
  /** The tappable short URL, e.g. "https://rzp.io/i/xxxxx" */
  payment_link: string;
  payment_link_id: string;
  amount: number;
  status: string;
}

/* The SDK declares `create` with two overloads — one promise-returning, one
   callback-style — so inference picks the callback form and collapses the
   result to `void`. Naming the SDK's own exported types avoids inventing a
   shape of our own that could silently drift from the real response. */
type CreateParams = PaymentLinks.RazorpayPaymentLinkCreateRequestBody;
type CreatedLink = PaymentLinks.RazorpayPaymentLink;

/** Create a real test-mode payment link the buyer can open. */
export async function createPaymentLink(
  input: OrderInput,
): Promise<CreatedPaymentLink> {
  const payload = buildPaymentLinkPayload(input);
  const link = (await razorpay().paymentLink.create(
    payload as CreateParams,
  )) as unknown as CreatedLink;

  const url = link.short_url;
  if (!url) {
    throw new Error(
      "Razorpay returned a payment link with no short_url — nothing for the " +
        "buyer to open.",
    );
  }

  return {
    payment_link: url,
    payment_link_id: link.id,
    amount: fromPaise(Number(link.amount)),
    status: String(link.status),
  };
}
