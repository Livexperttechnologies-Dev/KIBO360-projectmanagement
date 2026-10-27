import React, { useEffect, useState } from "react";
import { Settings, Building, Shield, BellRing, Database } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { API_BASE_URL } from "../api/client";
import { useAuth } from "../contexts/AuthContext";
import { QRCodeSVG } from "qrcode.react";

export const SettingsPage: React.FC = () => {
  const { token } = useAuth();
  const [twoFactor, setTwoFactor] = useState<any>(null);
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [setup, setSetup] = useState<any>(null);
  const [notice, setNotice] = useState("");
  const isSuperAdmin = Boolean(twoFactor?.canManageEnforcement);
  const headers = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };

  const loadTwoFactor = async () => {
    const response = await fetch(`${API_BASE_URL}/auth/two-factor`, { headers, credentials: "include" });
    const result = await response.json();
    if (response.ok) setTwoFactor(result.data);
  };
  useEffect(() => { void loadTwoFactor(); }, [token]);

  const startEnrollment = async () => {
    setNotice("");
    const response = await fetch(`${API_BASE_URL}/auth/two-factor/enrollment`, { method: "POST", headers, credentials: "include", body: JSON.stringify({ password }) });
    const result = await response.json();
    if (!response.ok) { setNotice(result?.error?.message || "Could not start authenticator setup"); return; }
    setSetup(result.data);
  };
  const verifyEnrollment = async () => {
    const response = await fetch(`${API_BASE_URL}/auth/two-factor/enrollment/verify`, { method: "POST", headers, credentials: "include", body: JSON.stringify({ password, authenticatorCode: code }) });
    const result = await response.json();
    setNotice(response.ok ? "Google Authenticator is connected." : result?.error?.message || "Code verification failed");
    if (response.ok) { setSetup(null); setPassword(""); await loadTwoFactor(); }
  };
  const toggleEnforcement = async () => {
    const response = await fetch(`${API_BASE_URL}/auth/two-factor/enforcement`, { method: "PUT", headers, credentials: "include", body: JSON.stringify({ enabled: !twoFactor?.globalTwoFactorEnabled, authenticatorCode: code }) });
    const result = await response.json();
    setNotice(response.ok ? "Organization-wide Google Authenticator policy updated." : result?.error?.message || "Could not update policy");
    if (response.ok) await loadTwoFactor();
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
          <CardHeader><div className="flex items-center gap-2"><Shield className="h-5 w-5 text-[#690BA8]" /><CardTitle>Google Authenticator</CardTitle></div><CardDescription>Organization-wide 2FA uses the super admin’s authenticator code for all user sign-ins and password resets.</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-600">Organization-wide enforcement is {twoFactor?.globalTwoFactorEnabled ? "on" : "off"}. {isSuperAdmin ? `Your authenticator is ${twoFactor?.authenticatorEnrolled ? "connected" : "not connected"}.` : twoFactor?.usesSuperAdminAuthenticator ? `The super admin authenticator is ${twoFactor?.superAdminAuthenticatorEnrolled ? "active" : "not set up"}. Ask the super admin for the current code when signing in or resetting your password.` : ""}</p>
            {!twoFactor?.usesSuperAdminAuthenticator && !twoFactor?.authenticatorEnrolled && <div className="flex gap-2"><Input label="Current password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} /><Button className="self-end" onClick={startEnrollment} disabled={!password}>Set up authenticator</Button></div>}
            {setup && <div className="space-y-3 rounded-xl border border-purple-200 bg-purple-50 p-4 text-sm"><p>Scan this QR in Google Authenticator, or enter the key manually:</p><div className="flex justify-center rounded-lg bg-white p-4"><QRCodeSVG value={setup.otpauthUri} size={220} level="Q" includeMargin aria-label="Google Authenticator setup QR code" /></div><code className="block break-all font-mono">{setup.secret}</code><a className="text-[#690BA8] underline" href={setup.otpauthUri}>Open authenticator setup</a><Input label="6-digit code" inputMode="numeric" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} /><Button onClick={verifyEnrollment} disabled={!/^\d{6}$/.test(code) || !password}>Verify and finish setup</Button></div>}
            {twoFactor?.authenticatorEnrolled && !twoFactor?.usesSuperAdminAuthenticator && <div className="flex items-end gap-2"><Input label="Current authenticator code" inputMode="numeric" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} /><Button onClick={toggleEnforcement} disabled={!isSuperAdmin || !/^\d{6}$/.test(code)}>{twoFactor?.globalTwoFactorEnabled ? "Turn off for everyone" : "Require for everyone"}</Button></div>}
            {isSuperAdmin && <p className="text-xs text-slate-500">Only the super admin can turn organization-wide enforcement on or off. When enabled, all users must ask the super admin for the current authenticator code at each sign-in and password reset.</p>}
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
