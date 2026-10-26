import fs from "fs";
import path from "path";
import { dbStore } from "../src/lib/db";

export interface DatabaseSnapshot {
  metadata: {
    version: string;
    organization: string;
    createdAt: string;
    recordCounts: Record<string, number>;
  };
  data: {
    departments: any[];
    users: any[];
    profiles: any[];
    refreshTokens: any[];
    passwordResetTokens: any[];
    projects: any[];
    projectMembers: any[];
    milestones: any[];
    tasks: any[];
    taskDependencies: any[];
    taskComments: any[];
    taskAttachments: any[];
    notifications: any[];
    notificationPreferences: any[];
    backgroundJobs: any[];
    auditLogs: any[];
  };
}

export class BackupRestoreService {
  /**
   * Generates a complete relational database snapshot
   */
  public static createSnapshot(): DatabaseSnapshot {
    const data = {
      departments: JSON.parse(JSON.stringify(dbStore.departments)),
      users: JSON.parse(JSON.stringify(dbStore.users)),
      profiles: JSON.parse(JSON.stringify(dbStore.profiles)),
      refreshTokens: JSON.parse(JSON.stringify(dbStore.refreshTokens)),
      passwordResetTokens: JSON.parse(JSON.stringify(dbStore.passwordResetTokens)),
      projects: JSON.parse(JSON.stringify(dbStore.projects)),
      projectMembers: JSON.parse(JSON.stringify(dbStore.projectMembers)),
      milestones: JSON.parse(JSON.stringify(dbStore.milestones)),
      tasks: JSON.parse(JSON.stringify(dbStore.tasks)),
      taskDependencies: JSON.parse(JSON.stringify(dbStore.taskDependencies)),
      taskComments: JSON.parse(JSON.stringify(dbStore.taskComments)),
      taskAttachments: JSON.parse(JSON.stringify(dbStore.taskAttachments)),
      notifications: JSON.parse(JSON.stringify(dbStore.notifications)),
      notificationPreferences: JSON.parse(JSON.stringify(dbStore.notificationPreferences)),
      backgroundJobs: JSON.parse(JSON.stringify(dbStore.backgroundJobs)),
      auditLogs: JSON.parse(JSON.stringify(dbStore.auditLogs)),
    };

    const recordCounts: Record<string, number> = {};
    for (const [key, value] of Object.entries(data)) {
      recordCounts[key] = (value as any[]).length;
    }

    return {
      metadata: {
        version: "2.0.0",
        organization: "Livexpert Technologies Pvt. Ltd.",
        createdAt: new Date().toISOString(),
        recordCounts,
      },
      data,
    };
  }

  /**
   * Saves a snapshot to disk
   */
  public static saveToFile(filePath?: string): string {
    const snapshot = this.createSnapshot();
    const resolvedPath = filePath || path.join(process.cwd(), `kibo360_backup_${Date.now()}.json`);
    const dir = path.dirname(resolvedPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(resolvedPath, JSON.stringify(snapshot, null, 2), "utf-8");
    return resolvedPath;
  }

  /**
   * Restores a snapshot into the database store
   */
  public static restoreSnapshot(snapshot: DatabaseSnapshot): { success: boolean; restoredCounts: Record<string, number> } {
    if (!snapshot || !snapshot.data || !snapshot.metadata) {
      throw new Error("Invalid backup snapshot format");
    }

    const { data } = snapshot;

    // Restore collections
    dbStore.departments = data.departments.map((d: any) => ({
      ...d,
      createdAt: new Date(d.createdAt),
      updatedAt: new Date(d.updatedAt),
    }));

    dbStore.users = data.users.map((u: any) => ({
      ...u,
      createdAt: new Date(u.createdAt),
      updatedAt: new Date(u.updatedAt),
    }));

    dbStore.profiles = data.profiles.map((p: any) => ({
      ...p,
      createdAt: new Date(p.createdAt),
      updatedAt: new Date(p.updatedAt),
    }));

    dbStore.refreshTokens = data.refreshTokens.map((r: any) => ({
      ...r,
      expiresAt: new Date(r.expiresAt),
      createdAt: new Date(r.createdAt),
      revokedAt: r.revokedAt ? new Date(r.revokedAt) : undefined,
    }));

    dbStore.passwordResetTokens = data.passwordResetTokens.map((pr: any) => ({
      ...pr,
      expiresAt: new Date(pr.expiresAt),
      createdAt: new Date(pr.createdAt),
      usedAt: pr.usedAt ? new Date(pr.usedAt) : undefined,
    }));

    dbStore.projects = data.projects.map((p: any) => ({
      ...p,
      startDate: new Date(p.startDate),
      targetDate: new Date(p.targetDate),
      createdAt: new Date(p.createdAt),
      updatedAt: new Date(p.updatedAt),
      archivedAt: p.archivedAt ? new Date(p.archivedAt) : undefined,
    }));

    dbStore.projectMembers = data.projectMembers.map((pm: any) => ({
      ...pm,
      assignedAt: new Date(pm.assignedAt),
    }));

    dbStore.milestones = data.milestones.map((m: any) => ({
      ...m,
      dueDate: new Date(m.dueDate),
      reachedAt: m.reachedAt ? new Date(m.reachedAt) : undefined,
      createdAt: new Date(m.createdAt),
      updatedAt: new Date(m.updatedAt),
    }));

    dbStore.tasks = data.tasks.map((t: any) => ({
      ...t,
      startDate: t.startDate ? new Date(t.startDate) : undefined,
      dueDate: t.dueDate ? new Date(t.dueDate) : undefined,
      createdAt: new Date(t.createdAt),
      updatedAt: new Date(t.updatedAt),
    }));

    dbStore.taskDependencies = data.taskDependencies.map((td: any) => ({
      ...td,
      createdAt: new Date(td.createdAt),
    }));

    dbStore.taskComments = data.taskComments.map((tc: any) => ({
      ...tc,
      createdAt: new Date(tc.createdAt),
      updatedAt: new Date(tc.updatedAt),
    }));

    dbStore.taskAttachments = data.taskAttachments.map((ta: any) => ({
      ...ta,
      createdAt: new Date(ta.createdAt),
    }));

    dbStore.notifications = data.notifications.map((n: any) => ({
      ...n,
      createdAt: new Date(n.createdAt),
    }));

    dbStore.notificationPreferences = data.notificationPreferences.map((np: any) => ({
      ...np,
      createdAt: new Date(np.createdAt),
      updatedAt: new Date(np.updatedAt),
    }));

    dbStore.backgroundJobs = data.backgroundJobs.map((bj: any) => ({
      ...bj,
      scheduledAt: new Date(bj.scheduledAt),
      createdAt: new Date(bj.createdAt),
      processedAt: bj.processedAt ? new Date(bj.processedAt) : undefined,
    }));

    dbStore.auditLogs = data.auditLogs.map((al: any) => ({
      ...al,
      createdAt: new Date(al.createdAt),
    }));

    return {
      success: true,
      restoredCounts: snapshot.metadata.recordCounts,
    };
  }

  /**
   * Restores snapshot from a file
   */
  public static restoreFromFile(filePath: string) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Backup file not found at: ${filePath}`);
    }
    const raw = fs.readFileSync(filePath, "utf-8");
    const snapshot: DatabaseSnapshot = JSON.parse(raw);
    return this.restoreSnapshot(snapshot);
  }
}

// CLI handler when run directly
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0] || "backup";

  if (command === "backup") {
    const dest = args[1];
    const saved = BackupRestoreService.saveToFile(dest);
    console.log(`✅ Snapshot backup saved to: ${saved}`);
  } else if (command === "restore") {
    const file = args[1];
    if (!file) {
      console.error("❌ Please provide backup file path: ts-node backup-restore.ts restore <file.json>");
      process.exit(1);
    }
    const res = BackupRestoreService.restoreFromFile(file);
    console.log(`✅ Database successfully restored:`, res.restoredCounts);
  } else {
    console.log("Usage: node backup-restore.js [backup|restore] [path]");
  }
}
