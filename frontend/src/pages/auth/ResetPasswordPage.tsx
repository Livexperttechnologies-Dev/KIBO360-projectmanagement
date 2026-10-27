import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Lock, Eye, EyeOff, CheckCircle, ArrowRight, Info, ShieldCheck } from "lucide-react";
import { Card, CardContent } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { useAuth } from "../../contexts/AuthContext";

export const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const { resetPassword } = useAuth();

  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [authenticatorCode, setAuthenticatorCode] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !/^\d{6}$/.test(authenticatorCode)) {
      setError("Enter your account email and 6-digit Google Authenticator code.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      await resetPassword(email, authenticatorCode, password);
      setIsSuccess(true);
    } catch (err: any) {
      setError(err.message || "Failed to reset the password. Check the authenticator code and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col justify-center bg-[#F8F9FC] px-4 py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-white shadow-card border border-slate-100">
            <img src="/kibo360-logo.png" alt="KIBO360 Logo" className="h-12 w-auto object-contain" />
          </div>
          <h2 className="mt-4 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
            Set New Password
          </h2>
          <p className="mt-1 text-xs text-slate-500 font-medium">
            Livexpert Technologies Enterprise Security
          </p>
        </div>

        <Card className="mt-8 border-slate-200/80 shadow-elevated">
          <CardContent className="p-7 sm:p-9">
            {isSuccess ? (
              <div className="text-center space-y-4 py-4">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                  <CheckCircle className="h-8 w-8" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">
                  Password Updated Successfully!
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
                  Your password has been updated. Sign in with your new password and Google Authenticator code.
                </p>
                <div className="pt-2">
                  <Button
                    variant="gradient"
                    size="md"
                    className="w-full"
                    onClick={() => navigate("/login")}
                    rightIcon={<ArrowRight className="h-4 w-4" />}
                  >
                    Proceed to Sign In
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800 flex items-start gap-2">
                    <Info className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <Input label="Account email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                <Input label="Super admin Google Authenticator code" inputMode="numeric" maxLength={6} value={authenticatorCode} onChange={(e) => setAuthenticatorCode(e.target.value.replace(/\D/g, "").slice(0, 6))} leftIcon={<ShieldCheck className="h-4 w-4" />} />
                <Input
                  label="New Password"
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  leftIcon={<Lock className="h-4 w-4" />}
                  rightIcon={
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  }
                />

                <Input
                  label="Confirm New Password"
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  leftIcon={<Lock className="h-4 w-4" />}
                />

                <Button
                  type="submit"
                  variant="gradient"
                  size="lg"
                  className="w-full mt-2"
                  isLoading={isSubmitting}
                  rightIcon={<ArrowRight className="h-4 w-4" />}
                >
                  Reset Password
                </Button>

                <div className="text-center pt-2">
                  <Link to="/login" className="text-xs font-semibold text-[#690BA8] hover:underline">
                    Back to Sign In
                  </Link>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
