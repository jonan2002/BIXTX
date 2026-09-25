import { useState } from "react";
import { Settings, Key, Check, AlertTriangle } from "lucide-react";

const API_BASE = window.location.hostname === "localhost"
  ? "http://localhost:3000/v1"
  : "https://bixtx.onrender.com/v1";

function PasswordSection({ show }: { show: (msg: string, kind?: "success"|"error"|"info") => void }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [fieldErr, setFieldErr] = useState("");

  const handleSubmit = async () => {
    setFieldErr("");
    if (!current) { setFieldErr("Current password is required."); return; }
    if (next.length < 8) { setFieldErr("New password must be at least 8 characters."); return; }
    if (next !== confirm) { setFieldErr("Passwords do not match."); return; }

    const tok = sessionStorage.getItem("token") || "";
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${tok}` },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Server error");
      show("Password changed successfully", "success");
      setCurrent(""); setNext(""); setConfirm("");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to change password";
      show(msg, "error");
      setFieldErr(msg);
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full px-4 py-2.5 rounded-xl text-sm font-mono outline-none transition-all focus:ring-2";
  const inputStyle = {
    background: "#050c1a",
    border: "1px solid rgba(59,130,246,0.25)",
    color: "#e2eaf6",
  };

  return (
    <div className="rounded-2xl p-6 space-y-4"
      style={{ background: "#0a1628", border: "1px solid rgba(59,130,246,0.22)" }}>
      <div className="flex items-center gap-3 mb-2">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: "rgba(59,130,246,0.15)" }}>
          <Key size={16} color="#3b82f6" />
        </div>
        <div>
          <div className="font-bold text-sm" style={{ color: "#e2eaf6" }}>Change Password</div>
          <div className="text-[10px]" style={{ color: "#6b8ab0" }}>Applies immediately across all sessions</div>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-[10px] font-mono uppercase tracking-widest mb-1 block" style={{ color: "#6b8ab0" }}>
            Current Password
          </label>
          <input type="password" value={current} onChange={e => setCurrent(e.target.value)}
            className={inputClass} style={inputStyle} placeholder="••••••••" />
        </div>
        <div>
          <label className="text-[10px] font-mono uppercase tracking-widest mb-1 block" style={{ color: "#6b8ab0" }}>
            New Password
          </label>
          <input type="password" value={next} onChange={e => setNext(e.target.value)}
            className={inputClass} style={inputStyle} placeholder="Min. 8 characters" />
        </div>
        <div>
          <label className="text-[10px] font-mono uppercase tracking-widest mb-1 block" style={{ color: "#6b8ab0" }}>
            Confirm New Password
          </label>
          <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
            className={inputClass} style={inputStyle} placeholder="••••••••"
            onKeyDown={e => e.key === "Enter" && handleSubmit()} />
        </div>
      </div>

      {fieldErr && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold"
          style={{ background: "#ef444415", border: "1px solid #ef444435", color: "#ef4444" }}>
          <AlertTriangle size={12} />
          {fieldErr}
        </div>
      )}

      <button onClick={handleSubmit} disabled={loading}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-90 disabled:opacity-50"
        style={{ background: "linear-gradient(135deg,#2563eb,#3b82f6)", color: "#fff" }}>
        {loading ? (
          <span className="inline-block w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
        ) : (
          <Check size={14} />
        )}
        {loading ? "Saving…" : "Update Password"}
      </button>
    </div>
  );
}

export function SettingsPage({ show }: { show: (msg: string, kind?: "success"|"error"|"info") => void }) {
  return (
    <div className="max-w-2xl mx-auto px-6 py-8 space-y-8">
      <div className="flex items-center gap-3">
        <Settings size={22} color="#3b82f6" />
        <div>
          <h1 className="text-2xl font-black" style={{ color: "#e2eaf6" }}>Settings</h1>
          <p className="text-xs mt-0.5" style={{ color: "#6b8ab0" }}>Account & system configuration</p>
        </div>
      </div>

      {/* Account section */}
      <div className="space-y-4">
        <div className="text-xs font-mono uppercase tracking-widest" style={{ color: "#6b8ab0" }}>
          Account
        </div>
        <div className="rounded-2xl p-5"
          style={{ background: "#0a1628", border: "1px solid rgba(59,130,246,0.22)" }}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-black"
              style={{ background: "linear-gradient(135deg,#2563eb,#3b82f6)", color: "#fff" }}>
              S
            </div>
            <div>
              <div className="font-bold text-sm" style={{ color: "#e2eaf6" }}>systems.manager@bixtx.com</div>
              <div className="text-xs mt-0.5" style={{ color: "#6b8ab0" }}>Administrator · bixtx v4.7.2</div>
            </div>
          </div>
        </div>
      </div>

      {/* Password section */}
      <div className="space-y-4">
        <div className="text-xs font-mono uppercase tracking-widest" style={{ color: "#6b8ab0" }}>
          Security
        </div>
        <PasswordSection show={show} />
      </div>
    </div>
  );
}
