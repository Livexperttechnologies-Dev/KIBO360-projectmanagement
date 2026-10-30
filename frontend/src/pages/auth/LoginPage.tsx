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
  Code2,
  GitBranch,
  Layers3,
  Sparkles,
} from "lucide-react";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { Card, CardContent } from "../../components/ui/Card";
import { Modal } from "../../components/ui/Modal";
import { useAuth } from "../../contexts/AuthContext";

const developerHeadlines = [
  "Ship with clarity.",
  "Build in sync.",
  "Ship confidently.",
  "Sprint forward.",
];
const developerWaveColors = ["#7e36ff", "#b022ff", "#e02cff", "#902dff"];

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
  const [headlineIndex, setHeadlineIndex] = useState(0);

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
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const headlineTimer = window.setInterval(() => {
      setHeadlineIndex((current) => (current + 1) % developerHeadlines.length);
    }, 3200);
    return () => window.clearInterval(headlineTimer);
  }, []);

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
    <div className="min-h-screen min-h-[100svh] bg-[#F8F6FC] lg:grid lg:grid-cols-[minmax(0,1.12fr)_minmax(420px,0.88fr)] xl:grid-cols-[minmax(0,1.12fr)_minmax(480px,0.88fr)]">
      <style>{`
        @keyframes login-drift { 0%, 100% { transform: translate3d(0, 0, 0); } 50% { transform: translate3d(0, -12px, 0); } }
        @keyframes login-drift-small { 0%, 100% { transform: translate3d(0, 0, 0); } 50% { transform: translate3d(0, 8px, 0); } }
        @keyframes login-flow { from { transform: translateX(-100%); } to { transform: translateX(250%); } }
        @keyframes login-glow { 0%, 100% { opacity: .35; } 50% { opacity: .75; } }
        @keyframes login-rise { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes login-dots-drift { from { background-position: 0 0; } to { background-position: 22px 22px; } }
        @keyframes login-wave-flow { to { stroke-dashoffset: -240; } }
        @keyframes login-wave-breathe { 0%, 100% { transform: translateY(-2px) scaleY(.86); opacity: .5; } 50% { transform: translateY(2px) scaleY(1.12); opacity: .9; } }
        @keyframes login-wave-particle { 0%, 100% { opacity: .18; } 50% { opacity: .95; } }
        @keyframes login-terminal-blink { 0%, 48% { opacity: 1; } 49%, 100% { opacity: 0; } }
        @keyframes login-card-enter { from { opacity: 0; filter: blur(5px); } to { opacity: 1; filter: blur(0); } }
        .login-drift { animation: login-drift 6s ease-in-out infinite, login-card-enter 900ms ease-out both; }
        .login-drift-small { animation: login-drift-small 5s ease-in-out infinite, login-card-enter 900ms ease-out both; }
        .login-flow { animation: login-flow 2.8s ease-in-out infinite; }
        .login-glow { animation: login-glow 4s ease-in-out infinite; }
        .login-rise { animation: login-rise 850ms cubic-bezier(.2,.75,.25,1) both; }
        .login-dots { animation: login-dots-drift 24s linear infinite; }
        .login-wave-flow { animation: login-wave-flow 4.8s linear infinite; }
        .login-wave-strand { transform-box: fill-box; transform-origin: center; animation: login-wave-breathe 4.2s ease-in-out infinite; }
        .login-wave-particle { animation: login-wave-particle 2.4s ease-in-out infinite; }
        .login-terminal-cursor { animation: login-terminal-blink 1s steps(1, end) infinite; }
        .login-feature-card { z-index: 10; }
        @media (min-width: 1024px) and (max-height: 840px) {
          .login-brand-copy { margin-top: clamp(1.5rem, 6vh, 3rem) !important; }
          .login-feature-cards { margin-top: 1rem !important; }
          .login-brand-footer { margin-top: 1rem !important; }
          .login-feature-cards { display: grid !important; grid-template-columns: repeat(2, minmax(0, 1fr)); align-content: center; gap: .75rem; min-height: 0 !important; }
          .login-feature-card { position: relative !important; inset: auto !important; display: block !important; width: auto !important; padding: .75rem !important; }
          .login-feature-card-teams { display: flex !important; }
        }
        @media (min-width: 1024px) and (max-height: 700px) {
          .login-brand-panel { padding-top: 1.25rem !important; padding-bottom: 1.25rem !important; }
          .login-brand-copy { margin-top: 1rem !important; }
          .login-feature-cards { margin-top: .75rem !important; }
        }
        @media (prefers-reduced-motion: reduce) { .login-drift, .login-drift-small, .login-flow, .login-glow, .login-rise, .login-dots, .login-wave-flow, .login-wave-strand, .login-wave-particle, .login-terminal-cursor { animation: none !important; } }
      `}</style>

      {/* Developer-themed animated brand panel */}
      <section className="login-brand-panel relative min-h-[520px] overflow-hidden bg-[#180B28] px-5 py-6 text-white sm:px-8 sm:py-7 lg:min-h-screen lg:px-8 lg:py-8 xl:px-12 xl:py-9">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_14%_18%,rgba(153,24,191,0.48),transparent_34%),radial-gradient(circle_at_82%_78%,rgba(232,23,120,0.2),transparent_38%),linear-gradient(135deg,#35104D_0%,#1B0D2B_52%,#150921_100%)]" />
        <div className="login-dots pointer-events-none absolute inset-0 opacity-[0.24] [background-image:radial-gradient(rgba(211,145,255,0.9)_0.85px,transparent_0.85px)] [background-size:19px_19px]" />
        <div className="pointer-events-none absolute -left-20 top-1/3 h-72 w-72 rounded-full bg-fuchsia-500/20 blur-[100px] login-glow" />
        <div className="pointer-events-none absolute -right-24 bottom-0 h-72 w-72 rounded-full bg-violet-500/20 blur-[100px] login-glow" />

        <div className="relative z-10 flex h-full min-h-[460px] flex-col lg:min-h-[calc(100vh-4.5rem)] lg:min-h-[calc(100svh-4.5rem)]">
          <div className="flex items-center gap-3">
            <img src="/kibo360-logo-white.png" alt="KIBO360 Logo" className="h-12 w-auto object-contain sm:h-14" />
            <span className="h-8 w-px bg-white/20" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/55">Project Hub</span>
          </div>

          <div className="login-brand-copy mt-10 max-w-xl sm:mt-12 lg:mt-[8vh] xl:mt-[10vh] 2xl:mt-[12vh]">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.07] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-violet-100 shadow-lg shadow-black/10 backdrop-blur">
              <span className="rounded-full bg-gradient-to-r from-fuchsia-400 to-amber-300 px-2 py-0.5 text-[9px] text-[#271038]">DEV</span>
              Developer workspace
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.9)]" />
            </div>
            <h1 className="mt-5 text-[clamp(2.25rem,3.5vw,3.25rem)] font-extrabold leading-[1.08] tracking-tight sm:text-[clamp(2.5rem,3.6vw,3.5rem)]">
              <span className="block pb-1"><span className="login-rise inline-block">Build together.</span></span>
              <span className="block pb-1" aria-live="polite"><span key={headlineIndex} className="login-rise inline-block bg-gradient-to-r from-fuchsia-300 via-pink-300 to-amber-200 bg-clip-text text-transparent">{developerHeadlines[headlineIndex]}</span></span>
            </h1>
            <p className="mt-4 max-w-md text-sm leading-6 text-violet-100/70 sm:text-base">
              Projects, tasks, and teams in one secure workspace built for the way your developers work.
            </p>
          </div>

          {/* Floating sprint and deployment cards */}
          <div className="login-feature-cards relative isolate mt-8 min-h-64 flex-1 sm:mt-10 lg:mt-4 xl:mt-6">
            <div className="login-feature-card absolute left-[2%] top-[8%] hidden w-52 rounded-2xl border border-white/15 bg-white/[0.08] p-4 shadow-2xl shadow-black/20 backdrop-blur-md login-drift sm:block">
              <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-[0.16em] text-violet-100/55">
                <span>Current sprint</span><span className="text-emerald-300">● Active</span>
              </div>
              <div className="mt-3 font-mono text-2xl font-bold tracking-wider">SPR-024</div>
              <div className="mt-1 text-[10px] text-violet-100/60">Platform delivery · 8 tasks</div>
              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full w-[68%] rounded-full bg-gradient-to-r from-fuchsia-400 to-amber-300" /></div>
              <div className="mt-2 text-right text-[10px] font-semibold text-violet-100/70">68% complete</div>
            </div>

            <div className="login-feature-card absolute right-[3%] top-[3%] hidden w-52 rounded-2xl border border-white/15 bg-[#251533]/90 p-4 shadow-2xl shadow-black/25 backdrop-blur-md login-drift-small sm:block">
              <div className="flex items-center gap-2 text-xs font-semibold"><GitBranch className="h-4 w-4 text-pink-300" /> Release pipeline</div>
              <div className="mt-4 flex items-center justify-between text-[9px] text-violet-100/65"><span>Build</span><span>Test</span><span>Deploy</span></div>
              <div className="relative mt-2 h-1 overflow-hidden rounded-full bg-white/10"><div className="login-flow absolute h-full w-1/3 rounded-full bg-gradient-to-r from-transparent via-fuchsia-300 to-transparent" /></div>
              <div className="mt-3 flex items-center gap-1.5 text-[10px] text-emerald-300"><span className="h-1.5 w-1.5 rounded-full bg-emerald-300" /> All systems operational</div>
            </div>

            <div className="login-feature-card login-feature-card-recent absolute bottom-[8%] left-[15%] hidden w-64 rounded-2xl border border-white/15 bg-[#251533]/90 p-4 shadow-2xl shadow-black/25 backdrop-blur-md login-drift-small sm:block">
              <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-[0.15em] text-violet-100/50"><span>Recently updated</span><span>2m ago</span></div>
              <div className="mt-3 flex items-start gap-3">
                <div className="rounded-xl bg-fuchsia-400/15 p-2 text-fuchsia-200"><Code2 className="h-4 w-4" /></div>
                <div><div className="text-xs font-semibold text-white">API authentication</div><div className="mt-1 font-mono text-[10px] text-violet-100/70"><span className="text-fuchsia-300">$</span> feature/auth-refresh<span className="login-terminal-cursor ml-0.5 text-fuchsia-200">▋</span></div></div>
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-[10px] text-emerald-300"><span className="text-xs">✓</span> Changes saved successfully</div>
            </div>

            <div className="login-feature-card login-feature-card-teams absolute bottom-[16%] right-[5%] hidden items-center gap-3 rounded-2xl border border-white/15 bg-white/[0.08] px-4 py-3 shadow-2xl shadow-black/20 backdrop-blur-md login-drift sm:flex">
              <div className="rounded-xl bg-gradient-to-br from-violet-400/25 to-pink-400/20 p-2.5 text-pink-200"><Layers3 className="h-5 w-5" /></div>
              <div><div className="text-lg font-extrabold">4 teams</div><div className="text-[10px] text-violet-100/60">Working in sync</div></div>
              <Sparkles className="ml-2 h-4 w-4 text-amber-200" />
            </div>

            <svg className="pointer-events-none absolute inset-x-0 bottom-[1%] z-0 block h-28 w-full overflow-visible opacity-100" viewBox="0 0 1000 125" preserveAspectRatio="none" aria-hidden="true">
              <defs>
                <linearGradient id="login-wave-gradient" x1="0" x2="1">
                  <stop offset="0%" stopColor="#5100c9" stopOpacity=".1" />
                  <stop offset="28%" stopColor="#a000ff" stopOpacity=".9" />
                  <stop offset="58%" stopColor="#ed28ff" stopOpacity=".95" />
                  <stop offset="100%" stopColor="#7e28ff" stopOpacity=".3" />
                </linearGradient>
                <radialGradient id="login-wave-haze">
                  <stop offset="0%" stopColor="#b500ff" stopOpacity=".38" />
                  <stop offset="100%" stopColor="#7200ff" stopOpacity="0" />
                </radialGradient>
                <filter id="login-wave-glow" x="-30%" y="-100%" width="160%" height="300%">
                  <feGaussianBlur stdDeviation="7" result="blur" />
                  <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>
              <ellipse cx="500" cy="56" rx="560" ry="36" fill="url(#login-wave-haze)" filter="url(#login-wave-glow)" />
              {Array.from({ length: 20 }, (_, index) => {
                const baseline = 38 + index * 2.2;
                const amplitude = 7 + (index % 5) * 2;
                const frequency = 0.014 + (index % 4) * 0.0018;
                const phase = index * 0.43;
                const points = Array.from({ length: 61 }, (_, pointIndex) => {
                  const x = -80 + pointIndex * 20;
                  const y = baseline + Math.sin(x * frequency + phase) * amplitude + Math.sin(x * frequency * 2.15 + phase * 0.7) * amplitude * 0.3;
                  return `${x},${y.toFixed(1)}`;
                }).join(" ");
                return <polyline key={`strand-${index}`} className="login-wave-strand" style={{ animationDelay: `${index * 0.1}s` }} points={points} fill="none" stroke={developerWaveColors[index % developerWaveColors.length]} strokeOpacity={index % 4 === 0 ? ".72" : ".46"} strokeWidth={index % 5 === 0 ? "1.2" : ".82"} />;
              })}
              {Array.from({ length: 72 }, (_, index) => {
                const x = -12 + index * 14.5;
                const center = 60 + Math.sin(x * 0.014) * 10;
                const bend = 12 + (index % 5) * 3;
                const path = `M${x - bend} ${center - 25} C${x + bend} ${center - 12} ${x - bend} ${center + 12} ${x + bend} ${center + 25}`;
                return <path key={`mesh-${index}`} d={path} fill="none" stroke={developerWaveColors[index % developerWaveColors.length]} strokeOpacity=".34" strokeWidth=".75" />;
              })}
              {Array.from({ length: 3 }, (_, index) => {
                const baseline = 52 + index * 3;
                const points = Array.from({ length: 61 }, (_, pointIndex) => {
                  const x = -80 + pointIndex * 20;
                  const y = baseline + Math.sin(x * 0.018 + index * 1.15) * (12 + index * 3) + Math.sin(x * 0.041 + index) * 5;
                  return `${x},${y.toFixed(1)}`;
                }).join(" ");
                return <polyline key={`glow-${index}`} points={points} fill="none" stroke="url(#login-wave-gradient)" strokeOpacity=".75" strokeWidth={index === 1 ? "2.3" : "1.2"} filter={index === 1 ? "url(#login-wave-glow)" : undefined} className="login-wave-strand" style={{ animationDelay: `${index * 0.35}s` }} />;
              })}
              <polyline pathLength="1000" points={Array.from({ length: 61 }, (_, pointIndex) => {
                const x = -80 + pointIndex * 20;
                const y = 53 + Math.sin(x * 0.018 + 2.4) * 18 + Math.sin(x * 0.048) * 7;
                return `${x},${y.toFixed(1)}`;
              }).join(" ")} fill="none" stroke="#c324ff" strokeOpacity=".7" strokeWidth="1.2" strokeDasharray="2 7" strokeLinecap="round" className="login-wave-flow" style={{ animationDelay: "-2.2s" }} />
              <g fill="#df9aff">
                {Array.from({ length: 144 }, (_, index) => {
                  const x = (index * 163 + 37) % 1000;
                  const y = 5 + ((index * 47 + Math.floor(index / 4) * 19) % 100);
                  const radius = index % 11 === 0 ? 1.7 : index % 3 === 0 ? 1 : 0.55;
                  return <circle key={index} className="login-wave-particle" style={{ animationDelay: `${(index % 24) * 0.11}s` }} cx={x} cy={y} r={radius} />;
                })}
              </g>
            </svg>

          </div>

          <div className="login-brand-footer relative z-10 mt-8 flex flex-wrap gap-x-6 gap-y-2 pt-4 text-[10px] font-medium text-violet-100/50">
            <span>⌘ Secure access</span><span>◈ Team visibility</span><span>⌁ Delivery tracking</span>
          </div>
        </div>
      </section>

      {/* Existing sign-in form and authentication flow */}
      <section className="relative flex items-center justify-center px-5 py-8 sm:px-8 sm:py-10 lg:px-6 xl:px-10">
        <div className="pointer-events-none absolute right-0 top-0 h-80 w-80 rounded-full bg-fuchsia-100/60 blur-3xl" />
        <div className="relative w-full max-w-md">
          <div className="mb-7 text-center">
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">Sign in to KIBO360</h2>
            <p className="mt-1 text-sm text-slate-500">Use your company account to continue to Project Hub.</p>
          </div>
        {/* Login Card */}
        <Card className="border-violet-100 shadow-elevated">
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
      </section>

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
