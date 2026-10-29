-- Projects can belong to a department; the column existed in schema.prisma
-- but no earlier migration created it. Guards keep this safe on databases
-- that were synced with `prisma db push`.
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "department_id" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'projects_department_id_fkey') THEN
    ALTER TABLE "projects" ADD CONSTRAINT "projects_department_id_fkey"
      FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- Align remaining drift with schema.prisma (@updatedAt is set by Prisma, not the database)
DROP INDEX IF EXISTS "projects_owner_id_idx";
ALTER TABLE "background_jobs" ALTER COLUMN "updated_at" DROP DEFAULT;
ALTER TABLE "milestones" ALTER COLUMN "updated_at" DROP DEFAULT;
ALTER TABLE "notification_preferences" ALTER COLUMN "updated_at" DROP DEFAULT;
ALTER TABLE "task_comments" ALTER COLUMN "updated_at" DROP DEFAULT;
ALTER TABLE "tasks" ALTER COLUMN "status" SET DEFAULT 'OPEN';
