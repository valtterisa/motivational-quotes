# Motivational Quotes API

API and web app for motivational quotes: auth, feed, dashboard (my quotes, liked, saved), and a public API (API key) for use on your own site. Postgres for auth, MongoDB for content, Redis for cache and rate limiting. All services run locally via Docker Compose.

## Features

- **Auth**: Email/password signup and login via [Better Auth](https://www.better-auth.com/) (session in HTTP-only cookie)
- **RBAC**: Admin and user roles
- **API keys**: Create and revoke from the dashboard; use in the public API
- **Feed**: Browse quotes, like and save (optional auth). Sort by newest (cursor) or popular (offset)
- **Dashboard**: CRUD your quotes, view liked and saved
- **Public API**: `GET /api/v1/quotes/random` and `GET /api/v1/quotes` (author, cursor, limit) with `X-API-Key`
- **Rate limiting**: Redis-backed, per IP and per API key
- **Caching**: Redis for random quote (60s) and by-author list (5 min)
- **CORS**: Configurable allowed origins

## Tech stack

- **Backend**: Fastify, TypeScript, Better Auth (Postgres for users + sessions), Drizzle (Postgres for API keys), MongoDB for quotes/likes/saves, Redis (cache, rate limit)
- **Frontend**: React, Vite, React Router, TypeScript
- **Local stack**: Postgres, Redis, and MongoDB run as Docker Compose services; no external DBs required.

## Getting started

### Prerequisites

- Docker and Docker Compose
- For running backend/frontend on host: Node.js 20+, pnpm 10.17.1+

### Env and run

1. Clone and install (if running on host):

```bash
git clone <repo-url>
cd motivational-quotes
pnpm install
```

2. Copy env and set required values:

```bash
cp .env.example .env
```

Set at least: `POSTGRES_PASSWORD`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`. Optionally `POSTGRES_USER`, `POSTGRES_DB`, `CORS_ORIGINS`, `VITE_API_BASE_URL`. See `.env.example`.

3. Run everything locally (Postgres, Redis, MongoDB, backend, frontend):

```bash
docker compose up --build
```

On first start, the backend container runs **Better Auth migrations** (`pnpm run auth:migrate`) to create auth tables (`user`, `session`, `account`, `verification`), then app migrations, then seeds the DB from `english_quotes/quotes.jsonl` if the quotes collection is empty. If `quotes.jsonl` is in Git LFS, run `git lfs pull` before `docker compose build`. First start may take a moment for Postgres to become ready; if the backend exits once, run `docker compose up` again.

- Frontend: http://localhost:3000 (or `FRONTEND_PORT`)
- Backend: http://localhost:3001 (or `BACKEND_PORT`)
- OpenAPI: http://localhost:3001/docs

**Option B – Backend and frontend on host (DBs in Docker)**

Start only the data services:

```bash
docker compose up -d postgres redis mongodb
```

In `.env` set `DATABASE_URL`, `REDIS_URL`, `MONGODB_URI` to reach localhost (e.g. `postgres://app:yourpassword@localhost:5432/quotes`, `redis://localhost:6379`, `mongodb://localhost:27017/content`). Then:

Terminal 1 (backend):

```bash
cd backend && pnpm dev
```

Terminal 2 (frontend):

```bash
cd frontend && pnpm dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:3001
- OpenAPI: http://localhost:3001/docs

To seed manually (e.g. when not using Docker): run `pnpm seed` from repo root or `pnpm seed` in the backend directory. Requires MongoDB running and `.env` with `DATABASE_URL`, `MONGODB_URI`, etc.

### Better Auth CLI (schema and migrations)

Auth tables are created by the [Better Auth CLI](https://www.better-auth.com/docs/concepts/cli), not by the SQL files in `backend/migrations/`. Use these commands from the **backend** directory:

| Command | Description |
|--------|-------------|
| `pnpm run auth:migrate` | Create or update auth tables (`user`, `session`, `account`, `verification`). **Run before first app start** when not using Docker. |
| `pnpm run auth:generate` | Generate schema (e.g. SQL or Drizzle) for reference; does not apply changes. |

**With Docker:** the backend container runs `auth:migrate` automatically on every start, so auth tables are created or updated without running the command yourself.

**Without Docker:** run once before starting the backend:

```bash
cd backend
pnpm run auth:migrate
```

Requires `DATABASE_URL`, `BETTER_AUTH_SECRET`, and `BETTER_AUTH_URL` in `.env`.

## API overview

Base URL for API: `http://localhost:3001` (or your backend URL).

| Area       | Auth       | Paths                                                                                                        |
| ---------- | ---------- | ------------------------------------------------------------------------------------------------------------ |
| Health     | —          | `GET /health`                                                                                                |
| Auth       | —          | Better Auth at `/auth/*`: sign-up, sign-in, get-session, sign-out (session cookie)                           |
| API keys   | Session    | `GET /dashboard/api-keys`, `POST /dashboard/api-keys`, `POST /dashboard/api-keys/:id/revoke`                 |
| Feed       | Optional   | `GET /api/v1/feed`, `POST/DELETE /api/v1/feed/likes/:quoteId`, `POST/DELETE /api/v1/feed/saved/:quoteId`     |
| Dashboard  | Session    | `GET/POST/PUT/DELETE /api/v1/dashboard/quotes`, `GET /api/v1/dashboard/liked`, `GET /api/v1/dashboard/saved` |
| Public API | X-API-Key  | `GET /api/v1/quotes/random`, `GET /api/v1/quotes?author=&cursor=&limit=`                                     |

- **Public API** (API key): read-only; for embedding on your site.
- **Feed / dashboard**: session cookie; feed is browsable without auth, with optional like/save when logged in.

Full OpenAPI spec and Swagger UI: `GET /docs` on the backend.

## Rate limiting

- `/api/v1/*`: 100 req / 15 min per API key or IP
- `/auth/*`: 10 req / 15 min per IP

Response headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`. On exceed: `429` with `retryAfter`.

## Security

- CORS allowlist (`CORS_ORIGINS`)
- Better Auth (session cookie, configurable trusted origins; password hashing handled by Better Auth)
- API keys stored hashed (SHA-256)
- @fastify/helmet
- Rate limiting

## Tests

```bash
cd backend && pnpm test
cd frontend && pnpm test
```

## Project structure

```
motivational-quotes/
├── backend/                 # API – Dockerfile
│   ├── src/                 # app, auth (Better Auth), config, db (Drizzle), redis, middleware, modules, store (MongoDB)
│   ├── migrations/          # Postgres migrations
│   └── Dockerfile
├── frontend/                # Web app – Dockerfile
│   ├── src/
│   └── Dockerfile
├── docker-compose.yml       # Postgres, Redis, MongoDB, backend, frontend (all local)
├── english_quotes/          # Source data (e.g. quotes.jsonl for seeding)
└── .env.example
```

## License

ISC
