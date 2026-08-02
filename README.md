# Procure API

A REST API for managing suppliers and purchase orders, built as a backend
engineering project with Node.js and TypeScript.

The domain (procurement) is deliberate: it maps to real business workflows —
suppliers, purchase orders with line items, order approval, and bulk price-list
imports — which makes the data model and the choice of two databases realistic
rather than arbitrary.

## Features

- TypeScript throughout, `strict` mode
- Layered architecture: routes → controller → service → repository
- JWT authentication with role-based access control (`buyer` / `admin`)
- PostgreSQL (Neon) for the transactional core, MongoDB (Atlas) for an
  append-only audit log
- Parameterized queries everywhere — no string-built SQL
- A real Postgres transaction for creating an order together with its line
  items (all-or-nothing)
- Jest + Supertest integration tests
- Docker + docker-compose for local development
- GitHub Actions CI (build + test on every push/PR)

## Architecture

The service uses two databases on purpose, each for what it's genuinely good at:

- **PostgreSQL** holds the transactional core — `users`, `suppliers`,
  `purchase_orders`, and `order_items`. These have real relationships (foreign
  keys) and require consistency: creating an order together with its line
  items runs inside a single transaction, so a half-written order can never
  exist.
- **MongoDB** holds the **audit log** — an append-only record of who did what
  and when. It's write-heavy, schema-flexible, and needs no joins, which is a
  natural fit for a document store rather than a relational table.

```
Client ──HTTP/REST──▶ Express (TypeScript)
                          ├── PostgreSQL  (users, suppliers, orders, items)
                          └── MongoDB     (audit log)
```

## Tech stack

- **Runtime / language:** Node.js, TypeScript
- **Framework:** Express
- **Databases:** PostgreSQL (`pg`), MongoDB (Mongoose)
- **Auth:** JWT (`jsonwebtoken`) + bcrypt password hashing, role-based access
- **Validation:** zod
- **Testing:** Jest + Supertest (integration tests against the API)
- **Infra:** Docker + docker-compose (app + PostgreSQL + MongoDB)
- **CI:** GitHub Actions

## API endpoints

All authenticated routes expect `Authorization: Bearer <token>`. "Admin only"
routes additionally require the token's role to be `admin`.

### `/auth`

| Method | Path       | Auth       | Notes                              | Status codes    |
|--------|------------|------------|-------------------------------------|-----------------|
| POST   | `/register`| Public     | Creates a user (default role `buyer`) | 201, 400, 409 |
| POST   | `/login`   | Public     | Returns a JWT                       | 200, 400, 401   |
| GET    | `/me`      | Any user   | Returns the caller's `id` and `role`| 200, 401        |

### `/suppliers`

| Method | Path       | Auth       | Notes                        | Status codes         |
|--------|------------|------------|-------------------------------|-----------------------|
| GET    | `/`        | Any user   | List all suppliers            | 200                   |
| GET    | `/:id`     | Any user   | One supplier                  | 200, 400, 404         |
| POST   | `/`        | Admin only | Create a supplier             | 201, 400, 403         |
| PATCH  | `/:id`     | Admin only | Partial update                | 200, 400, 403, 404    |
| DELETE | `/:id`     | Admin only | Delete a supplier             | 204, 400, 403, 404    |

### `/orders`

| Method | Path            | Auth       | Notes                                                | Status codes         |
|--------|-----------------|------------|-------------------------------------------------------|-----------------------|
| GET    | `/`             | Any user   | List orders (summary rows)                            | 200                   |
| GET    | `/:id`          | Any user   | One order with its line items                         | 200, 400, 404         |
| POST   | `/`             | Any user   | Create an order + items in a single transaction; total is computed server-side | 201, 400 |
| PATCH  | `/:id/status`   | Admin only | Change status to `draft` \| `approved` \| `cancelled`  | 200, 400, 403, 404    |

### CSV import/export

| Method | Path                          | Auth       | Notes                                                | Status codes    |
|--------|-------------------------------|------------|--------------------------------------------------------|-----------------|
| POST   | `/suppliers/:id/catalog/import` | Admin only | Upload a `text/csv` catalog (`sku,name,unit_price,unit`); parsed and inserted as a fully streamed pipeline, never buffering the file in memory. Returns `{ imported, failed }` | 200, 400, 404, 403 |
| GET    | `/orders/export.csv`          | Any user   | Downloads all orders as CSV; rows are serialized and written to the response incrementally as they're read, rather than building the whole file in memory | 200             |

## Running locally

Requires Docker, or your own PostgreSQL + MongoDB instances (this project's
own `.env` points at managed Neon/Atlas instances instead of the local
containers — either works).

Create a `.env` file in the project root with:

```bash
PORT=3000
NODE_ENV=development
POSTGRES_URL=postgres://procure:procure@localhost:5432/procure   # or a Neon connection string
POSTGRES_SSL=true                                                 # set as needed for your Postgres host
MONGO_URL=mongodb://localhost:27017/procure                       # or an Atlas connection string
JWT_SECRET=some-long-random-string
JWT_EXPIRES_IN=1h
```

Then:

```bash
docker compose up -d postgres mongo   # skip if using Neon/Atlas instead
npm install
npm run migrate                       # create PostgreSQL tables
npm run dev                           # start the API in watch mode
```

Check it's alive:

```bash
curl http://localhost:3000/health
# {"status":"ok"}
```

Run the test suite:

```bash
npm test
```

Or run the whole stack (API + both databases) in containers:

```bash
docker compose up --build
```

## Project status / roadmap

- [x] Project scaffold, config, dual-database connections, health check
- [x] Docker + docker-compose, CI pipeline
- [x] Auth: register / login, JWT, bcrypt, role-based middleware, tests
- [x] Suppliers & purchase orders CRUD (with a transaction for order + items)
- [x] Audit log written to MongoDB on key write actions
- [x] CSV catalog import + orders export using Node streams

## A note on AI-assisted development

This project was built using an AI coding assistant as part of the workflow.
Design decisions, the data model, and every line of code were reviewed and are
fully understood by the author — the assistant accelerated the work; the
engineering judgment is the author's own.
