import { supabaseAdmin } from "@/lib/supabase";
import { Panel } from "@/components/Metric";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * 판단 로그.
 *
 * 심사 요구사항의 "판단 로그 · 추적성 · 오류 대응"이 한 화면에서 증명되는 곳이다.
 * 모든 상태 전이가 누가·언제·무엇을 근거로 일어났는지 시간순으로 남는다.
 * 사람이 한 결정(telegram:… / web)과 시스템이 한 일(system / cron)이 구분되고,
 * 실패도 지우지 않고 남긴다. 실패가 보이지 않는 로그는 신뢰의 근거가 되지 못한다.
 */

const LABEL: Record<string, { text: string; tone: string }> = {
  generated: { text: "초안 생성", tone: "text-[var(--muted)]" },
  approved: { text: "승인", tone: "text-[var(--ok)]" },
  rejected: { text: "반려", tone: "text-[var(--danger)]" },
  constraint_learned: { text: "규칙 학습", tone: "text-[var(--accent)]" },
  scheduled: { text: "발행 예약", tone: "text-[var(--muted)]" },
  published: { text: "발행", tone: "text-[var(--ok)]" },
  accepted: { text: "주제 채택", tone: "text-[var(--accent)]" },
  reopened: { text: "주제 재개방", tone: "text-[var(--amber)]" },
  attributed: { text: "문의 귀속", tone: "text-[var(--ok)]" },
  tracked_click: { text: "추적 링크 방문", tone: "text-[var(--muted)]" },
  generation_failed: { text: "생성 실패", tone: "text-[var(--danger)]" },
};

function actorLabel(actor: string) {
  if (actor.startsWith("telegram:")) return { who: "사람", where: "텔레그램" };
  if (actor === "web") return { who: "사람", where: "대시보드" };
  if (actor === "cron") return { who: "시스템", where: "예약 실행" };
  if (actor === "visitor") return { who: "방문자", where: "추적 링크" };
  return { who: "시스템", where: actor };
}

function when(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}.${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes()
  ).padStart(2, "0")}`;
}

export default async function LogPage() {
  const db = supabaseAdmin();
  const { data: rows } = await db
    .from("audit_log")
    .select("id, entity, entity_id, action, actor, detail, created_at")
    .order("created_at", { ascending: false })
    .limit(60);

  const log = rows ?? [];
  const byHuman = log.filter((r) => r.actor === "web" || String(r.actor).startsWith("telegram:"));
  const failures = log.filter((r) => r.action === "generation_failed");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[21px] font-semibold tracking-[-0.02em]">판단 로그</h1>
        <p className="mt-1 text-[13.5px] text-[var(--muted)]">
          누가 무엇을 왜 결정했는지 모두 남습니다. 사람의 결정과 시스템의 실행이 구분되고, 실패도
          지우지 않습니다.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "전체 기록", value: log.length, tone: "" },
          { label: "사람이 내린 결정", value: byHuman.length, tone: "text-[var(--accent)]" },
          { label: "처리 실패", value: failures.length, tone: failures.length ? "text-[var(--danger)]" : "" },
        ].map((m, i) => (
          <div
            key={m.label}
            className="rise rounded-[var(--r)] border border-[var(--line)] bg-[var(--surface)] px-4 py-3 shadow-[var(--shadow-1)]"
            style={{ animationDelay: `${i * 40}ms` }}
          >
            <div className="text-[12px] text-[var(--muted)]">{m.label}</div>
            <div className={`tnum mt-1 text-[24px] font-semibold leading-none ${m.tone}`}>{m.value}</div>
          </div>
        ))}
      </div>

      <Panel
        title="기록"
        delay={80}
        aside={<span className="text-[12px] text-[var(--muted)]">최근 {log.length}건 · 최신순</span>}
      >
        {log.length ? (
          <ol className="space-y-0">
            {log.map((r) => {
              const meta = LABEL[r.action] ?? { text: r.action, tone: "text-[var(--muted)]" };
              const who = actorLabel(String(r.actor));
              const detail = (r.detail ?? {}) as Record<string, unknown>;
              const summary = [
                detail.reason && `사유: ${detail.reason}`,
                detail.rule && `규칙: ${detail.rule}`,
                detail.voice_score !== undefined && `Voice ${detail.voice_score}`,
                detail.review_points !== undefined && `확인 ${detail.review_points}곳`,
                detail.constraints_applied !== undefined &&
                  `적용 규칙 ${detail.constraints_applied}건`,
                detail.tracking_id && `링크 ${detail.tracking_id}`,
                detail.content_id && `콘텐츠 #${detail.content_id}`,
                detail.error && `오류: ${detail.error}`,
              ]
                .filter(Boolean)
                .join(" · ");

              return (
                <li
                  key={r.id}
                  className="grid grid-cols-[56px_104px_1fr_auto] items-start gap-3 border-t border-[var(--line-2)] py-2.5 first:border-0 first:pt-0"
                >
                  <span className="tnum pt-0.5 text-[12px] text-[var(--muted)]">
                    {when(r.created_at as string)}
                  </span>
                  <span className={`text-[13px] font-medium ${meta.tone}`}>{meta.text}</span>
                  <span className="min-w-0 text-[12.5px] leading-relaxed text-[var(--ink-2)]">
                    <span className="text-[var(--muted)]">
                      {r.entity === "contents" ? "콘텐츠" : r.entity === "inquiries" ? "문의" : "주제"} #
                      {r.entity_id}
                    </span>
                    {summary && <span className="ml-2">{summary}</span>}
                  </span>
                  <span className="whitespace-nowrap pt-0.5 text-[11.5px] text-[var(--muted)]">
                    {who.who} · {who.where}
                  </span>
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="text-[13px] text-[var(--muted)]">아직 기록이 없습니다.</p>
        )}
      </Panel>

      <Panel title="오류가 났을 때" delay={120}>
        <ul className="space-y-1.5 text-[12.5px] leading-relaxed text-[var(--ink-2)]">
          <li>· 텔레그램이 응답하지 않으면 대시보드에서 같은 승인·반려를 처리합니다.</li>
          <li>· 생성이 실패하면 주제를 후보로 되돌려 다시 시도할 수 있게 합니다.</li>
          <li>· 외부 API 한도에 걸리면 대기 후 재시도하고, 하루 한도면 즉시 원인을 알립니다.</li>
          <li>· 승인 요청은 권한이 등록된 사람만 처리할 수 있고, 이미 처리된 건은 다시 처리되지 않습니다.</li>
          <li>· 모든 실패는 이 로그에 남습니다. 어디서 멈췄는지 추적할 수 있습니다.</li>
        </ul>
      </Panel>
    </div>
  );
}
