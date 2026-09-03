// ============================================================
// POST /api/feedback
// ============================================================
// What the buyer thought, after she has paid.
//
// Written into the SAME audit trail as the guardrail decisions rather than a
// table of its own. That is the point: at /dashboard a judge sees the agent
// asked for feedback and sees the answer, in one place, next to the decisions
// it made — evidence in one trail rather than two.
// ============================================================

import { NextResponse, type NextRequest } from "next/server";
import { logDecision } from "@/lib/audit/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Stable identifiers, never the translated labels the buyer actually saw. */
const RATINGS = ["good", "ok", "poor"] as const;
type Rating = (typeof RATINGS)[number];

export async function POST(request: NextRequest) {
  let body: { session_id?: unknown; rating?: unknown; product_id?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "invalid_json", message: "Request body must be JSON." },
      { status: 400 },
    );
  }

  const sessionId =
    typeof body.session_id === "string" ? body.session_id.trim() : "";
  if (!sessionId) {
    return NextResponse.json(
      { error: "missing_session", message: "session_id is required." },
      { status: 400 },
    );
  }

  /* Checked against the list rather than cast. This crosses the wire like the
     spend cap does, and an arbitrary string would land in the audit trail and
     be rendered on the dashboard. */
  if (!RATINGS.includes(body.rating as Rating)) {
    return NextResponse.json(
      { error: "invalid_rating", message: `rating must be one of: ${RATINGS.join(", ")}.` },
      { status: 400 },
    );
  }
  const rating = body.rating as Rating;

  const productId =
    typeof body.product_id === "string" ? body.product_id.slice(0, 64) : undefined;

  try {
    const auditId = await logDecision({
      sessionId,
      action: "feedback",
      input: { ...(productId ? { product_id: productId } : {}) },
      output: { rating },
      guardrailStatus: "n/a",
      reasoning: `Buyer rated the experience "${rating}" after paying.`,
    });
    return NextResponse.json({ ok: true, audit_id: auditId });
  } catch (e) {
    console.error("[/api/feedback]", e);
    /* Her tap is already acknowledged on screen. A failed write is not worth
       taking that away from her. */
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
