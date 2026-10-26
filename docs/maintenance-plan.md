# KIBO360 Project Hub — Maintenance & Operations Plan

Operational maintenance guide, known limitations, scheduled procedures, incident runbooks, and software upgrade lifecycle for the **KIBO360 Project Hub** at **Livexpert Technologies Pvt. Ltd.**

---

## 1. System Architecture Overview & Known Limitations

### 1.1 Architecture & Storage Engine Fallback
- **Primary Engine**: PostgreSQL 16 (Relational Database) accessed via Prisma ORM and strict SQL connection pooling.
- **In-Memory Seed & Dual-Driver Fallback**: The development and test environments feature an in-memory transactional mock engine (`backend/src/models/dbStore.ts`) enabling fast test execution (143+ unit/integration tests). In production, `DATABASE_URL` connects directly to PostgreSQL.
  - *Known Limitation*: When running in mock store mode, state resets on process restart. In production with PostgreSQL, all data is durable on the dedicated Docker persistent volume `postgres_prod_data`.

### 1.2 Background Scheduler & Queueing
- **Current Architecture**: Server-side in-memory async scheduler (`backend/src/services/scheduler.service.ts` and `queue.service.ts`) running at configurable intervals (`SCHEDULER_INTERVAL_MS=60000`).
  - *Known Limitation*: In a multi-node backend cluster running behind a load balancer without sticky sessions, multiple instances could run duplicate scheduler sweeps if not coordinated.
  - *Mitigation & Roadmap*: The system incorporates database idempotency keys and notification deduplication windows (e.g. 24h deduplication for overdue reminders). For horizontal scaling beyond 2 nodes, provision Redis with BullMQ (supported via clean queue abstraction in Phase 7).

### 1.3 File Attachments Storage
- **Current Architecture**: Local disk storage mounted at `uploads/` (`/var/kibo360/uploads` or Docker volume `backend_uploads`).
  - *Known Limitation*: Local file system storage does not automatically sync across distributed nodes without a shared NFS volume.
  - *Mitigation & Roadmap*: For multi-server clusters, configure S3/MinIO compatible object storage by plugging an S3 storage adapter into [`backend/src/services/task.service.ts`](file:///C:/Users/ajit/.gemini/antigravity/scratch/kibo360-project-hub/backend/src/services/task.service.ts).

### 1.4 Company Timezone Boundary Handling
- All system timestamps are persisted in standard UTC in the database.
- Deadline and approaching notifications are calculated server-side based on `COMPANY_TIMEZONE` (default: `Asia/Kolkata` / IST).
- *Limitation*: If `COMPANY_TIMEZONE` is altered on a live deployment, historic calculated report snapshots may reflect the previous timezone alignment until recalculated.

---

## 2. Routine Maintenance Schedule

| Cadence | Task | Description & Target | Runbook Reference |
| :--- | :--- | :--- | :--- |
| **Daily (02:00 IST)** | Automated PostgreSQL Backup | Executed via `backup-cron.sh` / `backup-cron.ps1`. Compresses snapshot and prunes backups older than 7 days. | [Section 3.1](#31-daily-backup-verification) |
| **Daily (08:00 IST)** | Health Endpoint Audit | Verify `/api/health`, `/api/health/liveness`, and `/api/health/readiness`. Check process uptime and memory heap. | [Section 3.2](#32-application-health-monitoring) |
| **Weekly (Sun 03:00 IST)** | Database VACUUM & ANALYZE | Reclaims storage from deleted tasks/attachments, updates query planner statistics. | [Section 3.3](#33-database-vacuum--index-optimization) |
| **Weekly (Sun 04:00 IST)** | Security & Expiration Pruning | Purge expired password reset tokens (`expiresAt < NOW()`) and orphaned temp files. | [Section 3.4](#34-token--file-cleanup) |
| **Monthly (1st Sun)** | Security Vulnerability Audit | Run `npm audit` across root, backend, and frontend packages. Check CVEs. | [Section 3.5](#35-security-dependency-auditing) |
| **Monthly (1st Sun)** | Backup Restoration Drill | Restore the latest automated backup to the staging database (`kibo360_staging`) and run test verification. | [Backup Guide](file:///C:/Users/ajit/.gemini/antigravity/scratch/kibo360-project-hub/docs/deployment/backup-and-recovery-guide.md#4-restore--disaster-recovery-procedure) |
| **Quarterly** | SSL Certificate Renewal | Renew Let's Encrypt certificates (or internal root certificates) before the 30-day expiry threshold. | [Section 3.6](#36-ssl-certificate-lifecycle) |

---

## 3. Standard Operating Procedures (SOPs)

### 3.1 Daily Backup Verification
Check that the automated backup completed successfully:
```bash
# On Linux host
ls -lh /var/kibo360/backups/kibo360_prod_*.sql.gz

# On Windows host (PowerShell)
Get-ChildItem -Path C:\kibo360\backups\ -Filter *.sql.gz | Sort-Object LastWriteTime -Descending | Select-Object -First 3
```
Ensure the latest backup has non-zero size (> 100 KB) and was generated within the last 24 hours.

### 3.2 Application Health Monitoring
Execute an HTTP check against the backend health endpoint:
```bash
curl -f https://kibo360.livexpert.in/api/health
```
Expected output:
```json
{
  "status": "UP",
  "database": "CONNECTED",
  "scheduler": { "running": true },
  "backgroundJobs": { "queued": 0, "completed": 42, "failed": 0 },
  "memory": { "heapUsedMB": 85.4, "heapTotalMB": 128.0 }
}
```

### 3.3 Database VACUUM & Index Optimization
Connect to PostgreSQL container or instance as `postgres` superuser:
```bash
docker exec -i kibo360-postgres psql -U postgres -d kibo360_prod -c "VACUUM (VERBOSE, ANALYZE);"
```
Reindex critical high-volume lookup tables:
```sql
REINDEX TABLE "Task";
REINDEX TABLE "Notification";
REINDEX TABLE "AuditLog";
REINDEX TABLE "Activity";
```

### 3.4 Token & File Cleanup
Run maintenance query to clear expired tokens and old completed background jobs:
```sql
-- Remove password reset tokens expired more than 7 days ago
DELETE FROM "PasswordResetToken" WHERE "expiresAt" < NOW() - INTERVAL '7 days';

-- Purge completed background job audit records older than 30 days
DELETE FROM "BackgroundJob" WHERE "status" = 'COMPLETED' AND "completedAt" < NOW() - INTERVAL '30 days';
```

### 3.5 Security Dependency Auditing
On the staging or build server:
```bash
npm audit --prefix backend
npm audit --prefix frontend
```
If critical or high vulnerabilities are detected, review patches with `npm audit fix --dry-run` and schedule an application update following [Section 5](#5-software-upgrade-procedure).

### 3.6 SSL Certificate Lifecycle
Certificates are stored in `deployment/ssl/`:
- `deployment/ssl/kibo360.crt`
- `deployment/ssl/kibo360.key`

To inspect expiration date:
```bash
openssl x509 -in deployment/ssl/kibo360.crt -noout -enddate
```
For Let's Encrypt certbot automated renewal:
```bash
certbot renew --post-hook "docker exec kibo360-nginx nginx -s reload"
```

---

## 4. Operational Incident Runbooks

### 4.1 Incident: Backend Returning 502 Bad Gateway / 500 Errors
1. **Check Nginx Error Logs**:
   ```bash
   docker logs kibo360-nginx --tail 50
   ```
2. **Check Backend Container Status & Logs**:
   ```bash
   docker logs kibo360-backend --tail 100
   ```
3. **Check Resource Starvation**:
   ```bash
   docker stats --no-stream
   ```
   If backend exceeded memory limit (default 1GB):
   ```bash
   docker restart kibo360-backend
   ```
4. **Test Database Connectivity from Backend**:
   ```bash
   docker exec -it kibo360-backend npx prisma db execute --stdin <<< "SELECT 1;"
   ```

### 4.2 Incident: Database Connection Pool Exhausted
**Symptom**: Logs display `PrismaClientInitializationError` or `Timed out fetching a connection from the pool`.
1. **Inspect Active Connections**:
   ```sql
   SELECT count(*), state FROM pg_stat_activity WHERE datname = 'kibo360_prod' GROUP BY state;
   ```
2. **Terminate Hanging / Idle Connections**:
   ```sql
   SELECT pg_terminate_backend(pid) 
   FROM pg_stat_activity 
   WHERE datname = 'kibo360_prod' 
     AND state = 'idle' 
     AND state_change < NOW() - INTERVAL '15 minutes';
   ```
3. **Permanent Fix**: Adjust `DATABASE_URL` in `.env.production` to increase connection limit:
   ```env
   DATABASE_URL="postgresql://kibo360_app:SECRET@postgres:5432/kibo360_prod?connection_limit=30&pool_timeout=20"
   ```

### 4.3 Incident: Background Notifications Not Dispatching
1. **Check Scheduler Health**:
   ```bash
   curl https://kibo360.livexpert.in/api/health
   ```
   Ensure `"scheduler": { "running": true }`.
2. **Inspect Scheduler & SMTP Logs**:
   Filter backend logs for scheduler tags:
   ```bash
   docker logs kibo360-backend | grep -iE "scheduler|email|smtp"
   ```
3. **Verify SMTP Relay Authentication**:
   Confirm credentials in `.env.production` (`SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`).

---

## 5. Software Upgrade Procedure

Upgrades must follow zero-downtime guidelines whenever possible.

```mermaid
graph TD
    A["1. Code Pull & Build"] --> B["2. Staging Deployment"]
    B --> C["3. Staging Verification Suite"]
    C --> D{"Tests Pass?"}
    D -- No --> E["Investigate & Fix"]
    D -- Yes --> F["4. Production Database Backup"]
    F --> G["5. Apply Prisma Migrations"]
    G --> H["6. Rolling Container Restart"]
    H --> I["7. Post-Deployment Smoke Test"]
    I --> J["Deployment Complete"]
```

### 5.1 Step-by-Step Upgrade Steps
1. **Deploy to Staging First**:
   ```bash
   docker compose -f docker-compose.staging.yml up -d --build
   npx tsx deployment/scripts/verify-staging.ts
   ```
2. **Take Pre-Deployment Production Snapshot**:
   ```bash
   # Linux
   bash deployment/scripts/backup-cron.sh
   # Windows
   powershell -File deployment/scripts/backup-cron.ps1
   ```
3. **Run Production Database Migration**:
   ```bash
   docker exec -it kibo360-backend npx prisma migrate deploy
   ```
4. **Deploy Updated Production Containers**:
   ```bash
   docker compose -f docker-compose.prod.yml up -d --no-deps --build backend frontend
   ```
5. **Run Production Smoke Tests**:
   Execute the automated launch checks suite:
   ```bash
   npm --prefix backend test -- tests/launch_checks.test.ts
   ```

---

## 6. Escalation & Support Matrix

For production emergencies at Livexpert Technologies Pvt. Ltd.:

| Tier | Role | Contact | SLA |
| :--- | :--- | :--- | :--- |
| **Tier 1** | Primary On-Call Site Reliability Engineer | `sre-oncall@livexpert.in` | 15 minutes |
| **Tier 2** | Lead Backend Engineer & DBA | `backend-leads@livexpert.in` | 30 minutes |
| **Tier 3** | Head of Engineering / Tech Director | `engineering-mgmt@livexpert.in` | 1 hour |

*Livexpert Technologies Pvt. Ltd. — Confidential & Proprietary Information.*
