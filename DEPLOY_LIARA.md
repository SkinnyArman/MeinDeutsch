# Deploy MeinDeutsch on Liara

MeinDeutsch deploys as three Liara resources:

- PostgreSQL database
- NodeJS backend from `backend/`
- Vue frontend from `frontend/`

## 1. Create PostgreSQL

Create a PostgreSQL database in Liara Console, then copy its connection URL.

You can also use the CLI:

```bash
liara db create -n meindeutsch-db -t postgresql
```

## 2. Deploy Backend

Create a NodeJS app in Liara, for example `meindeutsch-api`.

Set these environment variables on the backend app:

```bash
NODE_ENV=production
PORT=4000
DATABASE_URL=postgresql://...
APP_JWT_SECRET=replace-with-a-long-random-secret
ALLOWED_ORIGINS=https://YOUR_FRONTEND_URL
GOOGLE_CLIENT_ID=your-google-client-id
OPENAI_API_KEY=your-openai-api-key
OPENAI_MODEL=gpt-4o-mini
OPENAI_MODEL_SMART=gpt-4.1
AI_FALLBACK_ENABLED=false
AUTH_PASSWORD=
```

Deploy:

```bash
liara deploy --path ./backend --app meindeutsch-api --platform node --port 4000
```

Backend startup automatically runs the committed TypeORM migrations.
Allowed login emails live in `backend/src/config/authorized-emails.ts`.

## 3. Deploy Frontend

Create a Vue app in Liara, for example `meindeutsch-web`.

Set these environment variables on the frontend app before deploying:

```bash
VITE_API_BASE_URL=https://YOUR_BACKEND_URL
VITE_GOOGLE_CLIENT_ID=your-google-client-id
```

Deploy:

```bash
liara deploy --path ./frontend --app meindeutsch-web --platform vue --port 4173
```

## 4. Google OAuth

In Google Cloud Console, add the deployed frontend URL to Authorized JavaScript origins:

```text
https://YOUR_FRONTEND_URL
```

Use the same Google client ID in both:

- backend `GOOGLE_CLIENT_ID`
- frontend `VITE_GOOGLE_CLIENT_ID`

## 5. Quick Smoke Test

After both apps are deployed:

```bash
curl https://YOUR_BACKEND_URL/api/health
```

Then open the frontend URL and sign in.

## Notes

- Do not upload `.env`, `node_modules`, `dist`, or build folders.
- If Google is blocked from your network, set `AUTH_PASSWORD` on the backend and use the password fallback in the login screen.
- After the frontend URL is final, update backend `ALLOWED_ORIGINS` to that exact URL and redeploy or restart the backend.
