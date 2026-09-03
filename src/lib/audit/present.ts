// ============================================================
// Presenting the audit trail.
// ============================================================
// Pure, and deliberately separate from the dashboard component: the rules
// that decide what colour a decision gets are the rules a judge is checking.
// They should be provable without a browser.
//
// The one that matters most: `blocked` beats everything. A blocked order must
// never render green, whatever action produced it.
// ============================================================

import type { AuditAction, AuditEntry } from "@/types";

/** Card tones, matching `CardTone` in the UI kit. */
export type AuditTone = "success" | "warning" | "accent" | "info" | "handled" | "neutral";

/**
 * The colour a decision carries.
 *
 * Status first, action second. A guardrail that refused something is amber no
 * matter what it refused — reading the action first would paint a blocked
 * order green and tell a judge the opposite of what happened.
 */
export function toneFor(entry: AuditEntry): AuditTone {
  if (entry.guardrail_status === "blocked") return "warning";

  switch (entry.action) {
    case "create_order":
      return "success";
    /* Saffron: she has been ASKED, and has not answered yet. Green here would
       claim a consent that does not exist. */
    case "consent_request":
      return "accent";
    case "failure_recovery":
      return "handled";
    case "search_products":
      return "info";
    case "guardrail_check":
      return "neutral";
    /* Her own words back, not a decision the agent made — so it reads as
       information rather than as another judgement in the trail. */
    case "feedback":
      return "info";
    default:
      return "neutral";
  }
}

const LABELS: Record<string, string> = {
  search_products: "Searched catalog",
  create_order: "Order created",
  guardrail_check: "Guardrail check",
  consent_request: "Consent",
  failure_recovery: "Recovered",
  feedback: "Buyer feedback",
};

/** What this decision is called, in words rather than symbols. */
export function labelFor(action: AuditAction): string {
  return LABELS[action] ?? "Decision";
}

const rupees = (n: unknown) =>
  typeof n === "number" ? `₹${n.toLocaleString("en-IN")}` : String(n ?? "");

/**
 * One scannable line beneath the label.
 *
 * The full input/output JSON is still available on expand — this is the layer
 * that lets a judge read forty entries without opening any of them.
 */
export function summarise(entry: AuditEntry): string {
  const out = entry.output as Record<string, unknown>;
  const inp = entry.input as Record<string, unknown>;

  if (out?.rule) {
    const bits = [String(out.rule).replace(/_/g, " ")];
    if (out.attempted !== undefined) bits.push(rupees(out.attempted));
    if (out.limit !== undefined) bits.push(`limit ${rupees(out.limit)}`);
    return bits.join(" · ");
  }

  if (out?.razorpay_order_id) return String(out.razorpay_order_id);
  if (out?.product) {
    return out.price !== undefined
      ? `${out.product} · ${rupees(out.price)}`
      : String(out.product);
  }
  if (out?.asked_for) return String(out.asked_for);
  if (inp?.query) return `"${String(inp.query)}"`;
  if (inp?.product_id) return String(inp.product_id);

  /* Never blank — an entry with no summary reads as a rendering bug. */
  return entry.reasoning.split(".")[0].slice(0, 80) || "—";
}

/** HH:MM:SS, or a dash rather than "Invalid Date" on a malformed timestamp. */
export function formatClock(timestamp: string): string {
  const d = new Date(timestamp);
  if (Number.isNaN(d.getTime())) return "--:--:--";
  return d.toLocaleTimeString("en-GB", { hour12: false });
}

export interface AuditTurn {
  entries: AuditEntry[];
  /** True if any decision in this turn was refused. Lets the UI flag it. */
  hasBlock: boolean;
}

/**
 * Group a flat trail into conversational turns.
 *
 * A search is what starts a turn — it is the first thing the agent does when
 * she says something new. Grouping matters because the interesting unit is
 * *"what happened when she asked for the Paithani"*, not forty rows in a row.
 */
export function groupByTurn(entries: AuditEntry[]): AuditTurn[] {
  const turns: AuditTurn[] = [];

  for (const e of entries) {
    const startsTurn = e.action === "search_products";
    if (startsTurn || turns.length === 0) {
      turns.push({ entries: [], hasBlock: false });
    }
    const turn = turns[turns.length - 1];
    turn.entries.push(e);
    if (e.guardrail_status === "blocked") turn.hasBlock = true;
  }

  return turns;
}
