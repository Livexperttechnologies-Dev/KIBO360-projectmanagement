import React, { useState, useEffect } from "react";
import {
  Users,
  UserPlus,
  Shield,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Edit2,
  Lock,
  History,
  Building2,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Modal } from "../../components/ui/Modal";
import { Spinner } from "../../components/ui/Spinner";
import { useAuth, Role, User } from "../../contexts/AuthContext";
import { API_BASE_URL } from "../../api/client";

interface AuditLogItem {
  id: string;
  action: string;
  entity: string;
  details?: string;
  ipAddress?: string;
  createdAt: string;
}

export const UserManagementPage: React.FC = () => {
  const { user: currentUser, token } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>("");
  const [deptFilter, setDeptFilter] = useState<string>("all");

  // Invite Modal state
  const [isInviteOpen, setIsInviteOpen] = useState<boolean>(false);
  const [inviteEmail, setInviteEmail] = useState<string>("");
  const [inviteFirstName, setInviteFirstName] = useState<string>("");
  const [inviteLastName, setInviteLastName] = useState<string>("");
  const [inviteRole, setInviteRole] = useState<Role>("EMPLOYEE");
  const [inviteDept, setInviteDept] = useState<string>("dept-sw");
  const [inviteJobTitle, setInviteJobTitle] = useState<string>("");
  const [inviteLoading, setInviteLoading] = useState<boolean>(false);
  const [inviteError, setInviteError] = useState<string>("");

  // Edit User Modal state
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editFirstName, setEditFirstName] = useState<string>("");
  const [editLastName, setEditLastName] = useState<string>("");
  const [editJobTitle, setEditJobTitle] = useState<string>("");
  const [editDeptId, setEditDeptId] = useState<string>("");
  const [editLoading, setEditLoading] = useState<boolean>(false);

  // Audit Logs Modal state
  const [isAuditOpen, setIsAuditOpen] = useState<boolean>(false);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [auditLoading, setAuditLoading] = useState<boolean>(false);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setUsers(data.data.users);
      }
    } catch {
      // Ignore
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAuditLogs = async () => {
    setAuditLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/users/audit-logs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setAuditLogs(data.data.logs);
      }
    } finally {
      setAuditLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [token]);

  const handleToggleStatus = async (targetUser: User) => {
    const nextStatus = !targetUser.isActive;
    const confirmMessage = nextStatus
      ? `Activate access for ${targetUser.email}?`
      : `Deactivate ${targetUser.email}? They will be immediately blocked from accessing protected resources.`;

    if (!window.confirm(confirmMessage)) return;

    try {
      const res = await fetch(`${API_BASE_URL}/users/${targetUser.id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isActive: nextStatus }),
      });

      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) => (u.id === targetUser.id ? { ...u, isActive: nextStatus } : u))
        );
      } else {
        const data = await res.json();
        alert(data?.error?.message || "Failed to update account status.");
      }
    } catch (err: any) {
      alert(err.message || "Network error");
    }
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError("");
    setInviteLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/users/invite`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: inviteEmail.trim(),
          firstName: inviteFirstName.trim(),
          lastName: inviteLastName.trim(),
          role: inviteRole,
          departmentId: inviteDept,
          jobTitle: inviteJobTitle.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message || "Failed to invite user");
      }

      setIsInviteOpen(false);
      setInviteEmail("");
      setInviteFirstName("");
      setInviteLastName("");
      setInviteJobTitle("");
      fetchUsers();
    } catch (err: any) {
      setInviteError(err.message || "Invitation failed");
    } finally {
      setInviteLoading(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setEditLoading(true);

    try {
      // 1. Update Profile
      await fetch(`${API_BASE_URL}/users/${editingUser.id}/profile`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          firstName: editFirstName,
          lastName: editLastName,
          jobTitle: editJobTitle,
        }),
      });

      // 2. Update Department if changed
      if (editDeptId && editDeptId !== editingUser.departmentId) {
        await fetch(`${API_BASE_URL}/users/${editingUser.id}/department`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ departmentId: editDeptId }),
        });
      }

      setEditingUser(null);
      fetchUsers();
    } finally {
      setEditLoading(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const fullName = `${u.profile?.firstName || ""} ${u.profile?.lastName || ""}`.toLowerCase();
    const matchesSearch =
      u.email.toLowerCase().includes(search.toLowerCase()) || fullName.includes(search.toLowerCase());

    if (deptFilter === "all") return matchesSearch;
    if (deptFilter === "inactive") return matchesSearch && !u.isActive;
    return matchesSearch && u.department?.code === deptFilter;
  });

  const activeCount = users.filter((u) => u.isActive).length;
  const swCount = users.filter((u) => u.department?.code === "SOFTWARE_IT").length;
  const pdCount = users.filter((u) => u.department?.code === "PRODUCT_DESIGN").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-bold text-[#690BA8] mb-1.5 border border-[#690BA8]/15">
            <Shield className="h-3 w-3" />
            <span>Administrator Control Center</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            User & Access Management
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage credentials, assign departments, toggle account states, and review audit records for Livexpert Technologies.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setIsAuditOpen(true);
              fetchAuditLogs();
            }}
            leftIcon={<History className="h-4 w-4 text-slate-500" />}
          >
            Audit Trail
          </Button>

          <Button
            variant="gradient"
            size="sm"
            onClick={() => setIsInviteOpen(true)}
            leftIcon={<UserPlus className="h-4 w-4" />}
          >
            Invite New Member
          </Button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Total Accounts
            </span>
            <div className="text-2xl font-black text-slate-900 mt-1">{users.length}</div>
            <p className="text-[11px] text-slate-500 mt-0.5">Livexpert directory</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Active Sessions
            </span>
            <div className="text-2xl font-black text-emerald-600 mt-1">{activeCount}</div>
            <p className="text-[11px] text-emerald-700 mt-0.5">{users.length - activeCount} deactivated</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Software / IT
            </span>
            <div className="text-2xl font-black text-[#690BA8] mt-1">{swCount}</div>
            <p className="text-[11px] text-slate-500 mt-0.5">Engineers & Leads</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Product / Design
            </span>
            <div className="text-2xl font-black text-[#E81778] mt-1">{pdCount}</div>
            <p className="text-[11px] text-slate-500 mt-0.5">Managers & Designers</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 bg-white rounded-xl border border-slate-200 shadow-subtle w-full sm:w-auto">
          {[
            { id: "all", label: "All Users" },
            { id: "SOFTWARE_IT", label: "Software / IT" },
            { id: "PRODUCT_DESIGN", label: "Product / Design" },
            { id: "inactive", label: "Deactivated" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setDeptFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                deptFilter === tab.id
                  ? "bg-[#690BA8] text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-[#690BA8] focus:outline-none focus:ring-1 focus:ring-[#690BA8]"
          />
        </div>
      </div>

      {/* Users Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-12 text-center space-y-2">
              <Spinner size="md" variant="brand" />
              <p className="text-xs text-slate-500 font-medium">Loading user directory...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">
              No team members found matching the selected filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-3.5">User</th>
                    <th className="px-6 py-3.5">Department</th>
                    <th className="px-6 py-3.5">Role</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map((u) => {
                    const initials =
                      (u.profile?.firstName?.[0] || "") + (u.profile?.lastName?.[0] || u.email[0].toUpperCase());

                    return (
                      <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-[#690BA8] to-[#E81778] text-white font-bold text-xs shrink-0">
                              {initials}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900">
                                {u.profile?.firstName} {u.profile?.lastName}
                              </div>
                              <div className="text-[11px] text-slate-400">{u.email}</div>
                              {u.profile?.jobTitle && (
                                <div className="text-[10px] text-slate-500 font-medium">
                                  {u.profile.jobTitle}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          {u.department ? (
                            <Badge
                              variant={u.department.code === "SOFTWARE_IT" ? "primary" : "magenta"}
                              size="sm"
                            >
                              <Building2 className="h-3 w-3" />
                              <span>{u.department.name}</span>
                            </Badge>
                          ) : (
                            <span className="text-slate-400 text-xs">Unassigned</span>
                          )}
                        </td>

                        <td className="px-6 py-4">
                          <Badge
                            variant={
                              u.role === "ADMINISTRATOR"
                                ? "coral"
                                : u.role === "PROJECT_MANAGER"
                                ? "magenta"
                                : u.role === "TEAM_LEAD"
                                ? "primary"
                                : "neutral"
                            }
                            size="sm"
                          >
                            {u.role.replace("_", " ")}
                          </Badge>
                        </td>

                        <td className="px-6 py-4">
                          {u.isActive ? (
                            <Badge variant="success" size="sm">
                              <CheckCircle className="h-3 w-3 text-emerald-600" />
                              <span>Active</span>
                            </Badge>
                          ) : (
                            <Badge variant="neutral" size="sm" className="bg-slate-200 text-slate-600">
                              <XCircle className="h-3 w-3 text-slate-500" />
                              <span>Deactivated</span>
                            </Badge>
                          )}
                        </td>

                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                setEditingUser(u);
                                setEditFirstName(u.profile?.firstName || "");
                                setEditLastName(u.profile?.lastName || "");
                                setEditJobTitle(u.profile?.jobTitle || "");
                                setEditDeptId(u.departmentId || "dept-sw");
                              }}
                              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                              title="Edit Profile & Department"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>

                            {u.id !== currentUser?.id && (
                              <button
                                onClick={() => handleToggleStatus(u)}
                                className={`rounded-lg p-1.5 transition-colors ${
                                  u.isActive
                                    ? "text-rose-500 hover:bg-rose-50 hover:text-rose-700"
                                    : "text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                                }`}
                                title={u.isActive ? "Deactivate Account" : "Activate Account"}
                              >
                                {u.isActive ? <Lock className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invite User Modal */}
      <Modal
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
        title="Invite New Livexpert Member"
        description="Creates user account, sets temporary credentials, and dispatches activation email."
      >
        <form onSubmit={handleInviteSubmit} className="space-y-4">
          {inviteError && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
              {inviteError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="First Name"
              required
              placeholder="e.g. Rahul"
              value={inviteFirstName}
              onChange={(e) => setInviteFirstName(e.target.value)}
            />
            <Input
              label="Last Name"
              required
              placeholder="e.g. Verma"
              value={inviteLastName}
              onChange={(e) => setInviteLastName(e.target.value)}
            />
          </div>

          <Input
            label="Livexpert Email"
            type="email"
            required
            placeholder="name@livexpert.in"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
          />

          <Input
            label="Job Title"
            placeholder="e.g. Platform Engineer"
            value={inviteJobTitle}
            onChange={(e) => setInviteJobTitle(e.target.value)}
          />

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
              Department Assignment <span className="text-[#E81778]">*</span>
            </label>
            <select
              value={inviteDept}
              onChange={(e) => setInviteDept(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-800 focus:border-[#690BA8] focus:outline-none"
            >
              <option value="dept-sw">Software / IT</option>
              <option value="dept-pd">Product / Design</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
              Access Role <span className="text-[#E81778]">*</span>
            </label>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as Role)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-800 focus:border-[#690BA8] focus:outline-none"
            >
              <option value="EMPLOYEE">Employee</option>
              <option value="TEAM_LEAD">Team Lead</option>
              <option value="PROJECT_MANAGER">Project Manager</option>
              <option value="ADMINISTRATOR">Administrator</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsInviteOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="gradient"
              size="sm"
              isLoading={inviteLoading}
            >
              Send Invitation
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit User Modal */}
      <Modal
        isOpen={!!editingUser}
        onClose={() => setEditingUser(null)}
        title="Edit User Profile & Department"
        description={`Modifying access parameters for ${editingUser?.email}`}
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="First Name"
              value={editFirstName}
              onChange={(e) => setEditFirstName(e.target.value)}
            />
            <Input
              label="Last Name"
              value={editLastName}
              onChange={(e) => setEditLastName(e.target.value)}
            />
          </div>

          <Input
            label="Job Title"
            value={editJobTitle}
            onChange={(e) => setEditJobTitle(e.target.value)}
          />

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
              Department
            </label>
            <select
              value={editDeptId}
              onChange={(e) => setEditDeptId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-800 focus:border-[#690BA8] focus:outline-none"
            >
              <option value="dept-sw">Software / IT</option>
              <option value="dept-pd">Product / Design</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setEditingUser(null)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={editLoading}
            >
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* Audit Logs Modal */}
      <Modal
        isOpen={isAuditOpen}
        onClose={() => setIsAuditOpen(false)}
        title="Security & Permission Audit Trail"
        description="Chronological log of administrative actions, logins, status changes, and invitations."
      >
        <div className="max-h-[60vh] overflow-y-auto space-y-2">
          {auditLoading ? (
            <div className="py-8 text-center space-y-2">
              <Spinner size="md" variant="brand" />
              <p className="text-xs text-slate-400">Loading audit events...</p>
            </div>
          ) : auditLogs.length === 0 ? (
            <p className="py-8 text-center text-xs text-slate-400">No audit records found.</p>
          ) : (
            <div className="divide-y divide-slate-100 text-xs">
              {auditLogs.map((log) => (
                <div key={log.id} className="py-3 flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge variant="primary" size="sm">
                        {log.action}
                      </Badge>
                      <span className="font-bold text-slate-800">{log.entity}</span>
                    </div>
                    {log.details && (
                      <p className="text-[11px] text-slate-500 mt-1 font-mono break-all">
                        {log.details}
                      </p>
                    )}
                  </div>
                  <div className="text-right text-[10px] text-slate-400 shrink-0">
                    <div>{new Date(log.createdAt).toLocaleTimeString()}</div>
                    <div>{new Date(log.createdAt).toLocaleDateString()}</div>
                    <div className="font-mono mt-0.5">{log.ipAddress}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};