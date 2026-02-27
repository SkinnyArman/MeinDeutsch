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
    - System stores next due date and interval using lightweight SM-2 style scheduling.
- New feature: `Alltagssprache`
  - AI generates one common English everyday sentence/expression.
  - User writes the German equivalent.
  - AI evaluates naturalness as a score (0-100).
  - AI returns native-like German phrasing and alternatives.
  - Low scores are automatically added to a review queue.
  - Review mode re-tests weak items until they graduate.
  - No CEFR target selector for this feature.

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

### expression_prompts
- user_id
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
- `POST /api/vocabulary/:id/review`
- `POST /api/expressions/generate`
- `POST /api/expressions/attempt`
- `GET /api/expressions/history`
- `GET /api/expressions/review`
- `POST /api/expressions/review/:id/attempt`
- `GET /api/streaks/daily-talk`

All responses use the unified API envelope.

---

## 5. AI Responsibilities (MVP)

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
Input: none (or optional domain hint)
Output:
- `englishText` (common everyday sentence/expression)

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

## 6. Knowledge Base + RAG Direction

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
