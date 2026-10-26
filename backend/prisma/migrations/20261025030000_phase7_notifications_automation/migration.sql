-- Phase 7: Notifications and Workflow Automation DDL Migration
-- Livexpert Technologies Pvt. Ltd.

-- CreateEnums
CREATE TYPE "NotificationType" AS ENUM (
  'NEW_TASK_ASSIGNMENT',
  'TASK_REASSIGNMENT',
  'UPCOMING_DEADLINE',
  'OVERDUE_TASK',
  'BLOCKED_TASK',
  'REVIEW_REQUESTED',
  'CHANGES_REQUESTED',
  'TASK_APPROVED',
  'TASK_COMPLETED',
  'MILESTONE_APPROACHING'
);

CREATE TYPE "JobStatus" AS ENUM (
  'PENDING',
  'PROCESSING',
  'COMPLETED',
  'FAILED'
);

-- CreateTable notifications
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL DEFAULT 'TASK',
    "entity_id" TEXT,
    "project_id" TEXT,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "dedup_key" TEXT,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable notification_preferences
CREATE TABLE "notification_preferences" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "email_notifications" BOOLEAN NOT NULL DEFAULT true,
    "in_app_notifications" BOOLEAN NOT NULL DEFAULT true,
    "notify_on_assignment" BOOLEAN NOT NULL DEFAULT true,
    "notify_on_deadline_approaching" BOOLEAN NOT NULL DEFAULT true,
    "notify_on_overdue" BOOLEAN NOT NULL DEFAULT true,
    "notify_on_blocked_work" BOOLEAN NOT NULL DEFAULT true,
    "notify_on_review_requested" BOOLEAN NOT NULL DEFAULT true,
    "notify_on_changes_requested" BOOLEAN NOT NULL DEFAULT true,
    "notify_on_milestone_approaching" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable background_jobs
CREATE TABLE "background_jobs" (
    "id" TEXT NOT NULL,
    "job_name" TEXT NOT NULL,
    "payload" TEXT,
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 3,
    "last_error" TEXT,
    "processed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "background_jobs_pkey" PRIMARY KEY ("id")
);

-- Unique index on user_id for preferences
CREATE UNIQUE INDEX "notification_preferences_user_id_key" ON "notification_preferences"("user_id");

-- Indexes for notifications
CREATE INDEX "notifications_user_id_idx" ON "notifications"("user_id");
CREATE INDEX "notifications_is_read_idx" ON "notifications"("is_read");
CREATE INDEX "notifications_dedup_key_idx" ON "notifications"("dedup_key");

-- Indexes for background jobs
CREATE INDEX "background_jobs_job_name_idx" ON "background_jobs"("job_name");
CREATE INDEX "background_jobs_status_idx" ON "background_jobs"("status");

-- Foreign key constraints
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
