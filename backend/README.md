# MeinDeutsch Backend

Express + TypeScript backend with PostgreSQL, TypeORM, and OpenAI analysis support.

## Product Direction (Must Keep)

This project is not just grammar correction. The core objective is a personalized German coach that becomes better calibrated to one learner over time.

Non-negotiable direction:
- Build a learner knowledge base that stores recurring mistakes, corrections, rewrites, performance snapshots, and drill outcomes.
- Add retrieval-augmented generation (RAG) so analysis/coaching prompts can pull relevant past context before generating feedback.
- Use this memory to adapt difficulty, detect stagnation, and prioritize the next exercises.

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

## Routes

- `GET /api/health`
- `POST /api/submissions/text`

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
curl -X POST http://localhost:4000/api/submissions/text \
  -H 'Content-Type: application/json' \
  -d '{
    "prompt": "Describe your weekend in German",
    "answerText": "Am Wochenende ich habe mit meine Freund gehen park."
  }'
```
