# PRD: Arman’s German Performance Tracker & AI Coach

## 1. Objective

Build a **personal AI-powered German training system** that:

- Tracks and measures your writing and speaking performance.
- Detects recurring mistakes and grammar weaknesses.
- Adapts exercise difficulty automatically based on performance.
- Provides AI-driven coaching, native rewrites, and vocabulary suggestions.
- Increases workload if stagnation is detected.
- Locks mastered drills to push complexity.
- Maintains a structured history of mistakes, metrics, and progress.

> **Key Principle:** AI analyzes, backend decides. Personal routine > generic flashcards.

---

## 2. Key Features (Backend + AI)

### 2.1 Submission Processing

1. User submits **text** or **voice**.
2. Voice → text via **Whisper API** (optional future feature).
3. Send to **AI analysis**.

### 2.2 AI Layer

**Responsibilities:**

- Structured Analysis:

  - Detect grammar errors: articles, cases, prepositions, word order.
  - Detect sentence complexity: clause depth, subordinate clauses, sentence length.
  - Vocabulary: overused words, weak words, CEFR level.
  - Fluency (speaking): filler words, pauses, repetition.

- Coaching:

  - Corrected version.
  - Native rewrite.
  - Suggested new words (B2+ level, not previously mastered).
  - Mini coaching tips.

- Drill Generation (Phase 2):
  - Generate targeted exercises based on top recurring mistakes and severity.
  - Adjust difficulty according to mastery scores.

**Output:** JSON with metrics, errors, suggested exercises.

---

### 2.3 Backend Layer

**Responsibilities:**

- **Parse AI JSON** → structured mistake types.
- **Update DB**:
  - `mistake_stats`: frequency, severity, mastery_score
  - `performance_snapshots`: grammar accuracy, lexical diversity, sentence complexity
  - `drill_history`: exercise type, difficulty, success rate
- **Performance State Engine**:
  - Growth / Plateau / Stagnation / Mastery
  - Detect stagnation automatically.
- **Adaptive Routine Engine**:

  - Increase workload if stagnating.
  - Lock mastered drills; push complexity.
  - Decide next exercise difficulty.

- **Optional RAG / Vector Retrieval** (Phase 2):
  - Store embeddings of past answers, feedback.
  - Retrieve similar past answers to detect patterns.
  - Provide contextual memory for coaching prompts.

**Key Principle:** Backend owns the “what happens next” logic.

---

### 2.4 Metrics & Tracking

- Grammar accuracy (article, case, word order)
- Avg sentence length
- Subordinate clause usage %
- Lexical diversity
- CEFR word distribution
- Filler words (speaking)
- Mistake severity & recurrence
- Drill completion & mastery score
- Weekly progress summary (optional dashboard later)

---

## 3. Mistake Taxonomy

Core categories:

- `article_gender`
- `article_case`
- `dative_preposition`
- `accusative_preposition`
- `main_clause_word_order`
- `subordinate_clause_word_order`
- `weak_connector`
- `connector_repetition`
- `weak_adjective`
- `limited_vocabulary_range`
- `tense_shift_error`
- `filler_word`
- `overuse_simple_sentence`

> Every detected mistake must map to one of these for tracking and adaptive drills.

---

## 4. Tech Stack

### Backend

- **Node.js + TypeScript**  
  Framework: Fastify (lightweight, fast)
- **AI integration:** OpenAI API (GPT-4o for analysis + coaching, embeddings for vector search)
- **Optional Speech-to-Text:** OpenAI Whisper API
- **Database:** Supabase (Postgres + pgvector)
- **Deployment:** Vercel or Railway (personal scale)

### Data Models

**mistake_stats**

| Field          | Type      | Description                |
| -------------- | --------- | -------------------------- |
| mistake_type   | string    | One of taxonomy items      |
| frequency      | integer   | Total occurrences          |
| last_seen      | timestamp | Last time mistake appeared |
| severity_score | float     | Calculated severity        |
| mastery_score  | float     | 0–100                      |

**performance_snapshots**

| Field               | Type      | Description                             |
| ------------------- | --------- | --------------------------------------- |
| date                | timestamp | Snapshot date                           |
| grammar_accuracy    | float     | 0–1                                     |
| lexical_diversity   | float     | 0–1                                     |
| avg_sentence_length | float     | Words per sentence                      |
| clause_depth        | float     | Average clauses per sentence            |
| state               | enum      | Growth / Plateau / Stagnation / Mastery |

**answer_logs**

| Field          | Type      | Description          |
| -------------- | --------- | -------------------- |
| prompt         | text      | Original prompt      |
| answer_text    | text      | User submission      |
| corrected_text | text      | AI-corrected version |
| error_types    | JSON      | Detected mistakes    |
| metrics        | JSON      | Calculated metrics   |
| timestamp      | timestamp | Submission time      |

**drill_history**

| Field        | Type      | Description                     |
| ------------ | --------- | ------------------------------- |
| drill_type   | string    | Grammar / Vocabulary / Speaking |
| difficulty   | int       | 1–5                             |
| success_rate | float     | 0–1                             |
| timestamp    | timestamp | Completion time                 |

---

## 5. Workflow Overview
