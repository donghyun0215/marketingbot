# Level 1 Plan — marketingbot
상태: **승인 대기 (Product Owner: Donghyun)**

## Units (느슨하게 결합된 작업 단위)

### Unit 1 — Foundation
- [ ] Next.js 스캐폴드 (App Router, TS, Tailwind) + Vercel 배포 파이프라인
- [ ] Supabase 스키마: `voice_corpus`, `contents`(상태머신: draft→pending_approval→approved→published), `performance_metrics`, `topic_suggestions`, `audit_log`
- [ ] 코드프레소 블로그 스크래핑 → voice_corpus 적재 + Donghyun 큐레이션 UI(간단 토글)

### Unit 2 — Voice Engine ★핵심
- [ ] 코퍼스에서 스타일 프로파일 추출 (어휘·문장 리듬·용어 통일·반복 문단 자산화)
- [ ] 초안 생성 파이프라인: 주제+키워드 입력 → 코드프레소 톤 초안 (Claude API)
- [ ] **Baseline 비교 화면**: 동일 입력 → 일반 LLM vs Voice Engine, 나란히 렌더
- [ ] 채널별 포맷 변환기 (블로그 원문 → LinkedIn 포스트/제목/태그)

### Unit 3 — Approval Gate (Telegram + Web)
- [ ] Telegram Bot: 초안 도착 알림 → 미리보기 → ✅승인/❌반려(사유 입력) 버튼
- [ ] 승인/반려가 contents 상태머신 + audit_log에 기록 (판단 로그·추적성 = 심사 요구사항)
- [ ] 웹 대시보드 승인 큐 (Telegram과 동일 동작, 이중 채널)

### Unit 4 — Data Flywheel (친구의 6레이어 반영)
- [ ] performance_metrics 시드 데이터 (첨부 스크린샷 스키마 기반, 현실적 분포)
- [ ] AI 분석: 변화 감지 → 원인 설명 → 추천 (레이어 4)
- [ ] Telegram 데일리 브리핑: 핵심 지표 요약 + 이상치 알림 (레이어 5)
- [ ] 다음 주제 선제안 → 콘텐츠 캘린더에 자동 등록, 사람이 채택/거절 (레이어 6 → 단계①로 루프 완성)

### Unit 5 — Demo Assets
- [ ] 데모 시나리오 스크립트 (입력→처리→출력, 1~2분 영상용)
- [ ] 문제 정의 카드 + 설계 요약 초안 (심사 제출물 형식)
- [ ] 발표 흐름: Baseline 비교를 클라이맥스에 배치

## Bolt 순서 (제안)
Bolt 1: Unit 1 → Bolt 2: Unit 2 → Bolt 3: Unit 3 → Bolt 4: Unit 4 → Bolt 5: Unit 5 + 폴리시
(Unit 2가 밀리면 Unit 4의 브리핑을 단순화하는 방향으로 트레이드오프)

## 승인 요청
Product Owner가 이 플랜을 승인하면 Construction Phase (Bolt 1) 착수.
