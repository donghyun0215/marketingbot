import { supabaseAdmin } from "@/lib/supabase";
import { analyze } from "@/lib/flywheel/analyze";
import { loopMetrics } from "@/lib/flywheel/metrics";
import { Metric, Panel, AttributionBar, PipelineRail } from "@/components/Metric";
import { AdoptButton, DecideButtons } from "@/components/Actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

const fmt = (n: number) => n.toLocaleString("ko-KR");

export default async function Dashboard() {
  const db = supabaseAdmin();

  const [{ data: perf }, { data: inq }, { data: pending }, { data: suggestions }, { data: rules }] =
    await Promise.all([
      db.from("performance_metrics").select("channel, clicks, impressions"),
      db.from("inquiries").select("attribution"),
      db
        .from("contents")
        .select("id, title, voice_score, fact_flags")
        .eq("state", "pending_approval"),
      db.from("topic_suggestions").select("id, topic, rationale").eq("status", "proposed").limit(4),
      db
        .from("learned_constraints")
        .select("rule, created_at")
        .eq("active", true)
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

  const [{ data: scheduled }, { data: rejectedContents }, { data: allContents }] = await Promise.all([
    db
      .from("contents")
      .select("id, title, scheduled_for, timing_type")
      .eq("state", "scheduled")
      .order("scheduled_for", { ascending: true })
      .limit(5),
    db.from("contents").select("suggestion_id").eq("state", "rejected").not("suggestion_id", "is", null),
    db.from("contents").select("state"),
  ]);

  const rows = perf ?? [];
  const sum = (ch: string, k: "clicks" | "impressions") =>
    rows.filter((r) => r.channel === ch).reduce((a, r) => a + Number(r[k] ?? 0), 0);

  const inquiries = inq ?? [];
  const count = (a: string) => inquiries.filter((i) => i.attribution === a).length;
  const attributed = count("confirmed") + count("inferred");
  const rejectedTopicIds = new Set((rejectedContents ?? []).map((c) => c.suggestion_id as number));

  const stateCount = (s: string) => (allContents ?? []).filter((c) => c.state === s).length;

  const insights = await analyze();
  const loops = await loopMetrics();

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-6">
        <div>
          <h1 className="text-[21px] font-semibold tracking-[-0.02em]">콘텐츠 운영 현황</h1>
          <p className="mt-1 text-[13.5px] text-[var(--muted)]">
            최근 6개월 · 블로그 {rows.filter((r) => r.channel === "blog").length}편 · 링크드인{" "}
            {rows.filter((r) => r.channel === "linkedin").length}건
          </p>
        </div>
        <p className="hidden pb-1 text-[12px] text-[var(--muted)] md:block">
          <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-[var(--accent)] align-middle" />
          사람이 판단하는 지점
        </p>
      </div>

      <PipelineRail
        stages={[
          { key: "proposed", label: "주제 제안", count: suggestions?.length ?? 0, human: true },
          { key: "pending", label: "승인 대기", count: stateCount("pending_approval"), human: true },
          { key: "scheduled", label: "발행 예약", count: stateCount("scheduled") },
          { key: "published", label: "발행", count: stateCount("published") },
          { key: "attributed", label: "문의 귀속", count: loops.attribution.systemTotal },
        ]}
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Metric label="블로그 클릭" value={fmt(sum("blog", "clicks"))} note={`노출 ${fmt(sum("blog", "impressions"))}회`} delay={40} />
        <Metric label="링크드인 클릭" value={fmt(sum("linkedin", "clicks"))} note={`노출 ${fmt(sum("linkedin", "impressions"))}회`} delay={70} />
        <Metric label="진성 문의" value={inquiries.length} unit="건" note="내부·허수 제외" delay={100} />
        <Metric
          label="콘텐츠 귀속률"
          value={`${Math.round((attributed / Math.max(inquiries.length, 1)) * 100)}%`}
          tone="danger"
          note={`${inquiries.length - attributed}건은 어떤 글에서 왔는지 알 수 없음`}
          delay={130}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <Panel
          title="승인 대기"
          delay={160}
          aside={<span className="text-[12px] text-[var(--muted)]">텔레그램에서도 처리됩니다</span>}
        >
          {pending?.length ? (
            <ul>
              {pending.map((c) => {
                const flags = (c.fact_flags as any[]) ?? [];
                const blocked = flags.filter((f) => f.severity === "block").length;
                return (
                  <li
                    key={c.id}
                    className="flex items-start justify-between gap-4 border-t border-[var(--line-2)] py-3 first:border-0 first:pt-0"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-[13.5px] font-medium">{c.title}</div>
                      <div className="mt-1.5 flex items-center gap-2.5 text-[12px]">
                        <span className="rounded bg-[var(--line-2)] px-1.5 py-0.5 text-[var(--ink-2)]">
                          Voice <span className="tnum font-semibold">{c.voice_score}</span>
                        </span>
                        <span className={blocked ? "text-[var(--danger)]" : flags.length ? "text-[var(--amber)]" : "text-[var(--ok)]"}>
                          {flags.length === 0 ? "확인 지점 없음" : `확인 ${flags.length}곳${blocked ? ` · 차단 ${blocked}` : ""}`}
                        </span>
                      </div>
                    </div>
                    <DecideButtons contentId={c.id} />
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="py-1 text-[13px] text-[var(--muted)]">
              대기 중인 초안이 없습니다. 아래에서 주제를 채택하면 초안이 만들어집니다.
            </p>
          )}
        </Panel>

        <Panel title="문의가 어디서 왔는가" delay={190}>
          <AttributionBar confirmed={count("confirmed")} inferred={count("inferred")} unknown={count("unknown")} />
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-[var(--line-2)] bg-[var(--surface-2)] px-3 py-2.5">
              <div className="text-[11.5px] text-[var(--muted)]">과거 방식</div>
              <div className="tnum mt-0.5 text-[20px] font-semibold text-[var(--danger)]">
                {loops.attribution.legacyRate}%
              </div>
              <div className="mt-0.5 text-[11px] text-[var(--muted)]">추적 수단 없음</div>
            </div>
            <div className="rounded-lg border border-[var(--line-2)] bg-[var(--surface-2)] px-3 py-2.5">
              <div className="text-[11.5px] text-[var(--muted)]">이 시스템 발행분</div>
              <div className="tnum mt-0.5 text-[20px] font-semibold text-[var(--ok)]">
                {loops.attribution.systemRate === null ? "—" : `${loops.attribution.systemRate}%`}
              </div>
              <div className="mt-0.5 text-[11px] text-[var(--muted)]">
                {loops.attribution.systemTotal === 0 ? "아직 없음" : `${loops.attribution.systemTotal}건 귀속`}
              </div>
            </div>
          </div>
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="데이터가 말하는 것" delay={220}>
          <ul className="space-y-3.5">
            {insights.slice(0, 4).map((i, n) => (
              <li key={n}>
                <div className="text-[13.5px] leading-snug">{i.headline}</div>
                <ul className="mt-1.5 space-y-1">
                  {i.evidence.slice(0, 2).map((e, m) => (
                    <li key={m} className="text-[12px] leading-relaxed text-[var(--muted)]">
                      {e}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel
          title="다음 주제 후보"
          delay={250}
          aside={<span className="text-[12px] text-[var(--muted)]">사람이 채택합니다</span>}
        >
          {suggestions?.length ? (
            <ul>
              {suggestions.map((s) => (
                <li key={s.id} className="border-t border-[var(--line-2)] py-3 first:border-0 first:pt-0">
                  <div className="text-[13.5px] font-medium leading-snug">{s.topic}</div>
                  <div className="mt-1 text-[12px] leading-relaxed text-[var(--muted)]">{s.rationale}</div>
                  {rejectedTopicIds.has(s.id) && (
                    <div className="mt-1.5 text-[11.5px] text-[var(--amber)]">
                      이전 초안이 반려된 주제입니다. 배운 규칙을 적용해 다시 생성합니다.
                    </div>
                  )}
                  <div className="mt-2.5">
                    <AdoptButton suggestionId={s.id} />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[13px] text-[var(--muted)]">
              제안할 주제가 없습니다. 성과 데이터가 갱신되면 새 후보가 나옵니다.
            </p>
          )}
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel
          title="시스템이 배운 규칙"
          delay={280}
          aside={<span className="text-[12px] text-[var(--muted)]">반려 사유에서</span>}
        >
          {rules?.length ? (
            <ul className="space-y-2">
              {rules.map((r, n) => (
                <li key={n} className="flex gap-2.5 text-[13px] leading-relaxed">
                  <span className="tnum mt-0.5 shrink-0 text-[11px] text-[var(--muted)]">
                    {String(n + 1).padStart(2, "0")}
                  </span>
                  <span>{r.rule}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[13px] text-[var(--muted)]">
              아직 반려된 초안이 없습니다. 반려하면 그 사유가 규칙이 되어 다음 생성부터 반영됩니다.
            </p>
          )}
        </Panel>

        <Panel
          title="발행 예정"
          delay={310}
          aside={<span className="text-[12px] text-[var(--muted)]">시각이 되면 자동 발행</span>}
        >
          {scheduled?.length ? (
            <ul>
              {scheduled.map((c) => {
                const d = new Date(c.scheduled_for as string);
                const wd = ["일", "월", "화", "수", "목", "금", "토"][d.getDay()];
                const kind =
                  c.timing_type === "event" ? "행사 연동" : c.timing_type === "immediate" ? "즉시" : "기본 주기";
                return (
                  <li
                    key={c.id}
                    className="flex items-center justify-between gap-4 border-t border-[var(--line-2)] py-2.5 first:border-0 first:pt-0"
                  >
                    <span className="min-w-0 truncate text-[13px]">{c.title}</span>
                    <span className="shrink-0 text-[12px] text-[var(--muted)]">
                      <span className="tnum">{`${d.getMonth() + 1}.${d.getDate()}(${wd}) ${d.getHours()}시`}</span>
                      <span className="ml-2 rounded bg-[var(--line-2)] px-1.5 py-0.5">{kind}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-[13px] text-[var(--muted)]">
              예약된 콘텐츠가 없습니다. 승인 후 발행 시점을 정하면 여기에 표시됩니다.
            </p>
          )}
        </Panel>
      </div>
    </div>
  );
}
