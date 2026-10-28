# KIBO360 Project Hub — Database Migration & Rollback Guide

Production database migration lifecycle, zero-downtime deployment policies, and emergency disaster rollback runbook for the **KIBO360 Project Hub** ([Livexpert Technologies Pvt. Ltd.](file:///C:/Users/ajit/.gemini/antigravity/scratch/kibo360-project-hub)).

---

## 1. Migration Architecture & Version History

KIBO360 Project Hub manages PostgreSQL relational schemas using **Prisma Migrate**. All migrations are stored as immutable SQL files in [`backend/prisma/migrations/`](file:///C:/Users/ajit/.gemini/antigravity/scratch/kibo360-project-hub/backend/prisma/migrations).

| Version | Migration Directory | Tables Created / Modified | Purpose |
| :---: | :--- | :--- | :--- |
| **v1.0** | `20261025000000_phase2_auth_and_user_management` | `departments`, `users`, `profiles`, `refresh_tokens`, `password_reset_tokens`, `audit_logs`, `teams`, `team_members` | Authentication, RBAC, user directory, security tokens, audit logging. |
| **v2.0** | `20261025010000_phase4_project_management` | `projects`, `project_members`, `milestones` | Enterprise project registry, role-based member assignments, milestones. |
| **v3.0** | `20261025020000_phase5_task_management` | `tasks`, `task_dependencies`, `task_comments`, `task_attachments` | Deliverables, subtasks, DAG dependency linking, file metadata, comments. |
| **v4.0** | `20261025030000_phase7_notifications_automation` | `notifications`, `notification_preferences`, `background_jobs` | In-app alerts, dedup keys, user alert preferences, background job queue. |

---

## 2. Production Migration Execution Workflow

### 2.1 The Golden Rule of Production Migrations
> [!IMPORTANT]
> **NEVER run `prisma migrate dev` in staging or production environments.**
> `prisma migrate dev` generates new migration files, compares development diffs, and may prompt to reset the database. In staging and production, **ONLY** use `prisma migrate deploy`.

### 2.2 Standard Migration Steps

1. **Pre-Migration Snapshot**:
   Always execute a database backup prior to applying schema migrations:
   ```bash
   npx tsx backend/scripts/backup-restore.ts backup
   ```
2. **Review Pending Migrations**:
   Inspect pending migrations against the target database:
   ```bash
   npx prisma migrate status --schema=backend/prisma/schema.prisma
   ```
3. **Execute Deploy**:
   Apply all unapplied migrations transactionally:
   ```bash
   npx prisma migrate deploy --schema=backend/prisma/schema.prisma
   ```
4. **Post-Migration Verification**:
   Verify migration state and generate rollback documentation:
   ```bash
   npx tsx backend/scripts/migration-verify.ts
   ```

---

## 3. Zero-Downtime Migration Principles

To ensure uninterrupted service for 24/7 business operations:

1. **Add Columns as Nullable First**: When adding new fields, always declare them optional or provide a database default value. Never introduce a `NOT NULL` column without a default in a single release.
2. **Expand and Contract Pattern**:
   - *Phase A (Expand)*: Add new columns/tables; backend writes to both old and new.
   - *Phase B (Backfill)*: Populate historic records via background migration script.
   - *Phase C (Switch)*: Point application reads to new columns.
   - *Phase D (Contract)*: Remove legacy columns in a subsequent release.
3. **Index Creation**: Add indexes using PostgreSQL `CONCURRENTLY` if working with high-volume tables to avoid table read/write locks.
4. **Connection Pooling**: Use `PgBouncer` or PostgreSQL connection limits to prevent connection starvation during schema alters.

---

## 4. Migration Audit & Rollback DDL Generator

KIBO360 provides an automated migration verification and rollback DDL generator in [`backend/scripts/migration-verify.ts`](file:///C:/Users/ajit/.gemini/antigravity/scratch/kibo360-project-hub/backend/scripts/migration-verify.ts).

### Running the Verifier
```bash
npx tsx backend/scripts/migration-verify.ts
```

### Sample Output
```text
Audited 4 migrations:

📦 Migration: 20261025000000_phase2_auth_and_user_management
   Tables created: tasks, projects, team_members, teams, audit_logs, password_reset_tokens, refresh_tokens, profiles, users, departments
   Indexes created: 13
   Rollback SQL generated: 1464 chars

📦 Migration: 20261025010000_phase4_project_management
   Tables created: milestones, project_members
   Indexes created: 2
   Rollback SQL generated: 631 chars

📦 Migration: 20261025020000_phase5_task_management
   Tables created: task_dependencies, task_attachments, task_comments
   Indexes created: 10
   Rollback SQL generated: 1087 chars

📦 Migration: 20261025030000_phase7_notifications_automation
   Tables created: background_jobs, notification_preferences, notifications
   Indexes created: 6
   Rollback SQL generated: 913 chars
```

---

## 5. Emergency Rollback Procedure

If a migration fails or causes unexpected application instability:

### Step 1: Place Application into Maintenance Mode
Temporarily route HTTP traffic to a 503 maintenance page via Nginx:
```bash
sudo ln -sf /etc/nginx/conf.d/maintenance.conf /etc/nginx/conf.d/default.conf
sudo nginx -s reload
```

### Step 2: Roll Back Schema via Reverse DDL
Generate and inspect the reverse DDL script for the target migration:
```sql
-- Example: Rollback for Phase 7 Notifications & Automation
BEGIN;

DROP TABLE IF EXISTS "notifications" CASCADE;
DROP TABLE IF EXISTS "notification_preferences" CASCADE;
DROP TABLE IF EXISTS "background_jobs" CASCADE;

DROP TYPE IF EXISTS "NotificationType";
DROP TYPE IF EXISTS "JobStatus";

-- Mark migration as rolled back in Prisma internal tracking table
DELETE FROM "_prisma_migrations" 
WHERE "migration_name" = '20261025030000_phase7_notifications_automation';

COMMIT;
```

Execute the SQL script via `psql`:
```bash
psql -U kibo360_app -d kibo360_hub -f rollback.sql
```

### Step 3: Resolve Prisma Migration State
If a migration partially applied and failed, tell Prisma to mark it as rolled back:
```bash
npx prisma migrate resolve --rolled-back "20261025030000_phase7_notifications_automation" --schema=backend/prisma/schema.prisma
```

### Step 4: Revert Backend Application Version
Roll back the Node.js application container or Git release to the previous known good commit:
```bash
# Docker Compose
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build backend

# PM2
pm2 restart kibo360-backend
```

### Step 5: Resume Traffic & Verify
Disable maintenance mode in Nginx and run the smoke verification script:
```bash
sudo ln -sf /etc/nginx/conf.d/kibo360.conf /etc/nginx/conf.d/default.conf
sudo nginx -s reload
npx tsx deployment/scripts/verify-staging.ts https://kibo360.livexpert.in/api/v1
```

---

## 6. Seed Data & Baseline Restoration

For newly provisioned environments requiring initial organization data:
```bash
# Populate initial departments, users, projects, and milestones
npx prisma db seed --schema=backend/prisma/schema.prisma
```
Default accounts seeded:
- `admin@livexpert.in` (`ADMINISTRATOR`)
- `pm@livexpert.in` (`MANAGER`)
- `lead@livexpert.in` (`TEAM_LEAD`)
- `dev@livexpert.in` (`EMPLOYEE`)
All accounts are provisioned with initial temporary password: `Livexpert@2026` (which requires immediate rotation).
