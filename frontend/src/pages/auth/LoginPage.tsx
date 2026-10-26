import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  ArrowRight,
  Info,
  CheckCircle,
  KeyRound,
  ExternalLink,
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
  const [forgotSubmitted, setForgotSubmitted] = useState<boolean>(false);
  const [forgotMessage, setForgotMessage] = useState<string>("");
  const [forgotDebugToken, setForgotDebugToken] = useState<string | undefined>();
  const [forgotLoading, setForgotLoading] = useState<boolean>(false);

  const { requestPasswordReset } = useAuth();

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
      });

      if (!result.success) {
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
    if (!forgotEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(forgotEmail)) {
      return;
    }

    setForgotLoading(true);
    try {
      const res = await requestPasswordReset(forgotEmail.trim());
      setForgotMessage(res.message);
      setForgotDebugToken(res.debugToken);
      setForgotSubmitted(true);
    } catch (err: any) {
      setForgotMessage(err.message || "Failed to process reset request");
      setForgotSubmitted(true);
    } finally {
      setForgotLoading(false);
    }
  };

  const quickFill = (userEmail: string) => {
    setEmail(userEmail);
    setPassword("Livexpert@2026");
    setEmailError("");
    setPasswordError("");
    setGeneralError("");
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
                    setForgotDebugToken(undefined);
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

            {/* Quick-Fill Testing Accounts */}
            <div className="mt-6 pt-5 border-t border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  <KeyRound className="h-3 w-3 text-[#690BA8]" />
                  <span>Phase 2 Demo Credentials</span>
                </span>
                <span className="text-[10px] text-slate-400 font-mono">Livexpert@2026</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => quickFill("admin@livexpert.in")}
                  className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-[#F5EFFB] hover:text-[#690BA8] text-left transition-colors font-medium truncate"
                >
                  Admin (Software/IT)
                </button>
                <button
                  type="button"
                  onClick={() => quickFill("pm@livexpert.in")}
                  className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-[#F5EFFB] hover:text-[#690BA8] text-left transition-colors font-medium truncate"
                >
                  PM (Product/Design)
                </button>
                <button
                  type="button"
                  onClick={() => quickFill("lead@livexpert.in")}
                  className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-[#F5EFFB] hover:text-[#690BA8] text-left transition-colors font-medium truncate"
                >
                  Lead (Software/IT)
                </button>
                <button
                  type="button"
                  onClick={() => quickFill("dev@livexpert.in")}
                  className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-[#F5EFFB] hover:text-[#690BA8] text-left transition-colors font-medium truncate"
                >
                  Dev (Software/IT)
                </button>
              </div>
              <div className="mt-1.5 text-center">
                <button
                  type="button"
                  onClick={() => quickFill("inactive@livexpert.in")}
                  className="text-[10px] text-rose-500 hover:underline"
                >
                  Test Deactivated Account: inactive@livexpert.in
                </button>
              </div>
            </div>
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
            {forgotDebugToken && (
              <div className="p-3 rounded-xl bg-purple-50 border border-purple-200 text-left space-y-2 mt-3">
                <span className="text-[11px] font-bold text-[#690BA8] uppercase">
                  Development Reset Link:
                </span>
                <Link
                  to={`/reset-password?token=${forgotDebugToken}&email=${encodeURIComponent(forgotEmail)}`}
                  className="text-xs font-semibold text-[#690BA8] hover:underline flex items-center gap-1 break-all"
                  onClick={() => setIsForgotModalOpen(false)}
                >
                  <span>Click here to set new password</span>
                  <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                </Link>
              </div>
            )}
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
              Enter your registered Livexpert email address. A time-limited password reset link will be dispatched through your organization email provider.
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
                disabled={!forgotEmail}
              >
                Send Reset Link
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};