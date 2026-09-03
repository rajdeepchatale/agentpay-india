// ============================================================
// POST /api/agent/chat
// ============================================================
// The one endpoint the whole UI talks to. Always returns 200 with a valid
// AgentResponse — even on failure — so the chat renders an ErrorCard instead
// of a blank screen. Only a malformed REQUEST earns a 4xx.
// ============================================================

import { NextResponse, type NextRequest } from "next/server";
import type { AgentResponse, ChatRequest } from "@/types";
import { runAgent } from "@/lib/agent/core";
import { validateChatRequest } from "@/lib/agent/validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Wake the function without spending anything.
 *
 * A cold first message measured 26 to 32 seconds against 1.8 to 8.5 warm, and
 * the judge's opening question is by definition the cold one. The chat page
 * pings this on load.
 *
 * A GET rather than a malformed POST: the POST was rejected at the validator,
 * which warmed the container correctly but printed a 400 in the console of
 * anyone who opened devtools — an error where there is no error.
 */
export function GET() {
  return NextResponse.json({ ok: true });
}

export async function POST(request: NextRequest) {
  let body: Partial<ChatRequest>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "invalid_json", message: "Request body must be JSON." },
      { status: 400 },
    );
  }

  const v = validateChatRequest(body);
  if (!v.ok) {
    return NextResponse.json(
      { error: v.error, message: v.message },
      { status: v.status },
    );
  }

  try {
    const response = await runAgent({
      message: v.message,
      sessionId: v.sessionId,
      maxSpend: v.maxSpend,
      allowedCategories: v.allowedCategories,
      language: v.language,
      history: v.history,
      pendingProductId: v.pendingProductId,
      selectedProductId: v.selectedProductId,
    });
    return NextResponse.json(response);
  } catch (e) {
    console.error("[/api/agent/chat]", e);
    const fallback: AgentResponse = {
      type: "error",
      content:
        "Maaf kijiye, kuch galat ho gaya. Thodi der baad dobara try karein?",
      language: "hinglish",
      audit_id: "",
    };
    return NextResponse.json(fallback);
  }
}
