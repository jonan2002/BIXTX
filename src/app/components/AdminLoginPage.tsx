import { useState, useEffect, useRef } from 'react';
import {
  Shield,
  Mail,
  Lock,
  Key,
  Eye,
  EyeOff,
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Fingerprint,
  ShieldAlert,
  Activity,
} from 'lucide-react';

interface AdminLoginPageProps {
  onLogin: () => void;
  onBack: () => void;
}

const MAX_CRED_ATTEMPTS = 3;
const MAX_TOTP_ATTEMPTS = 3;
const LOCKOUT_SECS      = 120;

// Simulated session context (in real app comes from server)
const SESSION_ID  = crypto.randomUUID().slice(0, 16).toUpperCase();
const DEVICE_FP   = crypto.randomUUID().slice(0, 12).toUpperCase();
const DEMO_TOTP   = "123456"; // demo TOTP — shown in hint

function useCountdown(lockoutEnd: number | null) {
  const [secs, setSecs] = useState(0);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (!lockoutEnd) { setSecs(0); return; }
    const tick = () => {
      const s = Math.ceil((lockoutEnd - Date.now()) / 1000);
      setSecs(s > 0 ? s : 0);
    };
    tick();
    ref.current = setInterval(tick, 500);
    return () => { if (ref.current) clearInterval(ref.current); };
  }, [lockoutEnd]);
  return secs;
}

export function AdminLoginPage({ onLogin, onBack }: AdminLoginPageProps) {
  const [step, setStep]             = useState<'credentials' | '2fa'>('credentials');
  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [totp, setTotp]             = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError]           = useState('');
  const [loading, setLoading]       = useState(false);

  const [credAttempts, setCredAttempts] = useState(0);
  const [totpAttempts, setTotpAttempts] = useState(0);
  const [lockoutEnd, setLockoutEnd]     = useState<number | null>(null);

  const remaining  = useCountdown(lockoutEnd);
  const isLocked   = lockoutEnd !== null && Date.now() < lockoutEnd;
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  // Auto-clear lockout
  useEffect(() => {
    if (lockoutEnd && remaining === 0) {
      setLockoutEnd(null);
      setCredAttempts(0);
      setTotpAttempts(0);
    }
  }, [remaining, lockoutEnd]);

  const handleCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) return;
    setError('');
    if (!emailValid) { setError('Enter a valid email address.'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      const newAttempts = credAttempts + 1;
      setCredAttempts(newAttempts);

      // Demo: accept system.manager@bixtx.com — in production validate server-side
      const credOk = email.toLowerCase() === 'system.manager@bixtx.com';
      if (credOk) {
        setStep('2fa');
        return;
      }
      if (newAttempts >= MAX_CRED_ATTEMPTS) {
        setLockoutEnd(Date.now() + LOCKOUT_SECS * 1000);
        setError(`Account locked for ${LOCKOUT_SECS} seconds after ${MAX_CRED_ATTEMPTS} failed attempts.`);
        return;
      }
      const left = MAX_CRED_ATTEMPTS - newAttempts;
      setError(`Invalid credentials. ${left} attempt${left === 1 ? '' : 's'} remaining.`);
    }, 700);
  };

  const handleTOTP = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) return;
    if (totp.length !== 6) { setError('Enter the 6-digit code.'); return; }
    setError('');
    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      const newAttempts = totpAttempts + 1;
      setTotpAttempts(newAttempts);

      if (totp === DEMO_TOTP) {
        onLogin();
        return;
      }
      if (newAttempts >= MAX_TOTP_ATTEMPTS) {
        setLockoutEnd(Date.now() + LOCKOUT_SECS * 1000);
        setTotp('');
        setError(`Too many invalid codes. Account locked for ${LOCKOUT_SECS} seconds.`);
        return;
      }
      const left = MAX_TOTP_ATTEMPTS - newAttempts;
      setTotp('');
      setError(`Invalid code. ${left} attempt${left === 1 ? '' : 's'} remaining.`);
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
            <ArrowLeft size={15} /> Back
          </button>

          {/* Header */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg,#2563eb,#3b82f6)" }}>
              <Shield size={20} color="#fff" />
            </div>
            <div>
              <div className="font-black text-lg" style={{ color: "#e2eaf6" }}>Admin Console</div>
              <div className="text-xs font-mono" style={{ color: "#3b82f6" }}>
                SESSION:{SESSION_ID}
              </div>
            </div>
          </div>

          {/* Step progress */}
          <div className="flex items-center gap-2 mb-6">
            {['credentials', '2fa'].map((s, i) => (
              <div key={s} className="flex items-center gap-2 flex-1">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                  style={{
                    background: step === s ? "#3b82f6" : (i === 0 && step === '2fa') ? "#10d9a0" : "#0f1e3a",
                    color: step === s || (i === 0 && step === '2fa') ? "#fff" : "#6b8ab0",
                  }}>
                  {i === 0 && step === '2fa' ? <CheckCircle2 size={12} /> : i + 1}
                </div>
                <div className="text-xs" style={{ color: step === s ? "#e2eaf6" : "#6b8ab0" }}>
                  {s === 'credentials' ? 'Credentials' : 'Authenticator'}
                </div>
                {i < 1 && <div className="flex-1 h-px mx-1" style={{ background: step === '2fa' ? "#3b82f6" : "#0f1e3a" }} />}
              </div>
            ))}
          </div>

          {/* Lockout banner */}
          {isLocked && (
            <div className="flex items-center gap-3 rounded-xl px-4 py-3 mb-5 text-sm"
              style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171" }}>
              <ShieldAlert size={15} />
              Admin access suspended — retry in <strong className="ml-1">{remaining}s</strong>
            </div>
          )}

          {/* Error */}
          {error && !isLocked && (
            <div className="flex items-start gap-3 rounded-xl px-4 py-3 mb-5 text-sm"
              style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", color: "#f87171" }}>
              <AlertTriangle size={15} className="flex-shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          {/* Credentials step */}
          {step === 'credentials' && (
            <form onSubmit={handleCredentials} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "#b8cce8" }}>
                  Admin Email
                </label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#6b8ab0" }} />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="system.manager@bixtx.com"
                    autoComplete="username"
                    required
                    disabled={isLocked || loading}
                    className="w-full pl-9 pr-9 py-2.5 rounded-xl text-sm outline-none"
                    style={{
                      background: "#0a1628",
                      border: `1px solid ${email && !emailValid ? "rgba(239,68,68,0.4)" : "rgba(59,130,246,0.2)"}`,
                      color: "#e2eaf6",
                    }}
                  />
                  {email && emailValid && (
                    <CheckCircle2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "#10d9a0" }} />
                  )}
                </div>
              </div>

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
                    placeholder="Admin password"
                    autoComplete="current-password"
                    required
                    disabled={isLocked || loading}
                    className="w-full pl-9 pr-10 py-2.5 rounded-xl text-sm outline-none"
                    style={{
                      background: "#0a1628",
                      border: "1px solid rgba(59,130,246,0.2)",
                      color: "#e2eaf6",
                    }}
                  />
                  <button type="button" onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-70"
                    style={{ color: "#6b8ab0" }}>
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Attempt warning */}
              {credAttempts > 0 && !isLocked && (
                <div className="flex items-center gap-1.5 text-xs" style={{ color: "#f59e0b" }}>
                  <AlertTriangle size={11} />
                  {MAX_CRED_ATTEMPTS - credAttempts} attempt{MAX_CRED_ATTEMPTS - credAttempts === 1 ? '' : 's'} before {LOCKOUT_SECS}s lockout
                </div>
              )}

              {/* Security notice */}
              <div className="flex items-start gap-3 rounded-xl px-4 py-3 text-xs"
                style={{ background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.18)", color: "#6b8ab0" }}>
                <Activity size={13} className="flex-shrink-0 mt-0.5" style={{ color: "#3b82f6" }} />
                All access attempts are logged with device fingerprint and timestamp.
              </div>

              <button
                type="submit"
                disabled={isLocked || loading || !emailValid || password.length < 8}
                className="w-full py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: "linear-gradient(135deg,#2563eb,#3b82f6)", color: "#fff" }}
              >
                {loading ? "Verifying…" : "Continue to Authenticator"}
              </button>
            </form>
          )}

          {/* 2FA step */}
          {step === '2fa' && (
            <form onSubmit={handleTOTP} className="space-y-5">
              <div className="rounded-xl p-5 text-center"
                style={{ background: "#0a1628", border: "1px solid rgba(59,130,246,0.2)" }}>
                <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3"
                  style={{ background: "rgba(59,130,246,0.12)" }}>
                  <Key size={24} style={{ color: "#3b82f6" }} />
                </div>
                <div className="font-semibold mb-1" style={{ color: "#e2eaf6" }}>
                  Two-Factor Authentication
                </div>
                <div className="text-xs" style={{ color: "#6b8ab0" }}>
                  Enter the 6-digit code from your authenticator app
                </div>
                <div className="mt-2 text-xs font-mono px-2 py-1 rounded inline-block"
                  style={{ background: "#0f1e3a", color: "#3b82f6" }}>
                  Demo code: {DEMO_TOTP}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "#b8cce8" }}>
                  6-Digit Code
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={totp}
                  onChange={e => setTotp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                  required
                  disabled={isLocked || loading}
                  className="w-full py-3 rounded-xl text-xl font-mono text-center tracking-widest outline-none"
                  style={{
                    background: "#0a1628",
                    border: `1px solid ${totp.length === 6 ? "rgba(59,130,246,0.5)" : "rgba(59,130,246,0.2)"}`,
                    color: "#e2eaf6",
                  }}
                />
              </div>

              {/* TOTP attempt warning */}
              {totpAttempts > 0 && !isLocked && (
                <div className="flex items-center gap-1.5 text-xs" style={{ color: "#f59e0b" }}>
                  <AlertTriangle size={11} />
                  {MAX_TOTP_ATTEMPTS - totpAttempts} code attempt{MAX_TOTP_ATTEMPTS - totpAttempts === 1 ? '' : 's'} remaining
                </div>
              )}

              <div className="flex gap-3">
                <button type="button" onClick={() => { setStep('credentials'); setError(''); setTotp(''); }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                  style={{ background: "#0f1e3a", color: "#b8cce8", border: "1px solid rgba(59,130,246,0.2)" }}>
                  Back
                </button>
                <button
                  type="submit"
                  disabled={totp.length !== 6 || isLocked || loading}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ background: "linear-gradient(135deg,#2563eb,#3b82f6)", color: "#fff" }}
                >
                  {loading ? "Verifying…" : "Verify & Access"}
                </button>
              </div>
            </form>
          )}

          {/* Device info footer */}
          <div className="mt-8 pt-5 border-t" style={{ borderColor: "rgba(59,130,246,0.1)" }}>
            <div className="flex items-center justify-between text-[10px] font-mono" style={{ color: "#6b8ab0" }}>
              <span className="flex items-center gap-1">
                <Fingerprint size={11} style={{ color: "#3b82f6" }} /> FP:{DEVICE_FP}
              </span>
              <span className="flex items-center gap-1">
                <Clock size={11} /> {new Date().toISOString().slice(0, 19)}Z
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Right — Security panel */}
      <div className="hidden lg:flex flex-col justify-center p-16 border-l"
        style={{ background: "#0a1628", borderColor: "rgba(59,130,246,0.12)", minWidth: 420, maxWidth: 480 }}>
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-8"
          style={{ background: "linear-gradient(135deg,#2563eb,#3b82f6)" }}>
          <Shield size={26} color="#fff" />
        </div>
        <h3 className="text-3xl font-black mb-3" style={{ color: "#e2eaf6" }}>
          Admin-Level<br />
          <span style={{ color: "#3b82f6" }}>Zero-Trust Auth</span>
        </h3>
        <p className="text-sm mb-8 leading-relaxed" style={{ color: "#6b8ab0" }}>
          Admin access requires two independent factors. Every step is fingerprinted, timestamped, and written to an immutable audit log.
        </p>

        {[
          { icon: <Lock size={14} />, color: "#3b82f6", title: "Credential Lockout", body: `${MAX_CRED_ATTEMPTS} failed attempts triggers a ${LOCKOUT_SECS}s IP-level suspension.` },
          { icon: <Key size={14} />, color: "#10d9a0", title: "TOTP Enforcement", body: "Time-based one-time passwords expire in 30 seconds. Replay attacks are blocked." },
          { icon: <Fingerprint size={14} />, color: "#f59e0b", title: "Device Fingerprinting", body: "Every session is bound to a device fingerprint. Unknown devices trigger alerts." },
          { icon: <ShieldAlert size={14} />, color: "#ef4444", title: "Anomaly Detection", body: "Geo-velocity checks and off-hours access patterns automatically escalate alerts." },
        ].map(item => (
          <div key={item.title} className="flex gap-3 mb-5">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
              style={{ background: `${item.color}1a`, color: item.color }}>
              {item.icon}
            </div>
            <div>
              <div className="text-sm font-semibold mb-0.5" style={{ color: "#e2eaf6" }}>{item.title}</div>
              <div className="text-xs leading-relaxed" style={{ color: "#6b8ab0" }}>{item.body}</div>
            </div>
          </div>
        ))}

        <div className="rounded-xl p-4 mt-2"
          style={{ background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.18)" }}>
          <div className="text-xs font-semibold mb-2" style={{ color: "#e2eaf6" }}>Session Controls</div>
          <ul className="space-y-1.5 text-xs" style={{ color: "#6b8ab0" }}>
            {["Auto-timeout after 15 min inactivity", "IP-based access restrictions enforced", "Encrypted audit trails (AES-256-GCM)", "Role-based permission control", "Concurrent session limit: 1 per admin"].map(f => (
              <li key={f} className="flex items-center gap-1.5">
                <CheckCircle2 size={11} style={{ color: "#10d9a0", flexShrink: 0 }} /> {f}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
