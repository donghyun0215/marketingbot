import { supabaseAdmin } from "@/lib/supabase";
import { Panel } from "@/components/Metric";
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
    .select("title, body, baseline_body, voice_score, baseline_voice_score, voice_breakdown")
    .not("baseline_body", "is", null)
    .order("id", { ascending: false })
    .limit(1);
  const c = data?.[0];

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
        <h1 className="text-[19px] font-semibold tracking-tight">같은 모델, 같은 주제, 다른 시스템</h1>
        <p className="mt-0.5 text-[13px] text-[var(--muted)]">
          모델을 바꾸지 않았습니다. 달라진 것은 코퍼스에서 뽑은 문체, 반려에서 배운 규칙, 실데이터 근거뿐입니다.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel
          title="일반 프롬프트"
          aside={
            <span className="text-[12px] text-[var(--muted)]">
              자사 용어 {sBase.axes.terminology >= 90 ? "정확" : "불일치"} · 자사 근거 {sBase.axes.structure}
            </span>
          }
        >
          <pre className="whitespace-pre-wrap text-[12.5px] leading-relaxed text-[var(--muted)]">
            {c.baseline_body}
          </pre>
        </Panel>
        <Panel
          title="Voice Engine"
          aside={
            <span className="text-[12px] font-medium">
              자사 근거 {sVoiced.axes.structure} · 리듬 {sVoiced.axes.rhythm}
            </span>
          }
        >
          <pre className="whitespace-pre-wrap text-[12.5px] leading-relaxed">{c.body}</pre>
        </Panel>
      </div>

      <Panel
        title="무엇이 달랐는가"
        aside={<span className="text-[12px] text-[var(--muted)]">같은 기준으로 양쪽을 채점했습니다</span>}
      >
        <table className="w-full text-[13px]">
          <thead>
            <tr className="text-[11.5px] text-[var(--muted)]">
              <th className="pb-2 text-left font-normal">축</th>
              <th className="pb-2 text-right font-normal">일반 프롬프트</th>
              <th className="pb-2 text-right font-normal">Voice Engine</th>
            </tr>
          </thead>
          <tbody>
            {Object.keys(sVoiced.axes).map((k) => {
              const a = (sBase.axes as Record<string, number>)[k];
              const b = (sVoiced.axes as Record<string, number>)[k];
              return (
                <tr key={k} className="border-t border-[var(--line)]">
                  <td className="py-1.5">{AXIS_LABEL[k] ?? k}</td>
                  <td className="tnum py-1.5 text-right text-[var(--muted)]">{a}</td>
                  <td className={`tnum py-1.5 text-right ${b > a ? "font-semibold" : ""}`}>{b}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="mt-3 space-y-1 border-t border-[var(--line)] pt-3 text-[12px] text-[var(--muted)]">
          <div>일반 프롬프트: {sBase.notes.find((n) => n.includes("자사 언급")) ?? sBase.notes[0]}</div>
          <div>Voice Engine: {sVoiced.notes.find((n) => n.includes("자사 언급")) ?? sVoiced.notes[0]}</div>
        </div>
      </Panel>
    </div>
  );
}
