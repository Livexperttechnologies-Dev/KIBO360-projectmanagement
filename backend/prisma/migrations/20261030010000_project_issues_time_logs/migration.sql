CREATE TYPE "ProjectIssueStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');

CREATE TABLE "project_issues" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "task_id" TEXT,
    "reporter_id" TEXT NOT NULL,
    "assignee_id" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "ProjectIssueStatus" NOT NULL DEFAULT 'OPEN',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "project_issues_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "project_time_entries" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "work_date" TIMESTAMP(3) NOT NULL,
    "duration_minutes" INTEGER NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "project_time_entries_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "project_time_entries_duration_minutes_check" CHECK ("duration_minutes" > 0 AND "duration_minutes" <= 1440)
);

CREATE INDEX "project_issues_project_id_status_idx" ON "project_issues"("project_id", "status");
CREATE INDEX "project_issues_task_id_idx" ON "project_issues"("task_id");
CREATE INDEX "project_issues_reporter_id_idx" ON "project_issues"("reporter_id");
CREATE INDEX "project_time_entries_project_id_work_date_idx" ON "project_time_entries"("project_id", "work_date");
CREATE INDEX "project_time_entries_task_id_idx" ON "project_time_entries"("task_id");
CREATE INDEX "project_time_entries_user_id_work_date_idx" ON "project_time_entries"("user_id", "work_date");

ALTER TABLE "project_issues" ADD CONSTRAINT "project_issues_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "project_issues" ADD CONSTRAINT "project_issues_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "project_issues" ADD CONSTRAINT "project_issues_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "project_issues" ADD CONSTRAINT "project_issues_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "project_time_entries" ADD CONSTRAINT "project_time_entries_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "project_time_entries" ADD CONSTRAINT "project_time_entries_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "project_time_entries" ADD CONSTRAINT "project_time_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
