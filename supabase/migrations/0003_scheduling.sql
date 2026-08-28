-- 0003: 예약 발행
-- 승인과 발행은 다른 결정이다. "내용이 괜찮다"와 "지금 내보낸다"를 분리하고,
-- 마케팅 캘린더에 맞춰 시점을 지정할 수 있게 한다.
-- 브리프의 "발행 타이밍을 놓치는 일이 한 달에 몇 번씩"은 승인 지연만의 문제가 아니라
-- 승인이 끝나도 사람이 직접 올려야 했기 때문이기도 하다.

alter table contents
  add column if not exists scheduled_for timestamptz;

-- state에 'scheduled'가 추가된다:
-- draft → fact_check → pending_approval → approved → scheduled → published | rejected
create index if not exists contents_scheduled_idx
  on contents (scheduled_for)
  where state = 'scheduled';
