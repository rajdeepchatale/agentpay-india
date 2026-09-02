// ============================================================
// GET /api/audit?session_id=xxx
// ============================================================
// The decision trail for one session, oldest first so it reads as a timeline.
// This is what /dashboard renders — the evidence that every guardrail
// decision was made deliberately and recorded with its reasoning.
// ============================================================

import { NextResponse, type NextRequest } from "next/server";
import type { AuditResponse } from "@/types";
import { getTrail } from "@/lib/audit/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const sessionId = new URL(request.url).searchParams.get("session_id")?.trim();

  if (!sessionId) {
    return NextResponse.json(
      { error: "missing_session", message: "session_id is required." },
      { status: 400 },
    );
  }

  try {
    const entries = await getTrail(sessionId);
    const response: AuditResponse = { entries };
    return NextResponse.json(response);
  } catch (e) {
    console.error("[/api/audit]", e);
    return NextResponse.json(
      { error: "internal_error", message: "Could not read the audit trail." },
      { status: 500 },
    );
  }
}
