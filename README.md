# FinAI

A money tracker you can talk to. Tell FinAI what you earned, spent or moved, by typing or out loud, and it keeps your
books, budgets and dashboard up to date. Everything can also be added and edited by hand.

## Stack

- Next.js 16 (App Router, TypeScript), Tailwind CSS 4, pnpm
- Postgres on Neon, with Drizzle ORM (`drizzle/` holds the migrations)
- Better Auth: email and password, plus Google sign-in
- Gemini: chat through the AI SDK (`GEMINI_CHAT_MODEL`), voice through the Gemini Live API (`GEMINI_LIVE_MODEL`) with
  short-lived tokens minted on the server, so the API key never reaches the browser

## Run it locally

```bash
pnpm install
cp .env.example .env.local   # then fill in the values
pnpm db:migrate
pnpm dev
```

Optional sample data for a local test account (runs against localhost only):

```bash
node scripts/seed-dev.mjs
```

## Environment variables

| Name | What it is |
|---|---|
| `DATABASE_URL` | Neon **pooled** connection string (host ends in `-pooler`) |
| `DIRECT_URL` | Neon direct connection string, used for migrations |
| `BETTER_AUTH_SECRET` | Random 32+ byte secret (`openssl rand -base64 32`) |
| `BETTER_AUTH_URL` | The site's public URL, e.g. `https://finai.example.com` |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google OAuth client. Redirect URI: `<BETTER_AUTH_URL>/api/auth/callback/google` |
| `GEMINI_API_KEY` | Google AI Studio key |
| `GEMINI_CHAT_MODEL` | Chat model, e.g. `gemini-3.8-flash` |
| `GEMINI_LIVE_MODEL` | Voice model, e.g. `gemini-3.1-flash-live-preview` |
| `RESEND_API_KEY`, `EMAIL_FROM` | Optional. Without them, password reset links are printed to the server log |
| `PULSE_ADMINS` | Emails (comma separated) that can open Pulse at `/app/pulse` |
| `CRON_SECRET` | Protects the daily Pulse clean-up job. Vercel Cron sends it automatically |

## Pulse (built-in monitoring)

Pulse is FinAI's own analytics, error tracking and speed monitoring. It stores everything in the same Postgres database, so there is no outside service to pay for or sign in to.

- **Collects:** page views, clicks (amounts masked), Core Web Vitals and browser errors from `src/components/pulse/pulse-tracker.tsx`; server errors from `src/instrumentation.ts`; sign ins, sign ups and failed attempts from Better Auth hooks; AI chat and voice timings from the API routes.
- **Stores:** `pulse_events`, plus `pulse_issues` and `pulse_errors`, where errors are grouped Sentry style by a fingerprint of name, message and top stack frame.
- **Shows:** `/app/pulse` has Overview, Users, Activity, Errors and Speed. Only emails in `PULSE_ADMINS` can open it; everyone else gets a 404.
- **Alerts:** new error issues are emailed to the admins when `RESEND_API_KEY` is set.
- **Retention:** a daily Vercel Cron (`/api/pulse/cleanup`) deletes events and error occurrences older than 90 days.
- **Opt out:** run `localStorage.pulse_off = "1"` in a browser to stop tracking it. Visits to Pulse itself never count as traffic.

## Checks

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

## Deploying

The app runs on any Node 22+ host that supports Next.js; Vercel is the simplest.

1. Import the repo and set the environment variables above for Production.
2. Set `BETTER_AUTH_URL` to the production URL and add its Google callback URL to the OAuth client.
3. Run `pnpm db:migrate` against the production database once (locally with production env vars, or as a build step).

## Fonts

OTSono is self-hosted in `public/fonts`. The files come from Perk, who gave permission for their use in FinAI.
Inter is the fallback.
