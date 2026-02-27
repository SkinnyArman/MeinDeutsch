# MeinDeutsch MVP Plan

Use this checklist and mark done items as `- [x]`.

## 0) Baseline
- [x] Express + TypeScript backend scaffolded
- [x] TypeORM + PostgreSQL connected
- [x] Unified API response envelope
- [x] Submission endpoint wired

## 1) Narrow MVP Data Model
- [x] Add `topics` entity/table
- [x] Add `questions` entity/table (linked to topic)
- [x] Keep `answer_logs` for question + answer + mistakes + CEFR + tips
- [x] Keep `mistake_stats` aggregate (frequency + severity)
- [x] Add `knowledge_items` entity/table for KB entries

## 2) Topic + Question Flow
- [x] `POST /api/topics`
- [x] `GET /api/topics`
- [x] `POST /api/questions/generate` (AI-generated from topic)
- [x] `GET /api/questions` (filter by topic)

## 3) Submission + Analysis Flow
- [x] Accept `questionId` in submission payload (plus compatibility for text prompt)
- [x] Store answer text
- [x] Store mistakes
- [x] Store CEFR level
- [x] Store tips
- [x] Store corrected text
- [x] Store contextual word suggestions
- [x] Update mistake aggregates
- [ ] Feed retrieved past Q&As + mistake/tip history into answer analysis context (currently stored but not injected in prompt)

## 4) Knowledge Base Build (MVP)
- [x] Create `knowledge_items` from topic/question/answer/mistake/tips records
- [x] Add simple retrieval query by topic + recency
- [x] Add API endpoint for KB inspection (`GET /api/knowledge`)

## 5) RAG Foundation (Next after MVP data is stable)
- [ ] Add embeddings for `knowledge_items`
- [ ] Store embedding vectors
- [ ] Retrieve top-k relevant memories for new prompts

## 6) Alltagssprache (Implemented)
- [x] `POST /api/expressions/generate` for B2+ everyday expressions
- [x] `POST /api/expressions/attempt` with naturalness scoring (0-100)
- [x] Persist native-like version and alternatives
- [x] `GET /api/expressions/history` with pagination metadata
- [x] Auto-enqueue weak attempts into review queue (`<= 70`)
- [x] `GET /api/expressions/review` for due review items
- [x] `POST /api/expressions/review/:id/attempt` for review checks
- [x] Review graduation rule: requires two successful review scores (`>= 90`)
- [x] Persist review score history (`score_history`)

## 7) Vocabulary SRS (Implemented)
- [x] Save vocabulary from contextual suggestions
- [x] Category list + icon metadata
- [x] SRS ratings (`1 Again`, `2 Hard`, `3 Good`, `4 Easy`)
- [x] Due-date scheduling with lightweight SM-2 style logic
- [x] Backend due-guard (reject reviews before due time)

## 8) Auth + User Isolation (Implemented)
- [x] Google auth (`POST /api/auth/google`)
- [x] Whitelist-based account access
- [x] Protected `GET /api/auth/me`
- [x] User-scoped repository filters across major features

## 9) Reliability
- [x] Add backend unit tests for SRS logic
- [x] Add backend unit tests for Alltag review transition logic
- [x] Add service-level tests for user scoping guarantees
- [ ] Add integration tests for topic -> question -> submission pipeline
- [ ] Add contract tests for AI JSON schema (`errors`, `cefrLevel`, `correctedText`, `contextualWordSuggestions`, `tips`)
- [ ] Add retry/backoff for transient AI failures

## Current MVP Definition of Done
- [x] I can create topics.
- [x] AI can generate questions tied to a topic.
- [x] I can submit answers for those questions.
- [x] System persists question, answer, mistakes, CEFR, corrected text, contextual word suggestions, tips.
- [x] KB entries are generated from stored learning records.
- [ ] AI assessment uses retrieved past Q&A context for personalization (RAG phase).
