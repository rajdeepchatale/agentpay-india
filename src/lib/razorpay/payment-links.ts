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
import { fromPaise, toPaise } from "./amounts.ts";

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

/**
 * A link for this saree that can still be paid.
 *
 * Reuse exists because Razorpay's test mode allows thirty payment links in
 * total and development exhausted the quota. But the first version reused ANY
 * link recorded for the saree, including ones already paid — and a paid link
 * cannot be paid again: Razorpay shows its own "already paid" page, so the
 * buyer never pays, is never redirected, and sits on a page that looks like
 * success. That is worse than the quota problem it was solving.
 *
 * Razorpay is asked directly rather than our own orders table, because the
 * table only knows what a webhook told it. The link's own status is the fact
 * that matters, and it is the one Razorpay will act on when she opens it.
 */
export async function findPayableLink(
  productId: string,
  amountInr: number,
): Promise<string | null> {
  try {
    const paise = toPaise(amountInr);
    const page = (await razorpay().paymentLink.all({ count: 100 })) as unknown as {
      payment_links?: Array<{
        short_url?: string;
        status?: string;
        amount?: number;
        callback_url?: string;
      }>;
    };

    const match = (page.payment_links ?? []).find(
      (l) =>
        l.status === "created" &&
        l.amount === paise &&
        typeof l.short_url === "string" &&
        /* Same saree: the callback carries the product id, and sending her
           back to a different saree's confirmation would be its own bug. */
        (l.callback_url ?? "").includes(encodeURIComponent(productId)),
    );

    return match?.short_url ?? null;
  } catch {
    /* Cannot tell — mint a new one and let that fail loudly if it must. */
    return null;
  }
}
