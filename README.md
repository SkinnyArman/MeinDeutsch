# MeinDeutsch

A personal German-learning app: Writing practice, Alltagssprache, Kollokationen, a
Gespräch (AI conversation) mode, Vocabulary SRS, a CEFR placement + progress system,
and a user-aware coach. Vue 3 + Vite frontend, Express + TypeScript + PostgreSQL backend.

## Run it (one command)

From this directory:

```bash
npm run dev
```

This starts the backend (port 4000) and the frontend (port 5173) together, with
prefixed `[backend]` / `[frontend]` logs. Ctrl-C stops both. Then open
http://localhost:5173.

Requires **PostgreSQL** running and reachable at the `DATABASE_URL` in `backend/.env`.
Backend startup auto-applies migrations.

### First-time setup

```bash
npm run install:all        # installs root + backend + frontend deps
cp backend/.env.example backend/.env      # then fill in values
cp frontend/.env.example frontend/.env
npm run dev
```

## Mobile (PWA)

The frontend is an installable PWA: manifest, icons, and a service worker are
generated at build time (`vite-plugin-pwa`). Once deployed over **HTTPS**, open
the site on your phone and use "Add to Home Screen" — it launches standalone
with the app icon.

- Updates: a "new version is ready" toast appears after deploys; the user
  applies it (no forced mid-exercise reloads).
- Caching: app shell + Google Fonts only. `/api` is never cached.
- Icons: regenerate with `npm --prefix frontend run icons` after changing the
  mark in `frontend/scripts/generate-icons.mjs`.
- Deployment note: serve the SPA and the API over HTTPS; if the API is on the
  same origin under `/api`, everything works out of the box (the service worker
  explicitly excludes `/api` from the SPA fallback).

## Other root commands

- `npm run check` — typecheck backend + frontend
- `npm test` — backend test suite (needs the PostgreSQL DB)
- `npm run migrate` — apply DB migrations manually

See `AGENTS.md` for architecture, conventions, and the change log.
