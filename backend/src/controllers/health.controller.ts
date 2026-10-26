// ==============================================================================
// KIBO360 Project Hub — Production Health & Observability Controller
// Livexpert Technologies Pvt. Ltd.
// ==============================================================================

import { Request, Response } from "express";
import { dbStore } from "../lib/db";
import { schedulerService } from "../services/scheduler.service";
import { jobQueueService } from "../services/job-queue.service";

/**
 * Diagnostic Health Check
 * Returns detailed health metrics for application monitoring systems
 */
export function getHealth(_req: Request, res: Response) {
  const memory = process.memoryUsage();
  const uptimeSeconds = Math.round(process.uptime());

  // Check in-memory / database store integrity
  const isDbHealthy = Boolean(dbStore && Array.isArray(dbStore.users) && dbStore.users.length > 0);

  // Background queue diagnostics
  const pendingJobs = dbStore.backgroundJobs?.filter((j) => j.status === "PENDING").length || 0;
  const runningJobs = dbStore.backgroundJobs?.filter((j) => j.status === "PROCESSING").length || 0;
  const failedJobs = dbStore.backgroundJobs?.filter((j) => j.status === "FAILED").length || 0;

  const healthData = {
    status: isDbHealthy ? "healthy" : "degraded",
    timestamp: new Date().toISOString(),
    service: "kibo360-hub-api",
    organization: "Livexpert Technologies Pvt. Ltd.",
    version: "2.0.0",
    uptime: uptimeSeconds,
    environment: process.env.NODE_ENV || "development",
    subsystems: {
      database: {
        status: isDbHealthy ? "connected" : "disconnected",
        usersCount: dbStore.users?.length || 0,
        projectsCount: dbStore.projects?.length || 0,
        tasksCount: dbStore.tasks?.length || 0,
      },
      scheduler: {
        status: schedulerService.isRunning() ? "running" : "idle",
        intervalSeconds: 60,
      },
      jobQueue: {
        status: "active",
        pending: pendingJobs,
        running: runningJobs,
        failed: failedJobs,
      },
      memory: {
        heapUsedMb: Math.round((memory.heapUsed / 1024 / 1024) * 100) / 100,
        heapTotalMb: Math.round((memory.heapTotal / 1024 / 1024) * 100) / 100,
        rssMb: Math.round((memory.rss / 1024 / 1024) * 100) / 100,
      },
    },
  };

  res.status(isDbHealthy ? 200 : 503).json(healthData);
}

/**
 * Kubernetes / Container Liveness Probe
 * Lightweight check to verify the process is alive and event loop is responsive
 */
export function getLiveness(_req: Request, res: Response) {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: Math.round(process.uptime()),
  });
}

/**
 * Kubernetes / Container Readiness Probe
 * Verifies that the server and database are initialized and ready to accept client traffic
 */
export function getReadiness(_req: Request, res: Response) {
  const isReady = Boolean(dbStore && dbStore.users && dbStore.users.length > 0);

  if (isReady) {
    res.status(200).json({
      status: "ready",
      timestamp: new Date().toISOString(),
    });
  } else {
    res.status(503).json({
      status: "not_ready",
      message: "Database stores are still initializing",
      timestamp: new Date().toISOString(),
    });
  }
}
