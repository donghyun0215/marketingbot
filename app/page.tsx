import { supabaseAdmin } from "@/lib/supabase";
import { analyze } from "@/lib/flywheel/analyze";
import { loopMetrics } from "@/lib/flywheel/metrics";
import { Metric, Panel, AttributionBar } from "@/components/Metric";
import { AdoptButton, DecideButtons } from "@/components/Actions";

export const dynamic = "force-dynamic";
// 승인·반려 결과는 즉시 화면에 보여야 한다. 캐시된 페이지를 재사용하면
// 텔레그램에서 처리한 내용이 대시보드에 안 나타난다.
export const revalidate = 0;
export const fetchCache = "force-no-store";

const fmt = (n: number) => n.toLocaleString("ko-KR");

export default async function Dashboard() {
  const db = supabaseAdmin();

  const [{ data: perf }, { data: inq }, { data: pending }, { data: suggestions }, { data: rules }] =
    await Promise.all([
      db.from("performance_metrics").select("channel, clicks, impressions, ctr"),
      db.from("inquiries").select("attribution"),
      db.from("contents").select("id, title, voice_score, fact_flags, created_at").eq("state", "pending_approval"),
      db.from("topic_suggestions").select("id, topic, rationale, status").eq("status", "proposed").limit(4),
      db.from("learned_constraints").select("rule, created_at").eq("active", true).limit(5),
    ]);

  const rows = perf ?? [];
  const sum = (ch: string, k: "clicks" | "impressions") =>
    rows.filter((r) => r.channel === ch).reduce((a, r) => a + Number(r[k] ?? 0), 0);

  const inquiries = inq ?? [];
  const count = (a: string) => inquiries.filter((i) => i.attribution === a).length;
  const attributed = count("confirmed") + count("inferred");

  const insights = await analyze();
  const loops = await loopMetrics();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[19px] font-semibold tracking-tight">콘텐츠 운영 현황</h1>
        <p className="mt-0.5 text-[13px] text-[var(--muted)]">
          최근 6개월 · 블로그 {rows.filter((r) => r.channel === "blog").length}편 · 링크드인{" "}
          {rows.filter((r) => r.channel === "linkedin").length}건
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Metric label="블로그 클릭" value={fmt(sum("blog", "clicks"))} note={`노출 ${fmt(sum("blog", "impressions"))}회`} />
        <Metric label="링크드인 클릭" value={fmt(sum("linkedin", "clicks"))} note={`노출 ${fmt(sum("linkedin", "impressions"))}회`} />
        <Metric label="진성 문의" value={inquiries.length} unit="건" note="내부·허수 제외" />
        <Metric
          label="콘텐츠 귀속률"
          value={`${Math.round((attributed / Math.max(inquiries.length, 1)) * 100)}%`}
          tone="risk"
          note={`${inquiries.length - attributed}건은 어떤 글에서 왔는지 알 수 없음`}
        />
        <Metric label="승인 대기" value={pending?.length ?? 0} unit="건" tone={pending?.length ? "ok" : "default"} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.15fr_1fr]">
        <Panel title="승인 대기" aside={<span className="text-[12px] text-[var(--muted)]">텔레그램에서도 처리 가능</span>}>
          {pending?.length ? (
            <ul className="divide-y divide-[var(--line)]">
              {pending.map((c) => {
                const flags = (c.fact_flags as any[]) ?? [];
                const blocked = flags.filter((f) => f.severity === "block").length;
                return (
                  <li key={c.id} className="flex items-start justify-between gap-4 py-2.5 first:pt-0">
                    <div className="min-w-0">
                      <div className="truncate text-[13.5px]">{c.title}</div>
                      <div className="mt-1 flex gap-3 text-[12px] text-[var(--muted)]">
                        <span>Voice <span className="tnum text-[var(--ink)]">{c.voice_score}</span></span>
                        <span className={blocked ? "text-[var(--risk)]" : "text-[var(--warn)]"}>
                          확인 {flags.length}곳{blocked ? ` (차단 ${blocked})` : ""}
                        </span>
                      </div>
                    </div>
                    <DecideButtons contentId={c.id} />
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="py-1 text-[13px] text-[var(--muted)]">대기 중인 초안이 없습니다.</p>
          )}
        </Panel>

        <Panel title="문의가 어디서 왔는가">
          <AttributionBar confirmed={count("confirmed")} inferred={count("inferred")} unknown={count("unknown")} />
          <p className="mt-3 text-[12.5px] leading-relaxed text-[var(--muted)]">
            지금까지 발행된 콘텐츠에는 추적 수단이 없어 대부분의 문의를 특정 글에 연결하지 못합니다.
            이 시스템으로 발행하는 글은 추적 링크를 갖고, 들어온 문의가 어느 글에서 왔는지 남습니다.
          </p>
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <Panel title="데이터가 말하는 것">
          <ul className="space-y-3">
            {insights.slice(0, 4).map((i, n) => (
              <li key={n}>
                <div className="text-[13.5px]">{i.headline}</div>
                <ul className="mt-1 space-y-0.5">
                  {i.evidence.slice(0, 2).map((e, m) => (
                    <li key={m} className="text-[12px] text-[var(--muted)]">— {e}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="다음 주제 후보" aside={<span className="text-[12px] text-[var(--muted)]">사람이 채택합니다</span>}>
          <ul className="divide-y divide-[var(--line)]">
            {(suggestions ?? []).map((s) => (
              <li key={s.id} className="py-2.5 first:pt-0">
                <div className="text-[13.5px]">{s.topic}</div>
                <div className="mt-1 text-[12px] leading-snug text-[var(--muted)]">{s.rationale}</div>
                <div className="mt-2">
                  <AdoptButton suggestionId={s.id} />
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="콘텐츠가 문의를 만들었는가" aside={<span className="text-[12px] text-[var(--muted)]">루프 1</span>}>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded border border-[var(--line)] px-3 py-2">
              <div className="text-[11.5px] text-[var(--muted)]">과거 방식 (추적 없음)</div>
              <div className="tnum mt-0.5 text-[20px] font-semibold text-[var(--risk)]">{loops.attribution.legacyRate}%</div>
              <div className="mt-0.5 text-[11.5px] text-[var(--muted)]">
                {loops.attribution.legacyTotal}건 중 {loops.attribution.legacyAttributed}건만 출처 파악
              </div>
            </div>
            <div className="rounded border border-[var(--line)] px-3 py-2">
              <div className="text-[11.5px] text-[var(--muted)]">이 시스템 발행분</div>
              <div className="tnum mt-0.5 text-[20px] font-semibold text-[var(--ok)]">
                {loops.attribution.systemRate === null ? "—" : `${loops.attribution.systemRate}%`}
              </div>
              <div className="mt-0.5 text-[11.5px] text-[var(--muted)]">
                {loops.attribution.systemTotal === 0
                  ? "아직 추적 링크로 들어온 문의가 없습니다"
                  : `${loops.attribution.systemTotal}건 전부 귀속`}
              </div>
            </div>
          </div>
        </Panel>

        <Panel title="추천이 성과로 이어졌는가" aside={<span className="text-[12px] text-[var(--muted)]">루프 4</span>}>
          <div className="flex items-center gap-2 text-[12.5px]">
            {[
              ["제안", loops.suggestions.proposed],
              ["채택", loops.suggestions.accepted],
              ["발행", loops.suggestions.published],
              ["문의 발생", loops.suggestions.ledToInquiry],
            ].map(([label, n], i, arr) => (
              <div key={String(label)} className="flex items-center gap-2">
                <div className="rounded border border-[var(--line)] px-2.5 py-1.5 text-center">
                  <div className="text-[11px] text-[var(--muted)]">{label}</div>
                  <div className="tnum text-[16px] font-semibold">{n as number}</div>
                </div>
                {i < arr.length - 1 && <span className="text-[var(--muted)]">→</span>}
              </div>
            ))}
          </div>
          <p className="mt-2.5 text-[12px] text-[var(--muted)]">
            {loops.suggestions.hitRate === null
              ? "추천에서 나온 콘텐츠가 아직 발행되지 않았습니다. 발행 후 적중률이 계산됩니다."
              : `발행된 추천 중 ${loops.suggestions.hitRate}%가 문의로 이어졌습니다.`}
          </p>
        </Panel>
      </div>

      <Panel title="시스템이 배운 규칙" aside={<span className="text-[12px] text-[var(--muted)]">반려 사유에서 학습</span>}>
        {rules?.length ? (
          <ul className="space-y-1.5">
            {rules.map((r, n) => (
              <li key={n} className="text-[13px]">
                <span className="mr-2 text-[var(--muted)]">·</span>
                {r.rule}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[13px] text-[var(--muted)]">
            아직 반려된 초안이 없습니다. 반려하면 그 사유가 규칙이 되어 다음 생성부터 반영됩니다.
          </p>
        )}
      </Panel>
    </div>
  );
}
