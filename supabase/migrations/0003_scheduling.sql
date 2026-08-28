-- 0003: 예약 발행 + 시점 유형
--
-- 승인과 발행은 다른 결정이다. "내용이 괜찮다"와 "언제 내보낸다"를 분리한다.
-- 브리프의 "발행 타이밍을 놓치는 일이 한 달에 몇 번씩"은 승인 지연만의 문제가 아니라,
-- 승인이 끝나도 사람이 직접 각 채널에 올려야 했기 때문이기도 하다.
--
-- 별도의 '캘린더' 테이블을 만들지 않는 이유: 캘린더는 독립된 개체가 아니라
-- contents를 시간순으로 본 뷰다. 따로 두면 상태가 두 곳에 생기고 동기화 로직이
-- 필요해지며, 유지보수 비용은 대부분 거기서 발생한다.

alter table contents
  add column if not exists scheduled_for timestamptz,
  -- default: 기본 주기의 다음 빈 슬롯 / event: 행사일 기준 상대 배치 / immediate: 즉시
  add column if not exists timing_type text not null default 'default',
  -- 행사·명절 기준일. timing_type='event'일 때만 사용한다.
  add column if not exists anchor_date date;

-- state에 'scheduled'가 추가된다:
-- draft → fact_check → pending_approval → approved → scheduled → published | rejected
create index if not exists contents_scheduled_idx
  on contents (scheduled_for)
  where state = 'scheduled';
