import { useEffect, useState } from "react";
import { Check, Copy, Download, Shield, Terminal } from "lucide-react";

export function EnrollPage() {
  const [copied, setCopied] = useState<string | null>(null);
  const [enrollData, setEnrollData] = useState<any>(null);

  // Parse the URL for linkId and key
  const path = window.location.pathname; // /enroll/XXXX
  const params = new URLSearchParams(window.location.search);
  const linkId = path.replace("/enroll/", "").split("?")[0];
  const key = params.get("key") || "BTX-2026-ALPHA";

  useEffect(() => {
    // Try to fetch the enroll details (optional)
    fetch(`https://bixtx.onrender.com/v1/devices/enroll/${linkId}`)
      .then(r => r.json())
      .then(setEnrollData)
      .catch(() => {});
  }, [linkId]);

  const copy = (cmd: string, id: string) => {
    navigator.clipboard.writeText(cmd);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const commands = {
    linux: `curl -sSL https://bixtx.onrender.com/agent/install.sh | bash -s -- --key ${key}`,
    macos: `curl -sSL https://bixtx.onrender.com/agent/install.sh | bash -s -- --key ${key}`,
    windows: `powershell -c "iwr 'https://bixtx.onrender.com/agent/install.ps1' -OutFile $env:TEMP\\install.ps1; & $env:TEMP\\install.ps1 -Key ${key}"`,
    android: `pkg install nodejs git -y && git clone https://github.com/jonan2002/BIXTX.git && cd BIXTX/software-a && npm install && BIXTX_SERVER_URL=wss://bixtx.onrender.com/agent BIXTX_ENROLL_KEY=${key} npm run dev`,
    ios: `# Build with Xcode or DevEco Studio — see instructions in the dashboard`,
    harmony: `hdc app install -r bixtx-agent.hap && hdc shell aa start -b ai.bixtx.agent -a EntryAbility -p key=${key}`
  };

  return (
    <div className="min-h-screen bg-[#050c1a] text-[#e2eaf6] px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "linear-gradient(135deg,#3b82f6,#10d9a0)" }}>
            <Shield size={30} color="#fff" />
          </div>
          <h1 className="text-3xl font-black mb-2">Enroll a Device</h1>
          <p className="text-sm text-[#6b8ab0]">Link ID: <span className="font-mono text-[#e2eaf6]">{linkId}</span></p>
          <p className="text-sm text-[#6b8ab0]">Enrollment Key: <span className="font-mono text-[#e2eaf6]">{key}</span></p>
        </div>

        <div className="rounded-2xl border p-6 mb-4" style={{ background: "#0a1628", borderColor: "rgba(59,130,246,0.25)" }}>
          <div className="flex items-center gap-2 mb-4">
            <Terminal size={16} className="text-[#3b82f6]" />
            <h2 className="text-lg font-bold">Install Command</h2>
          </div>

          {Object.entries(commands).map(([os, cmd]) => (
            <div key={os} className="mb-4 last:mb-0">
              <div className="text-xs font-mono uppercase tracking-widest mb-2 text-[#6b8ab0]">{os}</div>
              <div className="flex gap-2 items-start">
                <pre className="flex-1 px-3 py-2 rounded-lg text-xs font-mono overflow-x-auto whitespace-pre-wrap break-all" style={{ background: "#0d1930", border: "1px solid rgba(59,130,246,0.2)" }}>{cmd}</pre>
                <button
                  onClick={() => copy(cmd, os)}
                  className="px-3 py-2 rounded-lg flex-shrink-0"
                  style={{ background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.3)" }}
                >
                  {copied === os ? <Check size={14} className="text-[#10d9a0]" /> : <Copy size={14} className="text-[#6b8ab0]" />}
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border p-6" style={{ background: "#0a1628", borderColor: "rgba(59,130,246,0.25)" }}>
          <p className="text-sm text-[#6b8ab0] text-center">
            After running the command on your device, it will appear in your BIXTX dashboard within 30 seconds.
          </p>
        </div>

        <div className="text-center mt-8">
          <a href="/" className="text-sm text-[#3b82f6] hover:underline">← Back to Dashboard</a>
        </div>
      </div>
    </div>
  );
}
