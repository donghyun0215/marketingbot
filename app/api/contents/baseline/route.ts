import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { buildProfile, CorpusDoc } from "@/lib/voice/profile";
import { buildGenericBaseline } from "@/lib/voice/generic";
import { scoreVoice } from "@/lib/voice/score";
import { generateBaseline } from "@/lib/voice/generate";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * 대조군 생성.
 *
 * 승인 흐름에서 분리한 이유: 한 요청에서 생성을 두 번 하면 실행 시간 상한을 넘는다.
 * 대조군은 "왜 그냥 ChatGPT가 아닌가"를 보여주는 발표 자료이지 운영에 필요한 것이
 * 아니므로, 여유 있을 때 따로 만들어 저장해 둔다. /compare는 저장된 값을 읽는다.
 */
export async function POST(req: NextRequest) {
  try {
    const { contentId } = await req.json();
    const db = supabaseAdmin();

    const { data: content } = await db
      .from("contents")
      .select("id, title, body")
      .eq("id", contentId)
      .single();
    if (!content) return NextResponse.json({ error: "콘텐츠를 찾을 수 없습니다" }, { status: 404 });

    const body = await generateBaseline({ topic: content.title });

    const { data: corpus } = await db
      .from("voice_corpus")
      .select("title, body")
      .in("source", ["curated", "approved"]);
    const docs = (corpus ?? []) as CorpusDoc[];
    const profile = buildProfile(docs);
    const gbase = buildGenericBaseline(docs.map((d) => d.body));
    const score = scoreVoice(body, profile, gbase);

    await db
      .from("contents")
      .update({ baseline_body: body, baseline_voice_score: score.total })
      .eq("id", contentId);

    return NextResponse.json({ ok: true, baselineScore: score.total, axes: score.axes });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
