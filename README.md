# Motivational Quotes

**A full-stack web app and public API** for browsing, curating, and serving motivational quotes. Built to learn backend systems: auth, databases, caching, rate limiting, and API design.

---

## Motivation

I wanted to learn more about building backend systems, so I built this. It’s a single project that ties together: session-based auth ([Better Auth](https://www.better-auth.com/)), Postgres and MongoDB, Redis for cache and rate limits, a React frontend, and a key-protected public API. You get a real feed and dashboard, plus an API you can plug into your own site.

---

## Features

| Area | What you get |
|------|----------------|
| **Auth** | Email/password signup and login via Better Auth (session in HTTP-only cookie). |
| **Roles** | Admin and user (RBAC). |
| **API keys** | Create and revoke from the dashboard; use in the public API. |
| **Feed** | Browse quotes, like and save (optional auth). Sort by newest (cursor) or popular (offset). |
| **Dashboard** | CRUD your quotes, view liked and saved. |
| **Public API** | `GET /api/v1/quotes/random` and `GET /api/v1/quotes` (author, cursor, limit) with `X-API-Key`. |
| **Rate limiting** | Redis-backed, per IP and per API key. |
| **Caching** | Redis for random quote (60s) and by-author list (5 min). |
| **CORS** | Configurable allowed origins. |

---

## Tech stack

| Layer | Stack |
|-------|--------|
| **Backend** | Fastify, TypeScript, [Better Auth](https://www.better-auth.com/) (Postgres: users + sessions), Drizzle (Postgres: API keys), MongoDB (quotes, likes, saves), Redis (cache, rate limit). |
| **Frontend** | React, Vite, React Router, TypeScript. |
| **Local run** | Postgres, Redis, MongoDB, backend, frontend via Docker Compose; no external DBs required. |

---

## Getting started

### Prerequisites

- **Docker and Docker Compose** for running the full stack.
- **Node.js 20+ and pnpm 10.17.1+** if you run backend/frontend on the host.

### 1. Clone and install (when running on host)

```bash
git clone <repo-url>
cd motivational-quotes
pnpm install
```

### 2. Environment

Copy the example env and set at least the required values:

```bash
cp .env.example .env
```

**Required:** `POSTGRES_PASSWORD`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`.

**Optional:** `POSTGRES_USER`, `POSTGRES_DB`, `CORS_ORIGINS`, `VITE_API_BASE_URL`. See `.env.example` for the full list.

### 3. Run

**Option A – Everything in Docker (recommended)**

```bash
docker compose up --build
```

On first start the backend:

1. Runs **Better Auth migrations** (creates `user`, `session`, `account`, `verification` in Postgres).
2. Runs **app migrations** (quotes, api_keys, etc.).
3. Seeds from `english_quotes/quotes.jsonl` if the quotes collection is empty.

If `quotes.jsonl` is in Git LFS, run `git lfs pull` before `docker compose build`. If the backend exits once while Postgres is starting, run `docker compose up` again.

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 (or `FRONTEND_PORT`) |
| Backend | http://localhost:3001 (or `BACKEND_PORT`) |
| OpenAPI / Swagger | http://localhost:3001/docs |

**Option B – Backend and frontend on host, DBs in Docker**

Start only data services:

```bash
docker compose up -d postgres redis mongodb
```

In `.env`, point to localhost (e.g. `DATABASE_URL=postgres://app:yourpassword@localhost:5432/quotes`, `REDIS_URL=redis://localhost:6379`, `MONGODB_URI=mongodb://localhost:27017/content`).

Then:

```bash
# Terminal 1 – backend
cd backend && pnpm dev

# Terminal 2 – frontend
cd frontend && pnpm dev
```

- Frontend: http://localhost:5173  
- Backend: http://localhost:3001  
- OpenAPI: http://localhost:3001/docs  

**Manual seed (when not using full Docker stack):** from repo root or `backend`: `pnpm seed`. Requires MongoDB and `.env` with `DATABASE_URL`, `MONGODB_URI`, etc.

### Better Auth and migrations

Auth tables are created by the backend at startup via Better Auth’s programmatic migrations (no CLI step when using Docker). App tables use SQL in `backend/migrations/`.

If you run the backend **without Docker**, ensure Postgres is up and `DATABASE_URL`, `BETTER_AUTH_SECRET`, and `BETTER_AUTH_URL` are set in `.env`; the backend will run both Better Auth and app migrations on start.

| Command (from `backend/`) | Description |
|---------------------------|-------------|
| `pnpm run auth:generate` | Generate Better Auth schema (e.g. SQL) for reference; does not apply. |
| `pnpm run auth:migrate` | CLI migrate (optional; backend already runs auth migrations on startup). |

---

## API overview

Base URL: `http://localhost:3001` (or your backend URL).

| Area | Auth | Paths |
|------|------|--------|
| Health | — | `GET /health` |
| Auth | — | Better Auth at `/auth/*`: sign-up, sign-in, get-session, sign-out (session cookie) |
| API keys | Session | `GET /dashboard/api-keys`, `POST /dashboard/api-keys`, `POST /dashboard/api-keys/:id/revoke` |
| Feed | Optional | `GET /api/v1/feed`, `POST/DELETE /api/v1/feed/likes/:quoteId`, `POST/DELETE /api/v1/feed/saved/:quoteId` |
| Dashboard | Session | `GET/POST/PUT/DELETE /api/v1/dashboard/quotes`, `GET /api/v1/dashboard/liked`, `GET /api/v1/dashboard/saved` |
| Public API | X-API-Key | `GET /api/v1/quotes/random`, `GET /api/v1/quotes?author=&cursor=&limit=` |

- **Public API:** read-only; use your API key (e.g. in `X-API-Key` header) to embed on your site.
- **Feed / dashboard:** session cookie; feed is browsable without auth; like/save require login.

Full OpenAPI spec and Swagger UI: `GET /docs` on the backend.

---

## Rate limiting

| Scope | Limit |
|-------|--------|
| `/api/v1/*` | 100 requests / 15 min per API key or IP |
| `/auth/*` | 10 requests / 15 min per IP |

Responses include `X-RateLimit-Limit`, `X-RateLimit-Remaining`. On exceed: `429` with `retryAfter`.

---

## Security

- CORS allowlist (`CORS_ORIGINS`)
- Better Auth: session cookie, configurable trusted origins; password hashing by Better Auth
- API keys stored hashed (SHA-256)
- @fastify/helmet
- Rate limiting (see above)

---

## Tests

```bash
cd backend && pnpm test
cd frontend && pnpm test
```

---

## Project structure

```
motivational-quotes/
├── backend/              # Fastify API (Dockerfile)
│   ├── src/               # app, auth (Better Auth), config, db (Drizzle), redis,
│   │                      # middleware, modules, store (MongoDB)
│   ├── migrations/        # Postgres app migrations
│   └── Dockerfile
├── frontend/              # React web app (Dockerfile)
│   ├── src/
│   └── Dockerfile
├── docker-compose.yml     # Postgres, Redis, MongoDB, backend, frontend
├── english_quotes/        # Source data (e.g. quotes.jsonl for seeding)
└── .env.example
```

---

## License

ISC
