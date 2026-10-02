import { useState, useEffect, useCallback } from "react";
import { Download, Check, Loader2, AlertCircle, Clock } from "lucide-react";

type Platform = "linux" | "macos" | "windows" | "android" | "ios" | "harmony";
type Phase = "idle" | "checking" | "downloading" | "building" | "done" | "ci-error";

const BACKEND =
  window.location.hostname === "localhost"
    ? "http://localhost:3000/v1"
    : "https://bixtx.onrender.com/v1";

const DL_BASE = `${BACKEND}/agent/download`;
const C2 = "wss://bixtx.onrender.com/agent";

const META: Record<Platform, { color: string; label: string; dlFile: string; isScript: boolean }> = {
  linux:   { color: "#f97316", label: "Download linux.sh",          dlFile: "linux.sh",        isScript: true  },
  macos:   { color: "#94a3b8", label: "Download macos.sh",          dlFile: "macos.sh",        isScript: true  },
  windows: { color: "#3b82f6", label: "Download windows.ps1",       dlFile: "windows.ps1",     isScript: true  },
  android: { color: "#10b981", label: "Download bixtx-agent.apk",   dlFile: "bixtx-agent.apk", isScript: false },
  ios:     { color: "#6366f1", label: "Install via Enterprise OTA",  dlFile: "bixtx-agent.ipa", isScript: false },
  harmony: { color: "#a855f7", label: "Download bixtx-agent.hap",   dlFile: "bixtx-agent.hap", isScript: false },
};

function parsePlatformFromURL(): Platform {
  const parts = window.location.pathname.split("/").filter(Boolean);
  const seg = parts[1];
  if (seg && seg in META) return seg as Platform;
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return "ios";
  if (/android/.test(ua)) return "android";
  if (/huawei|harmony/.test(ua)) return "harmony";
  if (/mac os/.test(ua)) return "macos";
  if (/win/.test(ua)) return "windows";
  return "linux";
}

function parseKeyFromURL(): string {
  return new URLSearchParams(window.location.search).get("key") ?? "";
}

function triggerDownload(file: string) {
  const a = document.createElement("a");
  a.href = `${DL_BASE}/${file}`;
  a.download = file;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function makeInstallCmd(platform: Platform, key: string): string {
  const k = key || "BTX-2026-ALPHA";
  if (platform === "linux")
    return `curl -sSL '${DL_BASE}/linux.sh' | sudo bash -s -- --key ${k} --c2 ${C2}`;
  if (platform === "macos")
    return `curl -sSL '${DL_BASE}/macos.sh' | sudo bash -s -- --key ${k} --c2 ${C2}`;
  if (platform === "windows")
    return `powershell -ExecutionPolicy Bypass -c "& { $s=iwr '${DL_BASE}/windows.ps1' -UseBasicParsing; iex $s.Content }" -EnrollKey ${k}`;
  return "";
}

function hexToRgb(hex: string): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `${r},${g},${b}`;
}

export function EnrollPage() {
  const platform  = parsePlatformFromURL();
  const enrollKey = parseKeyFromURL();
  const meta      = META[platform];

  const [phase,     setPhase]     = useState<Phase>("idle");
  const [countdown, setCountdown] = useState(0);
  const [retryTick, setRetryTick] = useState(0);

  // Countdown timer while building
  useEffect(() => {
    if (phase !== "building" || countdown <= 0) return;
    const t = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          clearInterval(t);
          setRetryTick(n => n + 1);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [phase, countdown]);

  // Re-probe when countdown hits zero
  useEffect(() => {
    if (retryTick === 0) return;
    probeAndDownload();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retryTick]);

  const probeAndDownload = useCallback(async () => {
    setPhase("checking");
    try {
      const res  = await fetch(`${BACKEND}/agent/status/${platform}`);
      const data = await res.json() as {
        available: boolean;
        downloadUrl: string | null;
        building: boolean;
        retryAfter: number | null;
        message?: string;
      };

      if (data.available && data.downloadUrl) {
        setPhase("downloading");
        if (platform === "ios") {
          const manifest = encodeURIComponent(`${DL_BASE}/ios-manifest.plist`);
          window.location.href = `itms-services://?action=download-manifest&url=${manifest}`;
        } else {
          triggerDownload(meta.dlFile);
        }
        setTimeout(() => setPhase("done"), 1500);
        return;
      }

      if (data.building) {
        setPhase("building");
        setCountdown(data.retryAfter ?? 180);
        return;
      }

      setPhase("ci-error");
    } catch {
      setPhase("ci-error");
    }
  }, [platform, meta.dlFile]);

  const handleClick = async () => {
    if (phase === "checking" || phase === "downloading" || phase === "building") return;

    if (meta.isScript) {
      // Shell/PowerShell scripts are always served from templates — download immediately
      setPhase("downloading");
      triggerDownload(meta.dlFile);
      const cmd = makeInstallCmd(platform, enrollKey);
      if (cmd) navigator.clipboard.writeText(cmd).catch(() => {});
      if (enrollKey) {
        fetch(`${BACKEND}/enroll/ping`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: enrollKey, platform }),
        }).catch(() => {});
      }
      setTimeout(() => setPhase("done"), 1400);
      return;
    }

    // Binary platform — probe server status first
    await probeAndDownload();
  };

  // ── Derive button appearance from phase ─────────────────────────────────
  const rgb = hexToRgb(meta.color);

  const disabled = phase === "checking" || phase === "downloading" || phase === "building";

  let bg     = `linear-gradient(135deg,${meta.color},${meta.color}bb)`;
  let shadow = `0 0 40px rgba(${rgb},0.45)`;
  let icon: React.ReactNode = <Download size={22} />;
  let label  = meta.label;

  switch (phase) {
    case "checking":
      icon  = <Loader2 size={22} style={{ animation: "spin 1s linear infinite" }} />;
      label = "Checking…";
      break;
    case "downloading":
      icon  = <Loader2 size={22} style={{ animation: "spin 1s linear infinite" }} />;
      label = "Starting…";
      break;
    case "building":
      bg     = "linear-gradient(135deg,#92400e,#78350f)";
      shadow = "0 0 40px rgba(251,191,36,0.3)";
      icon   = <Clock size={22} />;
      label  = `Building binary… retry in ${countdown}s`;
      break;
    case "done":
      bg     = "linear-gradient(135deg,#10b981,#059669)";
      shadow = "0 0 40px rgba(16,185,129,0.45)";
      icon   = <Check size={22} strokeWidth={3} />;
      label  = meta.isScript ? "Paste command in terminal to install" : "Opening…";
      break;
    case "ci-error":
      bg     = "linear-gradient(135deg,#7f1d1d,#991b1b)";
      shadow = "0 0 40px rgba(239,68,68,0.35)";
      icon   = <AlertCircle size={22} />;
      label  = "Build not available — contact admin";
      break;
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#050c1a",
      }}
    >
      <button
        onClick={handleClick}
        disabled={disabled}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          padding: "20px 40px",
          borderRadius: "16px",
          border: "none",
          cursor: disabled ? "not-allowed" : "pointer",
          background: bg,
          color: "#fff",
          fontFamily: "inherit",
          fontSize: "18px",
          fontWeight: 700,
          letterSpacing: "0.01em",
          boxShadow: shadow,
          transition: "opacity 0.15s, transform 0.1s",
          opacity: disabled ? 0.75 : 1,
          maxWidth: "420px",
          textAlign: "center",
        }}
        onMouseDown={e => {
          if (!disabled) (e.currentTarget as HTMLButtonElement).style.transform = "scale(0.97)";
        }}
        onMouseUp={e => {
          (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
        }}
      >
        {icon}
        <span>{label}</span>
      </button>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
