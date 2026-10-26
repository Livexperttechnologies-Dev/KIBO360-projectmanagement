import { apiRequest } from "./client";

export interface HealthResponse {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  service: string;
  version: string;
  uptime: number;
  environment?: string;
}

export async function fetchBackendHealth(): Promise<HealthResponse> {
  return apiRequest<HealthResponse>("health");
}