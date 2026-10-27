-- Audit targets are polymorphic (users, projects, tasks, milestones, etc.),
-- so target_id must not reference only the users table.
ALTER TABLE "audit_logs" DROP CONSTRAINT IF EXISTS "audit_logs_target_id_fkey";
