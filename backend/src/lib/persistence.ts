import { prisma } from "./prisma";
import { dbStore } from "./db";

const collections = [
  "departments",
  "users",
  "profiles",
  "refreshTokens",
  "userTwoFactors",
  "securitySettings",
  "passwordResetTokens",
  "auditLogs",
  "projects",
  "projectMembers",
  "milestones",
  "tasks",
  "taskComments",
  "taskAttachments",
  "taskDependencies",
  "notifications",
  "notificationPreferences",
  "backgroundJobs",
] as const;

type CollectionName = (typeof collections)[number];
type StoreSnapshot = Record<CollectionName, Array<{ id: string; [key: string]: any }>>;

let lastPersisted: StoreSnapshot | undefined;
let writeQueue: Promise<void> = Promise.resolve();
let databaseAvailable = false;

function isDatabaseUnavailable(error: any) {
  return error?.code === "P1001" || error?.errorCode === "P1001" || error?.code === "ECONNREFUSED" || error?.code === "ETIMEDOUT" ||
    error?.cause?.code === "ECONNREFUSED" || error?.cause?.code === "ETIMEDOUT";
}

function snapshotStore(): StoreSnapshot {
  return Object.fromEntries(
    collections.map((name) => [name, structuredClone(dbStore[name])])
  ) as unknown as StoreSnapshot;
}

function emptySnapshot(): StoreSnapshot {
  return Object.fromEntries(collections.map((name) => [name, []])) as unknown as StoreSnapshot;
}

function delegateFor(collection: CollectionName): string {
  const overrides: Partial<Record<CollectionName, string>> = {
    refreshTokens: "refreshToken",
    userTwoFactors: "userTwoFactor",
    securitySettings: "securitySetting",
    passwordResetTokens: "passwordResetToken",
    auditLogs: "auditLog",
    projectMembers: "projectMember",
    taskComments: "taskComment",
    taskAttachments: "taskAttachment",
    taskDependencies: "taskDependency",
    notificationPreferences: "notificationPreference",
    backgroundJobs: "backgroundJob",
  };
  return overrides[collection] || collection.slice(0, -1);
}

function restoreStore(snapshot: StoreSnapshot) {
  for (const name of collections) {
    (dbStore as any)[name] = snapshot[name];
  }
}

/** Remove bundled demo records while retaining the configured administrator,
 * real users, departments, and organization security settings. */
function removeDemoSeedData() {
  const demoUserIds = new Set(["usr-pm-02", "usr-lead-03", "usr-dev-04", "usr-inactive-05"]);
  const demoProjectIds = new Set(["prj-01", "prj-02", "prj-03", "prj-04", "prj-05", "prj-06"]);
  const demoTaskIds = new Set(Array.from({ length: 16 }, (_, index) => `tsk-${String(index + 1).padStart(2, "0")}`));
  const demoEntityIds = new Set([...demoProjectIds, ...demoTaskIds]);

  dbStore.projects = dbStore.projects.filter((record) => !demoProjectIds.has(record.id));
  dbStore.tasks = dbStore.tasks.filter((record) => !demoProjectIds.has(record.projectId) && !demoTaskIds.has(record.id));
  dbStore.projectMembers = dbStore.projectMembers.filter((record) => !demoProjectIds.has(record.projectId) && !demoUserIds.has(record.userId));
  dbStore.milestones = dbStore.milestones.filter((record) => !demoProjectIds.has(record.projectId));
  dbStore.taskComments = dbStore.taskComments.filter((record) => !demoTaskIds.has(record.taskId) && !demoUserIds.has(record.userId));
  dbStore.taskAttachments = dbStore.taskAttachments.filter((record) => !demoTaskIds.has(record.taskId) && !demoUserIds.has(record.uploaderId));
  dbStore.taskDependencies = dbStore.taskDependencies.filter((record) => !demoTaskIds.has(record.taskId) && !demoTaskIds.has(record.dependsOnTaskId));
  dbStore.notifications = dbStore.notifications.filter((record) =>
    !demoUserIds.has(record.userId) && !demoEntityIds.has(record.entityId || "") && !demoProjectIds.has(record.projectId || "")
  );
  dbStore.users = dbStore.users.filter((record) => !demoUserIds.has(record.id));
  dbStore.profiles = dbStore.profiles.filter((record) => !demoUserIds.has(record.userId));
  dbStore.refreshTokens = dbStore.refreshTokens.filter((record) => !demoUserIds.has(record.userId));
  dbStore.userTwoFactors = dbStore.userTwoFactors.filter((record) => !demoUserIds.has(record.userId));
  dbStore.passwordResetTokens = dbStore.passwordResetTokens.filter((record) => !demoUserIds.has(record.userId));
  dbStore.notificationPreferences = dbStore.notificationPreferences.filter((record) => !demoUserIds.has(record.userId));
  dbStore.auditLogs = dbStore.auditLogs
    .filter((record) => record.id !== "aud-01")
    .map((record) => demoUserIds.has(record.userId || "") ? { ...record, userId: undefined } : record);
  dbStore.backgroundJobs = dbStore.backgroundJobs.filter((record) => !record.id.startsWith("job-seed-"));
}

function toDatabaseRow(collection: CollectionName, record: any) {
  if (collection !== "backgroundJobs") return record;
  return {
    ...record,
    payload:
      record.payload === undefined || record.payload === null
        ? null
        : typeof record.payload === "string"
          ? record.payload
          : JSON.stringify(record.payload),
  };
}

function fromDatabaseRow(collection: CollectionName, record: any) {
  if (collection !== "backgroundJobs" || !record.payload) return record;
  try {
    return { ...record, payload: JSON.parse(record.payload) };
  } catch {
    return record;
  }
}

function recordsEqual(left: any, right: any) {
  return JSON.stringify(left) === JSON.stringify(right);
}

async function syncCollection(
  tx: any,
  collection: CollectionName,
  previous: StoreSnapshot,
  current: StoreSnapshot
) {
  const delegate = tx[delegateFor(collection)];
  const oldRows = new Map(previous[collection].map((row) => [row.id, row]));

  for (const record of current[collection]) {
    const oldRecord = oldRows.get(record.id);
    const data = toDatabaseRow(collection, record);
    const oldData = oldRecord ? toDatabaseRow(collection, oldRecord) : undefined;
    if (oldData && recordsEqual(oldData, data)) continue;

    const { id, ...update } = data;
    await delegate.upsert({
      where: { id },
      create: data,
      update,
    });
  }
}

const deleteOrder: CollectionName[] = [
  "taskDependencies",
  "taskComments",
  "taskAttachments",
  "notifications",
  "notificationPreferences",
  "refreshTokens",
  "userTwoFactors",
  "securitySettings",
  "passwordResetTokens",
  "auditLogs",
  "projectMembers",
  "milestones",
  "tasks",
  "projects",
  "profiles",
  "users",
  "departments",
  "backgroundJobs",
];

const upsertOrder: CollectionName[] = [
  "departments",
  "users",
  "profiles",
  "projects",
  "projectMembers",
  "milestones",
  "tasks",
  "taskComments",
  "taskAttachments",
  "taskDependencies",
  "refreshTokens",
  "userTwoFactors",
  "securitySettings",
  "passwordResetTokens",
  "auditLogs",
  "notifications",
  "notificationPreferences",
  "backgroundJobs",
];

async function writeSnapshot(current: StoreSnapshot) {
  const previous = lastPersisted || emptySnapshot();

  await prisma.$transaction(async (tx) => {
    // Delete only records previously loaded by this app and removed from its store.
    for (const collection of deleteOrder) {
      const currentIds = new Set(current[collection].map((record) => record.id));
      const removedIds = previous[collection]
        .map((record) => record.id)
        .filter((id) => !currentIds.has(id));
      if (!removedIds.length) continue;

      await (tx as any)[delegateFor(collection)].deleteMany({ where: { id: { in: removedIds } } });
    }

    for (const collection of upsertOrder) {
      await syncCollection(tx, collection, previous, current);
    }
  }, { timeout: 30_000 });

  lastPersisted = current;
}

async function loadSnapshot(): Promise<StoreSnapshot> {
  const rows = await Promise.all([
    prisma.department.findMany(),
    prisma.user.findMany(),
    prisma.profile.findMany(),
    prisma.refreshToken.findMany(),
    prisma.userTwoFactor.findMany(),
    prisma.securitySetting.findMany(),
    prisma.passwordResetToken.findMany(),
    prisma.auditLog.findMany(),
    prisma.project.findMany(),
    prisma.projectMember.findMany(),
    prisma.milestone.findMany(),
    prisma.task.findMany(),
    prisma.taskComment.findMany(),
    prisma.taskAttachment.findMany(),
    prisma.taskDependency.findMany(),
    prisma.notification.findMany(),
    prisma.notificationPreference.findMany(),
    prisma.backgroundJob.findMany(),
  ]);

  return Object.fromEntries(
    collections.map((name, index) => [
      name,
      (rows[index] as any[]).map((record) => fromDatabaseRow(name, record)),
    ])
  ) as StoreSnapshot;
}

export async function initializePersistence() {
  try {
    await prisma.$connect();
    databaseAvailable = true;
  } catch (error) {
    if (process.env.NODE_ENV !== "development" || !isDatabaseUnavailable(error)) throw error;
    databaseAvailable = false;
    removeDemoSeedData();
    console.warn("PostgreSQL is unavailable; using minimal local bootstrap data. Changes will not persist after restart.");
    return;
  }
  let snapshot: StoreSnapshot;
  try {
    snapshot = await loadSnapshot();
  } catch (error) {
    if (process.env.NODE_ENV !== "development" || !isDatabaseUnavailable(error)) throw error;
    databaseAvailable = false;
    await prisma.$disconnect().catch(() => undefined);
    removeDemoSeedData();
    console.warn("PostgreSQL could not load application data; using minimal local bootstrap data. Changes will not persist after restart.");
    return;
  }
  const hasStoredData = collections.some((name) => snapshot[name].length > 0);

  if (hasStoredData) {
    restoreStore(snapshot);
    if (dbStore.securitySettings.length === 0) {
      dbStore.securitySettings.push({ id: "global", globalTwoFactorEnabled: false, updatedAt: new Date() });
    }
    removeDemoSeedData();
    lastPersisted = snapshot;
    const cleanedSnapshot = snapshotStore();
    if (!recordsEqual(snapshot, cleanedSnapshot)) {
      await persistStore();
    }
    console.log("Loaded application data from PostgreSQL");
    return;
  }

  // Empty installations retain only the minimal bootstrap administrator and
  // organization structure; bundled demo projects, tasks, and accounts are removed.
  lastPersisted = emptySnapshot();
  removeDemoSeedData();
  await persistStore();
  console.log("Saved the initial application data to PostgreSQL");
}

export function persistStore(): Promise<void> {
  if (process.env.NODE_ENV === "test" || !databaseAvailable) return Promise.resolve();
  const current = snapshotStore();
  const pending = writeQueue.catch(() => undefined).then(() => writeSnapshot(current));
  writeQueue = pending;
  return pending;
}

export async function closePersistence() {
  await writeQueue.catch(() => undefined);
  if (databaseAvailable) await prisma.$disconnect();
}
