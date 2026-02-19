# MeinDeutsch AI + Backend Plan

Use this file as the execution checklist.  
Rule: when a task is complete, change `- [ ]` to `- [x]`.

## 0) Baseline (Already Done)
- [x] Express + TypeScript backend scaffolded
- [x] TypeORM + PostgreSQL wired
- [x] Unified API response envelope
- [x] `POST /api/submissions/text` and `GET /api/health`
- [x] Frontend API trigger page scaffolded

## 1) Core Data Model for Personalization
- [ ] Add `performance_snapshots` entity/table
- [ ] Add `drill_history` entity/table
- [ ] Add `mistake_events` table (per-error event log, not only aggregates)
- [ ] Add `knowledge_items` table (facts about user weaknesses/strengths)
- [ ] Add `memory_chunks` table (text chunks for retrieval context)
- [ ] Add `memory_embeddings` table (vector column, pgvector)
- [ ] Add TypeORM migrations (replace `synchronize` for production-safe schema)

## 2) AI Contracts and Prompting
- [ ] Define strict AI JSON schema v1 (analysis + coaching + vocabulary suggestions)
- [ ] Add response validation guard with retry-on-invalid-JSON policy
- [ ] Separate prompt templates into files (`analysis`, `coaching`, `drill-generation`)
- [ ] Add prompt versioning in logs (`prompt_version`)

## 3) Submission Ingestion Pipeline
- [ ] Persist raw submission + normalized text
- [ ] Persist structured errors as `mistake_events`
- [ ] Update `mistake_stats` aggregate from events (single source of truth = events)
- [ ] Store corrected text + native rewrite + coaching tips
- [ ] Compute and store snapshot metrics per submission

## 4) RAG Foundation (Knowledge Base)
- [ ] Enable `pgvector` extension
- [ ] Create embedding service wrapper
- [ ] Chunk historical learner data for retrieval
- [ ] Generate/store embeddings for each chunk
- [ ] Build retrieval query (top-k semantic + optional recency weighting)
- [ ] Add retrieval trace logging (`retrieval_log`) for debugging quality

## 5) Personalized Coaching with Memory
- [ ] Build `buildCoachingContext(userId)` service (mistakes + recent trends + retrieved memories)
- [ ] Inject retrieved context into AI analysis/coaching prompt
- [ ] Ensure AI suggestions avoid already-mastered vocabulary/drills
- [ ] Add “why this feedback” trace metadata for transparency

## 6) Performance State Engine
- [ ] Implement state classification: `Growth | Plateau | Stagnation | Mastery`
- [ ] Define thresholds/windows (e.g., last 7/14 submissions)
- [ ] Persist state transitions
- [ ] Trigger workload increase policy on stagnation

## 7) Adaptive Routine Engine
- [ ] Implement drill selection policy based on top recurring mistakes
- [ ] Lock mastered drills automatically
- [ ] Increase complexity after stable mastery
- [ ] Add API: `GET /api/routine/next`

## 8) Drill Generation (AI-Assisted)
- [ ] Add AI drill generator endpoint/service
- [ ] Generate drills by mistake type + difficulty
- [ ] Validate generated drills to avoid malformed tasks
- [ ] Store drill attempts + success rate updates

## 9) API Surface Expansion
- [ ] `GET /api/progress/summary`
- [ ] `GET /api/mistakes/top`
- [ ] `GET /api/history/submissions`
- [ ] `POST /api/drills/:id/attempt`
- [ ] `GET /api/routine/next`

## 10) Reliability, Observability, Cost Controls
- [ ] Add structured request logs with latency + endpoint + failure code
- [ ] Add AI call metrics (tokens, cost estimate, failure rate)
- [ ] Add rate limiting for submission endpoints
- [ ] Add retry/backoff policy for transient AI failures
- [ ] Add feature flags (`AI_FALLBACK_ENABLED`, `RAG_ENABLED`, `ADAPTIVE_ROUTINE_ENABLED`)

## 11) Security and Privacy
- [ ] Move to user-scoped data model (`user_id` on all learner tables)
- [ ] Add auth strategy (simple JWT/session for personal app)
- [ ] Add data retention policy and delete endpoint
- [ ] Scrub secrets from logs and audit env usage

## 12) Test Strategy
- [ ] Unit tests for: state engine, mastery logic, routine selector
- [ ] Integration tests for submission flow + DB writes
- [ ] Contract tests for AI JSON schema parsing/validation
- [ ] End-to-end smoke test from frontend trigger to DB persistence

## Next Milestone (Build Order)
- [ ] M1: Data model extensions + migrations
- [ ] M2: Event-driven ingestion + snapshots
- [ ] M3: RAG storage + retrieval service
- [ ] M4: Personalized coaching with retrieved context
- [ ] M5: State engine + adaptive routine API
