import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { buildProfile, CorpusDoc } from "@/lib/voice/profile";
import { buildGenericBaseline } from "@/lib/voice/generic";
import { scoreVoice } from "@/lib/voice/score";
import { generateDraft } from "@/lib/voice/generate";
import { factGuard } from "@/lib/fact-guard";
import { activeConstraints, logDecision } from "@/lib/approval";
import { sendApprovalRequest } from "@/lib/telegram";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * 주제 채택 → 초안 생성 → 사실 검사 → 승인 요청.
 *
 * 사람이 하는 일은 이 라우트의 시작과 끝에만 있다.
 *   시작: 어느 주제로 갈지 고른다
 *   끝:   나온 결과물을 승인한다
 * 그 사이는 손이 가지 않는다. 브리프가 요구한 개입 지점 두 곳과 정확히 일치한다.
 */
export async function POST(req: NextRequest) {
  const db = supabaseAdmin();

  try {
    const { suggestionId } = await req.json();
    if (!suggestionId) {
      return NextResponse.json({ error: "suggestionId가 필요합니다" }, { status: 400 });
    }

    // 1) 채택 — 같은 주제를 두 번 채택하지 않도록 상태로 잠근다
    const { data: suggestion, error: sErr } = await db
      .from("topic_suggestions")
      .update({ status: "accepted", decided_at: new Date().toISOString(), decided_by: "web" })
      .eq("id", suggestionId)
      .eq("status", "proposed")
      .select()
      .single();
    if (sErr || !suggestion) {
      return NextResponse.json({ error: "이미 처리된 주제입니다" }, { status: 409 });
    }
    await logDecision("topic_suggestions", suggestionId, "accepted", "web", { topic: suggestion.topic });

    // 2) 문체 기준과 학습된 규칙을 모은다
    const { data: curated } = await db
      .from("voice_corpus")
      .select("title, body")
      .in("source", ["curated", "approved"]);
    const docs = (curated ?? []) as CorpusDoc[];
    if (docs.length < 3) {
      return NextResponse.json({ error: "보이스 코퍼스가 부족합니다" }, { status: 500 });
    }
    const profile = buildProfile(docs);
    const base = buildGenericBaseline(docs.map((d) => d.body));
    const constraints = await activeConstraints(); // 루프 2: 반려에서 배운 규칙

    // 3) 근거는 추천을 만든 실제 수치를 그대로 쓴다. 여기서 지어내면 안 된다.
    const ev = (suggestion.evidence ?? {}) as Record<string, unknown>;
    const evidence = [suggestion.rationale, ...Object.entries(ev).map(([k, v]) => `${k}: ${v}`)].filter(
      Boolean
    ) as string[];

    // 4) 같은 모델로 두 번 — 대조군과 실험군
    const result = await generateDraft(
      { topic: suggestion.topic, channel: suggestion.channel, evidence, constraints },
      profile
    );
    const voiced = scoreVoice(result.voiced.body, profile, base);
    const baseline = scoreVoice(result.baseline.body, profile, base);

    // 5) 사실 검사
    const guard = factGuard(result.voiced.body);

    const { data: content } = await db
      .from("contents")
      .insert({
        suggestion_id: suggestionId, // 루프 4: 추천 → 콘텐츠 → 성과 체인
        title: suggestion.topic,
        body: result.voiced.body,
        channel: suggestion.channel,
        state: "pending_approval",
        voice_score: voiced.total,
        voice_breakdown: voiced.axes,
        fact_flags: guard.flags,
        baseline_body: result.baseline.body,
        baseline_voice_score: baseline.total,
      })
      .select()
      .single();

    await logDecision("contents", content!.id, "generated", "system", {
      model: result.model,
      voice_score: voiced.total,
      baseline_voice_score: baseline.total,
      constraints_applied: constraints.length,
      review_points: guard.reviewPoints,
    });

    // 6) 사람에게 넘긴다
    await sendApprovalRequest({
      contentId: content!.id,
      title: content!.title,
      body: content!.body,
      channel: suggestion.channel === "linkedin" ? "링크드인" : "블로그",
      voice: voiced,
      guard,
      rationale: suggestion.rationale,
    });

    return NextResponse.json({
      ok: true,
      contentId: content!.id,
      voiceScore: voiced.total,
      baselineScore: baseline.total,
      reviewPoints: guard.reviewPoints,
      constraintsApplied: constraints.length,
    });
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: detail }, { status: 500 });
  }
}
