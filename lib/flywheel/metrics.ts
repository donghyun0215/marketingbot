/**
 * 루프가 실제로 닫혔는지를 숫자로 보여주는 지표.
 *
 * 저장하지 않고 매번 체인을 따라가 계산한다. 별도 집계 컬럼을 두면 그 값이
 * 언제 갱신됐는지 믿을 수 없게 되고, 추적성이라는 목적 자체가 흔들린다.
 *
 * 루프 1: contents.tracking_id → inquiries.content_id
 * 루프 4: topic_suggestions.id → contents.suggestion_id → 성과·문의
 */

import { supabaseAdmin } from "../supabase";

export type LoopMetrics = {
  attribution: {
    legacyTotal: number;
    legacyAttributed: number;
    systemTotal: number;
    systemAttributed: number;
    /** 이 시스템으로 발행한 콘텐츠에서 온 문의의 귀속률 */
    systemRate: number | null;
    legacyRate: number;
  };
  suggestions: {
    proposed: number;
    accepted: number;
    published: number;
    ledToInquiry: number;
    /** 채택된 추천 중 실제 발행까지 간 비율 */
    publishRate: number | null;
    /** 발행된 추천 중 문의로 이어진 비율 */
    hitRate: number | null;
  };
};

export async function loopMetrics(): Promise<LoopMetrics> {
  const db = supabaseAdmin();

  const [{ data: inq }, { data: contents }, { data: sugg }] = await Promise.all([
    db.from("inquiries").select("id, content_id, attribution"),
    db.from("contents").select("id, state, suggestion_id, tracking_id"),
    db.from("topic_suggestions").select("id, status"),
  ]);

  const inquiries = inq ?? [];
  const cs = contents ?? [];
  const ss = sugg ?? [];

  // 과거 데이터: 추적 수단 없이 들어온 문의
  const legacy = inquiries.filter((i) => !i.content_id);
  const legacyAttributed = legacy.filter((i) => i.attribution === "confirmed" || i.attribution === "inferred").length;

  // 이 시스템으로 발행한 콘텐츠에 귀속된 문의
  const system = inquiries.filter((i) => !!i.content_id);

  const published = cs.filter((c) => c.state === "published");
  const publishedFromSuggestion = published.filter((c) => !!c.suggestion_id);
  const suggestionIdsWithInquiry = new Set(
    system
      .map((i) => cs.find((c) => c.id === i.content_id)?.suggestion_id)
      .filter(Boolean) as number[]
  );

  const accepted = ss.filter((s) => s.status === "accepted").length;

  return {
    attribution: {
      legacyTotal: legacy.length,
      legacyAttributed,
      systemTotal: system.length,
      systemAttributed: system.length, // 추적 링크로 들어왔으므로 정의상 전부 귀속된다
      systemRate: system.length ? 100 : null,
      legacyRate: legacy.length ? Math.round((legacyAttributed / legacy.length) * 100) : 0,
    },
    suggestions: {
      proposed: ss.filter((s) => s.status === "proposed").length,
      accepted,
      published: publishedFromSuggestion.length,
      ledToInquiry: suggestionIdsWithInquiry.size,
      publishRate: accepted ? Math.round((publishedFromSuggestion.length / accepted) * 100) : null,
      hitRate: publishedFromSuggestion.length
        ? Math.round((suggestionIdsWithInquiry.size / publishedFromSuggestion.length) * 100)
        : null,
    },
  };
}
