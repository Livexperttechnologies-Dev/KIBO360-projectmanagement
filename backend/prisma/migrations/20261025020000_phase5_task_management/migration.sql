-- Phase 5: Task and Subtask Management Migration
-- Livexpert Technologies Pvt. Ltd.

-- 1. Alter TaskStatus Enum to add Phase 5 statuses
ALTER TYPE "TaskStatus" ADD VALUE IF NOT EXISTS 'OPEN';
ALTER TYPE "TaskStatus" ADD VALUE IF NOT EXISTS 'ASSIGNED';
ALTER TYPE "TaskStatus" ADD VALUE IF NOT EXISTS 'UNDER_REVIEW';
ALTER TYPE "TaskStatus" ADD VALUE IF NOT EXISTS 'CHANGES_REQUIRED';
ALTER TYPE "TaskStatus" ADD VALUE IF NOT EXISTS 'BLOCKED';

-- 2. Alter tasks table to add Phase 5 fields
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "task_list" TEXT NOT NULL DEFAULT 'Default';
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "start_date" TIMESTAMP(3);
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "estimated_effort" DOUBLE PRECISION;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "completion_percentage" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "reviewer_id" TEXT;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "parent_task_id" TEXT;

-- Foreign keys on tasks
ALTER TABLE "tasks" DROP CONSTRAINT IF EXISTS "tasks_assignee_id_fkey";
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "tasks" DROP CONSTRAINT IF EXISTS "tasks_reviewer_id_fkey";
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "tasks" DROP CONSTRAINT IF EXISTS "tasks_parent_task_id_fkey";
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_parent_task_id_fkey" FOREIGN KEY ("parent_task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "tasks_parent_task_id_idx" ON "tasks"("parent_task_id");
CREATE INDEX IF NOT EXISTS "tasks_assignee_id_idx" ON "tasks"("assignee_id");
CREATE INDEX IF NOT EXISTS "tasks_project_id_idx" ON "tasks"("project_id");

-- 3. Create task_comments table
CREATE TABLE IF NOT EXISTS "task_comments" (
    "id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_comments_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "task_comments" DROP CONSTRAINT IF EXISTS "task_comments_task_id_fkey";
ALTER TABLE "task_comments" ADD CONSTRAINT "task_comments_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "task_comments" DROP CONSTRAINT IF EXISTS "task_comments_user_id_fkey";
ALTER TABLE "task_comments" ADD CONSTRAINT "task_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "task_comments_task_id_idx" ON "task_comments"("task_id");
CREATE INDEX IF NOT EXISTS "task_comments_user_id_idx" ON "task_comments"("user_id");

-- 4. Create task_attachments table
CREATE TABLE IF NOT EXISTS "task_attachments" (
    "id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "uploader_id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "filesize" INTEGER NOT NULL,
    "mimetype" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "access_scope" TEXT NOT NULL DEFAULT 'PROJECT_MEMBERS',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_attachments_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "task_attachments" DROP CONSTRAINT IF EXISTS "task_attachments_task_id_fkey";
ALTER TABLE "task_attachments" ADD CONSTRAINT "task_attachments_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "task_attachments" DROP CONSTRAINT IF EXISTS "task_attachments_uploader_id_fkey";
ALTER TABLE "task_attachments" ADD CONSTRAINT "task_attachments_uploader_id_fkey" FOREIGN KEY ("uploader_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "task_attachments_task_id_idx" ON "task_attachments"("task_id");
CREATE INDEX IF NOT EXISTS "task_attachments_uploader_id_idx" ON "task_attachments"("uploader_id");

-- 5. Create task_dependencies table
CREATE TABLE IF NOT EXISTS "task_dependencies" (
    "id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "depends_on_task_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_dependencies_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "task_dependencies" DROP CONSTRAINT IF EXISTS "task_dependencies_task_id_fkey";
ALTER TABLE "task_dependencies" ADD CONSTRAINT "task_dependencies_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "task_dependencies" DROP CONSTRAINT IF EXISTS "task_dependencies_depends_on_task_id_fkey";
ALTER TABLE "task_dependencies" ADD CONSTRAINT "task_dependencies_depends_on_task_id_fkey" FOREIGN KEY ("depends_on_task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS "task_dependencies_task_id_depends_on_task_id_key" ON "task_dependencies"("task_id", "depends_on_task_id");
CREATE INDEX IF NOT EXISTS "task_dependencies_task_id_idx" ON "task_dependencies"("task_id");
CREATE INDEX IF NOT EXISTS "task_dependencies_depends_on_task_id_idx" ON "task_dependencies"("depends_on_task_id");
