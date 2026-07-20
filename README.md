# PLACARD (code name: CHEM SCAM)

PLACARD is a small, anonymous community board for sharing allegations about suspicious chemical suppliers, websites, and online scammers. It preserves the original PLACARD interface while using a privacy-focused, self-hosted architecture:

```text
Internet → Caddy (TLS) → Next.js → PostgreSQL
```

Reports are allegations, not legal findings. The software does not prove that a report, confirmation, or supporting account is true or comes from a unique person.

## Features

- Anonymous reports, comments, comment flags, and browser-limited confirmations
- Silly generated nicknames with an optional custom nickname
- Exact-domain duplicate attachment; name-only matches stay separate for admin review
- Published, pending-review, and removed publication states
- Unverified, Community Confirmed, Repeatedly Reported, and sticky Disputed statuses
- Password-protected admin sessions, CSRF protection, moderation audit events, and dispute queue
- PostgreSQL-backed privacy-preserving rate limits
- Docker Compose deployment with Caddy and PostgreSQL
- Encrypted backup and documented restore scripts

## Public pages

| Route      | Purpose                                                                                  |
| ---------- | ---------------------------------------------------------------------------------------- |
| `/`        | The board: search, filter, file a report                                                   |
| `/about`   | What the board is, how it works, terms of use, community guidelines, prohibited content    |
| `/policy`  | Privacy policy, moderation policy, report removal policy, dispute policy, jurisdiction     |
| `/contact` | The only contact channel — removals, corrections, disputes, conduct and security reports   |
| `/admin`   | Moderation console (password protected)                                                    |

There is no public email address. `/contact` writes to a private moderation queue in the database, so neither the
operator nor a requester has to expose an identity to open a dispute. `/dispute` redirects to `/contact`.

All fonts (Oswald, IBM Plex Sans, IBM Plex Mono) are self-hosted from the application. No request is made to Google,
a CDN, or any third party from a visitor's browser.

## Repository map

```text
app/          Next.js pages and API routes
components/   PLACARD interface components
db/           PostgreSQL schema and database access
drizzle/      Versioned PostgreSQL migrations
lib/          Validation, privacy, security, and shared helpers
public/       Static assets
references/   Original HTML design handoff
scripts/      Encrypted backup and restore tools
tests/        Vitest test suite
```

The original design handoff is preserved at `references/chem-scam-mockup.html`.

## Local development

Requirements: Node.js 22 and PostgreSQL 16 or newer.

```bash
npm install
cp .env.example .env
```

Set `NODE_ENV=development`, change `DATABASE_URL` to the local PostgreSQL connection, replace the placeholder secrets, create the database, then run:

```bash
npm run db:migrate
npm run dev
```

Open `http://localhost:3000`; moderation is at `/admin`. Migrations are explicit and are never applied by application startup.

## Production with Docker

```bash
git clone https://github.com/0xZanderPander/CHEM_SCAM.git
cd CHEM_SCAM
cp .env.example .env
# Replace every placeholder secret and set SITE_DOMAIN/SITE_URL.
docker compose build
docker compose up -d postgres
docker compose --profile tools run --rm app-migrate
docker compose up -d
```

Only Caddy publishes host ports (80 and 443). PostgreSQL and Next.js remain on internal Docker networks. See [DEPLOYMENT.md](DEPLOYMENT.md) for the complete launch, update, and rollback procedure.

## Quality checks

```bash
npm run lint
npm run test
npm run build
docker compose config
docker compose build
```

## Operations and policy

- [PRIVACY.md](PRIVACY.md) explains stored data, browser tokens, rate limits, retention, and limitations. The
  visitor-facing version of this is published at `/policy`.
- [MODERATION.md](MODERATION.md) explains publication review, disputes, removals, and prohibited content. The
  visitor-facing version is split across `/policy#moderation` and `/about#prohibited`.
- The site's terms of use and community guidelines live only in the application, at `/about`.
- [BACKUP_AND_RESTORE.md](BACKUP_AND_RESTORE.md) covers encrypted daily backups and recovery.
- [DEPLOYMENT.md](DEPLOYMENT.md) covers a provider-agnostic VPS deployment.

## License

CHEM SCAM is licensed under the [GNU Affero General Public License v3.0](LICENSE). If you modify the software and make it available over a network, the AGPL requires that users be offered the corresponding source code for that running version.

## Legal note

This website contains community-submitted reports and allegations. Reports have not necessarily been independently verified and should not be interpreted as legal findings. Exercise your own judgment before making decisions based on information posted here. This repository and its documentation are not legal advice.
