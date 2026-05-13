# Google Login Setup — Runbook

This is the exact sequence to get Google login working on Lebronator. The code is already wired (see `src/lib/auth-options.ts`, `src/app/login/page.tsx`, middleware, etc.). What's left is configuration + two local-environment fixes I found while reviewing the project.

---

## 0. Two problems in your current local setup you must fix first

Without these, Google login will fail even after you create the OAuth client.

### 0a. `.env` is missing the Google keys

Your `.env.example` defines them, but your actual `.env` does not. With empty values, NextAuth will send Google an empty `client_id` and Google returns `invalid_client`.

**Append to `.env`:**

```env
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
DISTRICT_GOOGLE_DOMAIN="district.k12.il"   # replace with your real district domain
```

You'll fill `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in step 3.

### 0b. Postgres schema vs SQLite DATABASE_URL mismatch

- `prisma/schema.prisma` → `provider = "postgresql"`
- `.env` → `DATABASE_URL="file:./dev.db"` (SQLite)

That's why `npx prisma db push` failed when you tried it from this environment. Pick one path:

**Option A — Use SQLite for local dev (fastest)**

1. Edit `prisma/schema.prisma`:
   ```prisma
   datasource db {
     provider = "sqlite"
     url      = env("DATABASE_URL")
   }
   ```
2. Run `npx prisma generate && npx prisma db push`

Caveat: keep a separate `schema.postgresql.prisma` (or a branch) for production, since district hosting will be Postgres. SQLite has fewer enums / constraints, but your enum-like fields are already plain strings, so the schema is compatible.

**Option B — Use Postgres locally (matches prod, recommended for a district pilot)**

1. Spin up Postgres. You already have `docker-compose.yml`:
   ```bash
   docker compose up -d
   ```
2. Replace `DATABASE_URL` in `.env` with the Postgres URL the compose file exposes (check `docker-compose.yml` for the exact port/user/password).
3. Run `npx prisma generate && npx prisma db push`

### 0c. (Optional but worth it) Regenerate `NEXTAUTH_SECRET`

```bash
openssl rand -base64 32
```

Paste the output into `NEXTAUTH_SECRET=""` in `.env`. NextAuth signs every JWT with this — changing it logs everyone out, which is what you want before going live.

---

## 1. Create the OAuth client in Google Cloud Console

You must do this part yourself (Google requires your account). It takes ~5 minutes.

1. Open https://console.cloud.google.com/
2. **Project selector** (top bar) → New Project → name it `Lebronator` (or use an existing one).
3. Left menu → **APIs & Services** → **OAuth consent screen**.
   - User Type: **Internal** if your district has Google Workspace and you want only district accounts (recommended — matches `DISTRICT_GOOGLE_DOMAIN` gate). Otherwise **External**.
   - App name: `Lebronator`
   - User support email: your email
   - Developer contact: your email
   - Save. (You don't need to add scopes — NextAuth's Google provider requests the defaults `openid email profile`.)
4. Left menu → **APIs & Services** → **Credentials** → **Create Credentials** → **OAuth client ID**.
   - Application type: **Web application**
   - Name: `Lebronator Web`
   - **Authorized JavaScript origins**:
     - `http://localhost:3000`
     - `https://YOUR_PRODUCTION_DOMAIN` (skip for now if you don't have one yet)
   - **Authorized redirect URIs** — these must match exactly:
     - `http://localhost:3000/api/auth/callback/google`
     - `https://YOUR_PRODUCTION_DOMAIN/api/auth/callback/google`
   - Create.
5. Copy **Client ID** and **Client secret** from the dialog.

---

## 2. Drop the credentials into `.env`

```env
GOOGLE_CLIENT_ID="<paste from Google>"
GOOGLE_CLIENT_SECRET="<paste from Google>"
DISTRICT_GOOGLE_DOMAIN="your-district-domain.example"   # the part after @ in district emails
ALLOWED_GOOGLE_EMAILS=""                                  # optional: comma-separated exact emails
NEXTAUTH_URL="http://localhost:3000"                    # for local; set to https://your-domain for prod
```

Important about `DISTRICT_GOOGLE_DOMAIN`:
- `auth-options.ts` rejects any Google account whose email domain doesn't match.
- It does a `.toLowerCase()` compare, no leading `@`, e.g. `tlv.k12.il` not `@tlv.k12.il`.
- If you leave it empty, all Google sign-ins are rejected (`/login?error=domain`).

Important about `ALLOWED_GOOGLE_EMAILS`:
- If this list has values, only these exact emails can sign in with Google.
- Comma-separated, case-insensitive.
- When this is set, domain checks become a fallback only.

---

## 3. Apply DB schema and seed

```bash
npx prisma generate
npx prisma db push
npm run seed       # creates the DEFAULT_ADMIN_EMAIL user + default branch
```

The seeded admin can log in with email/password (credentials provider), then approve new Google sign-ins from the admin panel.

---

## 4. Test the full flow

```bash
npm run dev
```

### Default local behavior (no login)

With `npm run dev` (`NODE_ENV=development`), **auth is skipped by default**: you go straight to the app without signing in. `getCurrentUser()` uses a synthetic **Local Developer** user (ADMIN, ACTIVE) and attaches the first branch from the DB if one exists.

To **require real NextAuth locally** (Google / password), set in `.env`:

```env
ENABLE_LOCAL_AUTH="true"
```

Then restart `npm run dev`. In that mode:

Then in a browser:

1. Visit `http://localhost:3000` → middleware redirects to `/login`.
2. Click **כניסה עם Google (חשבון מחוזי)**.
3. Sign in with a Google account allowed by `ALLOWED_GOOGLE_EMAILS` or `DISTRICT_GOOGLE_DOMAIN`.
4. Expected:
   - `events.signIn` in `auth-options.ts` creates a `User` row with `status=PENDING`, `onboardingCompleted=false`.
   - Middleware sees `!onboardingCompleted` → redirects to `/onboarding`.
   - Finish onboarding form → POST to `/api/onboarding` flips `onboardingCompleted=true`, sets `requestedBranchCode`.
   - Middleware now sees `status !== "ACTIVE"` → redirects to `/pending-approval`.
5. In a second browser (or incognito), log in as the seeded admin via email/password → open Settings → admin panel → set the pending user's branch + `status=ACTIVE`.
6. Refresh the pending user — they should land on `/dashboard`.

**Note:** `next start` locally runs `NODE_ENV=production`, so auth is **not** skipped there (same as Vercel).

---

## 5. Common Google OAuth errors and what they mean for *this* project

| Error you see | Cause |
|---|---|
| `Error 400: redirect_uri_mismatch` | The redirect URI in the request doesn't exactly match what you registered in Google Cloud. Most common cause: `NEXTAUTH_URL` doesn't match the URL you're loading the app from (e.g. `http://localhost:3000` vs `http://127.0.0.1:3000`). |
| `invalid_client` | `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` empty or wrong. Restart `npm run dev` after editing `.env`. |
| `/login?error=domain` | The Google account's email domain doesn't match `DISTRICT_GOOGLE_DOMAIN`. Check casing and that there's no leading `@`. |
| `/login?error=Callback` | The `events.signIn` callback threw — almost always because Prisma can't reach the DB. Recheck step 0b. |
| Stuck on `/onboarding` after submitting | The `/api/onboarding` route failed. Open devtools → Network → check the response. Usually a missing `requestedBranchCode` column → re-run `npx prisma db push`. |

---

## 6. For production (Vercel)

When you're ready to deploy:

1. In Vercel → Project → Settings → Environment Variables, set:
   - `DATABASE_URL` (Neon/Railway Postgres URL)
   - `NEXTAUTH_SECRET`
   - `NEXTAUTH_URL` = `https://your-app.vercel.app` (or your real domain) — no trailing slash, no path
   - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
   - `DISTRICT_GOOGLE_DOMAIN`
   - `DEFAULT_BRANCH_CODE`, `DEFAULT_BRANCH_NAME`
   - `DEFAULT_ADMIN_EMAIL`, `DEFAULT_ADMIN_NAME`, `DEFAULT_ADMIN_PASSWORD`
2. Back in Google Cloud Console → your OAuth client → add the production redirect URI:
   - `https://your-app.vercel.app/api/auth/callback/google`
3. Redeploy. First deploy will run `prisma generate`; you'll want a one-off `prisma db push` against the prod DB (or wire up `prisma migrate deploy` if you switch to migrations).

---

## TL;DR — the minimal happy path

```bash
# 1. Fix .env
echo 'GOOGLE_CLIENT_ID=""'           >> .env
echo 'GOOGLE_CLIENT_SECRET=""'       >> .env
echo 'DISTRICT_GOOGLE_DOMAIN=""'     >> .env

# 2. Pick a DB story (Option A: SQLite local)
#    edit prisma/schema.prisma -> provider = "sqlite"
npx prisma generate && npx prisma db push && npm run seed

# 3. Get Google client_id/secret from console.cloud.google.com
#    and paste into .env, plus your district domain

# 4. Run
npm run dev
```
