# Database Migrations

## Better Auth (user, session, account, verification)

Auth tables are created by the **Better Auth CLI**, not by the SQL files in this folder. Run:

```bash
cd backend
pnpm run auth:migrate
```

This creates the `user`, `session`, `account`, and `verification` tables. **Run this before the first app start** (or use Docker, which runs it automatically on backend startup).

To generate schema files (e.g. for reference) without applying:

```bash
pnpm run auth:generate
```

## App migrations (quotes, api_keys, etc.)

This directory contains SQL migration scripts for app tables. **The backend runs all `*.sql` files in this folder on startup** (sorted by name), after Better Auth tables exist. So:

1. Run `pnpm run auth:migrate` once (or let Docker do it).
2. Start the backend; it will run `000_initial_schema.sql`, `001_...`, etc.

### Migration files

- `000_initial_schema.sql` – Creates `quotes` and `api_keys` (references `user`).
- `001_add_role_to_users.sql` – Adds `role` column to `user` (Better Auth table).
- `002_add_speed_indexes.sql` – Indexes.
- `003_saved_quotes_and_likes.sql` – Saved/likes tables (reference `user`).
- `004_drop_quotes_tables.sql` – Drops old quote tables if present.

### Manual run (optional)

If you need to run app migrations yourself:

```bash
psql $DATABASE_URL -f backend/migrations/000_initial_schema.sql
# ... etc.
```

**Note:** Better Auth tables must already exist (run `pnpm run auth:migrate` first).

To reset only Postgres (drop data, rebuild on next start):  
`docker compose stop postgres && docker compose rm -f -v postgres && docker compose up -d --remove-orphans`
