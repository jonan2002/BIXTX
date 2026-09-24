import { useEffect, useState } from "react";
import { Check, Copy, Download, Shield, Terminal } from "lucide-react";

const GITHUB_RAW = "https://bixtx.onrender.com/v1/agent";

function detectOS(): "linux" | "macos" | "windows" | "android" | "ios" | "harmony" {
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes("harmony")) return "harmony";
  if (ua.includes("android")) return "android";
  if (ua.includes("iphone") || ua.includes("ipad") || ua.includes("ios")) return "ios";
  if (ua.includes("win")) return "windows";
  if (ua.includes("mac")) return "macos";
  return "linux";
}

export function EnrollPage() {
  const [copied, setCopied] = useState<string | null>(null);
  const [detected, setDetected] = useState<"linux" | "macos" | "windows" | "android" | "ios" | "harmony">("linux");

  const path = window.location.pathname;
  const params = new URLSearchParams(window.location.search);
  const linkId = path.replace("/enroll/", "").split("?")[0];
  const key = params.get("key") || "BTX-2026-ALPHA";

  useEffect(() => { setDetected(detectOS()); }, []);

  const copy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const commands: Record<string, string> = {
    linux:   `curl -sSL ${GITHUB_RAW}/install.sh | bash -s -- --key ${key}`,
    macos:   `curl -sSL ${GITHUB_RAW}/install.sh | bash -s -- --key ${key}`,
    windows: `powershell -c "iwr '${GITHUB_RAW}/install.ps1' -OutFile $env:TEMP\\install.ps1; & $env:TEMP\\install.ps1 -Key ${key}"`,
    android: `pkg install nodejs git -y && git clone https://github.com/jonan2002/BIXTX.git && cd BIXTX/software-a && npm install && BIXTX_SERVER_URL=wss://bixtx.onrender.com/agent BIXTX_ENROLL_KEY=${key} npm run dev`,
    ios:     `# iOS agent requires Xcode build — see dashboard`,
    harmony: `hdc app install -r bixtx-agent.hap && hdc shell aa start -b ai.bixtx.agent -a EntryAbility -p key=${key}`
  };

  const OS_LABEL: Record<string, string> = {
    linux: "Linux", macos: "macOS", windows: "Windows",
    android: "Android (Termux)", ios: "iOS", harmony: "HarmonyOS"
  };

  return (
    <div className="min-h-screen bg-[#050c1a] text-[#e2eaf6] px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
               style={{ background: "linear-gradient(135deg,#3b82f6,#10d9a0)" }}>
            <Shield size={30} color="#fff" />
          </div>
          <h1 className="text-3xl font-black mb-2">Enroll This Device</h1>
          <p className="text-sm text-[#6b8ab0]">
            Detected OS: <span className="font-mono text-[#10d9a0]">{OS_LABEL[detected]}</span>
          </p>
          <p className="text-sm text-[#6b8ab0] mt-1">
            Link: <span className="font-mono text-[#e2eaf6]">{linkId}</span>
          </p>
        </div>

        {/* Primary action for detected OS */}
        {(detected === "linux" || detected === "macos") && (
          <a
            href={`${GITHUB_RAW}/install.sh`}
            download="install.sh"
            className="block w-full text-center py-4 rounded-2xl font-bold mb-4"
            style={{ background: "linear-gradient(135deg,#2563eb,#10d9a0)", color: "#fff" }}
          >
            <Download size={18} className="inline mr-2" />
            Download Agent for {OS_LABEL[detected]}
          </a>
        )}

        {detected === "windows" && (
          <a
            href={`${GITHUB_RAW}/install.ps1`}
            download="install.ps1"
            className="block w-full text-center py-4 rounded-2xl font-bold mb-4"
            style={{ background: "linear-gradient(135deg,#2563eb,#10d9a0)", color: "#fff" }}
          >
            <Download size={18} className="inline mr-2" />
            Download Agent for Windows
          </a>
        )}

        {/* Copy-able terminal command */}
        <div className="rounded-2xl border p-6"
             style={{ background: "#0a1628", borderColor: "rgba(59,130,246,0.25)" }}>
          <div className="flex items-center gap-2 mb-4">
            <Terminal size={16} className="text-[#3b82f6]" />
            <h2 className="text-lg font-bold">Or Run This Command</h2>
          </div>
          <div className="flex gap-2 items-start">
            <pre className="flex-1 px-3 py-2 rounded-lg text-xs font-mono whitespace-pre-wrap break-all"
                 style={{ background: "#0d1930", border: "1px solid rgba(59,130,246,0.2)" }}>
              {commands[detected]}
            </pre>
            <button
              onClick={() => copy(commands[detected], detected)}
              className="px-3 py-2 rounded-lg flex-shrink-0"
              style={{ background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.3)" }}
            >
              {copied === detected ? <Check size={14} className="text-[#10d9a0]" /> : <Copy size={14} className="text-[#6b8ab0]" />}
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-[#6b8ab0] mt-6">
          After running the command, this device will appear in the BIXTX admin dashboard within 30 seconds.
        </p>
      </div>
    </div>
  );
}
