# KIBO360 Project Hub — System Administrator Guide

Administrative operations, identity management, security forensics, and monitoring runbook for the **KIBO360 Project Hub** ([Livexpert Technologies Pvt. Ltd.](file:///C:/Users/ajit/.gemini/antigravity/scratch/kibo360-project-hub)).

---

## 1. Role-Based Access Control (RBAC) Matrix

KIBO360 implements strict hierarchical role boundaries across all API endpoints and frontend views:

| Role | Hierarchy Level | Capabilities & Access Scope |
| :--- | :---: | :--- |
| **`ADMINISTRATOR`** | Level 4 (Highest) | Complete enterprise control. Manages users, departments, roles, audits, project creation, server worker cycles, and system configurations. |
| **`PROJECT_MANAGER`** | Level 3 | Creates projects, creates milestones, assigns team leads, views enterprise-wide KPIs, exports corporate CSV reports. Cannot alter user accounts or roles. |
| **`TEAM_LEAD`** | Level 2 | Manages tasks and team members within their assigned department or project. Reviews deliverables and requests changes. Exports departmental CSV reports. |
| **`EMPLOYEE`** | Level 1 | Creates tasks, logs progress, updates subtasks, posts comments, and uploads attachments within their department. Scoped strictly to assigned department projects. |

---

## 2. User & Identity Management

Navigate to **User Management** in the sidebar (accessible only by `ADMINISTRATOR`).

### 2.1 Inviting a New Colleague
1. Click **+ Invite User** in the top-right toolbar.
2. Enter the employee's corporate details:
   - **First & Last Name**
   - **Email Address** (`@livexpert.in`)
   - **Assigned Department**: Select `Software / IT` or `Product / Design`.
   - **System Role**: Select `EMPLOYEE`, `TEAM_LEAD`, or `PROJECT_MANAGER`.
   - **Job Title**: E.g., `Senior Backend Engineer`, `UI/UX Designer`.
3. Click **Send Invitation**. The system provisions the account with `isInvited: true` and dispatches an invitation link.

### 2.2 Promoting or Altering Roles
1. In the User Directory table, locate the target user.
2. Click the **Edit Role** action.
3. Select the new role and confirm.
4. *Security Policy*: This action is recorded immediately in the immutable Audit Log (`ROLE_CHANGED`).

### 2.3 Deactivating Accounts
When an employee departs Livexpert Technologies:
1. Locate the employee record and click **Deactivate Account**.
2. Deactivated accounts immediately:
   - Reject subsequent login attempts (`HTTP 401 Unauthorized`).
   - Invalidate all existing refresh tokens and session cookies.
   - Retain historic audit log entries and task authorship for compliance.

### 2.4 Forcing a Password Reset
1. Click **Force Reset Password** on the user row.
2. The user's active session is terminated, and a fresh password-reset email is generated.

---

## 3. Security Forensics & Audit Logging

All sensitive administrative, authentication, and security-relevant actions generate immutable audit log records via [`backend/src/services/audit.service.ts`](file:///C:/Users/ajit/.gemini/antigravity/scratch/kibo360-project-hub/backend/src/services/audit.service.ts).

### 3.1 Audited Event Types
- `USER_LOGIN` / `USER_LOGOUT` — Authentication tracking with client IP.
- `PASSWORD_RESET_REQUESTED` / `PASSWORD_RESET_COMPLETED` — Credential lifecycle events.
- `USER_INVITED` / `USER_UPDATED` / `USER_DEACTIVATED` — Directory management.
- `ROLE_CHANGED` / `DEPARTMENT_CHANGED` — Permission boundary shifts.
- `PROJECT_CREATED` / `PROJECT_UPDATED` / `PROJECT_ARCHIVED` — Project portfolio tracking.
- `REPORT_EXPORTED` — Data exfiltration monitoring (captures export type, filters, and record count).

### 3.2 Querying Audit Logs
Inspect audit logs via REST endpoint (Admin only):
```bash
curl -s -X GET "https://kibo360.livexpert.in/api/v1/users/audit-logs?limit=100" \
  -H "Authorization: Bearer <ADMIN_ACCESS_TOKEN>"
```

---

## 4. System Health & Observability Probes

The backend exposes three health endpoints designed for uptime monitors, load balancers, and container orchestrators:

### 4.1 Detailed Diagnostic Health Check (`GET /api/v1/health`)
Provides full subsystem status:
```bash
curl -s http://localhost:5000/api/v1/health | jq .
```
Sample response:
```json
{
  "status": "healthy",
  "service": "kibo360-hub-api",
  "organization": "Livexpert Technologies Pvt. Ltd.",
  "version": "2.0.0",
  "uptime": 86420,
  "environment": "production",
  "subsystems": {
    "database": {
      "status": "connected",
      "usersCount": 42,
      "projectsCount": 18,
      "tasksCount": 240
    },
    "scheduler": {
      "status": "running",
      "intervalSeconds": 60
    },
    "jobQueue": {
      "status": "active",
      "pending": 0,
      "running": 0,
      "failed": 0
    },
    "memory": {
      "heapUsedMb": 48.25,
      "heapTotalMb": 64.00,
      "rssMb": 112.40
    }
  }
}
```

### 4.2 Liveness Probe (`GET /api/v1/health/liveness`)
Returns HTTP 200 `{ "status": "ok" }`. Use in Docker healthchecks and Kubernetes `livenessProbe` to restart hung processes.

### 4.3 Readiness Probe (`GET /api/v1/health/readiness`)
Returns HTTP 200 `{ "status": "ready" }` when database connection pool is warmed up and able to process SQL transactions.

---

## 5. Background Jobs & Scheduler Administration

The server executes background jobs on a 60-second cycle for time-sensitive automation:
- **Upcoming Deadline Reminders**: Scans tasks due within 7 days.
- **Overdue Task Escalations**: Notifies assignees and project leads for past-due work.
- **Approaching Milestone Reminders**: Notifies project owners 7 days prior to milestone dates.
- **Deduplication Engine**: Uses structured composite deduplication keys (e.g. `UPCOMING:task-id:YYYY-MM-DD`) ensuring zero repeat alerts on the same calendar day.

### Manual Worker Execution
To force an immediate background worker scan cycle via API:
```bash
curl -s -X POST "https://kibo360.livexpert.in/api/v1/notifications/jobs/run-worker" \
  -H "Authorization: Bearer <ADMIN_ACCESS_TOKEN>"
```

---

## 6. Rate Limiting Controls

Configured in [`backend/src/middleware/rateLimiter.ts`](file:///C:/Users/ajit/.gemini/antigravity/scratch/kibo360-project-hub/backend/src/middleware/rateLimiter.ts):

| Limiter | Target Endpoint | Production Ceiling | Window | Description |
| :--- | :--- | :---: | :---: | :--- |
| `apiLimiter` | `/api/v1/*` | 1,000 req | 15 mins | General API protection against scraping and DoS. |
| `loginLimiter` | `/api/v1/auth/login` | 10 attempts | 15 mins | Brute-force credential stuffing mitigation. |
| `passwordResetLimiter` | `/api/v1/auth/forgot-password` | 5 attempts | 15 mins | Outbound SMTP spam and enumeration defense. |
| `exportLimiter` | `/api/v1/reports/export/:type` | 30 exports | 15 mins | Heavy CSV reporting resource exhaustion defense. |
