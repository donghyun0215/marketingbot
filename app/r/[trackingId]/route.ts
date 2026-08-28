import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { logDecision } from "@/lib/approval";

export const dynamic = "force-dynamic";

/**
 * 추적 링크 — 루프 1의 시작점.
 *
 * 발행된 글의 CTA는 이 주소를 가리킨다. 방문자가 여기를 거쳐 문의 폼으로 가면
 * 어느 글에서 왔는지가 ref로 따라붙고, 문의가 접수될 때 그 값으로 귀속된다.
 * 지금까지 문의 10건 중 6건의 출처를 몰랐던 이유가 이 연결이 없어서였다.
 */
export async function GET(req: NextRequest, { params }: { params: { trackingId: string } }) {
  const db = supabaseAdmin();
  const { data } = await db
    .from("contents")
    .select("id, title")
    .eq("tracking_id", params.trackingId)
    .maybeSingle();

  // 링크가 유효하지 않아도 방문자를 막지 않는다. 귀속만 포기한다.
  if (data) {
    await logDecision("contents", data.id, "tracked_click", "visitor", {
      tracking_id: params.trackingId,
      referer: req.headers.get("referer") ?? null,
    });
  }

  const target = new URL("/contact", req.nextUrl.origin);
  if (data) target.searchParams.set("ref", params.trackingId);
  return NextResponse.redirect(target);
}
