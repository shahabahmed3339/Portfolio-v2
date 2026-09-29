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
| Resume schema   | `server/resume/resume-schema.ts`                                     |
| Canonical resume| `server/resume/canonical-resume.ts` (reads `src/data.js`)            |
| Active resolver | `server/resume/get-active-resume.ts`                                 |
| Tailor prompt   | `server/ai/resume-tailor.ts`                                         |
| AI client       | `server/ai/ai-client.ts` (Gemini + Groq, with fallback)              |
| Resume service  | `server/services/resume.service.ts`                                  |
| Public resume   | `app/resume/[slug]/page.tsx`                                         |

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
cp .env.example .env        # set DATABASE_URL (Postgres), NEXTAUTH_SECRET, ADMIN_*, GEMINI_API_KEY and/or GROQ_API_KEY
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

## Job-specific resume tailoring

The canonical resume lives in `src/data.js` and is **never modified**. Tailored
resumes are generated from it, stored separately, and only ever shown publicly
after an explicit admin action.

### Data model

```text
Job 1 ──── N ResumeVersion          (ResumeVersion.jobId -> Job.id)
Canonical resume                    (ResumeVersion.jobId = NULL)
```

- `Job` — company, title, description, contact info, location, notes, slug.
- `ResumeVersion` — a complete resume JSON, plus `version`, `slug`, `status`,
  `isPublished`. Regenerating **always inserts a new version**; existing
  versions are never overwritten.
- `AppSetting` — stores which resume version is currently live on the portfolio.

### Admin workflow

1. **Admin → Jobs → Add job** — company name, job title and job description are
   required; contact details, URL, location and notes are optional.
2. Open **Details** on a job and click **Generate tailored resume**.
3. The server validates the job, loads the canonical resume from `src/data.js`,
   calls the configured AI provider, validates the response against the resume
   schema, and saves a **new, unpublished** resume version.
4. Review the versions list (version number, generated date, published state).
5. Click **Publish** on the version you want live. Publishing sets it as the
   active portfolio resume *and* makes `/resume/<slug>` publicly reachable.

A newly generated resume is **never** published automatically.

### Public resume resolution

```text
published tailored resume exists -> that resume
otherwise                        -> canonical resume from src/data.js
```

`getActiveResume()` in `server/services/resume.service.ts` implements this. It
fails soft: if the active version is missing or no longer matches the schema,
the canonical resume is served rather than breaking the site.

### Public URLs

Each published version has a stable, server-generated slug:

```text
/resume/acme-senior-frontend-developer-v1
/resume/acme-senior-frontend-developer-v2
```

Slugs are derived from company + job title + version, are URL-safe, handle
duplicate job titles via a numeric suffix, and never expose database ids.
Unpublished slugs return 404. The canonical resume is not reachable by slug — it
is served at the root portfolio only.

### Environment

Configure one or both providers — the API keys are read server-side only and are
never sent to the browser:

```env
GEMINI_API_KEY="..."                        # server-side only
GEMINI_MODEL="gemini-3.8-flash"             # optional

GROQ_API_KEY="..."                          # server-side only
GROQ_MODEL="llama-3.3-70b-versatile"        # optional
```

When both keys are set, Gemini is tried first and Groq is used as an automatic
fallback (a Gemini key can be valid while its project is denied access with
`403`, and the fallback keeps the admin workflow usable). If neither key is set,
the admin UI shows a clear configuration message and the generate endpoint
returns `503` instead of crashing.

Providers are declared in one registry (`PROVIDERS` in `server/ai/ai-client.ts`)
that holds each endpoint, env var name and default model, so adding another
provider is one entry there plus one entry in `PROVIDER_CALLERS`.

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
