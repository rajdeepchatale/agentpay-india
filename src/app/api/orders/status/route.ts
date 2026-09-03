// ============================================================
// GET /api/orders/status?session_id=…
// ============================================================
// Has this conversation paid for anything yet?
//
// The payment link carries a callback back into the chat and every link has
// one, but the buyer does not reliably arrive: Razorpay can leave her on its
// own receipt page, and the shop then never thanks her for a purchase that
// definitely happened. The webhook already knows the money landed. This lets
// the conversation ask, so the close fires because payment arrived rather
// than because a redirect worked.
// ============================================================

import { NextResponse, type NextRequest } from "next/server";
import { paidProductFor } from "@/lib/audit/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get("session_id")?.trim() ?? "";
  if (!sessionId) {
    return NextResponse.json({ paid: false });
  }

  try {
    const productId = await paidProductFor(sessionId);
    return NextResponse.json(
      productId ? { paid: true, product_id: productId } : { paid: false },
      /* Never cached: the whole point is noticing a change. */
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    /* Unknown is not paid. The buyer can still come back by the callback. */
    return NextResponse.json({ paid: false });
  }
}
