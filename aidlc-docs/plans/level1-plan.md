# Level 1 Plan v2 — marketingbot
상태: **승인됨 (2026-08-29) — Construction Phase 진행 중**
v2 변경: Red Team 리뷰 반영 — Voice Score / Fact-Guard 신설, 끊긴 루프 4곳 폐쇄, P0/P1/P2 우선순위 부여
(근거: `aidlc-docs/design-artifacts/red-team-review.md`)

## 닫힌 루프 (설계 요약에 그대로 사용)
```
성과+문의 → AI 분석 → 주제 추천 → [사람: 채택] → 생성(Voice Profile + 학습된 제약)
   ↑                                                          ↓
   └── 발행(추적링크 content_id) ← [사람: 승인] ← Fact-Guard 검사
                    ↓                      ↓ (반려 사유)
              승인글 → 코퍼스 편입      learned_constraints
```

## Units

### Unit 1 — Foundation  [P0]  ◀ Bolt 1 진행 중
- [x] Next.js 스캐폴드 (App Router, TS, Tailwind) — Vercel 배포는 env 등록 후
- [x] Supabase 스키마 적용 완료 (0001_init.sql + 0002_grants_rls.sql, RLS 활성화):
      `voice_corpus`(source: scraped|approved) · `contents`(state: draft→fact_check→pending_approval→approved→published, suggestion_id, tracking_id)
      `performance_metrics` · `inquiries`(content_id ← Loop1) · `topic_suggestions`(outcome ← Loop4)
      `learned_constraints`(← Loop2) · `audit_log`
- [x] 코드프레소 실데이터 임포트 완료 — 블로그 73 / 링크드인 55 / 검색어 433 / 문의 10, 합계 원본 대조 일치, 고객사명 익명화 확인 (블로그 73·검색어 433·LinkedIn 55·문의 10) + **고객사명 익명화** 처리
- [x] 보이스 코퍼스 확보 — xlsx 셀 하이퍼링크에서 URL 73개 추출 → 본문 스크래핑 72편 적재 (중앙값 3,346자 / 한글 46 · 영문 26). 큐레이션 대기

### Unit 2 — Voice Engine  [P0] ★핵심
- [x] 스타일 프로파일 추출 (어휘·문장 리듬·용어 통일·반복 문단 자산화)
- [x] 초안 생성 파이프라인 + LLM 제공자 추상화 (무료 티어: Gemini/Groq, 유료 전환 가능) + learned_constraints 주입 — **API 키 대기**
- [x] **Voice Score 0~100** (어휘·리듬·용어·구조·범용성 5축) + 근거 표시, 실측 분포에서 도출한 임계값 70점 미만은 승인 큐 진입 차단
- [ ] **Baseline 비교 화면** (사전 계산·DB 저장, 라이브 의존 제거): 일반 LLM vs 우리 시스템 + 각각 Voice Score
- [ ] 블라인드 테스트 모드 (실제 글 2 + 생성물 1, 정답 숨김) — 발표 무기

### Unit 3 — Trust Gate  [P0]
- [x] **Fact-Guard**: 고객사명·가격·계약조건·대외비·출처미상 수치 스캔 → 위험도별 표시. 실제 발행글 46편 오탐 0건 검증
- [ ] Telegram Bot: 알림 → 미리보기(위험 표시 포함) → ✅승인 / ❌반려(사유 필수)
- [ ] **반려 사유 → learned_constraints 변환** (Loop 2 폐쇄) + 대시보드 "시스템이 배운 규칙" 노출
- [ ] 전 상태 전이 audit_log 기록 (추적성) / 웹 대시보드 승인 큐 = Telegram 장애 시 폴백

### Unit 4 — Data Flywheel  [P1] (친구의 6레이어 기반)
- [ ] AI 분석: 이상치 감지 → 원인 설명 → 권고 (레이어 4). 실데이터에 근거한 인사이트 예: LinkedIn 고CTR 패턴 vs 노출만 높고 클릭 0인 영문 글
- [ ] Telegram 데일리 브리핑 (레이어 5)
- [ ] 주제 추천 → 캘린더 등록 → 사람 채택/거절 (레이어 6)
- [ ] **Loop 1**: 발행 시 추적링크 생성 → 문의 유입 시 content_id 귀속 → 리드 기준 성과 확정
- [ ] **Loop 3**: 승인 발행글 → voice_corpus 자동 편입
- [ ] **Loop 4**: 추천 → 콘텐츠 → 성과 체인 연결, "추천 적중률" 지표화

### Unit 5 — Demo & 제출물  [P0/P1 혼합]
- [ ] 문제 정의 카드 (숫자 포함: 컨펌 1~4일 / 주 2시간 취합 / 문의 귀속 4·10 / 반나절~하루 원고)
- [ ] 설계 요약 = 위 루프 다이어그램 + **8단계 커버리지 맵**(REAL/PARTIAL/DESIGN-ONLY 정직 표기)
- [ ] 성공 정의: 컨펌 10분 내 · 취합 0분 · 초안 10분 · **귀속률 100%** · Voice Score ≥85
- [ ] 데모 영상 스크립트 (입력→처리→출력, 1~2분) + 블라인드 테스트 컷
- [ ] "왜 ChatGPT가 아닌가" 3층 답변 정리

## Bolt 순서
Bolt 1: Unit 1 → Bolt 2: Unit 2 → Bolt 3: Unit 3 → Bolt 4: Unit 4 → Bolt 5: Unit 5
**규칙: P0 완료 전 P1 착수 금지.** 시간 부족 시 Unit 4를 분석+브리핑만 남기고 축소.

## P2 (여유 있으면)
블로그 스크래핑 자동화 · 채널별 포맷 변환기 · GEO 체크리스트 · UI 폴리시 · LinkedIn 실제 API 발행

## 승인 요청
승인 시 Construction Phase (Bolt 1) 착수.
