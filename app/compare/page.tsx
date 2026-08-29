import { supabaseAdmin } from "@/lib/supabase";
import { Panel, ScoreBar } from "@/components/Metric";
import { buildProfile, CorpusDoc } from "@/lib/voice/profile";
import { buildGenericBaseline } from "@/lib/voice/generic";
import { scoreVoice } from "@/lib/voice/score";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

/**
 * Baseline 비교 — 심사 제출물의 "왜 그냥 ChatGPT를 쓰지 않는가"에 답하는 화면.
 * 결과는 미리 계산해 DB에 저장한 것을 읽는다. 발표 중 API 호출에 의존하지 않는다.
 */
export default async function Compare() {
  const { data } = await supabaseAdmin()
    .from("contents")
    .select("id, title, body, baseline_body, voice_score, baseline_voice_score, voice_breakdown, suggestion_id")
    .not("baseline_body", "is", null)
    .order("id", { ascending: false })
    .limit(1);
  const c = data?.[0];

  // 실험 조건: 어떤 모델로, 어떤 입력을 넣었는지. 스크린샷 한 장에 조건이 다 보여야
  // "왜 그냥 ChatGPT가 아닌가"의 비교가 성립한다.
  let model = "";
  let inputRationale = "";
  if (c) {
    const { data: gen } = await supabaseAdmin()
      .from("audit_log")
      .select("detail")
      .eq("entity", "contents")
      .eq("entity_id", c.id)
      .eq("action", "generated")
      .maybeSingle();
    model = String((gen?.detail as any)?.model ?? "");
    if (c.suggestion_id) {
      const { data: sg } = await supabaseAdmin()
        .from("topic_suggestions")
        .select("rationale")
        .eq("id", c.suggestion_id)
        .maybeSingle();
      inputRationale = String(sg?.rationale ?? "");
    }
  }

  if (!c) {
    return (
      <Panel title="생성 비교">
        <p className="text-[13px] text-[var(--muted)]">
          비교 결과가 아직 없습니다. 주제를 채택해 초안을 생성하면 여기에 나란히 표시됩니다.
        </p>
      </Panel>
    );
  }

  // 양쪽을 같은 기준으로 다시 채점해 축별로 나란히 놓는다.
  // 총점 하나보다 축별 차이가 훨씬 많은 것을 말해준다.
  const { data: corpus } = await supabaseAdmin()
    .from("voice_corpus")
    .select("title, body")
    .in("source", ["curated", "approved"]);
  const docs = (corpus ?? []) as CorpusDoc[];
  const profile = buildProfile(docs);
  const gbase = buildGenericBaseline(docs.map((d) => d.body));
  const sVoiced = scoreVoice(c.body ?? "", profile, gbase);
  const sBase = scoreVoice(c.baseline_body ?? "", profile, gbase);

  const AXIS_LABEL: Record<string, string> = {
    lexicon: "어휘 재현",
    rhythm: "문장 리듬",
    terminology: "용어 표기",
    structure: "자사 근거",
    generic: "범용 표지 없음",
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-[21px] font-semibold tracking-[-0.02em]">같은 모델, 같은 주제, 다른 시스템</h1>
        <p className="mt-0.5 text-[13px] text-[var(--muted)]">
          모델을 바꾸지 않았습니다. 달라진 것은 코퍼스에서 뽑은 문체, 반려에서 배운 규칙, 실데이터 근거뿐입니다.
        </p>
      </div>

      <div className="rise grid gap-px overflow-hidden rounded-[var(--r)] border border-[var(--line)] bg-[var(--line)] shadow-[var(--shadow-1)] md:grid-cols-3">
        {[
          { k: "모델 (동일)", v: model || "—" },
          { k: "주제 (동일)", v: c.title },
          { k: "입력 근거 (동일)", v: inputRationale || "실데이터 기반 주제 추천" },
        ].map((x) => (
          <div key={x.k} className="bg-[var(--surface)] px-4 py-3">
            <div className="text-[11.5px] font-medium text-[var(--muted)]">{x.k}</div>
            <div className="mt-1 text-[13px] leading-snug">{x.v}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel
          title="일반 프롬프트 — 주제만 전달"
          aside={
            <span className="text-[12px] text-[var(--muted)]">
              자사 용어 {sBase.axes.terminology >= 90 ? "정확" : "불일치"} · 자사 근거 {sBase.axes.structure}
            </span>
          }
        >
          <pre className="max-h-[420px] overflow-y-auto whitespace-pre-wrap font-[inherit] text-[12.5px] leading-relaxed text-[var(--muted)]">
            {c.baseline_body}
          </pre>
        </Panel>
        <Panel
          title="Voice Engine — 문체·규칙·근거 주입"
          aside={
            <span className="text-[12px] font-medium">
              자사 근거 {sVoiced.axes.structure} · 리듬 {sVoiced.axes.rhythm}
            </span>
          }
        >
          <pre className="max-h-[420px] overflow-y-auto whitespace-pre-wrap font-[inherit] text-[12.5px] leading-relaxed">
            {c.body}
          </pre>
        </Panel>
      </div>

      <Panel
        title="무엇이 달랐는가"
        aside={<span className="text-[12px] text-[var(--muted)]">같은 기준으로 양쪽을 채점했습니다</span>}
      >
        <div className="mb-1.5 grid grid-cols-[96px_1fr_1fr] gap-3 text-[11.5px] text-[var(--muted)]">
          <span />
          <span>일반 프롬프트</span>
          <span>Voice Engine</span>
        </div>
        {Object.keys(sVoiced.axes).map((k) => (
          <ScoreBar
            key={k}
            label={AXIS_LABEL[k] ?? k}
            a={(sBase.axes as Record<string, number>)[k]}
            b={(sVoiced.axes as Record<string, number>)[k]}
          />
        ))}
        <div className="mt-3 space-y-1 border-t border-[var(--line)] pt-3 text-[12px] text-[var(--muted)]">
          <div>일반 프롬프트: {sBase.notes.find((n) => n.includes("자사 언급")) ?? sBase.notes[0]}</div>
          <div>Voice Engine: {sVoiced.notes.find((n) => n.includes("자사 언급")) ?? sVoiced.notes[0]}</div>
        </div>
      </Panel>
    </div>
  );
}
