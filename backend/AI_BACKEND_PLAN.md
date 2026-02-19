# MeinDeutsch MVP Plan (AI + Backend)

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
- [ ] Add `knowledge_items` entity/table for KB entries

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
- [x] Update mistake aggregates

## 4) Knowledge Base Build (MVP)
- [ ] Create `knowledge_items` from topic/question/answer/mistake/tips records
- [ ] Add simple retrieval query by topic + recency
- [ ] Add API endpoint for KB inspection (`GET /api/knowledge`)

## 5) RAG Foundation (Next after MVP data is stable)
- [ ] Add embeddings for `knowledge_items`
- [ ] Store embedding vectors
- [ ] Retrieve top-k relevant memories for new prompts

## 6) Reliability
- [ ] Add integration tests for topic -> question -> submission pipeline
- [ ] Add contract tests for AI JSON schema (`errors`, `cefrLevel`, `tips`)
- [ ] Add retry/backoff for transient AI failures

## Current MVP Definition of Done
- [ ] I can create topics.
- [ ] AI can generate questions tied to a topic.
- [ ] I can submit answers for those questions.
- [ ] System persists question, answer, mistakes, CEFR, tips.
- [ ] KB entries are generated from stored learning records.
