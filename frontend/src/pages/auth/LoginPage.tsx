import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  ArrowRight,
  Info,
  CheckCircle,
} from "lucide-react";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { Card, CardContent } from "../../components/ui/Card";
import { Modal } from "../../components/ui/Modal";
import { useAuth } from "../../contexts/AuthContext";

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, savedEmail, isAuthenticated, isLoading: authLoading } = useAuth();

  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [authenticatorCode, setAuthenticatorCode] = useState("");
  const [loginChallenge, setLoginChallenge] = useState<{ requiresEnrollment?: boolean; setupSecret?: string; setupUri?: string; usesSuperAdminAuthenticator?: boolean; message?: string } | null>(null);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(false);

  // Validation & error states
  const [emailError, setEmailError] = useState<string>("");
  const [passwordError, setPasswordError] = useState<string>("");
  const [generalError, setGeneralError] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Forgot Password Modal
  const [isForgotModalOpen, setIsForgotModalOpen] = useState<boolean>(false);
  const [forgotEmail, setForgotEmail] = useState<string>("");
  const [forgotCode, setForgotCode] = useState("");
  const [forgotNewPassword, setForgotNewPassword] = useState("");
  const [forgotSubmitted, setForgotSubmitted] = useState<boolean>(false);
  const [forgotMessage, setForgotMessage] = useState<string>("");
  const [forgotLoading, setForgotLoading] = useState<boolean>(false);

  const { resetPassword } = useAuth();

  useEffect(() => {
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, [savedEmail]);

  useEffect(() => {
    // If already authenticated, redirect to destination or dashboard
    if (isAuthenticated) {
      const from = (location.state as any)?.from?.pathname || "/dashboard";
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  const validate = (): boolean => {
    let isValid = true;
    setEmailError("");
    setPasswordError("");
    setGeneralError("");

    if (!email.trim()) {
      setEmailError("Company email address is required");
      isValid = false;
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        setEmailError("Please enter a valid company email address (e.g. name@livexpert.in)");
        isValid = false;
      }
    }

    if (!password) {
      setPasswordError("Password is required");
      isValid = false;
    } else if (password.length < 8) {
      setPasswordError("Password must be at least 8 characters");
      isValid = false;
    }

    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const result = await login({
        email: email.trim(),
        password,
        rememberMe,
        ...(loginChallenge ? { authenticatorCode } : {}),
      });

      if (result.challenge) {
        setLoginChallenge(result.challenge);
        setAuthenticatorCode("");
        setGeneralError(result.challenge.message || "");
      } else if (!result.success) {
        setGeneralError(result.message || "Invalid email or password");
      } else {
        const from = (location.state as any)?.from?.pathname || "/dashboard";
        navigate(from, { replace: true });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(forgotEmail) || !/^\d{6}$/.test(forgotCode) || forgotNewPassword.length < 8) {
      return;
    }

    setForgotLoading(true);
    try {
      const res = await resetPassword(forgotEmail.trim(), forgotCode, forgotNewPassword);
      setForgotMessage(res.message);
      setForgotSubmitted(true);
    } catch (err: any) {
      setForgotMessage(err.message || "Failed to process reset request");
      setForgotSubmitted(true);
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col justify-center bg-[#F8F9FC] px-4 py-12 sm:px-6 lg:px-8">
      {/* Background brand decorative accents */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-gradient-to-br from-[#690BA8]/10 via-[#E81778]/10 to-[#F16A65]/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-gradient-to-tr from-[#340771]/10 via-[#690BA8]/10 to-[#F5EFFB] blur-3xl" />
      </div>

      <div className="relative sm:mx-auto sm:w-full sm:max-w-md">
        {/* Logo and Brand Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-white shadow-card border border-slate-100">
            <img
              src="/kibo360-logo.png"
              alt="KIBO360 Logo"
              className="h-12 w-auto object-contain"
            />
          </div>
          <h2 className="mt-4 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
            Project Hub
          </h2>
          <p className="mt-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Livexpert Technologies Pvt. Ltd.
          </p>
        </div>

        {/* Login Card */}
        <Card className="mt-8 border-slate-200/80 shadow-elevated">
          <CardContent className="p-7 sm:p-9">
            {/* General Error Alert */}
            {generalError && (
              <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                  <div className="leading-relaxed font-medium">{generalError}</div>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              {/* Email Input */}
              <Input
                label="Company Email"
                type="email"
                required
                placeholder="name@livexpert.in"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailError) setEmailError("");
                }}
                error={emailError}
                leftIcon={<Mail className="h-4 w-4" />}
                autoComplete="email"
              />

              {loginChallenge && (
                <div className="space-y-3">
                  <div className="rounded-xl border border-purple-200 bg-purple-50 p-3 text-xs text-purple-900">
                    {loginChallenge.requiresEnrollment
                      ? "Set up Google Authenticator, then enter the code it displays."
                      : loginChallenge.usesSuperAdminAuthenticator
                        ? "Ask the super admin for the current 6-digit Google Authenticator code."
                        : "Enter the current 6-digit code from your Google Authenticator."}
                    {loginChallenge.setupSecret && <div className="mt-2 break-all font-mono">Setup key: {loginChallenge.setupSecret}</div>}
                    {loginChallenge.setupUri && <a className="mt-2 inline-block underline" href={loginChallenge.setupUri}>Open authenticator setup</a>}
                  </div>
                  <Input label="Google Authenticator code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={authenticatorCode} onChange={(e) => setAuthenticatorCode(e.target.value.replace(/\D/g, "").slice(0, 6))} leftIcon={<ShieldCheck className="h-4 w-4" />} helperText="Codes refresh every 30 seconds. If one is rejected, wait for the next code; automatic date and time should be enabled on your phone." />
                </div>
              )}

              {/* Password Input with Show/Hide toggle */}
              <Input
                label="Password"
                type={showPassword ? "text" : "password"}
                required
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (passwordError) setPasswordError("");
                }}
                error={passwordError}
                leftIcon={<Lock className="h-4 w-4" />}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                }
                autoComplete="current-password"
              />

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-[#690BA8] focus:ring-[#690BA8]/20"
                  />
                  <span className="font-medium text-slate-600">Remember me</span>
                </label>

                <button
                  type="button"
                  onClick={() => {
                    setForgotEmail(email);
                    setForgotSubmitted(false);
                    setForgotCode("");
                    setForgotNewPassword("");
                    setIsForgotModalOpen(true);
                  }}
                  className="font-semibold text-[#690BA8] hover:text-[#340771] hover:underline"
                >
                  Forgot password?
                </button>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                variant="gradient"
                size="lg"
                className="w-full mt-2"
                isLoading={isSubmitting || authLoading}
                rightIcon={<ArrowRight className="h-4 w-4" />}
              >
                Sign In to KIBO360
              </Button>
            </form>

          </CardContent>
        </Card>

        {/* Footer info */}
        <p className="mt-8 text-center text-[11px] text-slate-400">
          © {new Date().getFullYear()} Livexpert Technologies Pvt. Ltd. All rights reserved.
        </p>
      </div>

      {/* Forgot Password Modal */}
      <Modal
        isOpen={isForgotModalOpen}
        onClose={() => setIsForgotModalOpen(false)}
        title="Reset Account Password"
        description="Livexpert Technologies Security Service"
      >
        {forgotSubmitted ? (
          <div className="py-4 text-center space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <CheckCircle className="h-6 w-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-800">
              Reset Request Processed
            </h4>
            <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
              {forgotMessage}
            </p>
            <div className="pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsForgotModalOpen(false)}
              >
                Close Window
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleForgotSubmit} className="space-y-4">
            <p className="text-xs text-slate-600 leading-relaxed">
              Reset your password with the current code from the super admin’s Google Authenticator. No email link is used.
            </p>
            <Input
              label="Work Email"
              type="email"
              required
              placeholder="name@livexpert.in"
              value={forgotEmail}
              onChange={(e) => setForgotEmail(e.target.value)}
              leftIcon={<Mail className="h-4 w-4" />}
            />
            <Input label="Google Authenticator code" inputMode="numeric" maxLength={6} value={forgotCode} onChange={(e) => setForgotCode(e.target.value.replace(/\D/g, "").slice(0, 6))} leftIcon={<ShieldCheck className="h-4 w-4" />} />
            <Input label="New password" type="password" value={forgotNewPassword} onChange={(e) => setForgotNewPassword(e.target.value)} leftIcon={<Lock className="h-4 w-4" />} />
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsForgotModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={forgotLoading}
                disabled={!forgotEmail || !/^\d{6}$/.test(forgotCode) || forgotNewPassword.length < 8}
              >
                Reset Password
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
