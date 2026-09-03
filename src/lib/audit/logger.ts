// ============================================================
// Audit logger — the evidence that guardrails are architecture.
// ============================================================
// Every decision the agent makes is written here with the reasoning behind
// it. This is what /dashboard renders, and it is the artifact that turns
// "we have guardrails" from a claim into something a judge can inspect.
//
// Writes are best-effort: a database outage must never take down the chat.
// A lost audit row is bad. A dead demo is worse.
// ============================================================

import "server-only";
import type { AuditAction, AuditEntry, GuardrailStatus } from "@/types";
import { supabase } from "@/lib/db/supabase";

export interface AuditInput {
  sessionId: string;
  action: AuditAction;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  guardrailStatus: GuardrailStatus;
  reasoning: string;
}

/**
 * Write one decision to the trail.
 *
 * Returns the row id when persisted, or a synthetic local id when the
 * database is unavailable — the caller always gets an `audit_id` to hand
 * back in the API response.
 */
export async function logDecision(entry: AuditInput): Promise<string> {
  const localId = `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const db = supabase();

  if (!db) {
    console.info("[audit]", entry.action, "—", entry.reasoning);
    return localId;
  }

  try {
    const { data, error } = await db
      .from("audit_log")
      .insert({
        session_id: entry.sessionId,
        action: entry.action,
        input: entry.input,
        output: entry.output,
        guardrail_status: entry.guardrailStatus,
        reasoning: entry.reasoning,
      })
      .select("id")
      .single();

    if (error) {
      console.warn("[audit] write failed:", error.message);
      return localId;
    }
    return (data as { id: string }).id;
  } catch (e) {
    console.warn("[audit] write threw:", (e as Error).message);
    return localId;
  }
}

/** Read one session's trail, newest last so it reads like a timeline. */
export async function getTrail(sessionId: string): Promise<AuditEntry[]> {
  const db = supabase();
  if (!db) return [];

  const { data, error } = await db
    .from("audit_log")
    .select("id, timestamp, action, input, output, guardrail_status, reasoning")
    .eq("session_id", sessionId)
    .order("timestamp", { ascending: true })
    .limit(200);

  if (error) {
    console.warn("[audit] read failed:", error.message);
    return [];
  }

  return (data ?? []).map((r) => {
    const row = r as Record<string, unknown>;
    return {
      id: String(row.id),
      timestamp: String(row.timestamp),
      action: row.action as AuditAction,
      input: (row.input ?? {}) as Record<string, unknown>,
      output: (row.output ?? {}) as Record<string, unknown>,
      guardrail_status: row.guardrail_status as GuardrailStatus,
      reasoning: String(row.reasoning ?? ""),
    };
  });
}

/** Record an order in the orders table. Best-effort, like the audit trail. */
export async function recordOrder(params: {
  sessionId: string;
  productId: string;
  productName: string;
  amount: number;
  amountPaise: number;
  razorpayOrderId: string;
  paymentLink: string;
}): Promise<void> {
  const db = supabase();
  if (!db) return;

  const { error } = await db.from("orders").insert({
    session_id: params.sessionId,
    product_id: params.productId,
    product_name: params.productName,
    amount: params.amount,
    amount_paise: params.amountPaise,
    razorpay_order_id: params.razorpayOrderId,
    payment_link: params.paymentLink,
    status: "created",
  });

  if (error) console.warn("[orders] write failed:", error.message);
}

/**
 * Flip an order's status when Razorpay reports the payment outcome.
 *
 * Only ever moves a `created` order forward. A webhook can arrive late,
 * out of order, or more than once — Razorpay retries — so this must be
 * idempotent, and a replayed `payment.captured` must not overwrite a
 * subsequent refund or failure.
 */
export async function markOrderStatus(
  razorpayOrderId: string,
  status: "paid" | "failed",
): Promise<"updated" | "unchanged" | "unavailable"> {
  const db = supabase();
  if (!db) return "unavailable";

  const { data, error } = await db
    .from("orders")
    .update({ status })
    .eq("razorpay_order_id", razorpayOrderId)
    .eq("status", "created")
    .select("id");

  if (error) {
    console.warn("[orders] status update failed:", error.message);
    return "unavailable";
  }
  return data && data.length > 0 ? "updated" : "unchanged";
}



/**
 * The saree this session has actually paid for, if any.
 *
 * Razorpay's payment link carries a callback_url back to the chat, and it is
 * set correctly on every link — but the buyer does not reliably arrive back:
 * she can be left on Razorpay's own receipt page, and the shop then never
 * says thank you for a purchase that definitely happened.
 *
 * The webhook already knows. This lets the conversation ask, so the close
 * fires because the money arrived rather than because a redirect worked.
 */
export async function paidProductFor(sessionId: string): Promise<string | null> {
  const db = supabase();
  if (!db) return null;

  try {
    const { data, error } = await db
      .from("orders")
      .select("product_id")
      .eq("session_id", sessionId)
      .eq("status", "paid")
      .order("created_at", { ascending: false })
      .limit(1);
    if (error || !data?.length) return null;
    const id = (data[0] as { product_id?: string }).product_id;
    return typeof id === "string" && id ? id : null;
  } catch {
    return null;
  }
}
