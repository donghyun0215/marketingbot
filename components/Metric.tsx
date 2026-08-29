/**
 * 화면 부품.
 *
 * 원칙: 장식은 넣지 않고 구조가 내용을 설명하게 한다.
 * 파이프라인 레일의 칸 순서는 실제 상태 전이 순서와 같고,
 * 사람이 개입하는 두 칸에만 표시가 붙는다.
 */

export function Metric({
  label, value, unit, note, tone = "default", delay = 0,
}: {
  label: string; value: string | number; unit?: string; note?: string;
  tone?: "default" | "danger" | "ok" | "accent"; delay?: number;
}) {
  const color =
    tone === "danger" ? "text-[var(--danger)]"
    : tone === "ok" ? "text-[var(--ok)]"
    : tone === "accent" ? "text-[var(--accent)]"
    : "text-[var(--ink)]";
  return (
    <div className="rise rounded-[var(--r)] border border-[var(--line)] bg-[var(--surface)] px-4 py-3.5 shadow-[var(--shadow-1)]"
         style={{ animationDelay: `${delay}ms` }}>
      <div className="text-[12px] font-medium text-[var(--muted)]">{label}</div>
      <div className="mt-1.5 flex items-baseline gap-1">
        <span className={`tnum text-[27px] font-semibold leading-none ${color}`}>{value}</span>
        {unit && <span className="text-[13px] text-[var(--muted)]">{unit}</span>}
      </div>
      {note && <div className="mt-2 text-[11.5px] leading-snug text-[var(--muted)]">{note}</div>}
    </div>
  );
}

export function Panel({
  title, aside, children, delay = 0,
}: { title: string; aside?: React.ReactNode; children: React.ReactNode; delay?: number }) {
  return (
    <section className="rise overflow-hidden rounded-[var(--r)] border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow-1)]"
             style={{ animationDelay: `${delay}ms` }}>
      <header className="flex items-center justify-between border-b border-[var(--line-2)] px-4 py-3">
        <h2 className="text-[13px] font-semibold tracking-[-0.01em]">{title}</h2>
        {aside}
      </header>
      <div className="px-4 py-3.5">{children}</div>
    </section>
  );
}

/**
 * 시그니처 — 파이프라인 레일.
 * 콘텐츠가 지금 어느 상태에 몇 건 있는지를 실제 전이 순서대로 보여준다.
 * 점이 찍힌 칸이 사람이 판단하는 지점이고, 나머지는 손이 가지 않는 구간이다.
 */
export function PipelineRail({
  stages,
}: { stages: { key: string; label: string; count: number; human?: boolean }[] }) {
  return (
    <div className="rise overflow-x-auto rounded-[var(--r)] border border-[var(--line)] bg-[var(--surface)] p-1.5 shadow-[var(--shadow-1)]">
      <ol className="flex min-w-[640px] items-stretch">
        {stages.map((s, i) => (
          <li key={s.key} className="flex flex-1 items-center">
            <div className="flex-1 rounded-lg px-3 py-2.5 transition-colors hover:bg-[var(--surface-2)]">
              <div className="flex items-center gap-1.5">
                {s.human && (
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--accent)]"
                        title="사람이 판단하는 지점" />
                )}
                <span className="text-[11.5px] text-[var(--muted)]">{s.label}</span>
              </div>
              <div className={`tnum mt-1 text-[19px] font-semibold leading-none ${s.count > 0 ? "text-[var(--ink)]" : "text-[#c3cad6]"}`}>
                {s.count}
              </div>
            </div>
            {i < stages.length - 1 && (
              <svg width="7" height="10" viewBox="0 0 7 10" className="shrink-0 text-[#cfd6e2]" aria-hidden>
                <path d="M1 1l4 4-4 4" stroke="currentColor" strokeWidth="1.4" fill="none" />
              </svg>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

/** 문의가 어디서 왔는지. 빨간 구간이 이 시스템이 존재하는 이유다. */
export function AttributionBar({
  confirmed, inferred, unknown,
}: { confirmed: number; inferred: number; unknown: number }) {
  const total = Math.max(confirmed + inferred + unknown, 1);
  const seg = [
    { n: confirmed, color: "var(--ok)", label: "확정" },
    { n: inferred, color: "var(--amber)", label: "추정" },
    { n: unknown, color: "var(--danger)", label: "불명" },
  ];
  return (
    <div>
      <div className="flex h-2 gap-0.5 overflow-hidden rounded-full">
        {seg.map((s) => (
          <div key={s.label} style={{ width: `${(s.n / total) * 100}%`, background: s.color }}
               className="first:rounded-l-full last:rounded-r-full" />
        ))}
      </div>
      <div className="mt-2.5 flex gap-4 text-[12px] text-[var(--muted)]">
        {seg.map((s) => (
          <span key={s.label} className="flex items-center gap-1.5">
            <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: s.color }} />
            {s.label} <span className="tnum font-medium text-[var(--ink)]">{s.n}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/** 축별 비교. 숫자만 있으면 비교가 어렵고, 막대만 있으면 정확도가 없다. */
export function ScoreBar({ label, a, b }: { label: string; a: number; b: number }) {
  return (
    <div className="grid grid-cols-[96px_1fr_1fr] items-center gap-3 border-t border-[var(--line-2)] py-2 first:border-0">
      <span className="text-[12.5px] text-[var(--muted)]">{label}</span>
      <div className="flex items-center gap-2">
        <div className="h-1.5 flex-1 rounded-full bg-[var(--line-2)]">
          <div className="h-1.5 rounded-full bg-[#b9c2d0]" style={{ width: `${a}%` }} />
        </div>
        <span className="tnum w-7 text-right text-[12px] text-[var(--muted)]">{a}</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="h-1.5 flex-1 rounded-full bg-[var(--line-2)]">
          <div className="h-1.5 rounded-full" style={{ width: `${b}%`, background: b >= a ? "var(--accent)" : "#b9c2d0" }} />
        </div>
        <span className={`tnum w-7 text-right text-[12px] ${b >= a ? "font-semibold text-[var(--ink)]" : "text-[var(--muted)]"}`}>{b}</span>
      </div>
    </div>
  );
}
