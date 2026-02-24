# PRD: MeinDeutsch MVP - Daily Talk

## 1. Objective

Build a personal German learning MVP where:
- Users authenticate with Google (whitelisted emails only).
- You add learning topics.
- AI generates questions tied to those topics.
- You answer those questions (Daily Talk response; frontend can hint to keep it short).
- The system stores: question, answer, mistakes, CEFR level, tips, corrected text, and contextual word suggestions.
- The stored history becomes a learner knowledge base for future RAG.

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
- created_at

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

---

## 6. Knowledge Base + RAG Direction

MVP stores clean records first.
Next step uses those records for retrieval:
- Retrieve relevant past mistakes/questions/answers by topic and similarity.
- Inject retrieved context into future prompts.
- Make coaching increasingly familiar with your recurring patterns.
- Daily Talk assessments should use current answer + past Q&As to detect repeated patterns.
- users
  - id
  - google_sub
  - email
  - display_name (optional)
  - avatar_url (optional)
  - created_at
