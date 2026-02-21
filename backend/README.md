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

In development, TypeORM runs with `synchronize: true` and creates/updates tables from entities automatically.

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
