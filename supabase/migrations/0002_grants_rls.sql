-- 0002: API 권한 + RLS
-- 증상: PostgREST가 403 (42501 permission denied) — SQL Editor로 만든 테이블에
-- service_role 권한이 붙지 않아 발생. 아래로 해결하고, 동시에 RLS를 켜서
-- 공개 anon 키로는 아무것도 읽히지 않게 잠근다.

grant usage on schema public to service_role, anon, authenticated;

grant all privileges on all tables    in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;

-- 앞으로 만들 테이블에도 자동 적용
alter default privileges in schema public
  grant all privileges on tables to service_role;
alter default privileges in schema public
  grant all privileges on sequences to service_role;

-- RLS 활성화: 정책을 만들지 않았으므로 anon/authenticated는 접근 불가.
-- service_role은 RLS를 우회하므로 서버 사이드 코드만 데이터를 다룰 수 있다.
alter table voice_corpus        enable row level security;
alter table learned_constraints enable row level security;
alter table topic_suggestions   enable row level security;
alter table contents            enable row level security;
alter table performance_metrics enable row level security;
alter table search_queries      enable row level security;
alter table inquiries           enable row level security;
alter table audit_log           enable row level security;
