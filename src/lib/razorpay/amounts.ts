// ============================================================
// Money — the single place rupees become paise.
// ============================================================
// Razorpay takes amounts in currency subunits: ₹599 is 59900.
// Passing 599 charges ₹5.99 and still returns HTTP 200, so the bug looks
// like success. Every amount sent to Razorpay goes through toPaise().
// Never inline `* 100` anywhere else.
// ============================================================

/**
 * Sanity ceiling, in ₹. This is NOT the user's spending cap — that is the
 * guardrail engine's job and is configurable per session. This is a hard
 * floor-of-last-resort so that a hallucinated price, a corrupted catalog
 * entry, or a misplaced decimal can never reach the payment API.
 * The most expensive item in the catalog is ₹24,999.
 */
const MAX_ORDER_INR = 100_000;

/**
 * Convert rupees to paise for the Razorpay API.
 *
 * @throws if the value is not a finite number, is not positive, or exceeds
 *         the sanity ceiling.
 */
export function toPaise(rupees: number): number {
  if (typeof rupees !== "number" || !Number.isFinite(rupees)) {
    throw new TypeError(`Amount must be a finite number, received: ${rupees}`);
  }
  if (rupees <= 0) {
    throw new RangeError(`Amount must be positive, received: ₹${rupees}`);
  }
  if (rupees > MAX_ORDER_INR) {
    throw new RangeError(
      `Amount ₹${rupees} exceeds the ₹${MAX_ORDER_INR} sanity ceiling. ` +
        `Refusing to build a payment for it.`,
    );
  }

  /* Shift the decimal via string notation rather than multiplying.
     `0.015 * 100` is 1.4999999999999998 in IEEE-754 and rounds to 1;
     `Number("0.015e2")` is exactly 1.5 and rounds to 2. */
  const paise = Math.round(Number(`${rupees}e2`));

  if (!Number.isSafeInteger(paise)) {
    throw new RangeError(`₹${rupees} did not convert to a safe integer`);
  }
  return paise;
}

/** Rupees back from paise — for reading Razorpay responses. */
export function fromPaise(paise: number): number {
  if (!Number.isInteger(paise)) {
    throw new TypeError(`Paise must be a whole number, received: ${paise}`);
  }
  return Number(`${paise}e-2`);
}

/* Monotonic so two orders created in the same millisecond cannot collide. */
let lastReceiptStamp = 0;

/**
 * Receipt id for a Razorpay order. Prefixed so AgentPay orders are
 * identifiable in the dashboard. Razorpay caps receipts at 40 characters;
 * this produces 25.
 */
export function orderReceipt(): string {
  const now = Date.now();
  lastReceiptStamp = now > lastReceiptStamp ? now : lastReceiptStamp + 1;
  return `saree_order_${lastReceiptStamp}`;
}
