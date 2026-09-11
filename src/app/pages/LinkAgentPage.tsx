import { useState } from "react";
import {
  Server, Terminal, ArrowRight, Check, Download,
  RefreshCw, Upload, Shield, Zap, HardDrive, Cpu,
  Activity, Lock, Signal, Wifi as WifiIcon,
} from "lucide-react";
import { OS, OS_COLOR, OS_ICON, OS_LABEL, DeployLinkPanel } from "../shared";

export function LinkAgentPage({ show }: { show: (msg: string, kind?: "success"|"error"|"info") => void }) {
  const [tab, setTab] = useState<"builder"|"deploy"|"fleet"|"capabilities"|"mutations">("builder");

  const [targetOS, setTargetOS] = useState<OS>("windows");
  const [stealthLevel, setStealthLevel] = useState<"low"|"medium"|"high"|"ultra">("high");
  const [persistence, setPersistence] = useState("service");
  const [c2Endpoint, setC2Endpoint] = useState("https://c2.bixtx.com/beacon");
  const [beaconInterval, setBeaconInterval] = useState("30");
  const [antiDebug, setAntiDebug] = useState(true);
  const [rootkitDepth, setRootkitDepth] = useState<"user"|"kernel"|"hypervisor">("kernel");
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

  const FLEET: { id: string; device: string; os: OS; ip: string; version: string; status: string; lastPing: string; dataQueue: string; mutations: number }[] = [
    { id:"a1", device:"EXEC-LAPTOP-01",    os:"windows", ip:"192.168.1.42",  version:"4.7.2", status:"active",  lastPing:"Now",    dataQueue:"2.3 MB", mutations:4 },
    { id:"a2", device:"MacBook-Pro-M3",    os:"macos",   ip:"192.168.1.55",  version:"4.7.2", status:"active",  lastPing:"4s ago", dataQueue:"0.8 MB", mutations:2 },
    { id:"a3", device:"KIOSK-UBUNTU-07",   os:"linux",   ip:"10.0.0.7",      version:"4.7.1", status:"active",  lastPing:"12s ago",dataQueue:"5.1 MB", mutations:7 },
    { id:"a4", device:"Galaxy-S24-Ultra",  os:"android", ip:"192.168.1.88",  version:"4.7.2", status:"warning", lastPing:"2m ago", dataQueue:"1.2 MB", mutations:3 },
    { id:"a5", device:"iPhone-15-Pro",     os:"ios",     ip:"192.168.2.11",  version:"4.7.0", status:"active",  lastPing:"Now",    dataQueue:"0.4 MB", mutations:1 },
    { id:"a6", device:"Mate60-Pro",        os:"harmony", ip:"10.0.1.4",      version:"4.7.2", status:"active",  lastPing:"6s ago", dataQueue:"1.9 MB", mutations:5 },
    { id:"a7", device:"WORKSTATION-WIN11", os:"windows", ip:"10.0.0.22",     version:"4.6.5", status:"offline", lastPing:"3h ago", dataQueue:"0 B",    mutations:2 },
    { id:"a8", device:"DEVBOX-ARCH",       os:"linux",   ip:"10.0.0.31",     version:"4.7.2", status:"active",  lastPing:"Now",    dataQueue:"3.7 MB", mutations:9 },
  ];

  const [mutating, setMutating] = useState(false);
  const [mutProgress, setMutProgress] = useState(0);
  const [mutLog, setMutLog] = useState([
    { ts: "2026-07-01 14:32", event: "Signature hash rotated (SHA3-512)", target: "All agents", result: "OK" },
    { ts: "2026-07-01 11:10", event: "Process name randomised → svchost32x", target: "Windows fleet", result: "OK" },
    { ts: "2026-06-30 22:07", event: "AV pattern break — Kaspersky rule #KV-9221", target: "All agents", result: "OK" },
    { ts: "2026-06-30 09:44", event: "C2 channel migrated → Tor hidden service", target: "High-stealth nodes", result: "OK" },
    { ts: "2026-06-29 16:18", event: "Memory-resident payload update (no disk write)", target: "All agents", result: "OK" },
  ]);

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
        setBuildLog(prev => [...prev, steps[i]]);
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
        setMutLog(prev => [{
          ts: new Date().toISOString().replace("T"," ").slice(0,16),
          event: "Global signature rotation + hash randomisation",
          target: "All active agents",
          result: "OK",
        }, ...prev]);
        show("Mutation pushed to all active agents", "success");
      }
    }, 80);
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
  const totalData = "14.4 MB";

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
            { label:"Active Agents",   val: `${activeCount}/8`,  color:"#10b981" },
            { label:"Data Queued",     val: totalData,            color:"#10d9a0" },
            { label:"Mutations Live",  val: "v4.7.2-r14",        color:"#3b82f6" },
            { label:"AV Detection",    val: "1/12",               color:"#f59e0b" },
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-1 space-y-4">
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
            </div>

            <div className="rounded-2xl p-4 space-y-4" style={{ background:"#0a1628", border:"1px solid rgba(59,130,246,0.2)" }}>
              <div className="text-xs font-mono uppercase tracking-widest" style={{ color:"#6b8ab0" }}>Stealth Configuration</div>
              <div>
                <div className="text-xs font-semibold mb-2" style={{ color:"#b8cce8" }}>Stealth Level</div>
                <div className="grid grid-cols-2 gap-1.5">
                  {(["low","medium","high","ultra"] as const).map(lvl => (
                    <button key={lvl} onClick={() => setStealthLevel(lvl)}
                      className="py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-all"
                      style={{
                        background: stealthLevel===lvl ? (lvl==="ultra"?"linear-gradient(135deg,#3b82f6,#10d9a0)":lvl==="high"?"rgba(59,130,246,0.3)":lvl==="medium"?"rgba(245,158,11,0.2)":"rgba(16,185,129,0.2)") : "rgba(255,255,255,0.03)",
                        color: stealthLevel===lvl ? (lvl==="ultra"?"#fff":lvl==="high"?"#3b82f6":lvl==="medium"?"#f59e0b":"#10b981") : "#6b8ab0",
                        border:`1px solid ${stealthLevel===lvl ? (lvl==="ultra"?"rgba(59,130,246,0.6)":lvl==="high"?"rgba(59,130,246,0.4)":lvl==="medium"?"rgba(245,158,11,0.4)":"rgba(16,185,129,0.4)") : "rgba(59,130,246,0.1)"}`,
                      }}>
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold mb-2" style={{ color:"#b8cce8" }}>Persistence Method</div>
                <div className="space-y-1.5">
                  {[
                    { val:"service",   label:"System Service / Daemon" },
                    { val:"registry",  label:"Registry AutoRun (Win)" },
                    { val:"startup",   label:"Startup Folder (stealth)" },
                    { val:"bootkit",   label:"Bootkit (pre-boot, ultra)" },
                  ].map(o => (
                    <button key={o.val} onClick={() => setPersistence(o.val)}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-left transition-all"
                      style={{ background: persistence===o.val ? "rgba(59,130,246,0.15)" : "rgba(255,255,255,0.02)", border:`1px solid ${persistence===o.val ? "rgba(59,130,246,0.4)" : "rgba(59,130,246,0.1)"}`, color: persistence===o.val ? "#3b82f6" : "#6b8ab0" }}>
                      <div className={`w-3 h-3 rounded-full border-2 flex-shrink-0 ${persistence===o.val ? "border-purple-500 bg-purple-500" : "border-gray-600"}`} />
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold mb-2" style={{ color:"#b8cce8" }}>Rootkit Depth</div>
                <div className="grid grid-cols-3 gap-1.5">
                  {(["user","kernel","hypervisor"] as const).map(r => (
                    <button key={r} onClick={() => setRootkitDepth(r)}
                      className="py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-all capitalize"
                      style={{ background: rootkitDepth===r ? "rgba(59,130,246,0.25)" : "rgba(255,255,255,0.03)", color: rootkitDepth===r ? "#3b82f6" : "#6b8ab0", border:`1px solid ${rootkitDepth===r ? "rgba(59,130,246,0.5)" : "rgba(59,130,246,0.1)"}` }}>
                      {r}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold" style={{ color:"#b8cce8" }}>Anti-Debug / VM Detection</span>
                <button onClick={() => setAntiDebug(v => !v)}
                  className="relative w-10 h-5 rounded-full transition-all"
                  style={{ background: antiDebug ? "#3b82f6" : "#0f1e3a" }}>
                  <span className="absolute top-0.5 transition-all duration-200 w-4 h-4 rounded-full bg-white shadow"
                    style={{ left: antiDebug ? "calc(100% - 1.1rem)" : "0.125rem" }} />
                </button>
              </div>
            </div>

            <div className="rounded-2xl p-4 space-y-3" style={{ background:"#0a1628", border:"1px solid rgba(59,130,246,0.2)" }}>
              <div className="text-xs font-mono uppercase tracking-widest" style={{ color:"#6b8ab0" }}>C2 Configuration</div>
              <div>
                <div className="text-xs font-semibold mb-1" style={{ color:"#b8cce8" }}>Beacon Endpoint</div>
                <input value={c2Endpoint} onChange={e => setC2Endpoint(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-xs font-mono outline-none"
                  style={{ background:"#030b16", border:"1px solid rgba(59,130,246,0.25)", color:"#10d9a0" }} />
              </div>
              <div>
                <div className="text-xs font-semibold mb-1" style={{ color:"#b8cce8" }}>Beacon Interval (seconds)</div>
                <input value={beaconInterval} onChange={e => setBeaconInterval(e.target.value)}
                  type="number" min="5" max="3600"
                  className="w-full px-3 py-2 rounded-lg text-xs font-mono outline-none"
                  style={{ background:"#030b16", border:"1px solid rgba(59,130,246,0.25)", color:"#10d9a0" }} />
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-4">
            <div className="rounded-2xl p-4" style={{ background:"#0a1628", border:"1px solid rgba(59,130,246,0.2)" }}>
              <div className="text-xs font-mono uppercase tracking-widest mb-3" style={{ color:"#6b8ab0" }}>Compile Agent Binary</div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {(["windows","macos","linux","android","ios","harmony"] as OS[]).map(id => (
                  <button key={id} onClick={() => !building && handleBuild(id)}
                    disabled={building}
                    className="flex items-center justify-between px-4 py-3 rounded-xl border transition-all disabled:opacity-40"
                    style={{ background: buildOS===id && built ? `${OS_COLOR[id]}15` : "#030b16", borderColor: buildOS===id && built ? OS_COLOR[id] : "rgba(59,130,246,0.2)" }}>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{OS_ICON[id]}</span>
                      <span className="text-xs font-bold" style={{ color:"#e2eaf6" }}>{OS_LABEL[id]}</span>
                    </div>
                    {buildOS===id && building ? (
                      <RefreshCw size={13} color="#3b82f6" className="animate-spin" />
                    ) : buildOS===id && built ? (
                      <Check size={13} color="#10b981" />
                    ) : (
                      <span className="text-[10px] font-mono" style={{ color:"#6b8ab0" }}>BUILD</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl overflow-hidden" style={{ background:"#050410", border:"1px solid rgba(59,130,246,0.22)" }}>
              <div className="px-4 py-2.5 flex items-center justify-between border-b" style={{ borderColor:"rgba(59,130,246,0.15)", background:"#030b16" }}>
                <div className="flex items-center gap-2">
                  <Terminal size={13} color="#3b82f6" />
                  <span className="text-xs font-mono" style={{ color:"#6b8ab0" }}>
                    Build Console {buildOS ? `— ${OS_LABEL[buildOS]}` : ""}
                  </span>
                </div>
                {building && (
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-1.5 rounded-full overflow-hidden" style={{ background:"rgba(59,130,246,0.2)" }}>
                      <div className="h-full rounded-full transition-all duration-300" style={{ width:`${buildProgress}%`, background:"linear-gradient(90deg,#3b82f6,#10d9a0)" }} />
                    </div>
                    <span className="text-[10px] font-mono" style={{ color:"#3b82f6" }}>{buildProgress}%</span>
                  </div>
                )}
                {built && !building && <span className="text-[10px] font-mono" style={{ color:"#10b981" }}>✓ BUILD SUCCESS</span>}
              </div>
              <div className="p-4 min-h-48 font-mono text-xs space-y-1 overflow-y-auto max-h-72">
                {buildLog.length === 0 ? (
                  <div style={{ color:"#1a3060" }}>// Select a platform and click BUILD to compile the agent binary</div>
                ) : buildLog.map((line, i) => (
                  <div key={i} style={{ color: typeof line === "string" && line.startsWith("[✓]") ? "#10b981" : typeof line === "string" && line.startsWith("[!]") ? "#ef4444" : "#b8cce8" }}>
                    {line}
                  </div>
                ))}
              </div>
            </div>

            {built && !building && buildOS && (
              <div className="rounded-2xl p-4 flex items-center justify-between"
                style={{ background:"rgba(16,185,129,0.07)", border:"1px solid rgba(16,185,129,0.3)" }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background:"rgba(16,185,129,0.15)" }}>
                    <Check size={18} color="#10b981" />
                  </div>
                  <div>
                    <div className="text-sm font-bold" style={{ color:"#10b981" }}>Agent Ready</div>
                    <div className="text-xs font-mono" style={{ color:"#6b8ab0" }}>
                      bixtx-agent-v4.7.2-{buildOS}{buildOS==="windows"?".exe":buildOS==="macos"?".pkg":buildOS==="linux"?".deb":buildOS==="android"?".apk":buildOS==="ios"?".ipa":".hap"}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => {
                    const ext = buildOS==="windows"?".exe":buildOS==="macos"?".pkg":buildOS==="linux"?".deb":buildOS==="android"?".apk":buildOS==="ios"?".ipa":".hap";
                    const filename = `bixtx-agent-v4.7.2-${buildOS}${ext}`;
                    const enabled = Object.entries(modules).filter(([,v])=>v).map(([k])=>k).join(",");
                    const content = `[bixtx Agent Binary]\nOS: ${buildOS}\nVersion: 4.7.2\nStealth: ${stealthLevel}\nPersistence: ${persistence}\nC2: ${c2Endpoint}\nBeacon: ${beaconInterval}s\nRootkit: ${rootkitDepth}\nAnti-Debug: ${antiDebug}\nModules: ${enabled}\nBuilt: ${new Date().toISOString()}`;
                    const blob = new Blob([content], { type:"application/octet-stream" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url; a.download = filename; a.click();
                    URL.revokeObjectURL(url);
                    show(`${filename} downloaded`, "success");
                  }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all hover:opacity-90"
                    style={{ background:"#10b981", color:"#000" }}>
                    <Download size={12} /> Download
                  </button>
                  <button onClick={() => setTab("deploy")}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all"
                    style={{ background:"rgba(59,130,246,0.2)", color:"#3b82f6", border:"1px solid rgba(59,130,246,0.4)" }}>
                    Deploy <ArrowRight size={12} />
                  </button>
                </div>
              </div>
            )}

            <div className="rounded-2xl p-4" style={{ background:"#0a1628", border:"1px solid rgba(59,130,246,0.2)" }}>
              <div className="text-xs font-mono uppercase tracking-widest mb-3" style={{ color:"#6b8ab0" }}>Agent Specifications</div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label:"Binary Size",  val:"~14 MB",           icon:<HardDrive size={13} />, color:"#3b82f6" },
                  { label:"RAM Usage",    val:"<3 MB idle",       icon:<Cpu size={13} />,       color:"#10d9a0" },
                  { label:"CPU Load",     val:"<0.1% idle",       icon:<Activity size={13} />,  color:"#10b981" },
                  { label:"Encryption",   val:"AES-256-GCM",      icon:<Lock size={13} />,      color:"#f59e0b" },
                  { label:"Protocol",     val:"HTTPS + WS",       icon:<WifiIcon size={13} />,  color:"#3b82f6" },
                  { label:"Persistence",  val:persistence,        icon:<Server size={13} />,    color:"#10d9a0" },
                  { label:"Rootkit",      val:rootkitDepth,       icon:<Shield size={13} />,    color:"#ef4444" },
                  { label:"Beacon",       val:`${beaconInterval}s`, icon:<Signal size={13} />, color:"#10b981" },
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
              <div className="text-xs font-mono uppercase tracking-widest" style={{ color:"#6b8ab0" }}>Active Agent Fleet — {FLEET.length} nodes</div>
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
