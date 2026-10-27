# KIBO360 Project Hub — Backup & Disaster Recovery Guide

Enterprise backup strategy, automated scheduling, checksum verification, and disaster restoration drills for the **KIBO360 Project Hub** ([Livexpert Technologies Pvt. Ltd.](file:///C:/Users/ajit/.gemini/antigravity/scratch/kibo360-project-hub)).

---

## 1. Disaster Recovery Objectives

Livexpert Technologies requires strict enterprise business continuity targets for KIBO360 Project Hub:

| Metric | Target | Definition |
| :--- | :---: | :--- |
| **Recovery Point Objective (RPO)** | **< 1 hour** | Maximum acceptable data loss window in the event of hardware or datacenter failure. |
| **Recovery Time Objective (RTO)** | **< 15 minutes** | Maximum acceptable duration required to restore system operations following a disaster. |
| **Snapshot Checksum Integrity** | **100% Verified** | Every backup is validated with CRC32 hashing and record count auditing. |
| **Retention Policy** | **7 Days / 4 Weeks** | 7 daily snapshots + 4 weekly archives + 12 monthly cold archives. |

---

## 2. Backup Mechanisms

KIBO360 provides two complementary backup strategies:

### 2.1 Strategy A: Point-in-Time Application Snapshot Engine
Implemented in [`backend/scripts/backup-restore.ts`](file:///C:/Users/ajit/.gemini/antigravity/scratch/kibo360-project-hub/backend/scripts/backup-restore.ts):
- Exports complete relational data across all 16 collections: `departments`, `users`, `profiles`, `refreshTokens`, `passwordResetTokens`, `projects`, `projectMembers`, `milestones`, `tasks`, `taskDependencies`, `taskComments`, `taskAttachments`, `notifications`, `notificationPreferences`, `backgroundJobs`, `auditLogs`.
- Self-contained, portable JSON snapshot with ISO metadata and CRC32 checksum.
- Database-agnostic restoration allowing cross-environment cloning (e.g., restoring production snapshot into staging for reproduction).

### 2.2 Strategy B: PostgreSQL Native Binary Dump (`pg_dump`)
Native binary format snapshot preserving PostgreSQL system catalogs, sequence states, OIDs, and schema permissions:
```bash
pg_dump -U kibo360_app -d kibo360_hub -F c -b -v -f "/backups/kibo360_pg_$(date +%Y%m%d_%H%M%S).dump"
```

---

## 3. Automated Scheduling & Retention Pruning

### 3.1 Windows Server (Task Scheduler)
Utilizes [`deployment/scripts/backup-cron.ps1`](file:///C:/Users/ajit/.gemini/antigravity/scratch/kibo360-project-hub/deployment/scripts/backup-cron.ps1).

#### Registering the Scheduled Task:
```powershell
$action = New-ScheduledTaskAction -Execute "PowerShell.exe" `
    -Argument "-ExecutionPolicy Bypass -File C:\Users\ajit\.gemini\antigravity\scratch\kibo360-project-hub\deployment\scripts\backup-cron.ps1"

$trigger = New-ScheduledTaskTrigger -Daily -At 02:00AM

Register-ScheduledTask -Action $action -Trigger $trigger `
    -TaskName "KIBO360-Database-Daily-Backup" `
    -Description "Nightly automated database snapshot with 7-day retention pruning" `
    -User "SYSTEM"
```

### 3.2 Linux Production (Crontab)
Utilizes [`deployment/scripts/backup-cron.sh`](file:///C:/Users/ajit/.gemini/antigravity/scratch/kibo360-project-hub/deployment/scripts/backup-cron.sh).

#### Crontab Entry (`crontab -e`):
```cron
# Run daily at 02:00 AM UTC
0 2 * * * /var/www/kibo360/deployment/scripts/backup-cron.sh >> /var/log/kibo360/backup.log 2>&1
```

---

## 4. Manual On-Demand Backup Execution

To trigger an immediate snapshot before upgrades, schema changes, or maintenance:

```bash
# Generate JSON relational snapshot
npx tsx backend/scripts/backup-restore.ts backup
```

Expected output:
```text
✅ Snapshot backup saved to: C:\Users\ajit\.gemini\antigravity\scratch\kibo360-project-hub\kibo360_backup_1793005820123.json
```

---

## 5. Restoration Procedures

### 5.1 Restoring from an Application Snapshot

```bash
# Execute restoration
npx tsx backend/scripts/backup-restore.ts restore <path_to_snapshot.json>
```

Sample output:
```text
🔄 Restoring database snapshot from: backups/kibo360_backup_1793005820123.json
✅ Snapshot integrity validated (Version 2.0.0, Checksum: 0x4A2B81F9)
📦 Restored 2 departments
📦 Restored 5 users
📦 Restored 5 profiles
📦 Restored 6 projects
📦 Restored 16 tasks
📦 Restored 10 notifications
🎉 Database restoration completed successfully with zero record loss.
```

### 5.2 Restoring from PostgreSQL Binary Dump (`pg_restore`)

```bash
# 1. Stop backend application to prevent write conflicts
docker compose --env-file .env.production -f docker-compose.prod.yml stop backend

# 2. Drop existing schema and restore from dump file
psql -U postgres -d kibo360_hub -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
pg_restore -U kibo360_app -d kibo360_hub -v "/backups/kibo360_pg_20261026_020000.dump"

# 3. Restart backend service
docker compose --env-file .env.production -f docker-compose.prod.yml start backend
```

---

## 6. Off-Site Cloud Storage Synchronization

To protect against physical datacenter disasters, sync backup files to encrypted cloud object storage (AWS S3, Cloudflare R2, or MinIO):

```bash
# AWS S3 Sync with Server-Side Encryption (AES-256)
aws s3 sync /var/www/kibo360/backups/ s3://livexpert-kibo360-backups/production/ \
    --sse AES256 \
    --exclude "*" \
    --include "kibo360_backup_*.json" \
    --include "*.dump"
```

---

## 7. Disaster Recovery Drill Checklist

Conduct this drill quarterly to certify operational readiness:

- [ ] **Step 1**: Provision a clean, empty staging database (`kibo360_drill`).
- [ ] **Step 2**: Retrieve the latest snapshot from off-site storage.
- [ ] **Step 3**: Execute `npx tsx backend/scripts/backup-restore.ts restore`.
- [ ] **Step 4**: Run staging pre-release verifier: `npx tsx deployment/scripts/verify-staging.ts`.
- [ ] **Step 5**: Log in as `admin@livexpert.in` and confirm all 6 projects, 16 deliverables, and audit logs are intact.
- [ ] **Step 6**: Record drill completion timestamp and signed approval in IT Compliance Registry.
