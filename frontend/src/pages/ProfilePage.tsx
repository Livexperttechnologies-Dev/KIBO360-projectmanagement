import React, { useEffect, useState } from "react";
import { KeyRound, ShieldCheck, UserCircle } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { API_BASE_URL } from "../api/client";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "../components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/Card";
import { Input } from "../components/ui/Input";

interface TwoFactorSetup {
  secret: string;
  otpauthUri: string;
}

export const ProfilePage: React.FC = () => {
  const { user, token } = useAuth();
  const [settings, setSettings] = useState<any>(null);
  const [setup, setSetup] = useState<TwoFactorSetup | null>(null);
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const usesSharedSuperAdminCode = Boolean(settings?.usesSuperAdminAuthenticator);
  const headers = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };

  const loadSettings = async () => {
    const response = await fetch(`${API_BASE_URL}/auth/two-factor`, { headers, credentials: "include" });
    const result = await response.json();
    if (response.ok) setSettings(result.data);
  };
  useEffect(() => { void loadSettings(); }, [token]);

  const beginSetup = async () => {
    if (settings?.authenticatorEnrolled && !window.confirm("Replace your current authenticator key? Your old Google Authenticator entry will stop working.")) return;
    setLoading(true);
    setNotice("");
    try {
      const response = await fetch(`${API_BASE_URL}/auth/two-factor/enrollment`, {
        method: "POST", headers, credentials: "include", body: JSON.stringify({ password }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result?.error?.message || "Could not start authenticator setup");
      setSetup(result.data);
      setCode("");
      setNotice("Scan the new key or enter it manually, then verify a fresh six-digit code.");
    } catch (error: any) {
      setNotice(error.message || "Could not start authenticator setup");
    } finally {
      setLoading(false);
    }
  };

  const verifySetup = async () => {
    setLoading(true);
    setNotice("");
    try {
      const response = await fetch(`${API_BASE_URL}/auth/two-factor/enrollment/verify`, {
        method: "POST", headers, credentials: "include", body: JSON.stringify({ password, authenticatorCode: code }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result?.error?.message || "Code verification failed. Enter the current six-digit code from the new authenticator entry.");
      setSetup(null);
      setPassword("");
      setCode("");
      setNotice("Authenticator setup verified. Sign out and sign in again with your password and new authenticator code.");
      await loadSettings();
    } catch (error: any) {
      setNotice(error.message || "Code verification failed. Check your phone's automatic date and time, then try a fresh code.");
    } finally {
      setLoading(false);
    }
  };

  const toggleOrganizationPolicy = async () => {
    setLoading(true);
    setNotice("");
    try {
      const response = await fetch(`${API_BASE_URL}/auth/two-factor/enforcement`, {
        method: "PUT", headers, credentials: "include",
        body: JSON.stringify({ enabled: !settings?.globalTwoFactorEnabled, authenticatorCode: code }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result?.error?.message || "Could not change organization 2FA policy");
      setCode("");
      setNotice("Organization-wide 2FA policy updated. All active sessions have been signed out.");
      await loadSettings();
    } catch (error: any) {
      setNotice(error.message || "Could not change organization 2FA policy");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h2 className="text-2xl font-black tracking-tight text-slate-900">My Profile</h2>
        <p className="mt-1 text-sm text-slate-500">Manage your account details and sign-in security.</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2"><UserCircle className="h-5 w-5 text-[#690BA8]" /><CardTitle>Account</CardTitle></div>
          <CardDescription>Your KIBO360 account information</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Input label="Name" value={`${user?.profile?.firstName || ""} ${user?.profile?.lastName || ""}`.trim()} readOnly />
          <Input label="Email" value={user?.email || ""} readOnly />
          <Input label="Role" value={user?.role?.replace(/_/g, " ") || ""} readOnly />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-[#690BA8]" /><CardTitle>Google Authenticator</CardTitle></div>
          <CardDescription>Set up your personal authenticator from your profile. Do this before enabling organization-wide enforcement.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-600">Authenticator: <strong>{usesSharedSuperAdminCode ? (settings?.superAdminAuthenticatorEnrolled ? "Super admin authenticator active" : "Super admin setup required") : (settings?.authenticatorEnrolled ? "Connected" : "Not set up")}</strong></p>
          <p className="text-sm text-slate-600">Organization-wide enforcement: <strong>{settings?.globalTwoFactorEnabled ? "On" : "Off"}</strong></p>

          {usesSharedSuperAdminCode && <p className="rounded-lg border border-purple-200 bg-purple-50 p-3 text-sm text-purple-950">Organization-wide 2FA uses the super admin’s Google Authenticator. Ask the super admin for the current code each time you sign in or reset your password. Users do not enroll their own authenticator while this policy is on.</p>}

          {!usesSharedSuperAdminCode && !setup && <div className="space-y-3">
            <Input label="Current password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} />
            <Button onClick={beginSetup} isLoading={loading} disabled={password.length < 8} leftIcon={<KeyRound className="h-4 w-4" />}>
              {settings?.authenticatorEnrolled ? "Replace authenticator setup" : "Set up Google Authenticator"}
            </Button>
          </div>}

          {setup && <div className="space-y-4 rounded-xl border border-purple-200 bg-purple-50 p-4">
            <p className="text-sm font-semibold text-purple-950">In Google Authenticator, add an account using this setup key:</p>
            <div className="flex justify-center rounded-lg bg-white p-4"><QRCodeSVG value={setup.otpauthUri} size={220} level="Q" includeMargin aria-label="Google Authenticator setup QR code" /></div>
            <code className="block select-all break-all rounded-lg bg-white p-3 font-mono text-sm tracking-wider text-slate-900">{setup.secret}</code>
            <a className="inline-block text-sm font-semibold text-[#690BA8] underline" href={setup.otpauthUri}>Open in an authenticator app</a>
            <Input label="Current six-digit code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} helperText="Codes change every 30 seconds. Use the code shown for this KIBO360 entry." />
            <Button onClick={verifySetup} isLoading={loading} disabled={!/^\d{6}$/.test(code) || password.length < 8}>Verify authenticator</Button>
          </div>}

          {settings?.canManageEnforcement && settings?.authenticatorEnrolled && !setup && <div className="space-y-3 border-t border-slate-100 pt-4">
            <p className="text-sm text-slate-600">Only the super admin can change this policy. When enabled, all users use the current code from the super admin’s authenticator at sign-in and password reset.</p>
            <Input label="Fresh authenticator code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} />
            <Button onClick={toggleOrganizationPolicy} isLoading={loading} disabled={!/^\d{6}$/.test(code)}>
              {settings.globalTwoFactorEnabled ? "Turn off 2FA for everyone" : "Require 2FA for everyone"}
            </Button>
          </div>}

          {notice && <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700" role="status">{notice}</p>}
        </CardContent>
      </Card>
    </div>
  );
};
