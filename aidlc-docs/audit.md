# AI-DLC Audit Log — marketingbot

## 2026-08-26 — Workflow Start

**Raw user intent (initial):**
> Build for Zero100 Builderthon Track 02 (Codepresso marketing content automation).
> Stack: Next.js + Supabase + Vercel. Method: AWS AI-DLC.
> Agreed scope from prior planning: voice engine, approval workflow, data flywheel; later pipeline stages mocked.
> Friend's feedback incorporated as pipeline map (planning calendar, drafting, scheduled upload, secondary distribution loop), upgraded from "human writes final" to "human approves final."

**Workspace detection:** Greenfield. Empty repo `donghyun0215/marketingbot`, default branch `main`.

**Status:** Awaiting formal Intent statement + requirements clarification answers from Product Owner (Donghyun).

## 2026-08-29 — Level 1 Plan v2 승인 / Bolt 1 착수
- Red Team 리뷰 반영본(v2) 승인. 근거: `design-artifacts/red-team-review.md`
- Bolt 1: Next.js 스캐폴드, Supabase 스키마(8 테이블), 임포트 스크립트 작성
- 파싱 검증 완료: 블로그 73 / 링크드인 55 / 검색어 433 / 문의 10
- 고객사 실명 → 익명 별칭 변환 확인 (실명은 DB·레포 어디에도 미저장)
- 대기: SQL Editor에서 0001_init.sql 실행 → 임포트 실행
- 보안: 대화 중 노출된 Supabase service_role 키는 회전 필요

## 2026-08-29 — Bolt 1 완료
- 0001_init.sql / 0002_grants_rls.sql 적용 완료. 8개 테이블 + RLS 활성화(anon 접근 차단)
- 실데이터 임포트 검증:
  - 블로그 73건 — 클릭 457 / 노출 37,911 (원본 합계와 일치)
  - 링크드인 55건 — 클릭 2,842 / 노출 39,163 (원본 합계와 일치)
  - 검색어 433건 / 인바운드 문의 10건 (confirmed 1 · inferred 3 · unknown 6)
- 고객사 실명 → 익명 별칭 10건 변환. 실명은 DB·레포 미저장
- 이슈/해결: PostgREST 배치는 키 집합이 동일해야 함(PGRST102) → 합집합 정규화로 해결
- 알려진 제약: 임포트는 append-only. 재실행 전 테이블 비울 것 (스크립트 하단 주석)
- Bolt 2 (Voice Engine) 착수 가능

## 2026-08-29 — 보이스 코퍼스 수집
- URL 출처: 성과 리포트 xlsx의 셀 하이퍼링크 73개 (수동 입력 불필요)
- 스크래핑 결과: 72편 적재 / 1편 제외(2025-cloudvoucher, 본문 없음)
- 본문 길이 중앙값 3,346자 (최소 1,405 / 최대 11,019) — 전편 코퍼스 적합
- 언어 분포: 한글 제목 46 / 영문 제목 26 → 한국어 우선(4A)이므로 한글 46편이 1차 대상
- 본문은 Supabase에만 저장, public repo 미커밋

## 2026-08-29 — Bolt 2: Voice Profile / Voice Score
- 큐레이션 8편 확정 (id 2,4,5,6,7,10,11,14 → source='curated')
- Voice Profile: 결정적(비-LLM) 추출. 문장 평균 46.9자, 합니다체 55%/해요체 29%,
  자사 지칭 2.4회/1k, 수치 인용 1.26회/1k, 특징어 60개
- Voice Score 4축(어휘 0.3 / 리듬 0.25 / 용어 0.2 / 구조 0.25) 구현

### 검증 결과와 한계 (정직 기록)
- 홀드아웃(자기 학습 배제) 큐레이션 8편 평균 **77점**
- 범용 마케팅 문체 샘플 **49점**, 영문 글 **27점** → 브랜드 보이스 vs 범용 문체는 명확히 분리
- 그러나 **비큐레이션 한국어 자사 글 34편도 평균 78점** → 채점기는
  "코드프레소다움 vs 범용"은 가르지만, 자사 글 사이의 우열은 가르지 못한다.
  이는 Baseline 비교(범용 LLM 대비)라는 실제 용도에는 부합하나, 과장해서는 안 됨.
- 임계값을 임의 85 → **실측 p10인 70**으로 정정. 85로 두면 사람이 쓴 진짜 자사 글의
  다수가 반려되어 기준으로 성립하지 않음 (분포: 최소 64 / p10 70 / 중앙값 80 / p90 87 / 최대 90)

## 2026-08-29 — LLM 제공자 결정
- 요구사항 변경: 이 프로젝트는 무료 API로 운영한다 (유료 Anthropic 키 미사용)
- `lib/llm.ts` 어댑터 도입 — LLM_PROVIDER 환경변수로 gemini/groq/anthropic 전환
- 기본값 Gemini 무료 티어. 벤더 종속 없음, 추후 유료 전환 시 코드 변경 불필요
- **Baseline 비교 설계 원칙:** 대조군과 실험군에 동일 모델을 사용한다.
  모델을 다르게 하면 차이의 원인이 파이프라인인지 모델인지 분리할 수 없다.
  바뀌는 변수는 셋뿐: 문체 지시 / 학습된 제약 / 실데이터 근거

## 2026-08-29 — Bolt 2: 실제 생성 검증 (Gemini 무료 티어)
모델 gemini-3.6-flash. 대조군/실험군 동일 모델, 프롬프트만 상이.

### 해결한 문제 (기록: 같은 함정 재발 방지)
1. 모델명 `gemini-2.0-flash` 폐기됨 → `gemini-3.6-flash`
2. **thinking 토큰이 maxOutputTokens 예산을 함께 소비** (usageMetadata.thoughtsTokenCount).
   예산이 빠듯하면 본문이 341자로 잘리거나 사고 과정이 그대로 출력됨. → 16384로 상향
3. 채점기 버그: 대소문자 무시 정규식이 올바른 표기까지 오탐
   (`SkillCertify → SkillCertify`). 잘못된 변형만 정확히 매칭하도록 수정
4. 분량 지시 무시 → 프롬프트 끝으로 이동 + 미달 시 1회 재생성

### 측정 결과 (동일 주제)
| 축 | 대조군 | Voice Engine |
|---|---|---|
| 어휘 | 100 (35% 재현) | 100 (**73% 재현**) |
| 리듬 | 88 (어미 분포 차이 29%) | 84 (**차이 11%**) |
| 용어 | 100 (1개 사용) | 100 (**8개 사용**) |
| 구조 | 21 | 25 |
| **총점** | **77** | **77** |

### 미해결 — 다음 작업의 핵심
**총점이 두 글을 구분하지 못한다.** 세부 축에서는 Voice Engine이 명백히 우세한데
(어휘 재현 2배, 어미 분포 차이 1/3, 용어 사용 8배) 총점이 같다. 원인:
- 어휘 축이 30% 재현에서 포화 → 같은 주제면 대조군도 100점을 받는다
- 구조 축이 양쪽 모두 낮아 변별에 기여하지 못한다
- 즉 **변별력 있는 축이 비변별 축에 희석된다**

주의: 우리 결과가 이기도록 채점기를 손보면 그건 조작이다. 검증 조건은
"수정한 채점기가 실제 코드프레소 글 46편에서도 여전히 높은 점수를 주는가"이며,
이를 통과하지 못하는 수정은 채택하지 않는다.
