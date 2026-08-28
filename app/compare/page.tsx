import { supabaseAdmin } from "@/lib/supabase";
import { Panel } from "@/components/Metric";

export const dynamic = "force-dynamic";

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

  const axes = (c.voice_breakdown as Record<string, number>) ?? {};

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
          aside={<span className="tnum text-[13px] text-[var(--muted)]">Voice {c.baseline_voice_score}</span>}
        >
          <pre className="whitespace-pre-wrap text-[12.5px] leading-relaxed text-[var(--muted)]">
            {c.baseline_body}
          </pre>
        </Panel>
        <Panel
          title="Voice Engine"
          aside={<span className="tnum text-[13px] font-semibold">Voice {c.voice_score}</span>}
        >
          <pre className="whitespace-pre-wrap text-[12.5px] leading-relaxed">{c.body}</pre>
        </Panel>
      </div>

      <Panel title="축별 비교" aside={<span className="text-[12px] text-[var(--muted)]">총점보다 축을 봅니다</span>}>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {Object.entries(axes).map(([k, v]) => (
            <div key={k} className="rounded border border-[var(--line)] px-3 py-2">
              <div className="text-[11.5px] text-[var(--muted)]">{k}</div>
              <div className="tnum text-[18px] font-semibold">{v}</div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
