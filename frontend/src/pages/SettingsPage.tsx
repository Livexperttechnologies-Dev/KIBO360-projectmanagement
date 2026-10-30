import React, { useEffect, useState } from "react";
import { Settings, Building, Shield, BellRing, Database } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { API_BASE_URL } from "../api/client";
import { useAuth } from "../contexts/AuthContext";

export const SettingsPage: React.FC = () => {
  const { token } = useAuth();
  const [twoFactor, setTwoFactor] = useState<any>(null);
  const [code, setCode] = useState("");
  const [notice, setNotice] = useState("");
  const isSuperAdmin = Boolean(twoFactor?.canManageEnforcement);
  const headers = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };

  const loadTwoFactor = async () => {
    const response = await fetch(`${API_BASE_URL}/auth/two-factor`, { headers, credentials: "include" });
    const result = await response.json();
    if (response.ok) setTwoFactor(result.data);
  };
  useEffect(() => { void loadTwoFactor(); }, [token]);

  const toggleEnforcement = async () => {
    if (twoFactor?.globalTwoFactorEnabled && !window.confirm("Turn off 2FA for all users? Users will no longer need the super admin’s authenticator code at sign-in or password reset.")) return;
    const response = await fetch(`${API_BASE_URL}/auth/two-factor/enforcement`, { method: "PUT", headers, credentials: "include", body: JSON.stringify({ enabled: !twoFactor?.globalTwoFactorEnabled, authenticatorCode: code }) });
    const result = await response.json();
    setNotice(response.ok ? "Organization-wide Google Authenticator policy updated. Active sessions have been signed out." : result?.error?.message || "Could not update policy");
    if (response.ok) { setCode(""); await loadTwoFactor(); }
  };
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Organization & Workspace Settings</h2>
        <p className="text-xs text-slate-500 mt-1">
          Configure hub preferences, enterprise parameters, and security policies.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="md:col-span-2">
          <CardHeader><div className="flex items-center gap-2"><Shield className="h-5 w-5 text-[#690BA8]" /><CardTitle>Google Authenticator</CardTitle></div><CardDescription>Manage whether all users must use the super admin’s authenticator at sign-in and password reset. Set up the authenticator from My Profile.</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-600">Organization-wide enforcement is <strong>{twoFactor?.globalTwoFactorEnabled ? "on" : "off"}</strong>. {isSuperAdmin ? `Your authenticator is ${twoFactor?.authenticatorEnrolled ? "connected" : "not connected"}.` : twoFactor?.usesSuperAdminAuthenticator ? `The super admin authenticator is ${twoFactor?.superAdminAuthenticatorEnrolled ? "active" : "not set up"}.` : ""}</p>
            {isSuperAdmin ? twoFactor?.authenticatorEnrolled ? <div className="max-w-xl space-y-3 rounded-xl border border-violet-100 bg-violet-50/50 p-4">
              <p className="text-xs text-slate-600">{twoFactor.globalTwoFactorEnabled ? "All users are currently required to use your authenticator code at sign-in and password reset." : "Turn on enforcement to require your authenticator code from all users at sign-in and password reset."}</p>
              <Input label="Current super admin authenticator code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} />
              <Button variant={twoFactor.globalTwoFactorEnabled ? "danger" : "gradient"} onClick={toggleEnforcement} disabled={!/^\d{6}$/.test(code)}>{twoFactor.globalTwoFactorEnabled ? "Turn off 2FA for all users" : "Turn on 2FA for all users"}</Button>
            </div> : <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Set up Google Authenticator in My Profile before you can change the organization-wide 2FA setting.</p> : twoFactor?.globalTwoFactorEnabled && <p className="text-xs text-slate-500">Ask the super admin for the current authenticator code when signing in or resetting your password.</p>}
            {notice && <p className="text-sm text-slate-700" role="status">{notice}</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building className="h-5 w-5 text-[#690BA8]" />
              <CardTitle>Company Details</CardTitle>
            </div>
            <CardDescription>Primary organization configuration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input label="Organization Legal Name" defaultValue="Livexpert Technologies Pvt. Ltd." readOnly />
            <Input label="Application Identity" defaultValue="KIBO360 Project Hub" readOnly />
            <Input label="Support & Admin Email" defaultValue="admin@livexpert.in" readOnly />
            <Badge variant="primary">Enterprise Tier</Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-[#E81778]" />
              <CardTitle>API & Database Configuration</CardTitle>
            </div>
            <CardDescription>Backend endpoints and persistence layer</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input label="REST API Base URL" defaultValue="http://localhost:5002/api/v1" readOnly />
            <Input label="Database Target" defaultValue="PostgreSQL (Prisma ORM)" readOnly />
            <div className="flex items-center justify-between text-xs pt-2">
              <span className="text-slate-500">Security Rule Mode:</span>
              <Badge variant="success">Strict Phase 1 Active</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
