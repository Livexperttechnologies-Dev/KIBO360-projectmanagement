import { dbStore, AuditLogRecord } from "../lib/db";
import crypto from "crypto";

export interface CreateAuditLogParams {
  userId?: string;
  targetId?: string;
  action: string;
  entity: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export class AuditService {
  public static async log({
    userId,
    targetId,
    action,
    entity,
    details,
    ipAddress,
    userAgent,
  }: CreateAuditLogParams): Promise<AuditLogRecord> {
    const entry: AuditLogRecord = {
      id: `aud-${crypto.randomUUID().slice(0, 8)}`,
      userId,
      targetId,
      action,
      entity,
      details: details ? JSON.stringify(details) : undefined,
      ipAddress: ipAddress || "127.0.0.1",
      userAgent,
      createdAt: new Date(),
    };

    dbStore.auditLogs.unshift(entry);
    return entry;
  }

  public static async list(limit = 50): Promise<AuditLogRecord[]> {
    return dbStore.auditLogs.slice(0, limit);
  }
}