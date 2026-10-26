import { API_BASE_URL } from "./client";

export interface UserSummary {
  id: string;
  email: string;
  role: string;
  isActive: boolean;
  isInvited: boolean;
  departmentId?: string;
  department?: { id: string; name: string; code: string } | null;
  name: string;
  jobTitle?: string;
  avatarUrl?: string;
  profile?: {
    firstName?: string;
    lastName?: string;
    jobTitle?: string;
    avatarUrl?: string;
  } | null;
}

export async function fetchUsers(
  params: { departmentId?: string; role?: string; search?: string } = {},
  token: string | null
): Promise<UserSummary[]> {
  const query = new URLSearchParams();
  if (params.departmentId && params.departmentId !== "all") query.append("departmentId", params.departmentId);
  if (params.role && params.role !== "all") query.append("role", params.role);
  if (params.search) query.append("search", params.search);

  const res = await fetch(`${API_BASE_URL}/users${query.toString() ? `?${query.toString()}` : ""}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: "include",
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || "Failed to load users");
  }

  const rawUsers = data.data?.users || [];
  return rawUsers.map((u: any) => ({
    ...u,
    name: u.profile ? `${u.profile.firstName || ""} ${u.profile.lastName || ""}`.trim() || u.email : u.email,
    jobTitle: u.profile?.jobTitle,
    avatarUrl: u.profile?.avatarUrl,
  }));
}
