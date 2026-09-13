# Codemap — marketingbot

Read this first, then open only the files the task touches. Regenerate with
`python3 scripts/codemap.py .` after adding routes, tables, or env vars.

- Generated at: a707b81 2026-08-29 docs(deck): reorder for final 8-slide flow with two Q&A backup slides; surface judgment log on the gate slide
- Files mapped: 60 · code LOC: 5,754
- Scripts: `dev`, `build`, `start`, `import:data`
- Deps: @supabase/supabase-js, next, react, react-dom

## API endpoints
- app/api/contents/baseline/route.ts · POST
- app/api/contents/decide/route.ts · POST
- app/api/cron/publish/route.ts · GET
- app/api/inquiries/route.ts · POST
- app/api/telegram/webhook/route.ts · POST
- app/api/topics/adopt/route.ts · POST
- app/r/[trackingId]/route.ts · GET

## Data
- table `audit_log` — defined in supabase/migrations/0001_init.sql
- table `contents` — defined in supabase/migrations/0001_init.sql (+scheduled_for)
- table `inquiries` — defined in supabase/migrations/0001_init.sql
- table `learned_constraints` — defined in supabase/migrations/0001_init.sql
- table `performance_metrics` — defined in supabase/migrations/0001_init.sql
- table `search_queries` — defined in supabase/migrations/0001_init.sql
- table `topic_suggestions` — defined in supabase/migrations/0001_init.sql
- table `voice_corpus` — defined in supabase/migrations/0001_init.sql
- Supabase tables touched in code: `contents`×19, `topic_suggestions`×7, `inquiries`×5, `voice_corpus`×4, `audit_log`×4, `learned_constraints`×4, `performance_metrics`×3, `search_queries`×2

## Environment variables
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `TELEGRAM_CHAT_ID`, `LLM_PROVIDER`, `GROQ_MODEL`, `CRON_SECRET`, `TELEGRAM_WEBHOOK_SECRET`, `TELEGRAM_ALLOWED_USER_IDS`, `FACTGUARD_CLIENT_NAMES`, `GEMINI_MODEL`, `ANTHROPIC_MODEL`, `GEMINI_API_KEY`, `GROQ_API_KEY`, `ANTHROPIC_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `TELEGRAM_BOT_TOKEN`

## Biggest files (open these surgically — grep for the symbol, don't cat)
- scripts/build_deck.js — 423 LOC
- app/page.tsx — 266 LOC
- lib/llm.ts — 241 LOC
- lib/voice/score.ts — 206 LOC
- lib/flywheel/analyze.ts — 199 LOC
- lib/approval.ts — 196 LOC
- lib/voice/profile.ts — 176 LOC
- app/api/telegram/webhook/route.ts — 171 LOC
- scripts/codemap.py — 165 LOC
- app/api/topics/adopt/route.ts — 158 LOC
- lib/fact-guard.ts — 152 LOC
- app/compare/page.tsx — 150 LOC

## Exports by file
- **app/api/contents/baseline/route.ts** (50): POST, dynamic, maxDuration
- **app/api/contents/decide/route.ts** (26): POST, dynamic
- **app/api/cron/publish/route.ts** (44): GET, dynamic
- **app/api/inquiries/route.ts** (57): POST, dynamic
- **app/api/telegram/webhook/route.ts** (171): POST, dynamic
- **app/api/topics/adopt/route.ts** (158): POST, dynamic, maxDuration
- **app/compare/page.tsx** (150): dynamic, fetchCache, revalidate
- **app/layout.tsx** (48): metadata
- **app/log/page.tsx** (148): dynamic, revalidate
- **app/page.tsx** (266): dynamic, fetchCache, revalidate
- **app/r/[trackingId]/route.ts** (33): GET, dynamic
- **components/Actions.tsx** (123): AdoptButton, DecideButtons
- **components/Metric.tsx** (134): AttributionBar, Metric, Panel, PipelineRail, ScoreBar
- **lib/approval.ts** (196): ContentState, activeConstraints, approve, learnFromRejection, logDecision, publish, reject, schedule, takenSlots
- **lib/fact-guard.ts** (152): FactFlag, FactGuardResult, Severity, factGuard, summarize
- **lib/flywheel/analyze.ts** (199): Insight, TopicSuggestion, analyze, persistSuggestions, suggestTopics
- **lib/flywheel/metrics.ts** (85): LoopMetrics, loopMetrics
- **lib/llm.ts** (241): GenerateArgs, LlmProvider, generate, modelName
- **lib/scheduling.ts** (79): EVENT_OFFSETS, TimingType, describeSlot, eventPlan, holidayLeadTime, nextDefaultSlot
- **lib/supabase.ts** (33): supabaseAdmin, supabaseClient
- **lib/telegram.ts** (117): ApprovalRequest, answerCallback, askRejectionReason, callRaw, sendApprovalRequest, sendMessage
- **lib/voice/generate.ts** (131): DraftResult, GenerateInput, baselinePrompt, generateBaseline, generateDraft, generateVoiced, voicedPrompt
- **lib/voice/generic.ts** (83): GenericBaseline, buildGenericBaseline, genericScore
- **lib/voice/keywords.ts** (48): TOPIC_KEYWORDS
- **lib/voice/profile.ts** (176): CorpusDoc, TERMINOLOGY, VoiceProfile, buildProfile, endingOf, profileToInstructions, splitSentences
- **lib/voice/score.ts** (206): APPROVAL_THRESHOLD, VoiceScore, scoreVoice
- **scripts/codemap.py** (165): rel_files, loc, read, scan, tree, main
- **scripts/import_performance.py** (126): alias, post, num, i, d, header_row, table_rows
- **scripts/scrape_corpus.py** (64): fetch, extract, post, main

## Tree (depth 3)
```
README.md
aidlc-docs/
  audit.md
  deliverables/
    01_문제정의카드.md
    02_설계요약.md
    03_데모시나리오.md
    04_발표_및_QA.md
    05_발표대본.md
  design-artifacts/
    red-team-review.md
  plans/
    level1-plan.md
  requirements/
    requirements.md
app/
  api/
    contents/
    cron/
    inquiries/
    telegram/
    topics/
  compare/
    page.tsx
  contact/
    page.tsx
  globals.css
  layout.tsx
  log/
    page.tsx
  page.tsx
  r/
    [trackingId]/
components/
  Actions.tsx
  Metric.tsx
lib/
  approval.ts
  fact-guard.ts
  flywheel/
    analyze.ts
    metrics.ts
  llm.ts
  scheduling.ts
  supabase.ts
  telegram.ts
  voice/
    generate.ts
    generic.ts
    keywords.ts
    profile.ts
    score.ts
next-env.d.ts
next.config.mjs
package.json
postcss.config.mjs
scripts/
  build_deck.js
  calibrate_threshold.ts
  codemap.py
  import_performance.py
  run_flywheel.ts
  scrape_corpus.py
  test_factguard.ts
  test_generate.ts
  test_telegram.ts
  validate_generic_axis.ts
  validate_voice.ts
supabase/
  migrations/
    0001_init.sql
    0002_grants_rls.sql
    0003_scheduling.sql
tailwind.config.ts
tsconfig.json
vercel-setup.md
vercel.json
```
