// ============================================================
// Razorpay SDK client — SERVER ONLY.
// ============================================================
// Test-mode credentials. Never import this from a client component:
// RAZORPAY_KEY_SECRET has no NEXT_PUBLIC_ prefix and must never be bundled.
// ============================================================

import "server-only";
import Razorpay from "razorpay";

let instance: Razorpay | null = null;

/**
 * The shared Razorpay client, created on first use.
 *
 * Lazy rather than module-level so a missing key fails at call time with a
 * clear message, instead of crashing the whole route at import time.
 */
export function razorpay(): Razorpay {
  if (instance) return instance;

  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;

  if (!key_id || !key_secret) {
    throw new Error(
      "Razorpay is not configured. Set RAZORPAY_KEY_ID and " +
        "RAZORPAY_KEY_SECRET in .env.local.",
    );
  }

  if (!key_id.startsWith("rzp_test_")) {
    /* This project is a hackathon demo. Live keys would move real money. */
    throw new Error(
      "Refusing to start with a non-test Razorpay key. " +
        "AgentPay is a demo and must run in test mode.",
    );
  }

  instance = new Razorpay({ key_id, key_secret });
  return instance;
}
