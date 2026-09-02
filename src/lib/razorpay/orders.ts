// ============================================================
// Razorpay orders — SERVER ONLY.
// ============================================================

import "server-only";
import { razorpay } from "./client.ts";
import { buildOrderPayload, type OrderInput } from "./payloads.ts";
import { fromPaise } from "./amounts.ts";

export interface CreatedOrder {
  /** e.g. "order_PthN4kSaR1" */
  razorpay_order_id: string;
  /** Amount in ₹, read back from what Razorpay actually recorded. */
  amount: number;
  amount_paise: number;
  receipt: string;
  status: string;
}

/**
 * Create a real Razorpay test-mode order.
 *
 * The returned amount is read back from Razorpay's response rather than
 * echoed from the input — if the paise conversion were ever wrong, this
 * surfaces it instead of hiding it.
 */
export async function createOrder(input: OrderInput): Promise<CreatedOrder> {
  const payload = buildOrderPayload(input);
  const order = await razorpay().orders.create(payload);

  const paise = Number(order.amount);

  /* Defence in depth: the order Razorpay recorded must match what we sent. */
  if (paise !== payload.amount) {
    throw new Error(
      `Razorpay recorded ${paise} paise but we sent ${payload.amount}. ` +
        `Refusing to return a mismatched order.`,
    );
  }

  return {
    razorpay_order_id: order.id,
    amount: fromPaise(paise),
    amount_paise: paise,
    receipt: String(order.receipt ?? payload.receipt),
    status: String(order.status),
  };
}
