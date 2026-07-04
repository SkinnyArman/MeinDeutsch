# PRD: MeinDeutsch MVP - Daily Talk

## 1. Objective

Build a personal German learning MVP where:
- Users authenticate with Google (whitelisted emails only).
- You add learning topics.
- AI generates questions tied to those topics.
- You answer those questions (Daily Talk response; frontend can hint to keep it short).
- The system stores: question, answer, mistakes, CEFR level, tips, corrected text, and contextual word suggestions.
- The stored history becomes a learner knowledge base for future RAG.
- A second mode (`Alltagssprache`) trains natural German expression translation and review loops.

> Key Principle: Keep MVP narrow. Store clean learning data first, then use it for memory and retrieval.

---

## 2. MVP Scope

### In scope
- Google-only sign-in/sign-up.
- Email whitelist for allowed accounts.
- User-specific data isolation across topics, questions, submissions, streaks, knowledge, and vocabulary.
- Database-enforced ownership: every user-owned row requires a valid user foreign key and cascades on user deletion.
- Topic management (manual add/list).
- AI question generation per topic.
- Text answer submission.
- AI analysis that returns:
  - Mistakes
  - CEFR level
  - Fully corrected text
  - Contextual word suggestions (words that could be used in this context)
  - Tips
- Persistence of:
  - Topic
  - Question
  - Answer
  - Mistakes
  - CEFR level
  - Corrected text
  - Contextual word suggestions
  - Tips
- Basic knowledge base storage built from those records.
- Vocabulary capture from AI suggestions:
  - One-click save from contextual suggestions.
  - Store word, description, examples, and category/context.
  - Vocabulary page with category-based browsing.
  - Basic SRS scoring:
    - User gives memory points per word (1 Again, 2 Hard, 3 Good, 4 Easy).
    - Focused review session hides meanings/examples until the learner reveals the answer.
    - Backend returns a user-scoped due queue and the next scheduled review time.
    - `Again` creates a 10-minute relearning step; new-card intervals are 1/3/7 days for Hard/Good/Easy.
    - Learned-card intervals grow from the existing interval and ease factor.
    - Every rating is stored in an immutable review history for auditing and future SRS tuning.
- New feature: `Alltagssprache` (situational speaking practice)
  - Reframed from sentence-translation to situational production (research-backed: situation-specific
    formulaic-language practice beats decontextualized translation). The prompt is a concrete German
    micro-situation ("Ein Freund hat morgen eine Prüfung. Was wünschst du ihm?"); the learner produces
    the natural German utterance. The English equivalent is a reveal-on-tap hint, not the task.
  - Generation has a difficulty ceiling: simple A2-B1 scenario wording even when the target expression
    is idiomatic; expected answers ~3-12 words, natural spoken register (not literary/abstract).
  - AI scores whether the answer fits the SITUATION (not literal-translation equivalence).
  - Two-phase spaced practice (recognition → production), research-backed:
    - First encounter with an item is RECOGNITION: pick the natural utterance from a multiple-choice
      set (the stored native answer + 3 AI-generated plausible distractors).
    - A LATER session (spacing gate, default 6h) re-serves the same item as PRODUCTION: type it cold.
    - Per-user phase state lives on `expression_prompt_views` (recognition_done_at / production_due_at /
      production_done_at); delivery priority is due-production → unseen (recognition) → recycle (production).
    - Recognition still counts toward the daily goal but is excluded from history/score trends
      (attempt rows carry a `phase` column).
  - Categories are dynamic from backend configuration (frontend reads from API).
  - Current categories include: random, work, transport (bus/U-Bahn), home, slang, school/uni, doctor's office, cinema, concert, food, travel, sprichwort.
  - Page auto-loads a prompt on open and on category switch (no manual generate click).
  - Prompt pools are pre-generated on backend (default target: 20 per category) with non-blocking unseen-buffer refill.
  - Background pool refills are deduplicated per category and globally concurrency-limited.
  - Prompt delivery is shared-pool + per-user seen tracking (users draw from same pool but see different unseen items).
  - Generation prompt uses a backend config source for expression types and contexts (not hardcoded in prompt text).
  - Backend deduplicates prompts by normalized English text + category to avoid duplicate pool entries.
  - PostgreSQL enforces prompt uniqueness, so concurrent generators cannot insert duplicates.
  - A `Next` action moves to the next unseen prompt in the selected category.
  - User writes the natural German response to the situation.
  - AI evaluates naturalness as a score (0-100).
  - AI returns native-like German phrasing and alternatives.
  - Low scores are automatically added to a review queue.
  - Review mode re-tests weak items until they graduate.
  - No CEFR target selector for this feature.

- New feature: `Kollokationen` (collocation trainer)
  - Trains conventional German word partnerships (Verantwortung übernehmen, eine Entscheidung treffen, hohes Fieber).
  - Pedagogy (research-driven): productive recall from English cue, gap-fill in sentence context
    ("form recall with clue"), corrective feedback that names the conventional partner word,
    and spaced re-testing of failures.
  - AI generates prompts biased toward L1-INCONGRUENT collocations (not word-for-word translatable
    from English) since those carry the highest learning burden.
  - Each prompt: German cloze sentence (collocation gapped, inflected) + English equivalent.
    The served prompt never includes the answer.
  - Shared prompt pool per category with per-user seen tracking and background refill
    (same machinery as Alltagssprache; shared refill-queue util).
  - AI scores 0-100: full credit for the conventional partner (or an equally natural alternative),
    partial credit for right partner with wrong inflection, low score for transfer errors with
    explicit contrastive feedback.
  - Scores <= 70 auto-enqueue into a review queue; graduation after two successes >= 90
    (same transition logic as Alltagssprache review).

- New feature: Dashboard + Daily Goal streak
  - `/` is a dashboard: daily-goal stepper, streak, per-feature cards with due counts and
    score sparklines, and a 14-day activity chart.
  - Streak redefinition: a day counts when EVERY section saw at least one task
    (Daily Talk submission, Alltagssprache attempt, Kollokationen attempt, vocabulary review).
    Vocabulary also counts as done when its due queue is empty (nothing reviewable must not
    block the goal).
  - The day streak is stored under `streak_status.feature_key = 'daily_goal'` (UTC-day
    windows, same mechanics as the legacy daily_talk streak, which remains for compatibility).
  - The goal is re-evaluated after every qualifying task write and on each
    `GET /api/dashboard/overview`, so completion is recorded the moment the last section finishes.

- New feature: Level system (CEFR placement + level-aware content)
  - Onboarding placement exam: short ladder of rising-difficulty open German questions; a
    smart model estimates the user's overall CEFR from the produced answers and stores it.
  - Per-task model config: high-volume generation/scoring uses the cheap model; the level
    assessment uses a smarter model (`OPENAI_MODEL_SMART`). New tasks pick their model via a
    backend registry.
  - Level is set once and manually adjustable (no automatic drift). New users are gated into
    onboarding until assessed.
  - Content is level-aware: Daily Talk questions are generated at the user's level.
    (Alltagssprache/Kollokationen shared-pool level-segmentation is planned next.)
  - Independent of RAG: level-awareness needs only a stored level passed into prompts; RAG
    (history-based personalization) is a later, separate layer.
  - Planned next: progress view toward the next CEFR level; an AI conversation ("Gespräch")
    mode as the daily-habit pillar; then RAG.

- New feature: Gespräch (AI conversation mode)
  - Level-scaled role-play chat (text-only for now; voice later). The learner picks a scene
    (café, colleague, doctor, …); the AI stays in character and converses in German.
  - Research-based: comprehensible input at i+1 (uses the user's stored CEFR), output focus,
    low anxiety = NO mid-conversation correction (gentle recasts only). Correction is deferred to
    a post-conversation debrief (summary + targeted corrections + vocabulary suggestions).
  - Debrief vocabulary is one-click savable into the SRS deck ("Gespräch" category), tying the
    feature into the rest of the app.
  - Counts as the 5th daily-goal step (≥1 message that day), making it the daily-habit pillar.

- Daily goal & progress
  - The daily streak requires completing any 3 of the 5 sections (achievable in one sitting;
    consistency over volume), not all of them.
  - Progress view: shows current CEFR, an estimated "readiness" toward the next level (a
    transparent, labelled heuristic blending recent accuracy, writing level, and consistency —
    not a formal test), recent score trend, and focus areas (recurring mistakes).

- Writing (formerly Daily Talk)
  - Reframed as writing practice: prompts elicit a paragraph or two (opinion/description/
    narration; no letters or emails). Rich correction detail retained (red answer diff + green
    corrected text, mistakes, tips, word suggestions).
  - No topic picker in the flow — the server rotates topics automatically (topics remain
    managed in Settings).

### Out of scope (post-MVP)
- Any feature not required for this loop:
  topics -> AI questions -> answers -> mistakes + CEFR + tips -> knowledge base.

---

## 3. Core Data Objects (MVP)

### topics
- user_id
- id
- name
- description (optional)
- created_at

### questions
- user_id
- id
- topic_id
- question_text
- cefr_target (optional)
- source (`ai` / `manual`)
- created_at

### answer_logs
- user_id
- id
- question_id (or question text for initial compatibility)
- answer_text
- corrected_text
- error_types (JSON)
- cefr_level
- contextual_word_suggestions (JSON)
- tips (JSON)
- created_at

### mistake_stats
- user_id
- mistake_type
- frequency
- severity_score
- last_seen

### knowledge_items (MVP foundation)
- user_id
- id
- topic_id (optional)
- question_id (optional)
- answer_log_id (optional)
- text_chunk
- metadata (JSON)
- created_at

### vocabulary_items
- user_id
- id
- word
- normalized_word
- description
- examples (JSON)
- category (e.g. `Umwelt`, `General`)
- source_answer_log_id (optional)
- source_question_id (optional)
- srs_interval_days
- srs_ease_factor
- srs_due_at
- srs_last_rating
- srs_review_count
- srs_lapse_count
- srs_last_reviewed_at
- created_at

### vocabulary_review_logs
- user_id
- vocabulary_item_id
- rating
- previous_due_at / next_due_at
- previous_interval_days / next_interval_days
- previous_ease_factor / next_ease_factor
- reviewed_at

### expression_prompts
- user_id (optional creator reference; prompts belong to the shared pool)
- id
- english_text
- generated_context (optional)
- created_at

### expression_attempts
- user_id
- id
- prompt_id
- english_text
- user_answer_text
- naturalness_score (0-100)
- feedback (text, may be empty when fully correct)
- native_like_version
- alternatives (JSON, optional)
- created_at

### expression_review_items
- user_id
- id
- english_text
- normalized_english_text
- initial_score
- last_score
- success_count
- review_attempt_count
- next_review_at
- last_reviewed_at (optional)
- status (`active` / `graduated`)
- baseline_native_like_version
- baseline_alternatives (JSON)
- baseline_feedback
- score_history (JSON)
- created_at
- updated_at

---

## 4. API Goals (MVP)

- `POST /api/auth/google`
- `GET /api/auth/me`
- `POST /api/topics`
- `GET /api/topics`
- `POST /api/questions/generate`
- `GET /api/questions?topicId=...`
- `POST /api/submissions/text`
- `POST /api/vocabulary`
- `GET /api/vocabulary/categories`
- `GET /api/vocabulary?category=...`
- `GET /api/vocabulary/review/due`
- `POST /api/vocabulary/:id/review`
- `POST /api/expressions/generate`
- `POST /api/expressions/pool`
- `POST /api/expressions/next`
- `POST /api/expressions/attempt`
- `GET /api/expressions/history`
- `GET /api/expressions/review`
- `POST /api/expressions/review/:id/attempt`
- `GET /api/streaks/daily-talk`

All responses use the unified API envelope.

---

## 5. Reliability And Data Integrity

- PostgreSQL schema changes are managed through committed TypeORM migrations; runtime schema synchronization is disabled.
- Backend startup automatically applies pending migrations before accepting requests.
- User-owned records use non-null `user_id` foreign keys to `users`.
- Daily Talk persistence is atomic: answer log, knowledge item, mistake aggregates, and streak update commit together or roll back together.
- Alltagssprache serves existing prompts without waiting for bulk AI generation; low pools refill in a bounded background queue.
- Expression prompt deduplication is enforced by a normalized database unique index.
- Vocabulary ratings use row locks, preventing double-clicks or concurrent requests from advancing a card twice.
- Database-backed tests cover prompt races, vocabulary due isolation, concurrent reviews, and review-log persistence.

---

## 6. AI Responsibilities (MVP)

### Question generation
Input: topic (+ optional CEFR target)
Output: learner-facing German question.

### Answer analysis
Input: question + answer
Output (strict JSON):
- `errors[]`
- `cefrLevel`
- `correctedText`
- `contextualWordSuggestions[]`
- `tips[]`

### Alltagssprache generation
Input: optional `category`
Output:
- `englishText` (common everyday sentence/expression)

### Alltagssprache category list
Input: none
Output:
- `[{ id, label }]`

### Alltagssprache prompt pool generation
Input: `categories[]` + optional `countPerCategory`
Output:
- `promptsByCategory`
- `countPerCategory`
- `categories`

### Alltagssprache assessment
Input: `englishText` + user German answer
Output (strict JSON):
- `naturalnessScore` (0-100)
- `feedback` (specific, actionable)
- `nativeLikeVersion` (what a native speaker would say)
- `alternatives[]` (optional)

### Alltagssprache review assessment
Input: `englishText` + user German answer + baseline native-like version
Output (strict JSON):
- `naturalnessScore` (0-100)
- `feedback` (concise; can be empty if fully correct)

---

## 7. Knowledge Base + RAG Direction

MVP stores clean records first.
Next step uses those records for retrieval:
- Retrieve relevant past mistakes/questions/answers by topic and similarity.
- Inject retrieved context into future prompts.
- Make coaching increasingly familiar with your recurring patterns.
- Daily Talk assessments should use current answer + retrieved past context to detect repeated patterns (planned RAG step; not fully active yet).
- users
  - id
  - google_sub
  - email
  - display_name (optional)
  - avatar_url (optional)
  - created_at
