/**
 * Configurable API client for KIBO360 Project Hub
 * Base URL is driven by VITE_API_URL or defaults to localhost:5000/api/v1
 */

const API_BASE_URL = (import.meta.env.VITE_API_URL as string) || "http://localhost:5000/api/v1";

export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  status: number;
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL.replace(/\/$/, "")}/${endpoint.replace(/^\//, "")}`;

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const errorMessage =
        (data && (data.error?.message || data.message)) ||
        `Request failed with status ${response.status}`;
      throw new Error(errorMessage);
    }

    return data as T;
  } catch (error: any) {
    if (error.name === "TypeError" && error.message.includes("fetch")) {
      throw new Error("Unable to connect to the backend server. Please verify it is running.");
    }
    throw error;
  }
}

export { API_BASE_URL };