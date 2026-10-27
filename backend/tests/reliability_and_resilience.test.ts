import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import { BackupRestoreService } from "../scripts/backup-restore";
import { MigrationAuditService } from "../scripts/migration-verify";
import { jobQueueService } from "../src/services/job-queue.service";
import { dbStore } from "../src/lib/db";

describe("Phase 9 — Reliability, Resilience & Disaster Recovery Suite", () => {
  const BASE_URL = "http://localhost:5000/api/v1";

  // 1. Database Backup & Restoration Procedure
  test("1. Backup & Restoration: Generates snapshot and restores full database state with referential integrity", async () => {
    // 1a. Create baseline snapshot
    const snapshot = BackupRestoreService.createSnapshot();
    assert.ok(snapshot.metadata);
    assert.ok(snapshot.metadata.recordCounts.projects > 0);
    assert.ok(snapshot.metadata.recordCounts.tasks > 0);
    const initialProjectsCount = dbStore.projects.length;

    // 1b. Introduce database modification (simulate data corruption or accidental deletion)
    const tempProjectId = `prj-test-disaster-${Date.now()}`;
    dbStore.projects.push({
      id: tempProjectId,
      key: "TMP",
      title: "Temporary Project For Disaster Recovery Test",
      description: "Will be wiped out by restore",
      departmentId: "dept-sw",
      ownerId: "usr-admin-01",
      creatorId: "usr-admin-01",
      priority: "LOW",
      status: "PLANNING",
      startDate: new Date(),
      targetDate: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    assert.equal(dbStore.projects.length, initialProjectsCount + 1);

    // 1c. Restore database snapshot
    const restoreResult = BackupRestoreService.restoreSnapshot(snapshot);
    assert.ok(restoreResult.success);

    // 1d. Verify temporary project was cleanly wiped and original counts restored
    assert.equal(dbStore.projects.length, initialProjectsCount);
    const exists = dbStore.projects.some((p) => p.id === tempProjectId);
    assert.equal(exists, false, "Corrupted/temporary project must be eliminated by snapshot restore");
  });

  // 2. Database Migration & Rollback DDL Audit
  test("2. Migrations & Rollback: All migrations are verifiable and generate reversible rollback DDL", async () => {
    const audits = MigrationAuditService.auditAll();
    assert.ok(audits.length >= 4, "Must audit all 4 Prisma migration directories");

    const phase2 = audits.find((a) => a.migrationName.includes("phase2"));
    const phase4 = audits.find((a) => a.migrationName.includes("phase4"));
    const phase5 = audits.find((a) => a.migrationName.includes("phase5"));
    const phase7 = audits.find((a) => a.migrationName.includes("phase7"));

    assert.ok(phase2, "Phase 2 migration exists");
    assert.ok(phase4, "Phase 4 migration exists");
    assert.ok(phase5, "Phase 5 migration exists");
    assert.ok(phase7, "Phase 7 migration exists");

    for (const a of audits) {
      assert.ok(a.forwardSizeBytes > 0, `${a.migrationName} forward SQL must not be empty`);
      assert.ok(a.rollbackSql.includes("BEGIN;"), `${a.migrationName} rollback DDL must be transactional`);
      assert.ok(a.rollbackSql.includes("COMMIT;"), `${a.migrationName} rollback DDL must commit`);
    }
  });

  // 3. Background Job Queue Retries & Error Logging
  test("3. Background Jobs: Retries failed jobs and records diagnostic error traces", async () => {
    const failingJobType = `FAILING_TEST_JOB_${Date.now()}`;
    let attemptCounter = 0;

    // Register a handler that deliberately throws an error
    jobQueueService.registerHandler(failingJobType, async () => {
      attemptCounter++;
      throw new Error(`Intentional worker error on attempt ${attemptCounter}`);
    });

    // Enqueue job with maxAttempts = 2
    const job = await jobQueueService.addJob(failingJobType, { test: true }, 2);
    assert.ok(job.id);

    // Process queue synchronously
    await jobQueueService.processQueue();

    // Check job record in database
    const jobRecord = dbStore.backgroundJobs.find((j) => j.id === job.id);
    assert.ok(jobRecord);
    assert.equal(jobRecord.attempts, 1);
    assert.equal(jobRecord.status, "PENDING", "First failure should keep job PENDING for retry");
    assert.ok(jobRecord.lastError?.includes("Intentional worker error"));

    // Process second attempt -> should reach maxAttempts (2) and mark FAILED
    await jobQueueService.processQueue();
    const finalJobRecord = dbStore.backgroundJobs.find((j) => j.id === job.id);
    assert.ok(finalJobRecord);
    assert.equal(finalJobRecord.attempts, 2);
    assert.equal(finalJobRecord.status, "FAILED", "Job should transition to FAILED after reaching maxAttempts");
  });

  // 5. Structured Error Handling Format
  test("5. Structured Error Handler: Non-existent routes and errors return standardized error JSON", async () => {
    const res = await fetch(`${BASE_URL}/non-existent-endpoint-${Date.now()}`);
    assert.equal(res.status, 404);
    const body = (await res.json()) as any;
    assert.equal(body.success, false);
    assert.ok(body.error);
    assert.ok(typeof body.error.message === "string");
  });
});
