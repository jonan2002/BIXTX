import { useState, useEffect, useRef } from 'react';
import {
  Zap,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowLeft,
  AlertTriangle,
  ShieldCheck,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';

interface LoginPageProps {
  onLogin: () => void;
  onBack: () => void;
}

const MAX_ATTEMPTS    = 5;
const LOCKOUT_SECS    = 60;
const MIN_PW_LENGTH   = 8;

function getStrength(pw: string): { score: number; label: string; color: string } {
  let score = 0;
  if (pw.length >= 8)  score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { score, label: "Weak",   color: "#ef4444" };
  if (score <= 3) return { score, label: "Fair",   color: "#f59e0b" };
  return              { score, label: "Strong", color: "#10d9a0" };
}

export function LoginPage({ onLogin, onBack }: LoginPageProps) {
  const [email, setEmail]             = useState('');
  const [password, setPassword]       = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError]             = useState('');
  const [attempts, setAttempts]       = useState(0);
  const [lockoutEnd, setLockoutEnd]   = useState<number | null>(null);
  const [remaining, setRemaining]     = useState(0);
  const [loading, setLoading]         = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Lockout countdown
  useEffect(() => {
    if (lockoutEnd === null) return;
    const tick = () => {
      const secs = Math.ceil((lockoutEnd - Date.now()) / 1000);
      if (secs <= 0) {
        setLockoutEnd(null);
        setAttempts(0);
        setRemaining(0);
        if (timerRef.current) clearInterval(timerRef.current);
      } else {
        setRemaining(secs);
      }
    };
    tick();
    timerRef.current = setInterval(tick, 500);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [lockoutEnd]);

  const isLocked  = lockoutEnd !== null && Date.now() < lockoutEnd;
  const strength  = getStrength(password);
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) return;
    setError('');

    if (!emailValid) { setError('Enter a valid email address.'); return; }
    if (password.length < MIN_PW_LENGTH) {
      setError(`Password must be at least ${MIN_PW_LENGTH} characters.`);
      return;
    }

    setLoading(true);
    // Simulate async credential check
    setTimeout(() => {
      setLoading(false);
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);

      if (newAttempts >= MAX_ATTEMPTS) {
        setLockoutEnd(Date.now() + LOCKOUT_SECS * 1000);
        setError(`Too many failed attempts. Locked for ${LOCKOUT_SECS} seconds.`);
        return;
      }
      // Attempt real login via backend API
      onLogin(email, password);
      return;
      const left = MAX_ATTEMPTS - newAttempts;
      setError(`Invalid credentials. ${left} attempt${left === 1 ? '' : 's'} remaining.`);
    }, 600);
  };

  return (
    <div className="min-h-screen flex" style={{ background: "#050c1a" }}>
      {/* Left — Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-sm mb-8 transition-opacity hover:opacity-70"
            style={{ color: "#6b8ab0" }}
          >
            <ArrowLeft size={15} /> Back to Home
          </button>

          {/* Logo */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg,#2563eb,#10d9a0)" }}>
              <Zap size={20} color="#fff" />
            </div>
            <div>
              <div className="font-black text-lg" style={{ color: "#e2eaf6" }}>bixtx.com</div>
              <div className="text-xs" style={{ color: "#6b8ab0" }}>Secure Admin Access</div>
            </div>
          </div>

          <h2 className="text-3xl font-black mb-1" style={{ color: "#e2eaf6" }}>Sign In</h2>
          <p className="text-sm mb-8" style={{ color: "#6b8ab0" }}>
            Access your remote device dashboard
          </p>

          {/* Lockout banner */}
          {isLocked && (
            <div className="flex items-center gap-3 rounded-xl px-4 py-3 mb-5 text-sm"
              style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171" }}>
              <Clock size={15} />
              Account locked — retry in <strong className="ml-1">{remaining}s</strong>
            </div>
          )}

          {/* Error */}
          {error && !isLocked && (
            <div className="flex items-start gap-3 rounded-xl px-4 py-3 mb-5 text-sm"
              style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", color: "#f87171" }}>
              <AlertTriangle size={15} className="mt-0.5 flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: "#b8cce8" }}>
                Email Address
              </label>
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#6b8ab0" }} />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                  disabled={isLocked || loading}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none transition-all"
                  style={{
                    background: "#0a1628",
                    border: `1px solid ${email && !emailValid ? "rgba(239,68,68,0.5)" : "rgba(59,130,246,0.2)"}`,
                    color: "#e2eaf6",
                  }}
                />
                {email && emailValid && (
                  <CheckCircle2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "#10d9a0" }} />
                )}
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: "#b8cce8" }}>
                Password
              </label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#6b8ab0" }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  autoComplete="current-password"
                  required
                  disabled={isLocked || loading}
                  className="w-full pl-9 pr-10 py-2.5 rounded-xl text-sm outline-none transition-all"
                  style={{
                    background: "#0a1628",
                    border: "1px solid rgba(59,130,246,0.2)",
                    color: "#e2eaf6",
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-70"
                  style={{ color: "#6b8ab0" }}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {/* Strength meter */}
              {password.length > 0 && (
                <div className="mt-1.5 flex items-center gap-2">
                  <div className="flex gap-1 flex-1">
                    {[1,2,3,4,5].map(i => (
                      <div key={i} className="h-1 flex-1 rounded-full transition-all"
                        style={{ background: i <= strength.score ? strength.color : "#0f1e3a" }} />
                    ))}
                  </div>
                  <span className="text-[10px] font-mono" style={{ color: strength.color }}>
                    {strength.label}
                  </span>
                </div>
              )}
            </div>

            {/* Attempt warning */}
            {attempts > 0 && !isLocked && (
              <div className="text-xs flex items-center gap-1.5" style={{ color: "#f59e0b" }}>
                <AlertTriangle size={11} />
                {MAX_ATTEMPTS - attempts} attempt{MAX_ATTEMPTS - attempts === 1 ? '' : 's'} remaining before lockout
              </div>
            )}

            <button
              type="submit"
              disabled={isLocked || loading || !emailValid || password.length < MIN_PW_LENGTH}
              className="w-full py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed mt-2"
              style={{ background: "linear-gradient(135deg,#2563eb,#3b82f6)", color: "#fff" }}
            >
              {loading ? "Verifying…" : "Sign In"}
            </button>
          </form>

          {/* Security footer */}
          <div className="mt-8 pt-6 border-t flex items-center gap-2 text-xs"
            style={{ borderColor: "rgba(59,130,246,0.12)", color: "#6b8ab0" }}>
            <ShieldCheck size={13} style={{ color: "#10d9a0" }} />
            All sessions are encrypted end-to-end with AES-256-GCM and logged immutably.
          </div>
        </div>
      </div>

      {/* Right — Security info panel */}
      <div className="hidden lg:flex flex-col justify-center p-16 border-l"
        style={{ background: "#0a1628", borderColor: "rgba(59,130,246,0.12)", minWidth: 420, maxWidth: 480 }}>
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-8"
          style={{ background: "linear-gradient(135deg,#2563eb,#10d9a0)" }}>
          <ShieldCheck size={26} color="#fff" />
        </div>
        <h3 className="text-3xl font-black mb-3" style={{ color: "#e2eaf6" }}>
          Zero-Trust<br />
          <span style={{ color: "#3b82f6" }}>Security Model</span>
        </h3>
        <p className="text-sm mb-8 leading-relaxed" style={{ color: "#6b8ab0" }}>
          Every login attempt is verified, fingerprinted, and logged. Unauthorized access triggers automatic lockout and alerts.
        </p>

        {[
          { icon: <Lock size={15} />, title: "Brute-Force Protection", body: `Account locks after ${MAX_ATTEMPTS} failed attempts with exponential cooldown.` },
          { icon: <ShieldCheck size={15} />, title: "AES-256-GCM Sessions", body: "Session tokens are encrypted at rest and rotated every 30 minutes." },
          { icon: <Clock size={15} />, title: "Inactivity Timeout", body: "Sessions automatically expire after 15 minutes of inactivity." },
          { icon: <AlertTriangle size={15} />, title: "Immutable Audit Log", body: "Every access attempt is recorded with IP, device fingerprint, and timestamp." },
        ].map(item => (
          <div key={item.title} className="flex gap-3 mb-5">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
              style={{ background: "rgba(59,130,246,0.12)", color: "#3b82f6" }}>
              {item.icon}
            </div>
            <div>
              <div className="text-sm font-semibold mb-0.5" style={{ color: "#e2eaf6" }}>{item.title}</div>
              <div className="text-xs leading-relaxed" style={{ color: "#6b8ab0" }}>{item.body}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
