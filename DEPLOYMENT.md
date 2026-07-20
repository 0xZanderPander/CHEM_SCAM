# Self-hosted deployment

The reference target is a 1984.hosting VPS in Iceland with a domain registered through Njalla. 1984.hosting includes network-layer DDoS protection, so the reference design does not add a CDN or WAF proxy. Nothing in the application, Compose file, or Caddy configuration is tied to either provider.

## VPS and DNS

Start with a current 64-bit Linux VPS with at least 2 CPU cores, 2 GB RAM, 20 GB SSD storage, and additional space for encrypted backups. Point the domain's A record (and AAAA only when IPv6 is configured correctly) to the VPS. Remove stale records before requesting TLS.

Install Docker Engine with the Compose plugin from Docker's official repository. Create an unprivileged deployment user, use SSH keys, disable SSH password and root login after verifying key access, enable unattended security updates, and limit the host firewall to SSH, TCP 80, and TCP/UDP 443. Restrict SSH to trusted source ranges when practical.

## Configure

```bash
git clone https://github.com/0xZanderPander/CHEM_SCAM.git
cd CHEM_SCAM
cp .env.example .env
```

Set `SITE_DOMAIN` to the bare public hostname and `SITE_URL` to its `https://` URL. Replace every secret placeholder with independent high-entropy values. Make `POSTGRES_PASSWORD` match the password embedded in `DATABASE_URL`; percent-encode URL-reserved characters in the URL form of the password. Keep `.env` readable only by the deployment user and never commit it.

The supplied Caddy policy allows scripts and styles from the same origin plus inline scripts/styles required by the current Next.js rendering and CSS behavior. It denies framing, objects, and external connections by default, upgrades mixed content, uses strict referrer handling, MIME-sniffing protection, and a one-year HSTS policy. Tightening `unsafe-inline` with nonces is a worthwhile later hardening project, but requires coordinated Next.js changes.

Caddy access logs are disabled. That minimizes retained connection metadata but reduces incident investigation data. If an operator enables access logs, use a minimal format, omit headers/cookies, set short rotation/retention, restrict file permissions, and disclose the practice in `PRIVACY.md`.

## First launch

```bash
docker compose build
docker compose up -d postgres
docker compose --profile tools run --rm app-migrate
docker compose up -d
docker compose ps
```

Migration is an explicit deployment step; the application never changes the schema at startup. Migration `0001_thin_scorpion.sql` adds dispute-resolution classification and performs a one-time count backfill from confirmations and published, non-removed supporting accounts while preserving `Disputed` statuses. PostgreSQL publishes no host port, Next.js is reachable only on Docker's internal frontend, and Caddy alone publishes 80/443. Check `https://YOUR_DOMAIN/api/health` after DNS and TLS settle.

## Updates

Before updating, create and verify an encrypted backup and record the current commit:

```bash
./scripts/backup-postgres.sh
git rev-parse HEAD
git pull --ff-only
docker compose build
docker compose --profile tools run --rm app-migrate
docker compose up -d
```

Check the health endpoint and core report/admin flows. Review migration SQL before applying it; database migrations can make an application rollback incompatible.

## Rollback

If the schema is backward compatible, check out the recorded commit, rebuild, and restart. If it is not, stop the app and restore the verified pre-update backup by following [BACKUP_AND_RESTORE.md](BACKUP_AND_RESTORE.md), then rebuild the older commit. Never improvise a destructive schema rollback against the only database copy.

## Operational checklist

- Schedule encrypted daily backups and periodically test restoration.
- Monitor free disk space, container health, TLS renewal, and backup success without adding visitor analytics.
- Rotate application secrets deliberately; rotating confirmation or rate-limit secrets changes the corresponding pseudonymous identifiers, while rotating the admin-session secret invalidates existing sessions.
- Apply OS, Docker, Node-image, and dependency security updates.
- Review pending content, comment flags, possible duplicates, and disputes promptly.
- Obtain jurisdiction-specific legal advice before public launch; these documents are operational guidance, not legal advice.
