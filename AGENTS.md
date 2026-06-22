# AGENTS.md — Guide for Coding Agents

This file is the entry point for any coding agent (Claude Code, Codex, Cursor, etc.)
working on MeinDeutsch. Read this first, then the docs it links to.

**Before starting work:** read the [Worklog](#worklog) at the bottom to see what was
recently done and what is in progress.
**After finishing work:** append a worklog entry describing what you did.

---

## 1. What this project is

MeinDeutsch is a **personal German-learning app** for a single whitelisted user
(Google sign-in). Three learning loops:

| Feature | Loop | Key backend pieces |
|---|---|---|
| **Daily Talk** | topic → AI question → answer → AI analysis (mistakes, CEFR, corrected text, word suggestions, tips) → stored as knowledge base | `submission.service.ts`, `analysis.client.ts`, `knowledge.repository.ts` |
| **Alltagssprache** | AI English expression → user writes German → naturalness score 0–100 → weak items (≤70) enter review queue, graduate after two ≥90 | `expression.service.ts`, `expression-review.logic.ts` |
| **Vocabulary SRS** | save suggested words → Anki-style review (Again/Hard/Good/Easy), SM-2-ish scheduling, 10-min relearning step | `vocabulary.service.ts`, `srs.logic.ts` |

Product north star (do not drift from it): store **clean learner records** per cycle,
build a knowledge base from them, and eventually use **RAG** so AI feedback becomes
personalized to recurring mistakes.

Full product spec: [PRD.md](PRD.md)
Backend task checklist / history: [backend/AI_BACKEND_PLAN.md](backend/AI_BACKEND_PLAN.md)
Backend conventions in prose: [backend/README.md](backend/README.md)

---

## 2. Repo layout

```
MeinDeutsch/            <- repo root (note: nested inside an outer folder of the same name)
├── PRD.md
├── AGENTS.md           <- you are here
├── backend/            Express 5 + TypeScript (ESM) + PostgreSQL (TypeORM)
│   └── src/
│       ├── routes/ → controllers/ → services/ → repositories/ → models/
│       ├── logic/          pure, DB-free domain logic (SRS, review transitions)
│       ├── ai/             analysis.client.ts — ALL OpenAI calls live here
│       ├── contracts/      api-types.ts — single source of truth for API types
│       ├── db/             pool.ts (DataSource) + migrations/
│       ├── middleware/     auth, request-id, error handler, 404
│       ├── constants/      prompts config, API messages, category config
│       └── tests/          node:test files (some require a live PostgreSQL)
└── frontend/           Vue 3 + Vite + Tailwind + TanStack Query + vue-router + vue-i18n
    └── src/
        ├── components/     one .vue per view (no deep component tree)
        ├── queries/        TanStack Query hooks, grouped per feature
        ├── types/ApiTypes.ts   GENERATED — never edit by hand (see §4)
        ├── libs/           http wrapper, i18n, query client
        └── theme/          CSS-token themes
```

Layering rule (backend): `routes` wire URLs, `controllers` parse/validate requests and
shape responses, `services` hold business logic, `repositories` are the only place
that touches the DB, `logic/` is pure and unit-testable. Keep new code in this shape.

---

## 3. Commands

Backend (run from `backend/`):

```bash
npm run dev              # tsx watch, port 4000
npm run check            # tsc --noEmit  <- run before finishing any backend change
npm test                 # node:test; REQUIRES the PostgreSQL DB from DATABASE_URL
npm run migration:run    # apply migrations (also auto-applied on server start)
npm run migration:revert
npm run sync:types       # regenerate frontend/src/types/ApiTypes.ts from contracts
```

Frontend (run from `frontend/`):

```bash
npm run dev              # vite dev server
npm run check            # vue-tsc --noEmit  <- run before finishing any frontend change
npm run build
```

There is **no linter** configured. There are **no frontend tests**. Verification =
typecheck both sides + backend tests when PostgreSQL is available.

Environment: copy `.env.example` → `.env` in both `backend/` and `frontend/`.
Backend env is validated by zod in `backend/src/config/env.ts` — add new variables
there, never read `process.env` directly elsewhere.

---

## 4. Hard rules (things that have bitten before / must not regress)

1. **Database schema changes go through TypeORM migrations only.**
   `synchronize` is off everywhere. Add a migration file in
   `backend/src/db/migrations/` AND register it in `backend/src/db/pool.ts`.
   Update the matching model in `backend/src/models/`.

2. **API types are generated, not hand-written.**
   Edit `backend/src/contracts/api-types.ts`, then run `npm run sync:types`
   (from `backend/`) to regenerate `frontend/src/types/ApiTypes.ts`.
   Never edit the frontend copy directly.

3. **Every endpoint returns the unified envelope**
   `{ success, message, data, error, meta: { requestId, timestamp } }`.
   Use the helpers in `backend/src/utils/http-response.ts` and throw
   `AppError(status, code, message, details?)` for failures — the error
   middleware formats it. Add new user-facing strings to
   `backend/src/constants/api-messages.ts`.

4. **Everything is user-scoped.** Every query in repositories filters by
   `userId`; every user-owned table has a non-null FK to `users`.
   The one deliberate exception: `expression_prompts` is a shared pool
   (per-user "seen" tracking lives in `expression_prompt_views`).
   `src/tests/user-scope.services.test.ts` guards this.

5. **Multi-table writes are transactional.** Daily Talk persistence
   (answer log + knowledge item + mistake stats + streak) commits or rolls
   back together (`persistAnalyzedSubmission`). Vocabulary ratings take a
   row lock. Follow this pattern for any new multi-write flow.

6. **All OpenAI calls live in `backend/src/ai/analysis.client.ts`** and use the
   Responses API with **strict JSON schemas** (`text.format.type: "json_schema",
   strict: true`). Never trust the model output blindly — see how
   `submission.service.ts` re-aligns error ranges and filters invalid errors
   after the call. Prompts/config belong in `constants/`, not inline strings
   scattered around.

7. **AI failure behavior is env-controlled.** `AI_FALLBACK_ENABLED=false`
   (default) surfaces an API error; `true` uses local fallbacks. Preserve both
   paths when touching AI code.

8. **Auth:** Google ID token → email whitelist check (`GOOGLE_AUTHORIZED_EMAILS`)
   → 7-day app JWT. Public routes are only `/api/health` and `/api/auth/google`;
   everything else goes through `requireAuth`. New routers register in
   `backend/src/routes/index.ts` under the protected router unless there is a
   strong reason not to.

9. **Pure domain logic goes in `backend/src/logic/`** with unit tests that need
   no database (see `srs.logic.ts` + `srs.logic.test.ts`). Don't bury scheduling
   math or state-transition rules inside services.

10. **Frontend data fetching goes through TanStack Query hooks** in
    `frontend/src/queries/<feature>/`, using `fetchJson` from `libs/http`.
    No raw `fetch` in components. User-facing strings go in
    `libs/i18n/messages.ts`. Styling uses Tailwind + the CSS variables defined
    in `theme/themes.ts` (e.g. `var(--accent)`) so all six themes keep working.

---

## 5. Known quirks

- The git repo root is `MeinDeutsch/MeinDeutsch/` (nested folder of the same name).
- The Alltagssprache pool-refill queue is **in-process memory** (fine for the
  single-instance deployment; would need rework for multiple instances).
- Review attempts are mirrored into regular expression history by creating
  synthetic prompts with `generationCategory: "review"` — intentional, slightly
  hacky; don't "fix" it without checking history rendering.
- `npm test` (backend) creates and cleans up real rows in the configured
  PostgreSQL database — don't point `DATABASE_URL` at anything precious.

---

## 6. Roadmap (agreed direction — pick work from here)

Status as of 2026-06-11. The detailed checklist lives in
[backend/AI_BACKEND_PLAN.md](backend/AI_BACKEND_PLAN.md); keep both in sync when
you complete an item.

### Done (MVP)
- Daily Talk loop end to end (topics, AI questions, submission analysis, KB records, streak)
- Alltagssprache (shared prompt pool, naturalness scoring, review queue + graduation)
- Vocabulary SRS (due queue, recall/reveal review, relearning step, immutable review log)
- Google auth + whitelist, full user scoping with DB-enforced ownership
- Migrations-only schema management, transactional Daily Talk writes
- Backend tests incl. real-PostgreSQL concurrency/race coverage

### Next up (in rough priority order)
1. **RAG phase 1 — context injection.** Feed retrieved past Q&As + mistake/tip
   history into the Daily Talk analysis prompt. Note: a first attempt was
   reverted (commit `cfbed7f` "remove history injection for now") — check why
   before re-implementing. The plumbing hook is `getAssessmentContext` in
   `submission.repository.ts` (already called, result currently unused by the prompt).
2. **RAG phase 2 — embeddings.** Add embedding vectors for `knowledge_items`,
   top-k retrieval by similarity (pgvector is the obvious candidate; requires a
   migration + extension).
3. **Reliability:** retry/backoff for transient OpenAI failures; integration
   tests for topic → question → submission; contract tests for the AI JSON shapes.
4. Smaller ideas (unscheduled): frontend tests, linter setup, level/CEFR
   progress dashboard (sidebar has a level placeholder).

---

## 7. Worklog

Append-only log so different agents/sessions can see what happened. Newest entry
on top. Format:

```
### YYYY-MM-DD — short title (agent/tool used)
- What was done, files touched, decisions made
- Anything left unfinished or discovered for the next session
```

### 2026-06-12 — Bug fixes: Daily Talk 404, dynamic cloze gaps, review queue UX (Claude Code)
- Daily Talk submit was POSTing `/api/submissions` (route is `/api/submissions/text`) →
  "Route not found". Fixed via `API_PATHS.submissionsText`.
- Kollokationen cloze gaps are now DYNAMIC: generation gaps only the hard collocate
  (partner noun stays visible) with `clozeAnswer` = exactly the removed words; server-side
  validity guard (`isValidGeneratedCloze`: exactly one gap, sane answer) rejects bad
  generations; assessment accepts gap-only answers AND doesn't penalize typing the full
  collocation. Purged 39 unattempted old-format prompts so pools regenerate.
- Review pages (Kollokationen + Alltagssprache) now run a SESSION QUEUE: snapshot the due
  list on load, answer → feedback → "Next card" button advances; previously the active
  card was derived from the live query that mutates after each answer (cards "disappeared").
- Collocation review attempts are now mirrored into history via synthetic `review`-category
  prompts (same as Alltag), so the history percentage bumps across retries; verified 0→100.
- Dedup hardening: generation avoid-list is now cross-category, and near-duplicate check
  strips articles/reflexives (`toDedupKey`) so "eine/die Entscheidung treffen" can't both
  enter the pool. NOTE: same English gloss with different German collocation (Entscheidung
  treffen vs Entschluss fassen) is allowed on purpose.

### 2026-06-21 — Gespräch fixes: delete, anti-drift, variety, more scenes, reopen review (Claude Code)
- Delete conversations: `DELETE /api/conversations/:id` (cascades messages) + trash button in the
  Gespräch history with a `BaseModal` confirm.
- Anti-drift: conversation system prompt now hard-anchors to the scene — acknowledge off-topic
  asides briefly then steer back; never change location/topic/situation. (Fixes "pants cheaper in
  Iran" derailing a shopping scene.)
- Variety: scenarios expanded 8→19, grouped by `category` (Alltag / Dienstleistungen / Arbeit &
  Schule / Reisen / Sozial / Gesundheit); picker now renders grouped. Each start injects a random
  `CONVERSATION_OPENING_ANGLES` seed so the same scene opens differently.
- FIXED reopen-from-history showing nothing: `GET /api/conversations/:id` returned nested
  `{conversation, messages}` but the client read it flat — `getConversation` now returns a FLAT
  `ConversationWithMessages` (matches start which stays nested). Reopening an ended chat shows its
  debrief again.
- NOTE (deferred, user's call): rename Daily Talk → "Writing" and rework it as writing practice
  (vs Gespräch = speaking-style). Not started.

### 2026-06-21 — NEW FEATURE: Gespräch (AI conversation mode, text-only) (Claude Code)
- The "daily-habit pillar": a level-scaled role-play chat. Standalone feature (NOT folded into
  Daily Talk, which stays for now). Routes `/gespraech`; nav is now 6 tabs (mobile bottom nav
  grid-cols-6, short label "Chat").
- Pedagogy baked into prompts (`analysis.client.ts`): comprehensible input at i+1 (uses the
  user's stored CEFR level), short turns that always invite a reply, NO mid-conversation
  correction (silent recasts) for low anxiety — correction happens only in the post-chat
  DEBRIEF (`debriefConversation`: summary + corrections + vocab suggestions). All conversation
  AI uses the cheap `modelFor("default")`.
- Backend: `conversations` + `conversation_messages` tables (migration `AddConversations`),
  repository/service/controller, routes under `/api/conversations` (scenarios, start, :id/message,
  :id/end, list, get). Scenarios in `constants/conversation-scenarios.config.ts` (cafe, colleague,
  doctor, …). Debrief stored as jsonb on the conversation.
- Integrated into the DAILY GOAL as a 5th step `gespraech` (done = ≥1 user message today):
  touched `daily-goal.logic`, `dashboard.repository` (counts + 14-day activity series, pink),
  contract `DailyGoalStepKey`/`DashboardActivityDay`, dashboard stepper + ActivityChart.
- Frontend `GespraechView`: scenario picker + past-conversation list → chat (bubbles, typing
  indicator, Enter-to-send) → review (debrief with one-click vocab harvest reusing the Daily
  Talk save-word mutation into the "Gespräch" vocab category). Uses the new `ui/BaseButton`+`BaseModal`.
- Voice is DEFERRED (text-only v1, per user). RAG still the final step.
- Verified: both typechecks clean; 45 backend tests pass; migration applied.

### 2026-06-21 — Reusable UI components + CEFR-grounded assessment (Claude Code)
- NEW: `src/components/ui/` reusable primitives — `BaseModal` (backdrop, Esc/scroll-lock,
  `dismissable` flag for blocking flows) and `BaseButton` (variant→shared style classes,
  loading state). Re-export via `ui/index.ts`. New UI should use these; migrate existing
  `btn-*`/ad-hoc modals to them incrementally.
- Placement exam is now a BLOCKING MODAL (not a route): `OnboardingExamModal` (uses BaseModal
  dismissable=false) rendered in App.vue, gated by reactive `utils/level.ts`
  (levelKnown/examOpen/refreshLevel/markLeveled/resetLevel/requestRetake). The /onboarding
  route + async router guard were removed. Settings "retake" calls `requestRetake()`.
- CEFR assessment hardened to the official 5-dimension qualitative scale (range, accuracy,
  coherence, fluency/complexity, + task/content) with per-band descriptors; the smart model
  now rates each dimension (forced via json_schema `dimensions`) before the overall verdict,
  weights higher-level items, and is criterion-referenced (not an average). Honest limit: this
  is a calibrated LLM estimate, not a psychometric test — see chat note.
- DEFERRED still: Alltag/Kollok pool level-segmentation, progress view (#4), Gespräch (#6), RAG.

### 2026-06-21 — Level foundation: per-task models, placement exam, level-aware Daily Talk (Claude Code)
- Per-task model registry: `modelFor(task)` in `analysis.client.ts` + `OPENAI_MODEL_SMART`
  env (default `gpt-4.1`). Level assessment uses the smart model; everything else the cheap
  `OPENAI_MODEL`. Add new tasks to the `ModelTask` union.
- Placement exam (onboarding): `users.cefr_level` / `cefr_rationale` / `cefr_assessed_at`
  (migration `AddUserCefrLevel`). Exam = short rising-difficulty ladder of open German
  questions (`generateLevelExam`, cheap model); `assessLevel` (smart model) estimates CEFR
  from all answers. Endpoints under `/api/level` (GET status, GET /exam, POST /assess, POST set).
  Level is set-once + manually adjustable (no auto-drift) per product decision.
- Frontend: the placement exam is a BLOCKING MODAL overlay (`OnboardingExamModal`, rendered in
  `App.vue`, z-50, non-dismissable) — NOT a route. Visibility is driven by the reactive store in
  `utils/level.ts` (`levelKnown` null/false/true + `examOpen` for retake; `refreshLevel`,
  `markLeveled`, `resetLevel`, `requestRetake`). App refreshes level on route change when a token
  exists; logout/login reset it. `SettingsLevelView` (/settings/level) shows level + rationale,
  lets you adjust (A1-C2) or retake (sets `examOpen`). Daily Talk question generation now targets `user.cefrLevel` (falls back to a
  B1-C1 ladder if unset); question template pitches difficulty to the target.
- CEFR per-response tags removed from Daily Talk list/new/detail earlier; corrected text now
  highlights fixes in GREEN (HighlightedText `tone` prop) mirroring the red answer diff.
  Kollokationen review got an "I don't know" button; Daily Talk new opens with a question
  (no "Generate a question to start" placeholder).
- DECIDED with user: level-awareness/user-aware content does NOT require RAG (RAG is the later
  history-personalization layer). DEFERRED: (a) level-segmenting the SHARED Alltag/Kollok pools
  by level band (needs a pool-segmentation design — Daily Talk was done first since questions are
  user-owned); (b) progress view toward next CEFR (item 4); (c) conversation/"Gespräch" mode
  (item 6, researched — strong fit as the daily-habit pillar); (d) RAG (item 6/7 final).
- Verified: both typechecks clean; 44 backend tests pass. (Live/screenshots: user self-verifies.)

### 2026-06-12 — Alltagssprache: spaced recognition→production (option C) (Claude Code)
- Built on top of the situational reframe (option A). Each prompt now stores `native_answer` +
  `distractors` (jsonb); generation emits them. First encounter with an item is RECOGNITION
  (MCQ: shuffle of native answer + 3 distractors); a LATER session re-serves it as PRODUCTION
  (free text). Migration `AddExpressionRecognition`.
- Per-user phase state on `expression_prompt_views`: `recognition_done_at`, `production_due_at`,
  `production_done_at`. `getNextPrompt` priority: (1) due-production → (2) unseen → recognition →
  (3) recycle → production. Spacing gate `RECOGNITION_TO_PRODUCTION_DELAY_MS` (default 6h) in
  expression.service — production is withheld until then, so it lands in a later session.
- New endpoint `POST /api/expressions/recognition` ({promptId, chosenText} → {correct, correctAnswer}).
  `assessAttempt` (production) marks production_done + uses stored native_answer as a scoring reference.
- `expression_attempts.phase` ('recognition'|'production'): recognition rows count toward the daily
  goal/activity but are filtered OUT of history, score trends, and review (production-only).
- Frontend AlltagsspracheView branches on `prompt.mode`: recognition = MCQ buttons with correct/wrong
  states + "Next"; production = existing textarea + score ring. English hint hidden in recognition
  (options would reveal it). Mode chip shows RECOGNIZE/PRODUCE.
- buildDelivery downgrades to production when a prompt has no stored answer (legacy rows).
- VERIFY GOTCHA: tsx watch kept wedging on rapid edits and a STALE server served old code (0 prompts
  got answers until restarted); also the answer wasn't persisted until the service createPrompt call
  passed nativeAnswer/distractors (repo+AI were ready first). Purged answerless unattempted prompts so
  pools regenerate. To verify production locally, fast-forward `production_due_at` in the DB.
- Verified live end-to-end: recognition MCQ (4 options) → correct check → same-session next is a
  DIFFERENT item (spacing holds) → after due-time, item returns as production. 40 backend tests pass.

### 2026-06-12 — Alltagssprache reframed to situational production (Claude Code)
- Product fix: the feature was generating abstract English sentences to translate; reframed
  (research-backed — situational formulaic-language practice > decontextualized translation)
  so the prompt is a concrete GERMAN micro-situation and the learner produces the natural
  German utterance. English is now a reveal-on-tap HINT, not the task.
- Backend: `expression_prompts.situation_text` (nullable, migration `AddExpressionSituation`);
  generation prompt rewritten to emit `{situationText, englishText, generatedContext}` with a
  difficulty ceiling (simple A2-B1 scenario wording, ~3-12 word spoken answers); assessment
  prompt now judges fit-to-situation, not literal translation, and receives situationText.
- Legacy prompts have `situation_text = NULL`; frontend falls back to showing englishText, and
  the recycle query (`findLeastRecentlyViewedPrompt`) deprioritizes NULL-situation prompts so
  old basic phrases ("How are you?") only resurface as a last resort. Purged 255 unattempted
  legacy prompts; attempted ones kept (their FK cascades, would delete history).
- Frontend `AlltagsspracheView`: hero leads with situation + "Show English hint" toggle
  (`showHint`, reset on each new prompt). Review view unchanged (review items store englishText).
- Verified live: slang situation "Ein Freund hat schon wieder deine Ideen geklaut. Was sagst du?"
  → "Alter, das ist echt nicht cool!" scored 90 with situational feedback. 36 tests pass.
- DECIDED: option "C" (recognition→production gradient, spaced across encounters) is a possible
  future upgrade on top of this; not built yet.

### 2026-06-12 — Password sign-in fallback (Google 403 workaround) (Claude Code)
- Google sign-in 403s when the network/region blocks Google (browser-side GSI and/or
  backend cert fetch to googleapis.com; VPN often only covers the browser). Added a
  Google-free fallback: `POST /api/auth/password` — whitelisted email + `AUTH_PASSWORD`
  from env (min 8 chars, empty = disabled) → same app JWT. Constant-time compare
  (sha256 + timingSafeEqual), brute-force throttle (5 fails / 15 min per email,
  pure logic in `logic/login-throttle.ts` + tests), wrong password and non-whitelisted
  email return the SAME 401 (no whitelist probing).
- Accounts unify by email: password-created users get `google_sub = local:<email>`;
  Google sign-in now falls back to `findByEmail` so it reuses that account instead of
  crashing on the unique email constraint.
- LoginView has an email+password form under the Google button ("Google blocked?" hint).
- GOTCHA: `.env` is read once at startup — after editing `AUTH_PASSWORD`, restart the
  backend (tsx watch does NOT reload on .env changes; that caused a confusing 503).

### 2026-06-12 — Fix round: Daily Talk submit 404, dynamic cloze gaps, review queue UX (Claude Code)
- Daily Talk submit hit `POST /api/submissions` (only GET exists there) → "Route not
  found"; frontend now posts to `/api/submissions/text` (`API_PATHS.submissionsText`).
- Kollokationen cloze is now DYNAMIC: generation gaps only the hard-to-guess collocate
  (noun stays visible; e.g. "die Entscheidungen ____" → answer "getroffen"); clozeAnswer
  must exactly reproduce the sentence; structural validation rejects bad generations
  (exactly one gap, no markers in answer). Assessment accepts gap-only answers AND full
  collocations without penalty. Purged 39 unattempted old-format prompts so pools regenerate.
- Review pages (Kollok + Alltag) now run a SESSION QUEUE: snapshot of due items at page
  load, explicit "Next card" button after each answer — previously the active card was
  derived from the live due-list which mutated after every answer (cards seemed to vanish).
- Collocation review attempts are now mirrored into history via synthetic prompts
  (category "review", like Alltag), so the history card's percentage bumps on retries.
- Dedup hardening: collocation avoid-list now spans ALL categories and compares
  article-stripped keys ("eine/die Entscheidung treffen" collide). Same English gloss
  with different German collocation (e.g. "einen Entschluss fassen") is intentionally allowed.

### 2026-06-12 — NEW FEATURE: Dashboard + Daily Goal streak (Claude Code)
- `/` is now a dashboard (was a redirect): daily-goal stepper (4 clickable steps), streak
  hero, per-feature cards (totals, due badges, score sparklines), 14-day stacked activity
  chart. Charts are hand-rolled SVG components (`Sparkline.vue`, `ActivityChart.vue`) —
  no chart library; keep it that way unless there's a real need.
- STREAK REDEFINED: the headline streak is now the "daily goal" — at least one task in
  EVERY section that day (Daily Talk, Alltag, Kollokationen, vocab review). Vocab counts
  as done when its due queue is empty. Stored as `streak_status.feature_key='daily_goal'`
  via the now-generic `streakRepository.getStatus/recordCompletion`. The old `daily_talk`
  streak still exists and `/api/streaks/daily-talk` is unchanged.
- Pure goal logic in `logic/daily-goal.logic.ts` (+ tests). `dailyGoalService.recordGoalProgress`
  is hooked after all four task writes (never throws) AND the goal is re-evaluated on
  `GET /api/dashboard/overview` (App shell polls it every 60s; chip shows "n/4 · time left"
  or "secured"). Mobile bottom nav: Settings moved to the top bar gear; tabs are
  Home/Talk/Alltag/Kollok./Vocab.
- Verified live: overview returned 2/4 done (kollok 13 today, vocab auto-done via empty
  queue), streak correctly not yet recorded. 36 backend tests pass.

### 2026-06-12 — NEW FEATURE: Kollokationen (collocation trainer) (Claude Code)
- Full-stack feature mirroring Alltagssprache's architecture. Backend: 4 tables
  (`collocation_prompts` shared pool w/ unique normalized-German+category index,
  `collocation_prompt_views`, `collocation_attempts`, `collocation_review_items`),
  migration `AddCollocationTables`, repos, service (shared refill-queue + reused
  `expression-review.logic` transitions), routes under `/api/collocations/*`.
- Pedagogy (from SLA research on collocation learning): productive recall (EN cue → DE),
  gap-fill in sentence context with the collocation INFLECTED, generation biased toward
  L1-incongruent pairings ("Entscheidung treffen" not "machen"), assessment gives
  contrastive partner-word feedback, failures (<=70) enter spaced review (2× >=90 to
  graduate). Served prompts NEVER include germanText/clozeAnswer (see
  `CollocationPromptInternal` in the repo layer).
- Frontend: `KollokationenView` + `KollokationenReviewView` (routes /kollokationen[.review]),
  queries in `queries/collocations/`, 5th nav item (Puzzle icon); mobile bottom nav is now
  5 tabs using new short labels (`t.tabs.*`, `t.kollok.tab`).
- Verified live: prompt drawn, transfer error "eine Entscheidung machen" scored 20 with
  explicit "treffen" feedback and auto-enqueued to review. 33 backend tests pass.

### 2026-06-12 — Daily Talk question pool, CEFR dropped from UI (Claude Code)
- Daily Talk now works exactly like Alltagssprache: `POST /api/questions/next` draws an
  unseen pre-generated question for the topic (falls back to least-recently-viewed, then
  sync-generates), marks it viewed, and triggers a background refill (batch 8, buffer 3)
  with an avoid-list against repeats. Migration `AddQuestionViewTracking` added
  `questions.viewed_at` + index.
- The pool refill machinery is now SHARED: `src/utils/refill-queue.ts`
  (`createRefillQueue` — per-key dedup + concurrency cap). Both `expression.service.ts`
  and `question.service.ts` use it; don't reimplement queues.
- CEFR removed from the Daily Talk UI entirely: questions target B1+–C1 (template +
  random pool target weighted to B2); the learner's ANSWER is what gets CEFR-graded.
  `POST /api/questions/generate` still accepts `cefrTarget` for API tools.
- Tests: `question-pool.service.test.ts` mirrors the expression pool tests (scheduler is
  mockable via `questionPoolRefillScheduler`). All 31 backend tests pass.
- Verified live: two pool draws in <120ms with distinct questions; refill confirmed in DB.

### 2026-06-12 — Daily Talk auto-question + default topics (Claude Code)
- Daily Talk "new" now mirrors Alltagssprache: a question auto-generates on page open
  and regenerates on topic/CEFR change (`watch` in `DailyTalkNewView.vue`); the CEFR
  free-text input became a select (Auto/A1–C2, default B1); manual button is now a
  secondary "New question" regenerate.
- Default everyday topics: `backend/src/constants/default-topics.ts` (12 topics —
  Nature, School, University, Work, Daily Routine, etc.). Seeded on new-user creation
  in `auth.service.ts` (non-blocking on failure) via `topicService.seedDefaultTopics`,
  which uses `topicRepository.createMissingByName` (name-dedup, case-insensitive).
  Backfill script: `npm run seed:topics` (idempotent, all users) — already run for the
  existing account. Deleted defaults are NOT auto-recreated (deliberate).
- Verified: both typechecks clean; Playwright screenshots confirm auto-generated B1
  question on open at desktop + mobile.

### 2026-06-12 — Full frontend redesign + responsiveness (Claude Code)
- New design language: Fraunces (display serif) + Inter via Google Fonts in `index.html`;
  shared component classes in `src/style.css` (`.card`, `.card-hero`, `.btn-primary`,
  `.btn-ghost`, `.btn-soft`, `.input`, `.chip`, `.eyebrow`, `.notice-*`, `.page-title`) —
  new views should use these instead of ad-hoc Tailwind soup. Keyframes/animations in
  `tailwind.config.ts` (`animate-fade-up`, `animate-pop-in`).
- App shell (`App.vue`) is now responsive: desktop (≥lg) keeps the collapsible sidebar;
  mobile gets a top bar + fixed bottom tab nav (safe-area aware). Header shows a
  time-of-day German greeting and a streak-status chip (green "secured" / amber countdown,
  driven by `hasCompletedToday`).
- New `ScoreRing.vue` (animated SVG score ring) used by Alltagssprache main + review.
- All views restyled and made responsive. Vocabulary kept the compact inline stat strip
  (old design) on purpose — user preferred it over big stat cards; categories collapse to
  horizontal chips below `md`.
- Verified: `vue-tsc` clean; Playwright screenshots at 1440px and 390px across all routes
  (driver in /tmp, not committed). Login-page console errors are Google GSI origin
  restrictions in headless, pre-existing.
- Note: `index.html` title fixed to "MeinDeutsch"; fonts load from Google Fonts (needs
  network on first load).

### 2026-06-11 — Repo explored, AGENTS.md created (Claude Code)
- Explored full codebase, verified `npm run check` passes on both backend and frontend.
- Created this AGENTS.md: conventions, hard rules, roadmap, and this worklog.
- No code changes. Open items: RAG injection (see Roadmap #1) is the agreed next feature.
