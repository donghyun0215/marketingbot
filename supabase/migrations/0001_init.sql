-- marketingbot — initial schema
-- Bolt 1 / Unit 1. Run once in Supabase SQL Editor.

-- ① 보이스 코퍼스: Voice Engine 학습 소스
create table if not exists voice_corpus (
  id            bigserial primary key,
  title         text not null,
  body          text not null,
  channel       text not null default 'blog',        -- blog | linkedin
  source        text not null default 'scraped',     -- scraped | approved  (Loop 3)
  published_at  date,
  created_at    timestamptz not null default now()
);

-- ② 학습된 제약: 반려 사유가 다음 생성 규칙이 된다 (Loop 2)
create table if not exists learned_constraints (
  id            bigserial primary key,
  rule          text not null,                       -- 생성 프롬프트에 주입되는 문장
  origin        text not null default 'rejection',   -- rejection | manual
  source_content_id bigint,
  active        boolean not null default true,
  created_at    timestamptz not null default now()
);

-- ③ 주제 추천 (Layer 6). outcome으로 적중률 추적 (Loop 4)
create table if not exists topic_suggestions (
  id            bigserial primary key,
  topic         text not null,
  rationale     text,                                -- 왜 이 주제인가 (근거 데이터)
  evidence      jsonb,                               -- 근거가 된 지표 스냅샷
  channel       text not null default 'blog',
  status        text not null default 'proposed',    -- proposed | accepted | rejected
  decided_by    text,
  decided_at    timestamptz,
  created_at    timestamptz not null default now()
);

-- ④ 콘텐츠 본체 + 상태머신
create table if not exists contents (
  id            bigserial primary key,
  suggestion_id bigint references topic_suggestions(id),   -- Loop 4 체인
  title         text not null,
  body          text,
  channel       text not null default 'blog',
  state         text not null default 'draft',
    -- draft → fact_check → pending_approval → approved → published | rejected
  voice_score   numeric(5,2),
  voice_breakdown jsonb,                                    -- 4축 점수 근거
  fact_flags    jsonb,                                      -- Fact-Guard 결과
  baseline_body text,                                       -- 동일 입력 일반 LLM 결과
  baseline_voice_score numeric(5,2),
  tracking_id   text unique,                                -- Loop 1: 발행 추적 링크 키
  rejection_reason text,
  published_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists contents_state_idx on contents(state);

-- ⑤ 채널 성과 (코드프레소 실데이터 임포트)
create table if not exists performance_metrics (
  id            bigserial primary key,
  content_id    bigint references contents(id),
  channel       text not null,                       -- blog | linkedin
  external_title text,
  published_at  date,
  impressions   integer default 0,
  clicks        integer default 0,
  ctr           numeric(6,2),
  avg_position  numeric(6,2),                        -- 블로그(GSC)만
  unique_impressions integer,                        -- 링크드인만
  likes         integer,
  comments      integer,
  shares        integer,
  engagement_rate numeric(6,2),
  measured_from date,
  measured_to   date,
  created_at    timestamptz not null default now()
);

-- ⑥ 유입 검색어 (블로그 페이지 x 검색어)
create table if not exists search_queries (
  id            bigserial primary key,
  external_title text,
  query         text not null,
  clicks        integer default 0,
  impressions   integer default 0,
  ctr           numeric(6,2),
  position      numeric(6,2)
);

-- ⑦ 인바운드 문의 — Loop 1의 종착점. 고객사명은 익명화하여 저장
create table if not exists inquiries (
  id            bigserial primary key,
  inquired_on   date not null,
  company_alias text not null,                       -- 예: '제조 대기업 A' (실명 저장 금지)
  industry_hint text,
  inquiry_type  text,
  interest      text,
  source_channel text,
  content_id    bigint references contents(id),      -- 정확 귀속 (신규 발행분)
  attribution   text not null default 'unknown',     -- confirmed | inferred | unknown
  legacy_content_title text,                         -- 과거 데이터의 추정 콘텐츠
  note          text
);

-- ⑧ 감사 로그: 모든 상태 전이와 판단 기록 (추적성)
create table if not exists audit_log (
  id            bigserial primary key,
  entity        text not null,                       -- contents | topic_suggestions ...
  entity_id     bigint,
  action        text not null,                       -- generated | fact_checked | approved | rejected | published
  actor         text not null default 'system',      -- system | telegram:<user> | web:<user>
  detail        jsonb,
  created_at    timestamptz not null default now()
);
create index if not exists audit_log_entity_idx on audit_log(entity, entity_id);
