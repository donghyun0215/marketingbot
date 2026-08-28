export function Metric({
  label,
  value,
  unit,
  delta,
  note,
  tone = "default",
}: {
  label: string;
  value: string | number;
  unit?: string;
  delta?: string;
  note?: string;
  tone?: "default" | "risk" | "ok";
}) {
  const color =
    tone === "risk" ? "text-[var(--risk)]" : tone === "ok" ? "text-[var(--ok)]" : "text-[var(--ink)]";
  return (
    <div className="rounded-lg border border-[var(--line)] bg-[var(--surface)] px-4 py-3">
      <div className="text-[12px] text-[var(--muted)]">{label}</div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className={`tnum text-[26px] font-semibold leading-none ${color}`}>{value}</span>
        {unit && <span className="text-[13px] text-[var(--muted)]">{unit}</span>}
        {delta && <span className="ml-1 text-[12px] text-[var(--muted)]">{delta}</span>}
      </div>
      {note && <div className="mt-1.5 text-[11.5px] leading-snug text-[var(--muted)]">{note}</div>}
    </div>
  );
}

export function Panel({
  title,
  aside,
  children,
}: {
  title: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-[var(--line)] bg-[var(--surface)]">
      <div className="flex items-center justify-between border-b border-[var(--line)] px-4 py-2.5">
        <h2 className="text-[13px] font-semibold">{title}</h2>
        {aside}
      </div>
      <div className="px-4 py-3">{children}</div>
    </section>
  );
}

/** 귀속 현황을 한 눈에 — 이 시스템이 존재하는 이유를 보여주는 그림 */
export function AttributionBar({
  confirmed,
  inferred,
  unknown,
}: {
  confirmed: number;
  inferred: number;
  unknown: number;
}) {
  const total = Math.max(confirmed + inferred + unknown, 1);
  const seg = [
    { n: confirmed, color: "var(--ok)", label: "확정" },
    { n: inferred, color: "var(--warn)", label: "추정" },
    { n: unknown, color: "var(--risk)", label: "불명" },
  ];
  return (
    <div>
      <div className="flex h-2.5 overflow-hidden rounded-full">
        {seg.map((s) => (
          <div key={s.label} style={{ width: `${(s.n / total) * 100}%`, background: s.color }} />
        ))}
      </div>
      <div className="mt-2 flex gap-4 text-[12px] text-[var(--muted)]">
        {seg.map((s) => (
          <span key={s.label} className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: s.color }} />
            {s.label} <span className="tnum text-[var(--ink)]">{s.n}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
