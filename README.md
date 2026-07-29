# Procure API

A REST API for managing suppliers and purchase orders, built as a backend
engineering project with Node.js and TypeScript.

The domain (procurement) is deliberate: it maps to real business workflows —
suppliers, purchase orders with line items, order approval, and bulk price-list
imports — which makes the data model and the choice of two databases realistic
rather than arbitrary.

## Architecture

The service uses two databases on purpose, each for what it's genuinely good at:

- **PostgreSQL** holds the transactional core — `users`, `suppliers`,
  `purchase_orders`, and `order_items`. These have real relationships (foreign
  keys) and require consistency: creating an order together with its line items
  runs inside a single transaction, so a half-written order can never exist.
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
- **Streaming:** CSV bulk import and export using Node streams (constant memory
  regardless of file size)
- **Testing:** Jest + Supertest (integration tests against the API)
- **Infra:** Docker + docker-compose (app + PostgreSQL + MongoDB)
- **CI:** GitHub Actions

## Running locally

Requires Docker.

```bash
cp .env.example .env
docker compose up -d postgres mongo   # start the databases
npm install
npm run migrate                       # create PostgreSQL tables
npm run dev                           # start the API in watch mode
```

Then check it's alive:

```bash
curl http://localhost:3000/health
# {"status":"ok"}
```

Or run the whole stack (API + both databases) in containers:

```bash
docker compose up --build
```

## Project status / roadmap

- [x] Project scaffold, config, dual-database connections, health check
- [x] Docker + docker-compose, CI pipeline
- [ ] Auth: register / login, JWT, bcrypt, role-based middleware, tests
- [ ] Suppliers & purchase orders CRUD (with a transaction for order + items)
- [ ] Audit log written to MongoDB on every write action
- [ ] CSV catalog import + orders export using Node streams
- [ ] Test coverage across the main flows

## A note on AI-assisted development

This project was built using an AI coding assistant as part of the workflow.
Design decisions, the data model, and every line of code were reviewed and are
fully understood by the author — the assistant accelerated the work; the
engineering judgment is the author's own.
