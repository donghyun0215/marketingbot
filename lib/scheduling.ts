/**
 * 발행 시점 계산.
 *
 * 주장하는 것과 주장하지 않는 것을 구분한다.
 *   주장하지 않음: "데이터가 알려주는 최적 발행 시각"
 *     — 링크드인 55건에서 참여율 상위는 수상·협약 소식이다. 시각이 아니라 내용이
 *       만든 결과이므로, 이 표본으로 시간대 결론을 내면 근거 없는 주장이 된다.
 *   주장함: "아무도 챙기지 않아도 콘텐츠가 멈춰 있지 않는다"
 *     — 브리프의 병목은 최적화가 아니라 방치다.
 */

export type TimingType = "default" | "event" | "immediate";

/** 기본 주기. 결론이 아니라 기본값이며, 사람이 언제든 바꾼다. */
const DEFAULT_SLOTS = [
  { weekday: 2, hour: 10 }, // 화
  { weekday: 4, hour: 10 }, // 목
];

/**
 * 행사·명절 기준 상대 배치.
 * 실무 경험에 근거한 값이다 (B2B 기업 행사는 한 달 전부터, 명절은 2~3영업일 전).
 */
export const EVENT_OFFSETS = [
  { days: -30, label: "사전 안내", channel: "blog" },
  { days: -14, label: "초청·모집", channel: "linkedin" },
  { days: -7, label: "리마인드", channel: "linkedin" },
  { days: -1, label: "임박 공지", channel: "linkedin" },
  { days: 0, label: "당일 현장", channel: "linkedin" },
] as const;

/** 명절 콘텐츠는 2~3 영업일 전. 주말을 건너뛰고 역산한다. */
export function holidayLeadTime(holiday: Date, businessDays = 3): Date {
  const d = new Date(holiday);
  let left = businessDays;
  while (left > 0) {
    d.setDate(d.getDate() - 1);
    const wd = d.getDay();
    if (wd !== 0 && wd !== 6) left--;
  }
  d.setHours(10, 0, 0, 0);
  return d;
}

/** 기본 주기에서 아직 비어 있는 다음 슬롯. 같은 날 중복 배치를 피한다. */
export function nextDefaultSlot(from: Date, taken: Date[] = []): Date {
  const takenDays = new Set(taken.map((t) => new Date(t).toDateString()));
  const cursor = new Date(from);
  for (let i = 1; i <= 21; i++) {
    cursor.setTime(from.getTime());
    cursor.setDate(from.getDate() + i);
    const slot = DEFAULT_SLOTS.find((s) => s.weekday === cursor.getDay());
    if (!slot) continue;
    cursor.setHours(slot.hour, 0, 0, 0);
    if (cursor <= from) continue;
    if (takenDays.has(cursor.toDateString())) continue; // 이미 배치된 날은 건너뛴다
    return new Date(cursor);
  }
  const fallback = new Date(from);
  fallback.setDate(from.getDate() + 1);
  fallback.setHours(10, 0, 0, 0);
  return fallback;
}

/** 행사일 하나로 전체 배포 일정을 만든다. 사람이 입력하는 것은 날짜 하나뿐이다. */
export function eventPlan(anchor: Date): { at: Date; label: string; channel: string }[] {
  return EVENT_OFFSETS.map((o) => {
    const at = new Date(anchor);
    at.setDate(anchor.getDate() + o.days);
    at.setHours(10, 0, 0, 0);
    return { at, label: o.label, channel: o.channel };
  }).filter((p) => p.at > new Date(Date.now() - 86400000)); // 이미 지난 시점은 제외
}

/** 화면에 보여줄 문구. 시스템이 제안하고 사람이 확정한다. */
export function describeSlot(d: Date): string {
  const wd = ["일", "월", "화", "수", "목", "금", "토"][d.getDay()];
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${wd}) ${d.getHours()}시`;
}
