# Lebronator

A polished web app for school staff to **upload a grades file (CSV is parsed directly) or a photo/PDF (OCR), review the extracted rows, and build rich student profiles with notes and analytics.**

<p>
  Next.js 14 (App Router) · TypeScript · Tailwind · shadcn-style UI · Prisma · SQLite (Postgres optional) · Recharts · React Hook Form + Zod.
</p>

---

## Highlights

- **Modern dashboard** with metric cards, grade distribution chart, subject averages, top performers, and "needs attention" signals.
- **Upload → Extract → Review → Save** pipeline. Nothing hits the database until staff confirm, and low-confidence rows are highlighted.
- **Grades from CSV** — header row with columns like `studentName`, `subject`, `grade` (Hebrew column names supported); a sample is at `public/grades-template.csv`.
- **Pluggable OCR** (images/PDF) — a clean `OcrProvider` interface behind `src/lib/ocr/` with a deterministic mock provider wired in for the MVP.
- **Student profiles** with tabbed Overview / Grades / Notes, per-subject breakdowns, grade-trend chart, and full notes CRUD with categories.
- **Searchable student list** with class and risk (top performers / needs attention) quick filters.
- **Design system** — consistent primitives, soft shadows, rounded corners, dark mode, subtle animations, polished empty states.

---

## Quick start

### 1. Install

```bash
npm install
```

> Requires Node 18+. The app ships with SQLite by default — no database server to install. The `dev.db` file lives in the project root.

### 2. Configure

```bash
cp .env.example .env
```

The defaults are fine. If you'd rather use PostgreSQL, change `provider` in `prisma/schema.prisma` to `"postgresql"` and point `DATABASE_URL` at your server (or run `docker compose up -d` to spin up the bundled Postgres container).

### 3. Migrate + seed

```bash
npm run db:push     # creates the tables from prisma/schema.prisma
npm run db:seed     # populates students, grades, notes, uploads
```

### 4. Run

```bash
npm run dev
```

Open http://localhost:3000 — no login required. The app is designed to run on the school's own machine, so every request is attributed to a built-in "School Staff" user.

---

## Folder structure

```
src/
  app/
    (app)/                        # All app routes share the sidebar + topbar
      layout.tsx                  # Shell (sidebar + topbar + theme)
      dashboard/                  # Main dashboard
      students/                   # List + [id] detail with tabs
      upload/                     # Upload + /review editor
      analytics/                  # Deeper analytics view
      settings/                   # Profile + OCR config placeholder
    api/
      upload/parse|confirm/       # OCR parse and batch commit
      students/[id]/notes/        # Create note
      notes/[id]/                 # Update / delete note
  components/
    ui/                           # shadcn-style primitives (button, card, …)
    layout/                       # sidebar, topbar
    dashboard/                    # metric-card, charts, subject-averages
    students/                     # student-card, grade-trend, notes-panel
  lib/
    db.ts                         # Prisma singleton
    auth.ts                       # getCurrentUser() — default Staff user
    stats.ts                      # Dashboard + student analytics
    validators.ts                 # Zod schemas
    csv/
      parse-grade-csv.ts          # CSV → same row shape as OCR
    ocr/
      index.ts                    # getOcrProvider / parseGradeImage
      mock.ts                     # Deterministic mock provider
      types.ts                    # OcrProvider contract
      README.md                   # How to plug a real provider
prisma/
  schema.prisma                   # User, Student, Subject, Grade, Note, UploadSession
  seed.ts                         # Rich demo dataset
```

---

## How upload parsing works

`POST /api/upload/parse` branches on the file: **`.csv` (or CSV MIME type)** is parsed
locally by `src/lib/csv/parse-grade-csv.ts` (no API keys, no OCR). **Images and PDFs**
use `parseGradeImage` from `src/lib/ocr` and return the same `{ rows, avgConfidence, warnings }`
shape for the review page.

### OCR (images / PDF)

- `OCR_PROVIDER=mock` (default) → `mockOcrProvider` returns deterministic rows from the file bytes so the review flow always has realistic, noisy data.
- To plug in a real provider (Google Document AI / Azure Document Intelligence / AWS Textract / OpenAI Vision):
  1. Create e.g. `src/lib/ocr/google.ts` implementing the `OcrProvider` interface in `types.ts`.
  2. Register it in the `switch` inside `src/lib/ocr/index.ts`.
  3. Set `OCR_PROVIDER=google` in your environment.

See `src/lib/ocr/README.md` for copy-paste scaffolding.

---

## How auth works (and how to add it later)

The app is single-tenant by design: it runs on the school's own computer, so
there's no login screen. `src/lib/auth.ts` exports one helper:

```ts
const user = await getCurrentUser();
```

Under the hood it upserts a single "School Staff" user so notes and upload
sessions have a real foreign key. If you ever want real per-teacher auth:

1. Install `next-auth` and add `/api/auth/[...nextauth]/route.ts`.
2. Replace the body of `getCurrentUser` in `src/lib/auth.ts` with NextAuth's `auth()` helper — same return shape, zero changes anywhere else.

---

## Key workflows

### Dashboard (`/dashboard`)
Total students, class average, highest / lowest grade, pass/fail, live grade-distribution chart, subject averages, top performers, needs-attention list, recent uploads, and quick actions.

### Upload → Review (`/upload` → `/upload/review`)
1. Staff pick a **CSV** (recommended if you already have a spreadsheet) or an **image/PDF** for OCR.
2. The server parses CSV directly, or calls `parseGradeImage` for images/PDF, and returns rows with confidences.
3. The review editor:
   - highlights rows with confidence < 80%
   - inline-edits every cell
   - lets staff add or delete rows
   - validates before save
4. On Confirm, `/api/upload/confirm` matches/creates `Student`s and `Subject`s, then inserts `Grade`s linked to an `UploadSession`.

### Students (`/students` → `/students/[id]`)
List with search (name / ID / class / subject), class filter, and Top / Attention quick pills. The detail page shows a trend chart, subject breakdown, full grade history, and an editable notes panel with categories.

---

## Data model

- `User` — staff accounts
- `Student` — one per learner; hashed externalId for uniqueness
- `Subject` — unique name + color (used across the UI)
- `Grade` — value (0-100), source (`MANUAL` / `OCR` / `IMPORT`), linked to a subject, a student, and an upload session
- `Note` — categorized (`GENERAL`, `BEHAVIOR`, `PROGRESS`, `CONCERN`, `STRENGTH`)
- `UploadSession` — audit of every batch, including avg OCR confidence

---

## Scripts

| command | description |
|---------|-------------|
| `npm run dev` | start the Next.js dev server |
| `npm run build` | production build (runs `prisma generate` first) |
| `npm run start` | run the production server |
| `npm run db:push` | sync the schema to the database |
| `npm run db:seed` | seed rich demo data |
| `npm run db:studio` | open Prisma Studio |
| `npm run lint` | ESLint |

---

## Roadmap (nice-to-haves already scaffolded)

- CSV *export* of grades (import is in-app via `/upload`)
- Optional SSO (NextAuth / Google / Azure AD) for multi-user setups
- Grade term / semester tagging UI
- Class- and subject-scoped analytics pages
- Activity log (who edited what, when)
- Drag-and-drop multi-file OCR batches

These all slot into the existing architecture without restructuring — the boundaries between UI, data access, and OCR are already drawn.
