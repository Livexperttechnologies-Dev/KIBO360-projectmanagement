import bcrypt from "bcryptjs";

export type Role = "ADMINISTRATOR" | "PROJECT_MANAGER" | "TEAM_LEAD" | "EMPLOYEE";
export type ProjectStatus = "PLANNING" | "ACTIVE" | "IN_PROGRESS" | "ON_HOLD" | "COMPLETED" | "ARCHIVED";
export type TaskStatus =
  | "OPEN"
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "UNDER_REVIEW"
  | "CHANGES_REQUIRED"
  | "COMPLETED"
  | "BLOCKED"
  | "BACKLOG"
  | "TODO"
  | "IN_REVIEW"
  | "CANCELLED";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type ProjectPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type MilestoneStatus = "PENDING" | "REACHED" | "OVERDUE";
export type ProjectMemberRole = "LEAD" | "CONTRIBUTOR" | "VIEWER";
export type AttachmentAccessScope = "PUBLIC" | "PROJECT_MEMBERS" | "ASSIGNEE_ONLY";

export interface DepartmentRecord {
  id: string;
  name: "Software / IT" | "Product / Design";
  code: "SOFTWARE_IT" | "PRODUCT_DESIGN";
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProfileRecord {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  jobTitle?: string;
  phone?: string;
  avatarUrl?: string;
  bio?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
  role: Role;
  isActive: boolean;
  isInvited: boolean;
  departmentId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RefreshTokenRecord {
  id: string;
  tokenHash: string;
  userId: string;
  expiresAt: Date;
  revokedAt?: Date;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

export interface PasswordResetTokenRecord {
  id: string;
  tokenHash: string;
  userId: string;
  expiresAt: Date;
  usedAt?: Date;
  createdAt: Date;
}

export interface AuditLogRecord {
  id: string;
  userId?: string;
  targetId?: string;
  action: string;
  entity: string;
  details?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

export interface ProjectMemberRecord {
  id: string;
  projectId: string;
  userId: string;
  role: ProjectMemberRole;
  joinedAt: Date;
}

export interface MilestoneRecord {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  dueDate: Date;
  status: MilestoneStatus;
  reachedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectRecord {
  id: string;
  title: string;
  key: string;
  description?: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  startDate?: Date;
  targetDate?: Date;
  creatorId: string;
  ownerId?: string;
  departmentId?: string;
  teamId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskRecord {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  taskList?: string;
  startDate?: Date;
  dueDate?: Date;
  estimatedEffort?: number;
  completionPercentage?: number;
  projectId: string;
  creatorId: string;
  assigneeId?: string;
  reviewerId?: string;
  parentTaskId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskCommentRecord {
  id: string;
  taskId: string;
  userId: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskAttachmentRecord {
  id: string;
  taskId: string;
  uploaderId: string;
  filename: string;
  filesize: number;
  mimetype: string;
  fileUrl: string;
  accessScope: AttachmentAccessScope;
  createdAt: Date;
}

export interface TaskDependencyRecord {
  id: string;
  taskId: string;
  dependsOnTaskId: string;
  createdAt: Date;
}

export type NotificationType =
  | "NEW_TASK_ASSIGNMENT"
  | "TASK_REASSIGNMENT"
  | "UPCOMING_DEADLINE"
  | "OVERDUE_TASK"
  | "BLOCKED_TASK"
  | "REVIEW_REQUESTED"
  | "CHANGES_REQUESTED"
  | "TASK_APPROVED"
  | "TASK_COMPLETED"
  | "MILESTONE_APPROACHING";

export type JobStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";

export interface NotificationRecord {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  entityType: "TASK" | "MILESTONE" | "PROJECT";
  entityId?: string;
  projectId?: string;
  isRead: boolean;
  dedupKey?: string;
  readAt?: Date;
  createdAt: Date;
}

export interface NotificationPreferenceRecord {
  id: string;
  userId: string;
  emailNotifications: boolean;
  inAppNotifications: boolean;
  notifyOnAssignment: boolean;
  notifyOnDeadlineApproaching: boolean;
  notifyOnOverdue: boolean;
  notifyOnBlockedWork: boolean;
  notifyOnReviewRequested: boolean;
  notifyOnChangesRequested: boolean;
  notifyOnMilestoneApproaching: boolean;
  updatedAt: Date;
}

export interface BackgroundJobRecord {
  id: string;
  jobName: string;
  payload?: any;
  status: JobStatus;
  attempts: number;
  maxAttempts: number;
  lastError?: string;
  processedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

class HubDatabaseStore {
  public departments: DepartmentRecord[] = [];
  public users: UserRecord[] = [];
  public profiles: ProfileRecord[] = [];
  public refreshTokens: RefreshTokenRecord[] = [];
  public passwordResetTokens: PasswordResetTokenRecord[] = [];
  public auditLogs: AuditLogRecord[] = [];
  public projects: ProjectRecord[] = [];
  public projectMembers: ProjectMemberRecord[] = [];
  public milestones: MilestoneRecord[] = [];
  public tasks: TaskRecord[] = [];
  public taskComments: TaskCommentRecord[] = [];
  public taskAttachments: TaskAttachmentRecord[] = [];
  public taskDependencies: TaskDependencyRecord[] = [];
  public notifications: NotificationRecord[] = [];
  public notificationPreferences: NotificationPreferenceRecord[] = [];
  public backgroundJobs: BackgroundJobRecord[] = [];

  private isInitialized = false;

  constructor() {
    this.seedDefaultData();
  }

  public seedDefaultData() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    const now = Date.now();
    const ONE_DAY = 24 * 60 * 60 * 1000;

    // 1. Departments - Only Software / IT and Product / Design
    const swDept: DepartmentRecord = {
      id: "dept-sw",
      name: "Software / IT",
      code: "SOFTWARE_IT",
      description: "Core software engineering, platform architecture, and IT operations",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const pdDept: DepartmentRecord = {
      id: "dept-pd",
      name: "Product / Design",
      code: "PRODUCT_DESIGN",
      description: "Product management, user experience research, and UI design",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.departments = [swDept, pdDept];

    // Standard pre-computed bcrypt hash for 'Livexpert@2026'
    const defaultPasswordHash = bcrypt.hashSync("Livexpert@2026", 10);

    // 2. Default Seed Users
    const adminUser: UserRecord = {
      id: "usr-admin-01",
      email: "admin@livexpert.in",
      passwordHash: defaultPasswordHash,
      role: "ADMINISTRATOR",
      isActive: true,
      isInvited: false,
      departmentId: swDept.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const pmUser: UserRecord = {
      id: "usr-pm-02",
      email: "pm@livexpert.in",
      passwordHash: defaultPasswordHash,
      role: "PROJECT_MANAGER",
      isActive: true,
      isInvited: false,
      departmentId: pdDept.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const leadUser: UserRecord = {
      id: "usr-lead-03",
      email: "lead@livexpert.in",
      passwordHash: defaultPasswordHash,
      role: "TEAM_LEAD",
      isActive: true,
      isInvited: false,
      departmentId: swDept.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const devUser: UserRecord = {
      id: "usr-dev-04",
      email: "dev@livexpert.in",
      passwordHash: defaultPasswordHash,
      role: "EMPLOYEE",
      isActive: true,
      isInvited: false,
      departmentId: swDept.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const inactiveUser: UserRecord = {
      id: "usr-inactive-05",
      email: "inactive@livexpert.in",
      passwordHash: defaultPasswordHash,
      role: "EMPLOYEE",
      isActive: false,
      isInvited: false,
      departmentId: swDept.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.users = [adminUser, pmUser, leadUser, devUser, inactiveUser];

    // 3. User Profiles
    this.profiles = [
      {
        id: "prof-01",
        userId: adminUser.id,
        firstName: "Livexpert",
        lastName: "Admin",
        jobTitle: "System & Cloud Administrator",
        phone: "+91 98765 43210",
        bio: "Enterprise Security & Infrastructure Overseer",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "prof-02",
        userId: pmUser.id,
        firstName: "Sarah",
        lastName: "Chen",
        jobTitle: "Lead Technical Product Manager",
        phone: "+91 98765 43211",
        bio: "Driving delivery benchmarks across squads",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "prof-03",
        userId: leadUser.id,
        firstName: "Alex",
        lastName: "Rivera",
        jobTitle: "Technical Lead",
        phone: "+91 98765 43212",
        bio: "Architecture and sprint velocity coordinator",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "prof-04",
        userId: devUser.id,
        firstName: "Dev",
        lastName: "Contributor",
        jobTitle: "Senior Full Stack Engineer",
        phone: "+91 98765 43213",
        bio: "Building robust interfaces and APIs",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "prof-05",
        userId: inactiveUser.id,
        firstName: "Former",
        lastName: "Colleague",
        jobTitle: "Former Engineer",
        phone: "+91 98765 43214",
        bio: "Inactive profile account",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    // 4. Projects (6 realistic projects across Software/IT and Product/Design)
    this.projects = [
      {
        id: "prj-01",
        title: "KIBO360 Project Hub",
        key: "HUB",
        description: "Full-stack enterprise project management hub and telemetry engine",
        status: "IN_PROGRESS",
        priority: "URGENT",
        startDate: new Date(now - 14 * ONE_DAY),
        targetDate: new Date(now + 10 * ONE_DAY),
        creatorId: adminUser.id,
        ownerId: adminUser.id,
        departmentId: swDept.id,
        createdAt: new Date(now - 14 * ONE_DAY),
        updatedAt: new Date(),
      },
      {
        id: "prj-02",
        title: "CRM Automation Pipeline",
        key: "CRM",
        description: "High-throughput lead ingestion with automated triage algorithms",
        status: "ACTIVE",
        priority: "HIGH",
        startDate: new Date(now - 20 * ONE_DAY),
        targetDate: new Date(now + 18 * ONE_DAY),
        creatorId: leadUser.id,
        ownerId: leadUser.id,
        departmentId: swDept.id,
        createdAt: new Date(now - 20 * ONE_DAY),
        updatedAt: new Date(),
      },
      {
        id: "prj-03",
        title: "Livexpert Design System 2.0",
        key: "LDS",
        description: "Component tokens, accessibility compliance, and UI design kit",
        status: "IN_PROGRESS",
        priority: "HIGH",
        startDate: new Date(now - 7 * ONE_DAY),
        targetDate: new Date(now + 5 * ONE_DAY),
        creatorId: pmUser.id,
        ownerId: pmUser.id,
        departmentId: pdDept.id,
        createdAt: new Date(now - 7 * ONE_DAY),
        updatedAt: new Date(),
      },
      {
        id: "prj-04",
        title: "Client Onboarding UX Flow",
        key: "ONB",
        description: "Redesigned customer conversion funnel and registration experience",
        status: "COMPLETED",
        priority: "MEDIUM",
        startDate: new Date(now - 30 * ONE_DAY),
        targetDate: new Date(now - 2 * ONE_DAY),
        creatorId: pmUser.id,
        ownerId: pmUser.id,
        departmentId: pdDept.id,
        createdAt: new Date(now - 30 * ONE_DAY),
        updatedAt: new Date(),
      },
      {
        id: "prj-05",
        title: "Cloud Infrastructure Hardening",
        key: "INF",
        description: "PostgreSQL cluster provisioning, Redis caching, and VPC peering",
        status: "PLANNING",
        priority: "MEDIUM",
        startDate: new Date(now + 2 * ONE_DAY),
        targetDate: new Date(now + 30 * ONE_DAY),
        creatorId: adminUser.id,
        ownerId: adminUser.id,
        departmentId: swDept.id,
        createdAt: new Date(now - 3 * ONE_DAY),
        updatedAt: new Date(),
      },
      {
        id: "prj-06",
        title: "Product Analytics Dashboard",
        key: "PAD",
        description: "Real-time usage analytics, cohort retention, and executive metrics",
        status: "ACTIVE",
        priority: "HIGH",
        startDate: new Date(now - 10 * ONE_DAY),
        targetDate: new Date(now + 14 * ONE_DAY),
        creatorId: pmUser.id,
        ownerId: pmUser.id,
        departmentId: pdDept.id,
        createdAt: new Date(now - 10 * ONE_DAY),
        updatedAt: new Date(),
      },
    ];

    // 4b. Project Members
    this.projectMembers = [
      { id: "pm-01", projectId: "prj-01", userId: adminUser.id, role: "LEAD", joinedAt: new Date(now - 14 * ONE_DAY) },
      { id: "pm-02", projectId: "prj-01", userId: devUser.id, role: "CONTRIBUTOR", joinedAt: new Date(now - 12 * ONE_DAY) },
      { id: "pm-03", projectId: "prj-01", userId: leadUser.id, role: "CONTRIBUTOR", joinedAt: new Date(now - 10 * ONE_DAY) },
      { id: "pm-04", projectId: "prj-02", userId: leadUser.id, role: "LEAD", joinedAt: new Date(now - 20 * ONE_DAY) },
      { id: "pm-05", projectId: "prj-02", userId: devUser.id, role: "CONTRIBUTOR", joinedAt: new Date(now - 18 * ONE_DAY) },
      { id: "pm-06", projectId: "prj-03", userId: pmUser.id, role: "LEAD", joinedAt: new Date(now - 7 * ONE_DAY) },
      { id: "pm-07", projectId: "prj-04", userId: pmUser.id, role: "LEAD", joinedAt: new Date(now - 30 * ONE_DAY) },
      { id: "pm-08", projectId: "prj-05", userId: adminUser.id, role: "LEAD", joinedAt: new Date(now - 3 * ONE_DAY) },
      { id: "pm-09", projectId: "prj-05", userId: leadUser.id, role: "CONTRIBUTOR", joinedAt: new Date(now - 2 * ONE_DAY) },
      { id: "pm-10", projectId: "prj-06", userId: pmUser.id, role: "LEAD", joinedAt: new Date(now - 10 * ONE_DAY) },
    ];

    // 4c. Milestones
    this.milestones = [
      {
        id: "mls-01",
        projectId: "prj-01",
        title: "Phase 1 - Foundation & Design System",
        description: "Vite + React, Tailwind palette, and Express API scaffold",
        dueDate: new Date(now - 10 * ONE_DAY),
        status: "REACHED",
        reachedAt: new Date(now - 10 * ONE_DAY),
        createdAt: new Date(now - 14 * ONE_DAY),
        updatedAt: new Date(now - 10 * ONE_DAY),
      },
      {
        id: "mls-02",
        projectId: "prj-01",
        title: "Phase 2 - Authentication & RBAC Engine",
        description: "Bcrypt hashing, refresh session cookies, and user administration",
        dueDate: new Date(now - 5 * ONE_DAY),
        status: "REACHED",
        reachedAt: new Date(now - 5 * ONE_DAY),
        createdAt: new Date(now - 14 * ONE_DAY),
        updatedAt: new Date(now - 5 * ONE_DAY),
      },
      {
        id: "mls-03",
        projectId: "prj-01",
        title: "Phase 3 - Dynamic Dashboard & KPI Telemetry",
        description: "Reactive summary metrics, workload distribution, and overdue queues",
        dueDate: new Date(now - 1 * ONE_DAY),
        status: "REACHED",
        reachedAt: new Date(now - 1 * ONE_DAY),
        createdAt: new Date(now - 14 * ONE_DAY),
        updatedAt: new Date(now - 1 * ONE_DAY),
      },
      {
        id: "mls-04",
        projectId: "prj-01",
        title: "Phase 4 - Enterprise Project Management",
        description: "Project CRUD, milestone tracking, members, date validation, and audit logs",
        dueDate: new Date(now + 4 * ONE_DAY),
        status: "PENDING",
        createdAt: new Date(now - 14 * ONE_DAY),
        updatedAt: new Date(),
      },
      {
        id: "mls-05",
        projectId: "prj-01",
        title: "Phase 5 - Team Tasks & Kanban Workflow",
        description: "Board views, drag-and-drop transitions, and sprint management",
        dueDate: new Date(now + 9 * ONE_DAY),
        status: "PENDING",
        createdAt: new Date(now - 14 * ONE_DAY),
        updatedAt: new Date(),
      },
      {
        id: "mls-06",
        projectId: "prj-02",
        title: "Webhook Ingestion Architecture",
        description: "High-throughput message queue and payload parsing",
        dueDate: new Date(now - 12 * ONE_DAY),
        status: "REACHED",
        reachedAt: new Date(now - 12 * ONE_DAY),
        createdAt: new Date(now - 20 * ONE_DAY),
        updatedAt: new Date(),
      },
      {
        id: "mls-07",
        projectId: "prj-02",
        title: "Lead Qualification Scoring Model",
        description: "Algorithmic routing to Software / IT account executives",
        dueDate: new Date(now + 8 * ONE_DAY),
        status: "PENDING",
        createdAt: new Date(now - 20 * ONE_DAY),
        updatedAt: new Date(),
      },
      {
        id: "mls-08",
        projectId: "prj-03",
        title: "Design Tokens & Accessibility Review",
        description: "WCAG AAA color tokens and typography scale",
        dueDate: new Date(now - 2 * ONE_DAY),
        status: "REACHED",
        reachedAt: new Date(now - 2 * ONE_DAY),
        createdAt: new Date(now - 7 * ONE_DAY),
        updatedAt: new Date(),
      },
      {
        id: "mls-09",
        projectId: "prj-03",
        title: "React Component Library Release",
        description: "Interactive button, inputs, cards, and modal components",
        dueDate: new Date(now + 4 * ONE_DAY),
        status: "PENDING",
        createdAt: new Date(now - 7 * ONE_DAY),
        updatedAt: new Date(),
      },
      {
        id: "mls-10",
        projectId: "prj-04",
        title: "Funnel Flow Optimization",
        description: "Frictionless multi-step registration workflow",
        dueDate: new Date(now - 10 * ONE_DAY),
        status: "REACHED",
        reachedAt: new Date(now - 10 * ONE_DAY),
        createdAt: new Date(now - 30 * ONE_DAY),
        updatedAt: new Date(),
      },
      {
        id: "mls-11",
        projectId: "prj-05",
        title: "Multi-AZ Database Clustering",
        description: "Postgres primary-replica failover architecture",
        dueDate: new Date(now + 12 * ONE_DAY),
        status: "PENDING",
        createdAt: new Date(now - 3 * ONE_DAY),
        updatedAt: new Date(),
      },
      {
        id: "mls-12",
        projectId: "prj-06",
        title: "Cohort Analysis Data Ingestion",
        description: "Clickhouse telemetry and weekly retention calculations",
        dueDate: new Date(now + 10 * ONE_DAY),
        status: "PENDING",
        createdAt: new Date(now - 10 * ONE_DAY),
        updatedAt: new Date(),
      },
    ];

    // 5. Tasks (Realistic task distribution with overdue, due in 7 days, review, completed)
    this.tasks = [
      // Tasks for prj-01: KIBO360 Project Hub (Software / IT)
      {
        id: "tsk-01",
        title: "Configure PostgreSQL schema and Prisma migrations",
        description: "Setup tables for users, profiles, departments, and tokens",
        status: "COMPLETED",
        priority: "HIGH",
        taskList: "Backend",
        startDate: new Date(now - 14 * ONE_DAY),
        dueDate: new Date(now - 5 * ONE_DAY),
        estimatedEffort: 16,
        completionPercentage: 100,
        projectId: "prj-01",
        creatorId: adminUser.id,
        assigneeId: devUser.id,
        reviewerId: leadUser.id,
        createdAt: new Date(now - 10 * ONE_DAY),
        updatedAt: new Date(),
      },
      {
        id: "tsk-02",
        title: "Implement real bcrypt authentication and JWT tokens",
        description: "Session management with refresh token rotation",
        status: "COMPLETED",
        priority: "URGENT",
        taskList: "Security",
        startDate: new Date(now - 10 * ONE_DAY),
        dueDate: new Date(now - 2 * ONE_DAY),
        estimatedEffort: 24,
        completionPercentage: 100,
        projectId: "prj-01",
        creatorId: adminUser.id,
        assigneeId: devUser.id,
        reviewerId: adminUser.id,
        createdAt: new Date(now - 8 * ONE_DAY),
        updatedAt: new Date(),
      },
      {
        id: "tsk-03",
        title: "Build live Dashboard KPI cards and filters",
        description: "Compute total projects, open tasks, overdue deliverables",
        status: "IN_PROGRESS",
        priority: "HIGH",
        taskList: "Frontend",
        startDate: new Date(now - 3 * ONE_DAY),
        dueDate: new Date(now + 2 * ONE_DAY), // Due in 2 days (within 7 days)
        estimatedEffort: 32,
        completionPercentage: 65,
        projectId: "prj-01",
        creatorId: leadUser.id,
        assigneeId: devUser.id,
        reviewerId: leadUser.id,
        createdAt: new Date(now - 2 * ONE_DAY),
        updatedAt: new Date(),
      },
      {
        id: "tsk-04",
        title: "Security audit on session cookies and rate limiters",
        description: "Verify express-rate-limit and HTTP-only SameSite attributes",
        status: "IN_REVIEW", // Awaiting Review
        priority: "HIGH",
        taskList: "Security",
        startDate: new Date(now - 4 * ONE_DAY),
        dueDate: new Date(now + 1 * ONE_DAY), // Due tomorrow (within 7 days)
        estimatedEffort: 12,
        completionPercentage: 90,
        projectId: "prj-01",
        creatorId: adminUser.id,
        assigneeId: leadUser.id,
        reviewerId: adminUser.id,
        createdAt: new Date(now - 3 * ONE_DAY),
        updatedAt: new Date(),
      },
      {
        id: "tsk-05",
        title: "Optimize database index queries on audit_logs",
        description: "Add compound index for userId and action",
        status: "TODO",
        priority: "MEDIUM",
        taskList: "Database",
        startDate: new Date(now - 1 * ONE_DAY),
        dueDate: new Date(now + 6 * ONE_DAY), // Due in 6 days (within 7 days)
        estimatedEffort: 8,
        completionPercentage: 20,
        projectId: "prj-01",
        creatorId: leadUser.id,
        assigneeId: devUser.id,
        reviewerId: leadUser.id,
        createdAt: new Date(now - 1 * ONE_DAY),
        updatedAt: new Date(),
      },

      // Tasks for prj-02: CRM Automation Pipeline (Software / IT)
      {
        id: "tsk-06",
        title: "Resolve webhook timeout on high-volume lead ingestion",
        description: "Webhook handler experiences backpressure during peak ingest",
        status: "TODO",
        priority: "URGENT",
        taskList: "Backend",
        startDate: new Date(now - 6 * ONE_DAY),
        dueDate: new Date(now - 3 * ONE_DAY), // OVERDUE (3 days late!)
        estimatedEffort: 14,
        completionPercentage: 10,
        projectId: "prj-02",
        creatorId: leadUser.id,
        assigneeId: devUser.id,
        reviewerId: leadUser.id,
        createdAt: new Date(now - 6 * ONE_DAY),
        updatedAt: new Date(),
      },
      {
        id: "tsk-07",
        title: "Integrate customer duplicate detection algorithm",
        description: "Fuzzy matching on company tax ID and domain name",
        status: "IN_PROGRESS",
        priority: "HIGH",
        taskList: "Algorithms",
        startDate: new Date(now - 4 * ONE_DAY),
        dueDate: new Date(now + 4 * ONE_DAY), // Due in 4 days (within 7 days)
        estimatedEffort: 20,
        completionPercentage: 45,
        projectId: "prj-02",
        creatorId: leadUser.id,
        assigneeId: leadUser.id,
        reviewerId: leadUser.id,
        createdAt: new Date(now - 4 * ONE_DAY),
        updatedAt: new Date(),
      },
      {
        id: "tsk-08",
        title: "CRM lead export to CSV and PDF format",
        description: "Allow managers to export daily triage batches",
        status: "BACKLOG",
        priority: "LOW",
        taskList: "Reports",
        startDate: new Date(now - 5 * ONE_DAY),
        dueDate: new Date(now + 12 * ONE_DAY),
        estimatedEffort: 10,
        completionPercentage: 0,
        projectId: "prj-02",
        creatorId: leadUser.id,
        assigneeId: devUser.id,
        reviewerId: leadUser.id,
        createdAt: new Date(now - 5 * ONE_DAY),
        updatedAt: new Date(),
      },

      // Tasks for prj-03: Design System 2.0 (Product / Design)
      {
        id: "tsk-09",
        title: "Audit WCAG 2.1 AA color contrast for KIBO brand palette",
        description: "Check magenta and coral buttons on dark and light surfaces",
        status: "IN_REVIEW", // Awaiting Review
        priority: "HIGH",
        taskList: "Design QA",
        startDate: new Date(now - 4 * ONE_DAY),
        dueDate: new Date(now + 3 * ONE_DAY), // Due in 3 days (within 7 days)
        estimatedEffort: 8,
        completionPercentage: 85,
        projectId: "prj-03",
        creatorId: pmUser.id,
        assigneeId: pmUser.id,
        reviewerId: adminUser.id,
        createdAt: new Date(now - 4 * ONE_DAY),
        updatedAt: new Date(),
      },
      {
        id: "tsk-10",
        title: "Publish interactive Figma component token library",
        description: "Sync typography and spacing tokens with Tailwind theme",
        status: "TODO",
        priority: "URGENT",
        taskList: "Design Tokens",
        startDate: new Date(now - 5 * ONE_DAY),
        dueDate: new Date(now - 1 * ONE_DAY), // OVERDUE (1 day late!)
        estimatedEffort: 16,
        completionPercentage: 30,
        projectId: "prj-03",
        creatorId: pmUser.id,
        assigneeId: pmUser.id,
        reviewerId: pmUser.id,
        createdAt: new Date(now - 5 * ONE_DAY),
        updatedAt: new Date(),
      },
      {
        id: "tsk-11",
        title: "Create empty state vector illustrations",
        description: "Custom graphic assets for zero-data tables and search results",
        status: "IN_PROGRESS",
        priority: "MEDIUM",
        taskList: "Illustrations",
        startDate: new Date(now - 3 * ONE_DAY),
        dueDate: new Date(now + 5 * ONE_DAY), // Due in 5 days (within 7 days)
        estimatedEffort: 12,
        completionPercentage: 60,
        projectId: "prj-03",
        creatorId: pmUser.id,
        assigneeId: pmUser.id,
        reviewerId: pmUser.id,
        createdAt: new Date(now - 3 * ONE_DAY),
        updatedAt: new Date(),
      },

      // Tasks for prj-04: Client Onboarding (Product / Design)
      {
        id: "tsk-12",
        title: "User interview synthesis on drop-off rates",
        description: "Analyze session recordings of step 3 drop-off",
        status: "COMPLETED",
        priority: "MEDIUM",
        taskList: "UX Research",
        startDate: new Date(now - 20 * ONE_DAY),
        dueDate: new Date(now - 10 * ONE_DAY),
        estimatedEffort: 18,
        completionPercentage: 100,
        projectId: "prj-04",
        creatorId: pmUser.id,
        assigneeId: pmUser.id,
        reviewerId: pmUser.id,
        createdAt: new Date(now - 20 * ONE_DAY),
        updatedAt: new Date(),
      },
      {
        id: "tsk-13",
        title: "Simplified 2-step enterprise signup form",
        description: "Cut mandatory input fields from 14 to 6",
        status: "COMPLETED",
        priority: "HIGH",
        taskList: "Frontend",
        startDate: new Date(now - 15 * ONE_DAY),
        dueDate: new Date(now - 4 * ONE_DAY),
        estimatedEffort: 24,
        completionPercentage: 100,
        projectId: "prj-04",
        creatorId: pmUser.id,
        assigneeId: devUser.id,
        reviewerId: pmUser.id,
        createdAt: new Date(now - 15 * ONE_DAY),
        updatedAt: new Date(),
      },

      // Tasks for prj-05: Cloud Infrastructure (Software / IT)
      {
        id: "tsk-14",
        title: "Benchmark multi-AZ PostgreSQL replica latency",
        description: "Verify write replication latency is under 15ms",
        status: "TODO",
        priority: "MEDIUM",
        taskList: "DevOps",
        startDate: new Date(now - 2 * ONE_DAY),
        dueDate: new Date(now + 14 * ONE_DAY),
        estimatedEffort: 16,
        completionPercentage: 10,
        projectId: "prj-05",
        creatorId: adminUser.id,
        assigneeId: adminUser.id,
        reviewerId: adminUser.id,
        createdAt: new Date(now - 2 * ONE_DAY),
        updatedAt: new Date(),
      },

      // Tasks for prj-06: Product Analytics Dashboard (Product / Design)
      {
        id: "tsk-15",
        title: "Implement cohort retention matrix heatmap",
        description: "Display 30-day weekly retention rates per customer tier",
        status: "IN_REVIEW", // Awaiting Review
        priority: "HIGH",
        taskList: "Analytics",
        startDate: new Date(now - 3 * ONE_DAY),
        dueDate: new Date(now + 4 * ONE_DAY), // Due in 4 days (within 7 days)
        estimatedEffort: 20,
        completionPercentage: 80,
        projectId: "prj-06",
        creatorId: pmUser.id,
        assigneeId: devUser.id,
        reviewerId: pmUser.id,
        createdAt: new Date(now - 3 * ONE_DAY),
        updatedAt: new Date(),
      },
      {
        id: "tsk-16",
        title: "Export daily telemetry digest to Slack channel",
        description: "Automated cron notification at 09:00 IST",
        status: "TODO",
        priority: "LOW",
        taskList: "Integration",
        startDate: new Date(now - 2 * ONE_DAY),
        dueDate: new Date(now + 9 * ONE_DAY),
        estimatedEffort: 8,
        completionPercentage: 0,
        projectId: "prj-06",
        creatorId: pmUser.id,
        assigneeId: leadUser.id,
        reviewerId: pmUser.id,
        createdAt: new Date(now - 2 * ONE_DAY),
        updatedAt: new Date(),
      },
    ];

    // Seed task comments
    this.taskComments = [
      {
        id: "cm-01",
        taskId: "tsk-03",
        userId: devUser.id,
        content: "Implemented KPI summary cards and responsive Tailwind layout container.",
        createdAt: new Date(now - 1 * ONE_DAY),
        updatedAt: new Date(now - 1 * ONE_DAY),
      },
      {
        id: "cm-02",
        taskId: "tsk-03",
        userId: leadUser.id,
        content: "Verified KPI calculation logic against active and completed projects. Looking great!",
        createdAt: new Date(now - 12 * 60 * 60 * 1000),
        updatedAt: new Date(now - 12 * 60 * 60 * 1000),
      },
      {
        id: "cm-03",
        taskId: "tsk-04",
        userId: leadUser.id,
        content: "SameSite=Lax and httpOnly attributes verified across all session cookies.",
        createdAt: new Date(now - 2 * ONE_DAY),
        updatedAt: new Date(now - 2 * ONE_DAY),
      },
    ];

    // Seed task attachments
    this.taskAttachments = [
      {
        id: "att-01",
        taskId: "tsk-03",
        uploaderId: leadUser.id,
        filename: "dashboard_layout_spec_v2.png",
        filesize: 245760,
        mimetype: "image/png",
        fileUrl: "/uploads/tasks/dashboard_layout_spec_v2.png",
        accessScope: "PROJECT_MEMBERS",
        createdAt: new Date(now - 2 * ONE_DAY),
      },
      {
        id: "att-02",
        taskId: "tsk-04",
        uploaderId: adminUser.id,
        filename: "cookie_security_checklist.pdf",
        filesize: 1048576,
        mimetype: "application/pdf",
        fileUrl: "/uploads/tasks/cookie_security_checklist.pdf",
        accessScope: "PROJECT_MEMBERS",
        createdAt: new Date(now - 3 * ONE_DAY),
      },
    ];

    // Seed task dependencies
    this.taskDependencies = [
      {
        id: "dep-01",
        taskId: "tsk-03",
        dependsOnTaskId: "tsk-01", // tsk-03 depends on tsk-01 (which is COMPLETED)
        createdAt: new Date(now - 2 * ONE_DAY),
      },
      {
        id: "dep-02",
        taskId: "tsk-07",
        dependsOnTaskId: "tsk-06", // tsk-07 depends on tsk-06 (which is TODO)
        createdAt: new Date(now - 4 * ONE_DAY),
      },
    ];

    // Initial audit log
    this.auditLogs = [
      {
        id: "aud-01",
        userId: adminUser.id,
        targetId: adminUser.id,
        action: "SYSTEM_INITIALIZED",
        entity: "System",
        details: JSON.stringify({ message: "Phase 3 Dashboard & Analytics Initialized" }),
        ipAddress: "127.0.0.1",
        createdAt: new Date(),
      },
    ];

    // Seed notification preferences for default users
    for (const u of this.users) {
      this.notificationPreferences.push({
        id: `pref-${u.id}`,
        userId: u.id,
        emailNotifications: true,
        inAppNotifications: true,
        notifyOnAssignment: true,
        notifyOnDeadlineApproaching: true,
        notifyOnOverdue: true,
        notifyOnBlockedWork: true,
        notifyOnReviewRequested: true,
        notifyOnChangesRequested: true,
        notifyOnMilestoneApproaching: true,
        updatedAt: new Date(),
      });
    }

    // Seed initial notifications for demonstration
    this.notifications = [
      {
        id: "ntf-01",
        userId: devUser.id,
        type: "NEW_TASK_ASSIGNMENT",
        title: "New Task Assignment",
        message: "You have been assigned to task: Build live Dashboard KPI cards and filters",
        entityType: "TASK",
        entityId: "tsk-03",
        projectId: "prj-01",
        isRead: false,
        dedupKey: `NEW_TASK_ASSIGNMENT:tsk-03:${devUser.id}`,
        createdAt: new Date(now - 2 * ONE_DAY),
      },
      {
        id: "ntf-02",
        userId: leadUser.id,
        type: "REVIEW_REQUESTED",
        title: "Review Requested",
        message: "Dev Developer requested a review on: Security audit on session cookies and rate limiters",
        entityType: "TASK",
        entityId: "tsk-04",
        projectId: "prj-01",
        isRead: false,
        dedupKey: `REVIEW_REQUESTED:tsk-04:${leadUser.id}`,
        createdAt: new Date(now - 1 * ONE_DAY),
      },
      {
        id: "ntf-03",
        userId: devUser.id,
        type: "OVERDUE_TASK",
        title: "Task Overdue",
        message: "Task 'Resolve webhook timeout on high-volume lead ingestion' is overdue!",
        entityType: "TASK",
        entityId: "tsk-06",
        projectId: "prj-02",
        isRead: false,
        dedupKey: `OVERDUE_TASK:tsk-06:${devUser.id}:initial`,
        createdAt: new Date(now - 12 * 60 * 60 * 1000),
      },
    ];

    // Seed background jobs history
    this.backgroundJobs = [
      {
        id: "job-seed-01",
        jobName: "CHECK_UPCOMING_DEADLINES",
        payload: { triggeredBy: "SYSTEM_SCHEDULE" },
        status: "COMPLETED",
        attempts: 1,
        maxAttempts: 3,
        processedAt: new Date(now - 1 * 60 * 60 * 1000),
        createdAt: new Date(now - 1 * 60 * 60 * 1000),
        updatedAt: new Date(now - 1 * 60 * 60 * 1000),
      },
      {
        id: "job-seed-02",
        jobName: "CHECK_OVERDUE_TASKS",
        payload: { triggeredBy: "SYSTEM_SCHEDULE" },
        status: "COMPLETED",
        attempts: 1,
        maxAttempts: 3,
        processedAt: new Date(now - 1 * 60 * 60 * 1000),
        createdAt: new Date(now - 1 * 60 * 60 * 1000),
        updatedAt: new Date(now - 1 * 60 * 60 * 1000),
      },
    ];
  }

  public findUserByEmail(email: string): UserRecord | undefined {
    return this.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  }

  public findUserById(id: string): UserRecord | undefined {
    return this.users.find((u) => u.id === id);
  }

  public getProfileByUserId(userId: string): ProfileRecord | undefined {
    return this.profiles.find((p) => p.userId === userId);
  }

  public getDepartmentById(id?: string): DepartmentRecord | undefined {
    if (!id) return undefined;
    return this.departments.find((d) => d.id === id);
  }

  public getProjectById(id: string): ProjectRecord | undefined {
    return this.projects.find((p) => p.id === id);
  }

  public getTaskById(id: string): TaskRecord | undefined {
    return this.tasks.find((t) => t.id === id);
  }

  public getFullUser(user: UserRecord) {
    const profile = this.getProfileByUserId(user.id);
    const department = this.getDepartmentById(user.departmentId);
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      isInvited: user.isInvited,
      departmentId: user.departmentId,
      department: department
        ? { id: department.id, name: department.name, code: department.code }
        : null,
      profile: profile
        ? {
            id: profile.id,
            firstName: profile.firstName,
            lastName: profile.lastName,
            jobTitle: profile.jobTitle,
            phone: profile.phone,
            avatarUrl: profile.avatarUrl,
            bio: profile.bio,
          }
        : null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  public getProjectMembers(projectId: string) {
    return this.projectMembers
      .filter((pm) => pm.projectId === projectId)
      .map((pm) => {
        const user = this.findUserById(pm.userId);
        const profile = user ? this.getProfileByUserId(user.id) : undefined;
        return {
          id: pm.id,
          projectId: pm.projectId,
          userId: pm.userId,
          role: pm.role,
          joinedAt: pm.joinedAt,
          user: user
            ? {
                id: user.id,
                email: user.email,
                role: user.role,
                name: profile ? `${profile.firstName} ${profile.lastName}` : user.email,
                jobTitle: profile?.jobTitle,
                avatarUrl: profile?.avatarUrl,
              }
            : null,
        };
      });
  }

  public addProjectMember(projectId: string, userId: string, role: ProjectMemberRole = "CONTRIBUTOR"): ProjectMemberRecord {
    const existing = this.projectMembers.find((pm) => pm.projectId === projectId && pm.userId === userId);
    if (existing) {
      existing.role = role;
      return existing;
    }
    const newMember: ProjectMemberRecord = {
      id: `pm-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      projectId,
      userId,
      role,
      joinedAt: new Date(),
    };
    this.projectMembers.push(newMember);
    return newMember;
  }

  public removeProjectMember(projectId: string, userId: string): boolean {
    const index = this.projectMembers.findIndex((pm) => pm.projectId === projectId && pm.userId === userId);
    if (index === -1) return false;
    this.projectMembers.splice(index, 1);
    return true;
  }

  public getMilestones(projectId: string): MilestoneRecord[] {
    return this.milestones
      .filter((m) => m.projectId === projectId)
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }

  public getMilestoneById(id: string): MilestoneRecord | undefined {
    return this.milestones.find((m) => m.id === id);
  }

  public createMilestone(data: Omit<MilestoneRecord, "id" | "createdAt" | "updatedAt">): MilestoneRecord {
    const newMilestone: MilestoneRecord = {
      id: `mls-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.milestones.push(newMilestone);
    return newMilestone;
  }

  public updateMilestone(id: string, updates: Partial<MilestoneRecord>): MilestoneRecord | undefined {
    const milestone = this.getMilestoneById(id);
    if (!milestone) return undefined;
    Object.assign(milestone, updates, { updatedAt: new Date() });
    return milestone;
  }

  public deleteMilestone(id: string): boolean {
    const index = this.milestones.findIndex((m) => m.id === id);
    if (index === -1) return false;
    this.milestones.splice(index, 1);
    return true;
  }

  // --- Phase 5 Task & Subtask Management ---

  public createTask(data: Omit<TaskRecord, "id" | "createdAt" | "updatedAt">): TaskRecord {
    const newTask: TaskRecord = {
      id: `tsk-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      ...data,
      taskList: data.taskList || "Default",
      completionPercentage: data.completionPercentage ?? 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.tasks.push(newTask);
    return newTask;
  }

  public updateTask(id: string, updates: Partial<TaskRecord>): TaskRecord | undefined {
    const task = this.getTaskById(id);
    if (!task) return undefined;
    Object.assign(task, updates, { updatedAt: new Date() });
    return task;
  }

  public deleteTask(id: string): boolean {
    const index = this.tasks.findIndex((t) => t.id === id);
    if (index === -1) return false;

    // Remove subtasks as well
    const subtaskIds = this.tasks.filter((t) => t.parentTaskId === id).map((t) => t.id);
    const allIdsToRemove = new Set([id, ...subtaskIds]);

    this.tasks = this.tasks.filter((t) => !allIdsToRemove.has(t.id));
    this.taskComments = this.taskComments.filter((c) => !allIdsToRemove.has(c.taskId));
    this.taskAttachments = this.taskAttachments.filter((a) => !allIdsToRemove.has(a.taskId));
    this.taskDependencies = this.taskDependencies.filter(
      (d) => !allIdsToRemove.has(d.taskId) && !allIdsToRemove.has(d.dependsOnTaskId)
    );

    return true;
  }

  public getTaskSubtasks(parentTaskId: string): TaskRecord[] {
    return this.tasks.filter((t) => t.parentTaskId === parentTaskId);
  }

  public getTaskComments(taskId: string) {
    return this.taskComments
      .filter((c) => c.taskId === taskId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .map((c) => {
        const user = this.findUserById(c.userId);
        const profile = user ? this.getProfileByUserId(user.id) : undefined;
        return {
          id: c.id,
          taskId: c.taskId,
          userId: c.userId,
          content: c.content,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
          user: user
            ? {
                id: user.id,
                email: user.email,
                role: user.role,
                name: profile ? `${profile.firstName} ${profile.lastName}` : user.email,
                avatarUrl: profile?.avatarUrl,
                jobTitle: profile?.jobTitle,
              }
            : null,
        };
      });
  }

  public createTaskComment(data: Omit<TaskCommentRecord, "id" | "createdAt" | "updatedAt">): TaskCommentRecord {
    const comment: TaskCommentRecord = {
      id: `cm-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.taskComments.push(comment);
    return comment;
  }

  public deleteTaskComment(id: string): boolean {
    const index = this.taskComments.findIndex((c) => c.id === id);
    if (index === -1) return false;
    this.taskComments.splice(index, 1);
    return true;
  }

  public getTaskAttachments(taskId: string) {
    return this.taskAttachments
      .filter((a) => a.taskId === taskId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map((a) => {
        const uploader = this.findUserById(a.uploaderId);
        const profile = uploader ? this.getProfileByUserId(uploader.id) : undefined;
        return {
          id: a.id,
          taskId: a.taskId,
          uploaderId: a.uploaderId,
          filename: a.filename,
          filesize: a.filesize,
          mimetype: a.mimetype,
          fileUrl: a.fileUrl,
          accessScope: a.accessScope,
          createdAt: a.createdAt,
          uploader: uploader
            ? {
                id: uploader.id,
                email: uploader.email,
                role: uploader.role,
                name: profile ? `${profile.firstName} ${profile.lastName}` : uploader.email,
                avatarUrl: profile?.avatarUrl,
              }
            : null,
        };
      });
  }

  public createTaskAttachment(data: Omit<TaskAttachmentRecord, "id" | "createdAt">): TaskAttachmentRecord {
    const attachment: TaskAttachmentRecord = {
      id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      ...data,
      createdAt: new Date(),
    };
    this.taskAttachments.push(attachment);
    return attachment;
  }

  public deleteTaskAttachment(id: string): boolean {
    const index = this.taskAttachments.findIndex((a) => a.id === id);
    if (index === -1) return false;
    this.taskAttachments.splice(index, 1);
    return true;
  }

  public getTaskDependencies(taskId: string) {
    // Tasks that `taskId` depends on (prerequisites)
    return this.taskDependencies
      .filter((d) => d.taskId === taskId)
      .map((d) => {
        const prereqTask = this.getTaskById(d.dependsOnTaskId);
        return {
          id: d.id,
          taskId: d.taskId,
          dependsOnTaskId: d.dependsOnTaskId,
          prerequisiteTask: prereqTask
            ? {
                id: prereqTask.id,
                title: prereqTask.title,
                status: prereqTask.status,
                priority: prereqTask.priority,
                dueDate: prereqTask.dueDate,
              }
            : null,
          createdAt: d.createdAt,
        };
      });
  }

  public getTaskDependentOn(taskId: string) {
    // Tasks that depend on `taskId` (dependents)
    return this.taskDependencies
      .filter((d) => d.dependsOnTaskId === taskId)
      .map((d) => {
        const dependentTask = this.getTaskById(d.taskId);
        return {
          id: d.id,
          taskId: d.taskId,
          dependsOnTaskId: d.dependsOnTaskId,
          dependentTask: dependentTask
            ? {
                id: dependentTask.id,
                title: dependentTask.title,
                status: dependentTask.status,
                priority: dependentTask.priority,
                dueDate: dependentTask.dueDate,
              }
            : null,
          createdAt: d.createdAt,
        };
      });
  }

  public hasDependencyCycle(taskId: string, candidatePrerequisiteId: string): boolean {
    if (taskId === candidatePrerequisiteId) return true;
    const visited = new Set<string>();
    const queue = [candidatePrerequisiteId];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current === taskId) return true;
      if (!visited.has(current)) {
        visited.add(current);
        const deps = this.taskDependencies
          .filter((d) => d.taskId === current)
          .map((d) => d.dependsOnTaskId);
        for (const next of deps) {
          if (!visited.has(next)) {
            queue.push(next);
          }
        }
      }
    }
    return false;
  }

  public addTaskDependency(taskId: string, dependsOnTaskId: string): TaskDependencyRecord {
    const existing = this.taskDependencies.find(
      (d) => d.taskId === taskId && d.dependsOnTaskId === dependsOnTaskId
    );
    if (existing) return existing;

    const dep: TaskDependencyRecord = {
      id: `dep-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      taskId,
      dependsOnTaskId,
      createdAt: new Date(),
    };
    this.taskDependencies.push(dep);
    return dep;
  }

  public removeTaskDependency(taskId: string, dependsOnTaskId: string): boolean {
    const index = this.taskDependencies.findIndex(
      (d) => d.taskId === taskId && d.dependsOnTaskId === dependsOnTaskId
    );
    if (index === -1) return false;
    this.taskDependencies.splice(index, 1);
    return true;
  }

  // --- Notifications ---
  public createNotification(data: {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    entityType: "TASK" | "MILESTONE" | "PROJECT";
    entityId?: string;
    projectId?: string;
    dedupKey?: string;
    isRead?: boolean;
  }): NotificationRecord {
    if (data.dedupKey && this.hasNotificationWithDedupKey(data.dedupKey)) {
      const existing = this.notifications.find((n) => n.dedupKey === data.dedupKey);
      if (existing) return existing;
    }

    const ntf: NotificationRecord = {
      id: `ntf-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      userId: data.userId,
      type: data.type,
      title: data.title,
      message: data.message,
      entityType: data.entityType,
      entityId: data.entityId,
      projectId: data.projectId,
      isRead: data.isRead ?? false,
      dedupKey: data.dedupKey,
      createdAt: new Date(),
    };
    this.notifications.unshift(ntf);
    return ntf;
  }

  public getNotifications(
    userId: string,
    filters?: { isRead?: boolean; type?: NotificationType; entityType?: string }
  ): NotificationRecord[] {
    return this.notifications
      .filter((n) => {
        if (n.userId !== userId) return false;
        if (filters?.isRead !== undefined && n.isRead !== filters.isRead) return false;
        if (filters?.type && n.type !== filters.type) return false;
        if (filters?.entityType && n.entityType !== filters.entityType) return false;
        return true;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public getUnreadNotificationCount(userId: string): number {
    return this.notifications.filter((n) => n.userId === userId && !n.isRead).length;
  }

  public markNotificationAsRead(id: string, userId: string): NotificationRecord | null {
    const ntf = this.notifications.find((n) => n.id === id && n.userId === userId);
    if (!ntf) return null;
    ntf.isRead = true;
    ntf.readAt = new Date();
    return ntf;
  }

  public markAllNotificationsAsRead(userId: string): number {
    let count = 0;
    const now = new Date();
    for (const n of this.notifications) {
      if (n.userId === userId && !n.isRead) {
        n.isRead = true;
        n.readAt = now;
        count++;
      }
    }
    return count;
  }

  public deleteNotification(id: string, userId: string): boolean {
    const idx = this.notifications.findIndex((n) => n.id === id && n.userId === userId);
    if (idx === -1) return false;
    this.notifications.splice(idx, 1);
    return true;
  }

  public hasNotificationWithDedupKey(dedupKey: string): boolean {
    return this.notifications.some((n) => n.dedupKey === dedupKey);
  }

  // --- Notification Preferences ---
  public getUserNotificationPreferences(userId: string): NotificationPreferenceRecord {
    let pref = this.notificationPreferences.find((p) => p.userId === userId);
    if (!pref) {
      pref = {
        id: `pref-${userId}`,
        userId,
        emailNotifications: true,
        inAppNotifications: true,
        notifyOnAssignment: true,
        notifyOnDeadlineApproaching: true,
        notifyOnOverdue: true,
        notifyOnBlockedWork: true,
        notifyOnReviewRequested: true,
        notifyOnChangesRequested: true,
        notifyOnMilestoneApproaching: true,
        updatedAt: new Date(),
      };
      this.notificationPreferences.push(pref);
    }
    return pref;
  }

  public updateUserNotificationPreferences(
    userId: string,
    updates: Partial<Omit<NotificationPreferenceRecord, "id" | "userId" | "updatedAt">>
  ): NotificationPreferenceRecord {
    const pref = this.getUserNotificationPreferences(userId);
    Object.assign(pref, updates, { updatedAt: new Date() });
    return pref;
  }

  // --- Background Jobs ---
  public createBackgroundJob(jobName: string, payload?: any, maxAttempts = 3): BackgroundJobRecord {
    const job: BackgroundJobRecord = {
      id: `job-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      jobName,
      payload,
      status: "PENDING",
      attempts: 0,
      maxAttempts,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.backgroundJobs.unshift(job);
    return job;
  }

  public updateBackgroundJob(
    id: string,
    updates: Partial<Omit<BackgroundJobRecord, "id" | "createdAt">>
  ): BackgroundJobRecord | null {
    const job = this.backgroundJobs.find((j) => j.id === id);
    if (!job) return null;
    Object.assign(job, updates, { updatedAt: new Date() });
    return job;
  }

  public getBackgroundJobs(limit = 50): BackgroundJobRecord[] {
    return this.backgroundJobs.slice(0, limit);
  }

  public getBackgroundJobById(id: string): BackgroundJobRecord | undefined {
    return this.backgroundJobs.find((j) => j.id === id);
  }

  public retryBackgroundJob(id: string): BackgroundJobRecord | null {
    const job = this.backgroundJobs.find((j) => j.id === id);
    if (!job) return null;
    job.status = "PENDING";
    job.lastError = undefined;
    job.updatedAt = new Date();
    return job;
  }
}

export const dbStore = new HubDatabaseStore();