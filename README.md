# PLACARD (code name: CHEM SCAM)

A fast, anonymous community board for reporting suspicious chemical suppliers, websites, and online scammers. This MVP groups likely duplicate submissions, records one confirmation per browser, supports anonymous discussion, and includes a small password-protected moderation area.

## What is included

- Anonymous report submission with generated or custom nicknames
- Domain/name duplicate matching with attached duplicate accounts
- Search by scammer name or domain
- Browser-limited “I experienced this too” confirmations
- Report detail pages, anonymous comments, and comment flagging
- Statuses for unverified, confirmed, repeatedly reported, and disputed listings
- Admin tools to remove content, merge reports, and mark reports disputed
- Responsive, accessible UI and a prominent allegations disclaimer

## Project structure

```text
app/          Next.js pages and API routes
components/   Reusable interface components
db/           Database access and runtime schema setup
drizzle/      Versioned SQLite/D1 migrations
lib/          Shared nickname and admin utilities
public/       Public image assets
references/   Original visual and structural mockups
tests/        Automated project checks
worker/       Cloudflare worker entry point
```

The original static design handoff is preserved at `references/chem-scam-mockup.html`. Generated folders such as `node_modules`, `dist`, `.vinext`, and `.wrangler` are local build artifacts and are excluded from Git.

## Run locally

Requirements: Node.js 22.13 or newer.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Set a strong `ADMIN_PASSWORD` in `.env.local`, then open `http://localhost:3000`. The moderation page is at `/admin`.

The project uses Cloudflare D1, a hosted SQLite-compatible database. Local development automatically creates the database tables. Generate a migration after schema changes with:

```bash
npm run db:generate
```

## Build

```bash
npm run build
```

## Deployment notes

The included setup is ready for Cloudflare/Sites deployment. For Vercel, the Next.js UI and API routes can be retained, but the D1 adapter in `db/index.ts` should be replaced with a Vercel-compatible durable database such as Supabase Postgres or Turso/libSQL; a file-based SQLite database is not durable on serverless Vercel functions.

Production checklist:

- Set `ADMIN_PASSWORD` to a long random value.
- Set `NEXT_PUBLIC_SITE_URL` to the public origin.
- Add rate limiting, CAPTCHA, and stricter content moderation before broad promotion.
- Publish a privacy policy and terms suitable for the jurisdictions where the service operates.
- Establish a documented dispute/appeal and legal takedown process.

## Legal note

CHEM SCAM displays community-submitted allegations. It does not independently verify reports. This repository is an MVP and is not legal advice.
