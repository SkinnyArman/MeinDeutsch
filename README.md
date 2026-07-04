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

## Other root commands

- `npm run check` — typecheck backend + frontend
- `npm test` — backend test suite (needs the PostgreSQL DB)
- `npm run migrate` — apply DB migrations manually

See `AGENTS.md` for architecture, conventions, and the change log.
