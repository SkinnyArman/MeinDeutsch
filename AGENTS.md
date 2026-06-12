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
