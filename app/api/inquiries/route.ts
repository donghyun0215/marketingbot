import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { logDecision } from "@/lib/approval";
import { sendMessage, esc } from "@/lib/telegram";

export const dynamic = "force-dynamic";

/**
 * 문의 접수 — 루프 1의 종착점.
 *
 * ref(추적 링크 id)가 함께 오면 그 문의는 특정 콘텐츠에 확정 귀속된다.
 * 원본 데이터의 "GA4 form_submit이 문의 폼과 연결되어 있지 않음"이 바로 이 연결의 부재였다.
 *
 * 고객사 실명은 저장하지 않는다. 별칭과 업종 힌트만 남긴다.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { ref, companyAlias, industryHint, inquiryType, interest, note } = body;
    const db = supabaseAdmin();

    let contentId: number | null = null;
    if (ref) {
      const { data } = await db.from("contents").select("id").eq("tracking_id", ref).maybeSingle();
      contentId = data?.id ?? null;
    }

    const { data: created, error } = await db
      .from("inquiries")
      .insert({
        inquired_on: new Date().toISOString().slice(0, 10),
        company_alias: companyAlias ?? "미상 기업",
        industry_hint: industryHint ?? null,
        inquiry_type: inquiryType ?? "Sales Inquiry",
        interest: interest ?? null,
        source_channel: contentId ? "콘텐츠 추적 링크" : "직접 유입",
        content_id: contentId,
        attribution: contentId ? "confirmed" : "unknown",
        note: note ?? null,
      })
      .select()
      .single();
    if (error) throw error;

    if (contentId) {
      await logDecision("inquiries", created.id, "attributed", "system", { content_id: contentId, ref });
      const { data: c } = await db.from("contents").select("title").eq("id", contentId).single();
      await sendMessage(
        `📩 *문의 도착* — 귀속 확정\n_${esc(String(c?.title ?? ""))}_ 에서 유입되었습니다\\.`
      ).catch(() => {});
    }

    return NextResponse.json({ ok: true, attributed: !!contentId, contentId });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 400 });
  }
}
