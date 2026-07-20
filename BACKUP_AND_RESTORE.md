# Backup and restore

The supplied scripts create compressed PostgreSQL dumps encrypted to an [age](https://age-encryption.org/) recipient. Keep the corresponding private identity offline and test recovery regularly.

## Prepare

Install `age`, create or select an age recipient, set `BACKUP_ENCRYPTION_RECIPIENT`, and ensure `./backups` is writable only by the backup operator. The directory is mounted outside the PostgreSQL data volume. Do not store the private age identity in the repository or `.env`.

## Create and retain backups

With the Compose services running:

```bash
./scripts/backup-postgres.sh
```

The script runs `pg_dump` inside the PostgreSQL container, compresses the dump, encrypts it, writes it to `BACKUP_DIR` (default `./backups`), and deletes encrypted dumps older than `BACKUP_RETENTION_DAYS` (default 14). A failed command leaves no successful-looking final backup.

Example daily cron entry at 03:20:

```cron
20 3 * * * cd /srv/CHEM_SCAM && /usr/bin/flock -n /run/chem-scam-backup.lock ./scripts/backup-postgres.sh >> /var/log/chem-scam-backup.log 2>&1
```

As a systemd alternative, create a oneshot service whose `WorkingDirectory` is the repository and `ExecStart` is the absolute backup-script path, then activate it with a daily `OnCalendar=` timer. Protect both unit files and logs from unprivileged users.

Copy only the encrypted `.sql.gz.age` output to an off-server destination using the tool or provider of your choice. Do not hardcode provider credentials in this repository. Ensure off-server lifecycle rules are at least as strict as local retention.

## Verify

After every backup, check that the file is non-empty and decryptable without printing its content:

```bash
age --decrypt -i /secure/path/identity.txt backups/chem-scam-YYYYMMDDTHHMMSSZ.sql.gz.age | gzip -t
```

At least monthly, restore the newest backup into a disposable PostgreSQL database, run `SELECT count(*)` against key tables, and open the application against that database. A dump is not a verified backup until restoration succeeds.

## Restore

Restoration overwrites the selected database's objects. Stop the app to prevent writes, take a fresh safety backup, confirm the target database and encrypted file, then run:

```bash
docker compose stop app
AGE_IDENTITY_FILE=/secure/path/identity.txt ./scripts/restore-postgres.sh backups/chem-scam-YYYYMMDDTHHMMSSZ.sql.gz.age
docker compose up -d app
```

The script requires typing `RESTORE`, decrypts and decompresses as a stream, and feeds the SQL to `psql`. It never writes a plaintext dump to disk. Then check `/api/health`, inspect counts and recent records, and review container logs. If migration files newer than the backup exist, apply them after the restore and before restarting the app.
