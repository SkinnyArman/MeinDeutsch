# MeinDeutsch Backend

Express + TypeScript backend with PostgreSQL, TypeORM, and OpenAI analysis support.

## Product Direction (Must Keep)

This project is not just grammar correction. The core objective is a personalized German coach that becomes better calibrated to one learner over time.

Non-negotiable direction:
- Store a clean learner record for each cycle: topic -> question -> answer -> mistakes + CEFR + tips.
- Build a learner knowledge base from those records.
- Add retrieval-augmented generation (RAG) on top of that knowledge base so prompts can use relevant past context.

## Setup

1. Copy env file:

```bash
cp .env.example .env
```

2. Start PostgreSQL and create the database in `DATABASE_URL`.

3. Install and run:

```bash
npm install
npm run dev
```

TypeORM schema synchronization is disabled in every environment. Backend startup automatically applies committed migrations before accepting requests.

Migration commands are also available for deployment and maintenance:

```bash
npm run migration:run
npm run migration:revert
```

Auth: Google sign-in is the primary method. Because Google endpoints can be blocked by
network/region (403 on `accounts.google.com` in the browser or `googleapis.com` cert
fetch on the server), an optional Google-free fallback exists: set `AUTH_PASSWORD`
(min 8 chars) in `.env` and `POST /api/auth/password` with an email listed in
`src/config/authorized-emails.ts` + that password issues the same app JWT. Failed
attempts are throttled (5 per 15 minutes per email). Leave `AUTH_PASSWORD` empty to
disable.

User-owned tables enforce non-null foreign keys to `users`. The shared Alltagssprache prompt pool is the exception: a prompt may keep an optional creator reference, while views, attempts, and review records remain user-owned.

Daily Talk persistence is transactional. The answer log, knowledge item, mistake aggregates, and streak update either all commit or all roll back.

Alltagssprache prompt delivery does not wait for bulk pool generation. Existing prompts are returned immediately, while category refills run in a deduplicated, concurrency-limited background queue.

Expression prompt uniqueness is enforced by PostgreSQL using normalized English text plus category. Repository inserts use `ON CONFLICT`, so parallel pool workers resolve to the same prompt instead of racing.

Vocabulary review:
- `GET /api/vocabulary/review/due` returns the authenticated user's due queue, total due count, and next review time.
- The frontend review session asks for recall before revealing definitions and examples.
- `Again` schedules a 10-minute relearning step; Hard/Good/Easy schedule longer intervals.
- Ratings lock the vocabulary row in a transaction and append an immutable `vocabulary_review_logs` record.

## Tests

`npm test` requires the configured PostgreSQL database. In addition to unit tests, it creates temporary users and records to verify real database constraints, concurrency behavior, due-card isolation, and transactional review writes. Test data is removed afterward.

AI behavior:
- `AI_FALLBACK_ENABLED=false` (default): OpenAI failures return an API error response.
- `AI_FALLBACK_ENABLED=true`: API uses local fallback analysis when OpenAI fails.

Question generation template:
- Backend-owned template lives in `backend/src/constants/question-generation-template.ts`.
- Client does not send generation prompt each time.

## Routes

- `GET /api/health`
- `POST /api/topics`
- `GET /api/topics`
- `POST /api/questions/generate`
- `GET /api/questions`
- `GET /api/knowledge`
- `GET /api/streaks/daily-talk`
- `POST /api/submissions/text`
- `GET /api/submissions`
- `GET /api/submissions/:id`

## Unified API Response Shape

All endpoints return:

```json
{
  "success": true,
  "message": "string",
  "data": {},
  "error": null,
  "meta": {
    "requestId": "uuid",
    "timestamp": "ISO-8601"
  }
}
```

Error responses use the same envelope:

```json
{
  "success": false,
  "message": "string",
  "data": null,
  "error": {
    "code": "ERROR_CODE",
    "details": {}
  },
  "meta": {
    "requestId": "uuid",
    "timestamp": "ISO-8601"
  }
}
```

### Example request

```bash
curl -X POST http://localhost:4000/api/topics \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "Nature",
    "description": "Conversations about environment and forests"
  }'
```

```bash
curl -X POST http://localhost:4000/api/questions/generate \
  -H 'Content-Type: application/json' \
  -d '{
    "topicId": 1,
    "cefrTarget": "B1"
  }'
```

```bash
curl -X POST http://localhost:4000/api/submissions/text \
  -H 'Content-Type: application/json' \
  -d '{
    "questionId": 1,
    "answerText": "Ich denke, dass die Natur in meiner Stadt besser geschützt werden sollte."
  }'
```
