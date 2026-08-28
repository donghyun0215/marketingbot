/**
 * Data Flywheel — 친구가 설계한 6레이어 중 ④분석 ⑤브리핑 ⑥선제안.
 *
 * 브리프의 실패:
 *   "지난 분기에 쓴 글 하나가 대기업 교육 담당자들 사이에 돌면서 문의가 세 건
 *    들어왔습니다. 근데 그 글이 왜 터졌는지 아는 사람이 없어요."
 *
 * 그래서 이 모듈은 "무엇이 잘 됐다"에서 멈추지 않는다. 왜 그랬는지를 데이터로
 * 설명하고, 그 설명을 다음 주제로 바꾼다.
 *
 * 순서가 중요하다. 통계를 먼저 계산하고, LLM은 그 숫자를 해석만 한다.
 * LLM에게 숫자를 찾게 하면 지어낸다.
 */

import { supabaseAdmin } from "../supabase";

export type Insight = {
  kind: "outlier_win" | "outlier_miss" | "attribution_gap" | "query_demand";
  headline: string;
  /** 근거가 된 실제 수치. 화면과 브리핑에 그대로 노출한다. */
  evidence: string[];
};

export type TopicSuggestion = {
  topic: string;
  rationale: string;
  evidence: Record<string, unknown>;
  channel: "blog" | "linkedin";
};

const round = (n: number, d = 2) => Math.round(n * 10 ** d) / 10 ** d;

function mean(xs: number[]) {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

export async function analyze(): Promise<Insight[]> {
  const db = supabaseAdmin();
  const insights: Insight[] = [];

  const { data: perf } = await db
    .from("performance_metrics")
    .select("channel, external_title, clicks, impressions, ctr, engagement_rate");
  const rows = perf ?? [];

  for (const channel of ["blog", "linkedin"] as const) {
    const ch = rows.filter((r) => r.channel === channel && (r.impressions ?? 0) > 0);
    if (ch.length < 5) continue;
    const ctrs = ch.map((r) => Number(r.ctr ?? 0));
    const avg = mean(ctrs);
    const sd = Math.sqrt(mean(ctrs.map((c) => (c - avg) ** 2)));

    // 평균에서 2표준편차 이상 벗어난 건만 본다. 나머지는 잡음이다.
    const wins = ch.filter((r) => Number(r.ctr ?? 0) > avg + 2 * sd).sort((a, b) => Number(b.ctr) - Number(a.ctr));
    const misses = ch
      .filter((r) => (r.impressions ?? 0) > 500 && Number(r.clicks ?? 0) === 0)
      .sort((a, b) => Number(b.impressions) - Number(a.impressions));

    if (wins.length) {
      insights.push({
        kind: "outlier_win",
        headline: `${channel === "blog" ? "블로그" : "링크드인"} 상위 성과 ${wins.length}건이 평균을 크게 웃돕니다`,
        evidence: wins.slice(0, 3).map(
          (r) => `"${String(r.external_title).slice(0, 40)}" CTR ${round(Number(r.ctr))}% (채널 평균 ${round(avg)}%)`
        ),
      });
    }
    if (misses.length) {
      insights.push({
        kind: "outlier_miss",
        headline: `노출은 많은데 클릭이 없는 콘텐츠 ${misses.length}건`,
        evidence: misses.slice(0, 3).map(
          (r) => `"${String(r.external_title).slice(0, 40)}" 노출 ${r.impressions}회, 클릭 0`
        ),
      });
    }
  }

  // 귀속 공백 — 이 시스템이 존재하는 이유를 숫자로 보여주는 지표
  const { data: inq } = await db.from("inquiries").select("attribution");
  if (inq?.length) {
    const unknown = inq.filter((i) => i.attribution === "unknown").length;
    insights.push({
      kind: "attribution_gap",
      headline: `문의 ${inq.length}건 중 ${unknown}건은 어떤 콘텐츠에서 왔는지 알 수 없습니다`,
      evidence: [
        `확정 ${inq.filter((i) => i.attribution === "confirmed").length}건 · 추정 ${inq.filter((i) => i.attribution === "inferred").length}건 · 불명 ${unknown}건`,
        `앞으로 발행하는 콘텐츠는 추적 링크로 귀속됩니다`,
      ],
    });
  }

  // 검색 수요: 노출은 높은데 순위가 낮은 검색어 = 아직 못 잡은 트래픽
  const { data: q } = await db
    .from("search_queries")
    .select("query, impressions, clicks, position")
    .order("impressions", { ascending: false })
    .limit(200);
  const demand = (q ?? [])
    .filter((r) => (r.impressions ?? 0) >= 20 && Number(r.position ?? 0) > 8)
    .slice(0, 5);
  if (demand.length) {
    insights.push({
      kind: "query_demand",
      headline: `노출은 있으나 순위가 낮아 놓치고 있는 검색어 ${demand.length}건`,
      evidence: demand.map(
        (r) => `"${r.query}" 노출 ${r.impressions}회, 평균순위 ${round(Number(r.position), 1)}위`
      ),
    });
  }

  return insights;
}

/**
 * 주제 추천.
 * 코드프레소의 AEO/GEO 문서가 정한 방향("문의로 이어진 주제에 집중")을 그대로 따른다.
 * 우리가 방향을 새로 정하는 게 아니라, 회사가 이미 정한 방향을 데이터로 실행한다.
 */
export async function suggestTopics(limit = 3): Promise<TopicSuggestion[]> {
  const db = supabaseAdmin();
  const out: TopicSuggestion[] = [];

  // 1) 실제 문의가 붙은 주제 — 가장 강한 신호
  const { data: inq } = await db
    .from("inquiries")
    .select("interest, legacy_content_title, attribution")
    .neq("attribution", "unknown");
  // 원본 스프레드시트는 빈 값을 "-"로 채웠다. 그대로 쓰면 "- 도입 검토..." 같은
  // 말이 안 되는 주제가 생성된다. 실제 값만 남긴다.
  const interests = [
    ...new Set(
      (inq ?? [])
        .map((i) => (i.interest ?? "").trim())
        .filter((v) => v && v !== "-" && v.length > 1)
    ),
  ];
  if (interests.length) {
    out.push({
      topic: `${interests[0]}, 도입 검토 단계에서 실무자가 가장 많이 막히는 지점`,
      rationale: `문의로 이어진 것이 확인된 주제입니다. 관심 서비스 "${interests[0]}"로 실제 문의가 발생했습니다.`,
      evidence: { source: "inquiries", interests, matched: (inq ?? []).length },
      channel: "blog",
    });
  }

  // 2) 검색 수요는 있는데 순위가 낮은 검색어 — 만들면 바로 잡히는 트래픽
  const { data: q } = await db
    .from("search_queries")
    .select("query, impressions, position")
    .gte("impressions", 20)
    .gt("position", 8)
    .order("impressions", { ascending: false })
    .limit(3);
  for (const r of q ?? []) {
    out.push({
      topic: `"${r.query}"를 찾는 실무자를 위한 실행 가이드`,
      rationale: `검색 노출 ${r.impressions}회가 있으나 평균순위 ${round(Number(r.position), 1)}위로 클릭을 놓치고 있습니다.`,
      evidence: { source: "search_queries", query: r.query, impressions: r.impressions, position: r.position },
      channel: "blog",
    });
  }

  // 3) 링크드인에서 반응이 좋았던 형식을 블로그로 확장
  const { data: li } = await db
    .from("performance_metrics")
    .select("external_title, ctr, engagement_rate")
    .eq("channel", "linkedin")
    .order("engagement_rate", { ascending: false })
    .limit(1);
  if (li?.[0]) {
    out.push({
      topic: `링크드인에서 반응이 컸던 주제를 블로그 심층 글로 확장`,
      rationale: `"${String(li[0].external_title).slice(0, 40)}"의 참여율 ${round(Number(li[0].engagement_rate))}%는 채널 최상위입니다. 짧은 포스트로 검증된 관심을 긴 글로 옮깁니다.`,
      evidence: { source: "linkedin", title: li[0].external_title, engagement_rate: li[0].engagement_rate },
      channel: "blog",
    });
  }

  return out.slice(0, limit);
}

/** 추천을 DB에 남긴다. 루프 4는 이 id가 콘텐츠·성과까지 이어져야 닫힌다. */
export async function persistSuggestions(suggestions: TopicSuggestion[]) {
  const db = supabaseAdmin();
  const { data } = await db
    .from("topic_suggestions")
    .insert(
      suggestions.map((s) => ({
        topic: s.topic,
        rationale: s.rationale,
        evidence: s.evidence,
        channel: s.channel,
        status: "proposed",
      }))
    )
    .select();
  return data ?? [];
}
