/**
 * 승인 상태 전이 + 판단 기록.
 *
 * 심사 제출물이 요구하는 "신뢰 요소"가 여기에 모여 있다.
 *   - 승인 게이트: 상태는 사람의 결정 없이 published로 갈 수 없다
 *   - 판단 로그: 누가, 언제, 왜 그렇게 결정했는지 audit_log에 남는다
 *   - 추적성: content → suggestion → 성과까지 id로 연결된다
 *
 * 그리고 루프 2가 여기서 닫힌다. 반려 사유는 기록으로 끝나지 않고
 * learned_constraints가 되어 다음 생성 프롬프트에 들어간다.
 * (저지먼트 트랙 브리프의 "왜 아닌지 안 적혀 있어서 같은 유형을 또 올리게 된다"를
 *  오토메이션 쪽에서 반복하지 않기 위한 장치)
 */

import { supabaseAdmin } from "./supabase";

export type ContentState =
  | "draft"
  | "fact_check"
  | "pending_approval"
  | "approved"
  | "published"
  | "rejected";

export async function logDecision(
  entity: string,
  entityId: number,
  action: string,
  actor: string,
  detail: Record<string, unknown> = {}
) {
  await supabaseAdmin().from("audit_log").insert({ entity, entity_id: entityId, action, actor, detail });
}

export async function approve(contentId: number, actor: string) {
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("contents")
    .update({ state: "approved", updated_at: new Date().toISOString() })
    .eq("id", contentId)
    .eq("state", "pending_approval") // 이미 처리된 건을 두 번 승인하지 않는다
    .select()
    .single();
  if (error || !data) throw new Error(`승인 실패: 이미 처리되었거나 대기 상태가 아닙니다 (#${contentId})`);
  await logDecision("contents", contentId, "approved", actor, { voice_score: data.voice_score });
  return data;
}

/**
 * 반려. 사유는 필수다.
 * 사유 없는 반려를 허용하면 같은 실수가 반복되고, 그것이 브리프가 지적한 실패다.
 */
export async function reject(contentId: number, actor: string, reason: string) {
  if (!reason?.trim()) throw new Error("반려 사유가 필요합니다");
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("contents")
    .update({ state: "rejected", rejection_reason: reason, updated_at: new Date().toISOString() })
    .eq("id", contentId)
    .eq("state", "pending_approval")
    .select()
    .single();
  if (error || !data) throw new Error(`반려 실패: 이미 처리되었거나 대기 상태가 아닙니다 (#${contentId})`);

  await logDecision("contents", contentId, "rejected", actor, { reason });
  await learnFromRejection(contentId, reason);
  return data;
}

/**
 * 루프 2 — 반려 사유를 다음 생성의 제약으로 승격한다.
 * 사유 문장을 그대로 규칙으로 쓴다. 요약하거나 해석하면 사람이 뭘 지시했는지
 * 추적할 수 없게 되고, 그러면 판단 로그로서의 가치가 사라진다.
 */
export async function learnFromRejection(contentId: number, reason: string) {
  const db = supabaseAdmin();
  const rule = reason.trim();

  // 같은 규칙이 쌓이지 않게 한다
  const { data: existing } = await db
    .from("learned_constraints")
    .select("id")
    .eq("rule", rule)
    .eq("active", true)
    .maybeSingle();
  if (existing) return;

  await db.from("learned_constraints").insert({
    rule,
    origin: "rejection",
    source_content_id: contentId,
    active: true,
  });
  await logDecision("learned_constraints", contentId, "constraint_learned", "system", { rule });
}

/** 생성 시 프롬프트에 주입할 활성 규칙. 화면에도 "시스템이 배운 규칙"으로 노출한다. */
export async function activeConstraints(limit = 20): Promise<string[]> {
  const { data } = await supabaseAdmin()
    .from("learned_constraints")
    .select("rule")
    .eq("active", true)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []).map((r) => r.rule as string);
}

/** 발행. 루프 1(추적 링크)과 루프 3(코퍼스 편입)이 여기서 함께 닫힌다. */
export async function publish(contentId: number, actor: string) {
  const db = supabaseAdmin();
  const trackingId = `c${contentId}-${Math.random().toString(36).slice(2, 8)}`;

  const { data, error } = await db
    .from("contents")
    .update({
      state: "published",
      tracking_id: trackingId, // 루프 1: 이 링크로 들어온 문의는 이 글에 귀속된다
      published_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", contentId)
    .eq("state", "approved")
    .select()
    .single();
  if (error || !data) throw new Error(`발행 실패: 승인된 상태가 아닙니다 (#${contentId})`);

  // 루프 3: 사람이 승인한 글은 최고 품질의 학습 데이터다. 코퍼스로 돌려보낸다.
  await db.from("voice_corpus").insert({
    title: data.title,
    body: data.body,
    channel: data.channel,
    source: "approved",
    published_at: new Date().toISOString().slice(0, 10),
  });

  await logDecision("contents", contentId, "published", actor, { tracking_id: trackingId });
  return data;
}
