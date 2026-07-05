# Deploy MeinDeutsch Free on Render + Neon

Your frontend build is static, but it lives in `frontend/dist`, not root `dist`.
The Render error `Publish directory dist does not exist` means Render was looking
in the wrong folder or did not run the frontend build.

## Free Layout

- Frontend: Render Static Site
- Backend: Render Web Service, free plan
- Database: Neon Postgres, free plan

## Database First

Create a free Neon Postgres database and copy the pooled connection string.
Use it as backend `DATABASE_URL`.

## Option A: Render Blueprint

Use the checked-in `render.yaml`.

In Render:

1. New > Blueprint
2. Select this GitHub repo
3. Render should create:
   - `meindeutsch-api`
   - `meindeutsch-web`
4. Fill the `sync: false` environment variables.

Backend env values to fill:

```bash
DATABASE_URL=postgresql://...
ALLOWED_ORIGINS=https://YOUR_FRONTEND_ONRENDER_URL
GOOGLE_CLIENT_ID=your-google-client-id
OPENAI_API_KEY=your-openai-api-key
AUTH_PASSWORD=
```

Frontend env values to fill:

```bash
VITE_API_BASE_URL=https://YOUR_BACKEND_ONRENDER_URL
VITE_GOOGLE_CLIENT_ID=your-google-client-id
```

After both URLs exist, update backend `ALLOWED_ORIGINS` to the exact frontend URL.

## Option B: Manual Render Settings

If creating the frontend manually as a Static Site, use:

```text
Root Directory: frontend
Build Command: npm install && npm run build
Publish Directory: dist
```

If creating the backend manually as a Web Service, use:

```text
Root Directory: backend
Build Command: npm install && npm run build
Start Command: npm run start
Instance Type: Free
```

## Google OAuth

In Google Cloud Console, add the frontend URL to Authorized JavaScript origins:

```text
https://YOUR_FRONTEND_ONRENDER_URL
```

Use the same client ID in backend `GOOGLE_CLIENT_ID` and frontend
`VITE_GOOGLE_CLIENT_ID`.
