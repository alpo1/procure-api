# CLAUDE.md — Procure API

Context for AI-assisted work on this repo. Read this before writing or changing code.

## What this is

A REST API for managing suppliers and purchase orders. Node.js + TypeScript (`strict`),
Express, PostgreSQL (Neon) for the transactional core, MongoDB (Atlas) for an audit log.
The procurement domain is deliberate — it justifies the two-database design.

## Commands

- `npm run dev` — start the API with ts-node-dev (watch mode)
- `npm run build` — compile TypeScript to `dist/` (must pass under `strict`)
- `npm run migrate` — apply `src/db/schema.sql` (create Postgres tables)
- `npm test` — Jest + Supertest suite
- `npm start` — run the compiled build from `dist/`

## Project layout

```
src/
  config/      env (zod-validated), postgres (pool), mongo (mongoose)
  db/          schema.sql, migrate.ts
  errors/      AppError
  utils/       asyncHandler
  middleware/  validate (validateBody), require-auth (requireAuth, requireRole)
  validators/  zod schemas per resource
  repositories/ SQL only — the ONLY layer that talks to Postgres
  services/    business logic
  controllers/ thin request/response orchestration
  routes/      route definitions + middleware wiring
  models/      Mongoose models (audit log)
  types/       express.d.ts (declaration merging for req.user)
  app.ts       Express app (no port) — imported by tests
  server.ts    connects DBs, then listens
```

## Architecture conventions (follow these; they are the de facto standard)

- **Layering:** routes → controller → service → repository. Keep each layer thin
  and single-purpose. New resources follow the suppliers/orders pattern exactly.
- **Errors:** throw `AppError(statusCode, message)`. The central error handler in
  `app.ts` turns it into the HTTP response. Do not build ad-hoc error responses in
  controllers.
- **Async routes:** wrap async handlers in `asyncHandler(...)` so rejections reach
  the error handler (Express 4 does not forward them automatically).
- **Validation:** use zod schemas in `validators/` via the `validateBody(schema)`
  middleware. Controllers assume the body is already validated.
- **IDs from the URL:** validate with `parseId` (positive integer → number, else 400).
- **Never expose password_hash.** Strip it in SQL (`RETURNING id, email, role, ...`)
  and type public shapes as `Omit<UserRow, "password_hash">`.
- **req.user typing:** extended via declaration merging in `src/types/express.d.ts`.
  Never use `(req as any).user`.

## Database rules

- **Postgres = transactional core** (users, suppliers, purchase_orders, order_items).
  All queries **parameterized** (`$1, $2`) via the shared `pool`/`query`. Never
  string-concatenate user input into SQL.
- **Transactions** (e.g. create order + items): take a dedicated client with
  `pool.connect()`, run `BEGIN` → work → `COMMIT`, `ROLLBACK` in `catch`, and
  **always** `client.release()` in `finally`. Do NOT use the shared `query()` inside
  a transaction (it grabs an arbitrary pooled connection).
- **Money is `NUMERIC(12,2)`** and comes back from `pg` as a **string**. Keep it a
  string end-to-end; never round-trip through float.
- **MongoDB = append-only audit log** (who/what/when). Writes are **fire-and-forget**:
  `recordAudit(...)` must catch its own errors and NEVER throw into the caller — a
  failed audit write must not break the main operation. Call it AFTER the Postgres
  operation succeeds, never inside a transaction.

## Security rules (do not regress these)

- **Never trust the client** for server-owned fields: compute order `total` on the
  server from the items; take `created_by` from `req.user.id`, not the request body.
- **Registration always creates role `buyer`.** Admin is granted out-of-band (SQL).
  Never let the API set an arbitrary role from user input.
- **Write operations are admin-only** (`requireAuth` + `requireRole("admin")`); reads
  are for any authenticated user. Match the suppliers/orders routers.
- **Login returns a generic 401** ("Invalid email or password") for both wrong
  password and unknown email — don't leak which emails exist.
- **JWT carries `{ sub, role }`**, signed with `JWT_SECRET`. Verify with `jwt.verify`
  (never `jwt.decode`). 401 = not authenticated; 403 = authenticated but wrong role.

## Auth / roles

- `POST /auth/register`, `POST /auth/login`, `GET /auth/me`
- Roles: `buyer` (default) and `admin`.
- Role is baked into the JWT at login. Changing a user's role in the DB does NOT
  affect existing tokens — the user must log in again to get a token with the new role.

## Environment variables (see .env, which is gitignored)

`PORT`, `NODE_ENV`, `POSTGRES_URL`, `POSTGRES_SSL` (`true` for Neon/cloud, `false`
for local Docker), `MONGO_URL` (include the `/procure` database name before `?`),
`JWT_SECRET` (min 8 chars), `JWT_EXPIRES_IN`. Env is validated by zod in
`src/config/env.ts` and the app fails fast if any are missing.

## Testing conventions

- Jest + Supertest. Tests import `app` from `src/app.ts` (no port opened).
- **Mock the repository layer** so tests don't hit real databases. Do NOT mock
  `bcrypt` — for login tests, seed the mocked user with a real bcrypt hash of a known
  password so `bcrypt.compare` runs for real.
- `jest.clearAllMocks()` in `beforeEach` to keep tests isolated.
- Cover negative paths, not just happy paths (409 duplicate, 400 validation, 401/403).
- Test files live outside `src/` so they don't compile into `dist/`.

## Dev-environment gotchas (learned the hard way)

- **Run exactly one server.** ts-node-dev spawns two processes per run (a watcher +
  a child) — that's normal for ONE server. Multiple stale servers cause `EADDRINUSE`
  and requests hitting outdated code. Clean up with `pkill -f ts-node-dev` and check
  with `lsof -i:3000`.
- **Verify you're testing the current build, not a stale process,** when behavior
  looks wrong but the code looks right.
- **The seeded `test@example.com` account is `admin`** (promoted via SQL), so any
  login as it yields an admin token. Use a separate account for buyer-role tests.

## Status

Done: auth (register/login/JWT/roles + tests), suppliers CRUD, orders CRUD with a
transactional create, MongoDB audit log, Docker, GitHub Actions CI.
Planned: CSV catalog import + orders export using Node streams.
