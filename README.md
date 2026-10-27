# KIBO360 Project Hub

> Enterprise project management application for **Livexpert Technologies Pvt. Ltd.**

---

## Architecture Overview

**KIBO360 Project Hub** is an internal enterprise SaaS platform designed to streamline cross-functional project tracking, task allocation, sprint planning, and performance analytics across Livexpert squads.

- **Phase 1 Foundation**: React 18 + Vite + TypeScript frontend, Tailwind CSS design system, official KIBO360 brand assets, Express.js REST API with health check endpoint (`GET /api/v1/health`), and monorepo orchestration.
- **Phase 2 Authentication & User Management**: PostgreSQL Prisma schema migrations, bcrypt password hashing, JWT access/refresh token sessions with secure HTTP-only cookies, rate limiting, role-based access control (RBAC), protected frontend routes, administrator user management interface, password reset flow, and audit logging.
- **Phase 3 Dynamic Dashboard & Telemetry**: Live PostgreSQL and database-driven KPI summary cards, reactive multi-dimensional filter bar (Date Range, Department, Project, Assignee, Status), visual task status distribution chart, employee workload tracking, upcoming 14-day milestone timeline, personalized assigned tasks with inline status toggles, review queue, and overdue deliverable alerts.

---

## Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18, Vite, TypeScript, Tailwind CSS, React Router v6, Lucide Icons |
| **Backend** | Node.js, Express.js, TypeScript, Zod Schema Validation, REST API |
| **Security & Auth** | Bcryptjs, JSON Web Tokens (JWT), HTTP-only Cookies, Express-Rate-Limit, Helmet |
| **Database & ORM** | PostgreSQL, Prisma ORM (with migration SQL DDL and seed store) |
| **Dashboard Telemetry**| Dynamic KPI metrics, Filter Engine, Workload Allocation, Milestone Schedules |
| **Testing** | Node.js Test Runner (`node:test`, `node:assert`) |

---

## Dashboard Components (Phase 3)

### Summary Metric Cards
- **Total Projects**: Total initiatives in scope.
- **Active Projects**: Initiatives currently in `ACTIVE` or `IN_PROGRESS` execution.
- **Completed Projects**: Delivered milestones with `COMPLETED` status.
- **Total Open Tasks**: Backlog, Todo, In Progress, and In Review deliverables.
- **Overdue Tasks**: High-visibility alert metric for open tasks past their due date.
- **Tasks Due In 7 Days**: Approaching deadlines requiring squad focus.

### Telemetry & Workload Sections
- **Recent Projects Table**: Projects with live task completion percentages (`completed / total * 100`), department badges, leads, and target dates.
- **Task Status Distribution Chart**: Stacked multi-segment bar and granular status cards (`BACKLOG`, `TODO`, `IN_PROGRESS`, `IN_REVIEW`, `COMPLETED`, `CANCELLED`).
- **Workload by Employee**: Individual contributor cards showing open tasks, completed tasks, overdue items, and a visual workload capacity bar.
- **Upcoming Deadlines**: Chronological milestone tracker for the next 14 days with days-left badges (`Today`, `Tomorrow`, `In X days`).
- **My Assigned Tasks**: User's personal deliverables with interactive checkbox toggles to transition tasks between `IN_PROGRESS` and `COMPLETED`.
- **Tasks Awaiting Review**: Dedicated queue for tasks with `IN_REVIEW` status, featuring an instant "Approve" button.
- **Overdue Tasks Requiring Attention**: Prominent warning section listing late deliverables with calculated days-overdue badges.

### Multi-Dimensional Filters
- **Date Range**: `All Time`, `Today`, `This Week`, `This Month`, `This Quarter`.
- **Department**: `Software / IT`, `Product / Design`, or `All Departments`.
- **Project**: Dynamic dropdown of all projects in scope.
- **Task Owner**: Dynamic dropdown of team members.
- **Status**: Filter by specific task lifecycle state.
- **Clear Filters**: Instant reset button returning the view to organization defaults.

---

## Roles and Departments

### Approved Roles
- **Administrator**: Administrative control, account activation/deactivation, and audit trail access. The designated super admin creates users and assigns roles.
- **Project Manager**: Access to project planning, team tasks, workload tracking, and user directory.
- **Team Lead**: Sprint milestone coordination, technical deliverables, and department task allocation.
- **Employee**: Individual task view, completion tracking, personal dashboard, and profile management.

### Approved Departments
- **Software / IT** (Code: `SOFTWARE_IT`)
- **Product / Design** (Code: `PRODUCT_DESIGN`)

*(Note: Sales and Marketing departments and modules are strictly omitted per architectural specification).*

---

## Production deployment

Production does not create demo projects or demo accounts. For a fresh Dokploy deployment, follow the [Dokploy deployment guide](docs/deployment/dokploy.md). It describes domain/TLS setup, required secrets, the initial super-admin account, database migrations, and post-deploy checks.

---

## Quickstart Guide

### 1. Installation
From the project root:
```bash
npm run install:all
```

### 2. Run Automated Test Suite
Execute all 16 Phase 2 and Phase 3 security, authentication, and dashboard telemetry tests:
```bash
npm --prefix backend test
```

### 3. Start Applications Concurrently
From the project root:
```bash
npm run dev
```

- **Frontend**: [http://localhost:5173](http://localhost:5173)
  - Dashboard: [http://localhost:5173/dashboard](http://localhost:5173/dashboard)
  - User Management: [http://localhost:5173/users](http://localhost:5173/users)
  - Login Page: [http://localhost:5173/login](http://localhost:5173/login)
- **Backend API**: [http://localhost:5002](http://localhost:5002)
  - Health Endpoint: [http://localhost:5002/api/v1/health](http://localhost:5002/api/v1/health)

---

## API Endpoints (Phase 3 Dashboard)

- `GET /api/v1/dashboard/overview`: Composite endpoint returning all dashboard sections, metrics, and filter options in a single request.
- `GET /api/v1/dashboard/summary`: Summary KPI numbers.
- `GET /api/v1/dashboard/recent-projects`: Paginated recent projects with calculated task completion percentages.
- `GET /api/v1/dashboard/upcoming-deadlines`: Project and task deadlines within the next 14 days.
- `GET /api/v1/dashboard/my-tasks`: Tasks assigned to the active user.
- `GET /api/v1/dashboard/awaiting-review`: Deliverables in `IN_REVIEW` status.
- `GET /api/v1/dashboard/overdue`: Overdue deliverables sorted by lateness.
- `GET /api/v1/dashboard/status-stats`: Breakdown of tasks across lifecycle statuses.
- `GET /api/v1/dashboard/workload`: Workload allocation per team member.
- `GET /api/v1/dashboard/filters`: Dropdown options for filter bars.
- `PATCH /api/v1/dashboard/tasks/:id/status`: Inline status update with audit logging.
