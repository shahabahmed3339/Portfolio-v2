# Portfolio-v2 — Next.js + Prisma + Auth

The portfolio site, its API, and the admin panel all run in a **single Next.js
app on one port** (`http://localhost:3000`) — same architecture as the
Expense-Tracker project.

## Stack

- **Next.js 14** (App Router) — client + server on one port
- **next-auth** (Credentials) — session login
- **Prisma** + **PostgreSQL** (e.g. Neon)
- **styled-components** v6 — SSR-safe styling
- **zod** — request validation

## How the pieces map

| Concern         | Location                                                             |
| --------------- | -------------------------------------------------------------------- |
| DB schema       | `prisma/schema.prisma`                                               |
| Seed            | `prisma/seed.ts` (imports `src/data.js`)                             |
| Prisma client   | `server/db/client.ts`                                                |
| Auth options    | `server/authOptions.ts`, `server/auth/guard.ts`                      |
| Content service | `server/services/content.service.ts`                                 |
| REST API        | `app/api/**/route.ts` (portfolio, profile, CRUD per resource)        |
| Public site     | `app/page.tsx` → `components/PortfolioSite.tsx` → `src/components/*` |
| Login UI        | `app/login/page.tsx`                                                 |
| Admin UI        | `app/admin/page.tsx` → `components/admin/*`                          |

### Content model ↔ `data.js`

The Prisma models mirror the shape of `src/data.js` exactly, so the database
drives the site and the admin edits it:

| data.js key      | Prisma model     |
| ---------------- | ---------------- |
| `head` + assets  | `Profile`        |
| `head.links[]`   | `SocialLink`     |
| `about[]`        | `AboutParagraph` |
| `experience[]`   | `Experience`     |
| `education[]`    | `Education`      |
| `projects[]`     | `Project`        |
| `technologies[]` | `Technology`     |
| `skills[]`       | `Skill`          |
| `interests[]`    | `Interest`       |
| `languages[]`    | `Language`       |

`accomplishments` and `techList` are native PostgreSQL `String[]` columns.

## Getting started

```bash
npm install
cp .env.example .env        # set DATABASE_URL (Postgres), NEXTAUTH_SECRET, ADMIN_*
npm run db:migrate          # apply migrations to the database
npm run db:seed             # admin user + import src/data.js content
npm run dev                 # http://localhost:3000
```

That's it — **one port, no separate backend process.**

### Admin

- Login: <http://localhost:3000/login>
- Panel: <http://localhost:3000/admin>

Default credentials from `.env`:
`admin@portfolio.local` / `Admin@12345` — **change these.**

The admin panel has tabs for Projects, Experience, Education, Technologies,
Skills, About, Languages and Social links, each with **Add / Edit / Delete**,
plus a **Head / Profile** editor.

## API

Public:

- `GET /api/health`
- `GET /api/portfolio` — the whole site in one payload
- `GET /api/<resource>` — list a collection

Protected (session cookie required) — writes return `401` when not signed in:

- `POST /api/<resource>`, `PUT /api/<resource>/<id>`, `DELETE /api/<resource>/<id>`
- `GET|PUT /api/profile`

Resources: `projects`, `experience`, `education`, `technologies`, `skills`,
`about`, `languages`, `interests`, `social-links`.

## Database

The schema targets **PostgreSQL**. Set `DATABASE_URL` in `.env`, then:

```bash
npm run db:migrate     # apply migrations (prisma migrate dev)
npm run db:seed        # seed admin + content
```

`npm run db:generate`, `npm run db:push` and `npm run db:studio` are also available.

## Production

```bash
npm run build
npm start          # serves on port 3000
```
