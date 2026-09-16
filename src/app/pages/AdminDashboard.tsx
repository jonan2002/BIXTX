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
  DashDevice, DashSession, AppUser, WifiNet,
  MOCK_DEPLOY_JOBS, MOCK_NET_IFACES, ALERTS,
  OS_COLOR, OS_ICON, OS_LABEL,
  SEED_DEVICES, SEED_SESSIONS, SEED_USERS, SEED_WIFI,
  ALERT_COLOR, HEALTH_COLOR, ROLE_COLOR,
  Chip, GlowDot, MiniBar, StatCard, ToastStack, useToast,
  Modal, FLabel, FInput, FSelect, ActionBtn,
  AdminQRModal, DeployLinkPanel,
} from "../shared";

// ─── Admin Dashboard ──────────────────────────────────────────────────────────
export function AdminDashboard({ onControl }: { onControl: (d: DashDevice) => void }) {
  const { show, toasts } = useToast();

  // ── state ──
  const [tab, setTab]         = useState<"devices"|"sessions"|"network"|"surveillance"|"location"|"extraction"|"ai"|"c2"|"users"|"alerts"|"deploy">("devices");
  const [devices, setDevices] = useState<DashDevice[]>(SEED_DEVICES);
  const [sessions, setSessions] = useState<DashSession[]>(SEED_SESSIONS);
  const [users, setUsers]     = useState<AppUser[]>(SEED_USERS);
  const [alerts, setAlerts]   = useState(ALERTS.map(a => ({ ...a, dismissed:false })));
  const [wifi]                = useState<WifiNet[]>(SEED_WIFI);

  // ── surveillance state ──
  const [socialFilter, setSocialFilter] = useState("all");
  const [camRecFilter, setCamRecFilter] = useState("all");
  const [aiLearningPhase, setAiLearningPhase] = useState<"idle"|"scanning"|"learning"|"mutating"|"complete">("idle");
  const [aiProgress, setAiProgress] = useState(0);
  const [aiLearningMode, setAiLearningMode] = useState(true);
  const [aiMutations, setAiMutations] = useState<{id:string;type:string;target:string;confidence:number;applied:boolean;ignored?:boolean;ts:string}[]>([
    {id:"m1",type:"Stealth Enhancement",  target:"KIOSK-UBUNTU-07", confidence:97, applied:true,  ts:"14:20:00"},
    {id:"m2",type:"AV Evasion Retrain",   target:"EXEC-LAPTOP-01",  confidence:94, applied:true,  ts:"14:15:00"},
    {id:"m3",type:"Network Fingerprint",  target:"MacBook-Pro-M3",   confidence:88, applied:false, ts:"14:32:00"},
    {id:"m4",type:"Kernel Hook Adapt",    target:"DEVBOX-ARCH",      confidence:92, applied:true,  ts:"13:55:00"},
  ]);
  const [targetProfiles, setTargetProfiles] = useState([
    {id:"t1",name:"j.morgan",   dev:"EXEC-LAPTOP-01",  behavior:"Office hours 08-18, frequent Excel usage",  risk:62,  learned:true,  anomalyCount:3},
    {id:"t2",name:"s.chen",     dev:"MacBook-Pro-M3",   behavior:"Developer — heavy terminal, git commits",  risk:45,  learned:true,  anomalyCount:1},
    {id:"t3",name:"k.ivanov",   dev:"DEVBOX-ARCH",      behavior:"Night owl — active 22-06, VPN always on",  risk:91,  learned:true,  anomalyCount:7},
    {id:"t4",name:"r.okafor",   dev:"Galaxy-S24-Ultra", behavior:"High mobility, frequent unknown contacts",  risk:78,  learned:true,  anomalyCount:5},
    {id:"t5",name:"a.patel",    dev:"iPhone-15-Pro",    behavior:"Regular commute pattern, social media heavy",risk:34, learned:false, anomalyCount:0},
  ]);
  const [klEnabled,  setKlEnabled]  = useState(true);
  const [srEnabled,  setSrEnabled]  = useState(true);
  const [camEnabled, setCamEnabled] = useState(false);
  const [micEnabled, setMicEnabled] = useState(true);
  const [clipEnabled,setClipEnabled]= useState(true);
  const [klLogs] = useState([
    { ts:"14:32:11", dev:"EXEC-LAPTOP-01",  app:"Chrome",    text:"meeting notes for project bixtx" },
    { ts:"14:31:58", dev:"MacBook-Pro-M3",   app:"Terminal",  text:"git commit -m 'fix auth'" },
    { ts:"14:31:44", dev:"KIOSK-UBUNTU-07", app:"Nano",      text:"sudo nano /etc/hosts" },
    { ts:"14:31:30", dev:"EXEC-LAPTOP-01",  app:"Slack",     text:"can you send me the report" },
    { ts:"14:31:15", dev:"DEVBOX-ARCH",     app:"Vim",       text:":wq /etc/ssh/sshd_config" },
    { ts:"14:30:59", dev:"MacBook-Pro-M3",   app:"Chrome",    text:"https://github.com/bixtx" },
  ]);
  const [clipLogs] = useState([
    { ts:"14:32:05", dev:"EXEC-LAPTOP-01",  content:"Meeting at 3pm - conf room B",     app:"Outlook" },
    { ts:"14:31:42", dev:"MacBook-Pro-M3",   content:"sk-ant-api03-xxxxxxxxxxxx",         app:"Terminal" },
    { ts:"14:31:08", dev:"KIOSK-UBUNTU-07", content:"192.168.1.1:8080/admin",            app:"Firefox" },
  ]);
  const [recordings] = useState([
    { id:"r1", dev:"EXEC-LAPTOP-01",  start:"14:00:00", dur:"32m 11s", size:"1.2 GB", status:"recording" },
    { id:"r2", dev:"MacBook-Pro-M3",   start:"13:45:00", dur:"47m 05s", size:"2.1 GB", status:"recording" },
    { id:"r3", dev:"DEVBOX-ARCH",     start:"12:00:00", dur:"2h 32m",  size:"5.8 GB", status:"saved"     },
  ]);

  // ── location state ──
  const [geoDevices] = useState([
    { id:"d1", name:"EXEC-LAPTOP-01",  lat:40.7128,   lng:-74.0060,  loc:"New York, US",    acc:"3m",   spd:"0 km/h",   upd:"Now"    },
    { id:"d2", name:"MacBook-Pro-M3",   lat:1.3521,    lng:103.8198, loc:"Singapore",       acc:"5m",   spd:"0 km/h",   upd:"Now"    },
    { id:"d4", name:"Galaxy-S24-Ultra", lat:6.5244,    lng:3.3792,   loc:"Lagos, NG",       acc:"8m",   spd:"42 km/h",  upd:"2m ago" },
    { id:"d5", name:"iPhone-15-Pro",    lat:19.0760,   lng:72.8777,  loc:"Mumbai, IN",      acc:"4m",   spd:"0 km/h",   upd:"Now"    },
    { id:"d6", name:"Mate60-Pro",       lat:31.2304,   lng:121.4737, loc:"Shanghai, CN",    acc:"6m",   spd:"0 km/h",   upd:"Now"    },
  ]);
  const [geofences, setGeofences] = useState([
    { id:"g1", name:"HQ Campus",       lat:40.7128,  lng:-74.006,  radius:"500m",  active:true,  breached:false },
    { id:"g2", name:"Singapore Office",lat:1.3521,   lng:103.8198, radius:"300m",  active:true,  breached:false },
    { id:"g3", name:"Restricted Zone", lat:31.2304,  lng:121.4737, radius:"1 km",  active:true,  breached:false },
  ]);

  // ── extraction state ──
  const [viewJobId, setViewJobId] = useState<string|null>(null);
  const [viewQuickType, setViewQuickType] = useState<string|null>(null);
  const [quickExtractDev, setQuickExtractDev] = useState("iPhone-15-Pro");

  // ── per-device sample data for extraction preview ──
  const DEVICE_EXTRACT_DATA: Record<string,Record<string,{cols:string[];rows:string[][]}>> = {
    "EXEC-LAPTOP-01": {
      "Browser History": { cols:["URL","Title","Visited","Duration"], rows:[
        ["https://sharepoint.corp.io/finance","Finance Q2 — SharePoint","14:31:02","8m 12s"],
        ["https://outlook.office365.com","Outlook — Inbox","14:28:55","22m 04s"],
        ["https://bankofamerica.com/wires","B of A Wire Transfer","13:58:44","6m 07s"],
        ["https://vpn.corp.io/login","Corp VPN Portal","14:18:03","1m 22s"],
        ["https://confluence.corp.io/board","Board Reports","14:10:11","4m 39s"],
      ]},
      "Contacts":{ cols:["Name","Phone","Email","Title"], rows:[
        ["Sarah Mitchell","+1-555-0101","s.mitchell@corp.io","CFO"],
        ["David Kim","+1-555-0188","d.kim@corp.io","VP Engineering"],
        ["Rachel Torres","+1-555-0177","r.torres@law.io","General Counsel"],
      ]},
      "Credentials":{ cols:["Site","Username","Password","Source","Captured"], rows:[
        ["vpn.corp.io","j.morgan@corp.io","C0rpVPN#2026!","AutoFill","14:18:03"],
        ["outlook.office365.com","j.morgan","M365P@ss!","Keylogger","14:10:00"],
        ["bankofamerica.com","jamesmorgan26","Financi@l99","AutoFill","13:58:44"],
        ["aws.amazon.com","j.morgan+aws","AWSr00t!Corp","Keylogger","13:45:00"],
      ]},
      "SMS & Calls":{ cols:["Type","Contact","Preview / Duration","Time"], rows:[
        ["SMS","Sarah Mitchell","Q3 numbers look good","14:32:00"],
        ["Call","Rachel Torres","18m 22s","13:10:00"],
      ]},
      "File System":{ cols:["Path","Size","Modified","Type"], rows:[
        ["C:\\Users\\jmorgan\\Documents\\Board_Q3.xlsx","2.4 MB","14:20:11","Excel"],
        ["C:\\Users\\jmorgan\\Downloads\\NDA_draft.pdf","890 KB","13:55:00","PDF"],
        ["C:\\Users\\jmorgan\\Desktop\\wire_confirm.pdf","320 KB","13:58:55","PDF"],
        ["C:\\secrets\\aws_keys.txt","1.2 KB","12:00:00","Text"],
      ]},
      "Media Vault":{ cols:["Filename","Size","Captured","Type"], rows:[
        ["screenshot_2026-07-01_14-31.jpg","1.2 MB","14:31:00","Screen"],
        ["screen_bankportal.jpg","980 KB","13:58:44","Screen"],
      ]},
    },
    "MacBook-Pro-M3": {
      "Browser History":{ cols:["URL","Title","Visited","Duration"], rows:[
        ["https://github.com/bixtx/backend","bixtx/backend — GitHub","14:30:01","12m 44s"],
        ["https://linear.app/bixtx/issues","Linear — Sprint Board","14:22:33","8m 10s"],
        ["https://figma.com/files","Figma — Design System","14:15:00","5m 22s"],
        ["https://notion.so/bixtx/roadmap","Product Roadmap — Notion","14:08:12","3m 55s"],
      ]},
      "Contacts":{ cols:["Name","Phone","Email","Last Seen"], rows:[
        ["James Morgan","+1-555-0142","j.morgan@corp.io","Today 09:12"],
        ["Raj Patel","+91-98000-11222","raj@startup.in","Yesterday"],
        ["Lei Wei","+86-138-0000-0001","lei.wei@techco.cn","2 days ago"],
        ["Kwame Osei","+233-24-456789","k.osei@corp.io","Today 11:45"],
      ]},
      "Credentials":{ cols:["Site","Username","Password","Source","Captured"], rows:[
        ["github.com","s.chen","gh_token_xK9mP2qR","AutoFill","14:30:01"],
        ["notion.so","s.chen@dev.io","N0tion#2026!","Keylogger","14:08:12"],
        ["figma.com","s.chen@dev.io","Figm@Pass!1","AutoFill","14:15:00"],
      ]},
      "File System":{ cols:["Path","Size","Modified","Type"], rows:[
        ["/Users/schen/Projects/backend/.env","1.8 KB","14:29:00","Env"],
        ["/Users/schen/Documents/API_keys.txt","4 KB","13:00:00","Text"],
        ["/Users/schen/Downloads/contract.pdf","2.1 MB","12:30:00","PDF"],
      ]},
      "SMS & Calls":{ cols:["Type","Contact","Preview / Duration","Time"], rows:[
        ["iMessage","Raj Patel","Can you push the hotfix?","14:25:00"],
        ["Call","James Morgan","9m 05s","13:40:00"],
      ]},
      "Media Vault":{ cols:["Filename","Size","Captured","Type"], rows:[
        ["cam_14-22-33.jpg","3.2 MB","14:22:33","Camera — Front"],
        ["screen_linear.jpg","1.1 MB","14:22:00","Screen"],
      ]},
    },
    "iPhone-15-Pro": {
      "Browser History":{ cols:["URL","Title","Visited","Duration"], rows:[
        ["https://instagram.com/explore","Instagram Explore","14:29:01","18m"],
        ["https://maps.apple.com/?q=airport","Apple Maps — Airport","14:10:44","5m"],
        ["https://chase.com/online","Chase Mobile Banking","13:55:00","12m"],
        ["https://apple.com/icloud","iCloud — Storage","13:30:00","3m"],
      ]},
      "Contacts":{ cols:["Name","Phone","iCloud","Last Contact"], rows:[
        ["Mom","+91-99100-00001","mom@icloud.com","Today 08:05"],
        ["Priya Sharma","+91-98765-43210","priya@gmail.com","Yesterday 21:30"],
        ["Chase Bank","+1-800-935-9935","—","2 days ago"],
        ["Dr. Gupta","+91-22-4000-5000","—","Last week"],
      ]},
      "Credentials":{ cols:["Service","Account","Password / Token","Source","Captured"], rows:[
        ["iCloud","a.patel@icloud.com","iCl0ud#2026!","Keychain Hook","14:30:00"],
        ["WhatsApp","+91-98000-11222","OTP: 847291","SMS Intercept","14:21:33"],
        ["Instagram","@patel_a_dev","Insta@2026","Keylogger","13:58:00"],
        ["Chase Bank","raj.patel@mail.com","Bank$afe2026","Keylogger","13:55:00"],
      ]},
      "SMS & Calls":{ cols:["Type","Contact","Preview / Duration","Time"], rows:[
        ["iMessage","Mom","On my way home","14:29:01"],
        ["SMS","Chase Bank","Your OTP is 847291","14:21:33"],
        ["Call","Priya Sharma","4m 12s","13:44:22"],
        ["iMessage","Unknown","Click here to confirm","13:00:00"],
      ]},
      "Media Vault":{ cols:["Filename","Size","Captured","Type"], rows:[
        ["IMG_4821.heic","4.8 MB","14:28:00","Camera — Rear"],
        ["IMG_4820.heic","3.9 MB","14:27:44","Camera — Front (Selfie)"],
        ["VID_1033.mov","88 MB","13:45:00","Video — Rear"],
        ["screen_chase.png","1.1 MB","13:55:00","Screenshot"],
      ]},
      "File System":{ cols:["Path","Size","Modified","Type"], rows:[
        ["/var/mobile/Documents/passport_scan.pdf","3.1 MB","2026-06-01","PDF"],
        ["/var/mobile/Downloads/bank_statement.pdf","980 KB","2026-07-01","PDF"],
        ["iCloud/Photos/2026-07","—","Syncing","iCloud Album"],
      ]},
    },
    "Galaxy-S24-Ultra": {
      "SMS & Calls":{ cols:["Type","Contact","Preview / Duration","Time"], rows:[
        ["WhatsApp","Team Lead","Meeting pushed to 5pm","14:29:01"],
        ["SMS","+234-801-234-5678","Your transfer of ₦500k is confirmed","14:21:33"],
        ["Call","Unknown +44","1m 02s","13:44:22"],
        ["SMS","Bank Alert","New login from Lagos","13:00:00"],
      ]},
      "Contacts":{ cols:["Name","Phone","WhatsApp","Source"], rows:[
        ["Chidi Okafor","+234-802-111-2222","✓","Phonebook"],
        ["Emeka Ltd","+234-701-333-4444","✓","Phonebook"],
        ["Dr. Afolabi","+234-818-555-6666","—","Phonebook"],
        ["Unknown UK","+44-7700-900142","✓","Recent Call"],
      ]},
      "Credentials":{ cols:["App","Username","Password / Token","Source","Captured"], rows:[
        ["GTBank App","r.okafor@mail.ng","GTB@2026!","Keylogger","14:22:00"],
        ["WhatsApp","+234-802-111-2222","Session token","Memory Hook","14:10:00"],
        ["Gmail","r.okafor@gmail.com","Gm@il#2026","AutoFill","13:55:00"],
      ]},
      "Media Vault":{ cols:["Filename","Size","Captured","Type"], rows:[
        ["DCIM_20260701_1422.jpg","5.2 MB","14:22:00","Camera — Rear"],
        ["WhatsApp_video_001.mp4","22 MB","13:30:00","WhatsApp Video"],
      ]},
      "Browser History":{ cols:["URL","Title","Visited","Duration"], rows:[
        ["https://gtbank.com/transfer","GTBank — Transfer","14:18:00","8m"],
        ["https://wa.me","WhatsApp Web","14:05:00","22m"],
        ["https://jumia.com.ng","Jumia Nigeria","13:30:00","15m"],
      ]},
      "File System":{ cols:["Path","Size","Modified","Type"], rows:[
        ["/sdcard/Download/bank_slip.pdf","320 KB","14:18:00","PDF"],
        ["/sdcard/DCIM/Camera/","—","Ongoing","Images"],
        ["/data/data/com.whatsapp/databases/","—","14:29:00","WhatsApp DB"],
      ]},
    },
    "DEVBOX-ARCH": {
      "Credentials":{ cols:["Site/Key","Username","Value","Source","Captured"], rows:[
        ["github.com","k.ivanov","ghp_xK9mP2qR...","~/.gitconfig","13:55:00"],
        ["aws cli","k.ivanov","AKIA...7X2Q","~/.aws/credentials","13:50:00"],
        ["SSH Key","k.ivanov","RSA 4096 — id_rsa","~/.ssh/","13:48:00"],
        ["slack.com","k.ivanov@corp.io","Sl@ck!2026","Browser AutoFill","09:00:00"],
        ["VPN","k.ivanov","vpnP@ss2026","Keylogger","08:30:00"],
      ]},
      "Browser History":{ cols:["URL","Title","Visited","Duration"], rows:[
        ["https://github.com/bixtx/agent","Agent Repo — GitHub","14:30:00","45m"],
        ["https://shodan.io/search?query=bixtx","Shodan — bixtx","22:03:00","12m"],
        ["https://hackforums.net/showthread","HF Thread #98712","22:45:00","8m"],
      ]},
      "File System":{ cols:["Path","Size","Modified","Type"], rows:[
        ["/home/kivanov/.ssh/id_rsa","3.2 KB","2026-06-01","SSH Private Key"],
        ["/home/kivanov/.aws/credentials","900 B","13:50:00","AWS Creds"],
        ["/home/kivanov/tools/exploit.py","18 KB","22:03:00","Python Script"],
        ["/home/kivanov/Documents/secret_plan.txt","4.1 KB","21:55:00","Text"],
      ]},
      "SMS & Calls":{ cols:["Type","Contact","Preview","Time"], rows:[
        ["Signal","Unknown","Shipment confirmed","22:10:00"],
      ]},
      "Contacts":{ cols:["Name","Handle","Platform","Note"], rows:[
        ["[REDACTED]","@zero_day_m","Telegram","Frequent"],
        ["Backup","+1-555-0199","SMS","Emergency"],
      ]},
      "Media Vault":{ cols:["Filename","Size","Modified","Type"], rows:[
        ["screen_22-03.png","2.1 MB","22:03:00","Screen Capture"],
        ["keylog_dump_2026-07-01.txt","880 KB","22:00:00","Keylog Export"],
      ]},
    },
  };
  const [extractJobs, setExtractJobs] = useState([
    { id:"e1", dev:"EXEC-LAPTOP-01",  type:"Browser History", status:"complete", size:"4.2 MB",  items:1842, ts:"14:20:00" },
    { id:"e2", dev:"MacBook-Pro-M3",   type:"Contacts",        status:"complete", size:"128 KB",  items:312,  ts:"14:18:00" },
    { id:"e3", dev:"Galaxy-S24-Ultra", type:"SMS Log",          status:"running",  size:"—",       items:0,    ts:"14:32:00" },
    { id:"e4", dev:"iPhone-15-Pro",    type:"Media Vault",      status:"queued",   size:"—",       items:0,    ts:"—"        },
    { id:"e5", dev:"DEVBOX-ARCH",     type:"Credentials",      status:"complete", size:"18 KB",   items:27,   ts:"13:55:00" },
  ]);
  const [credentials] = useState([
    { site:"github.com",       user:"k.ivanov",    pass:"••••••••",  dev:"DEVBOX-ARCH",      ts:"13:55:00" },
    { site:"aws.amazon.com",   user:"j.morgan",    pass:"••••••••",  dev:"EXEC-LAPTOP-01",   ts:"14:20:00" },
    { site:"notion.so",        user:"s.chen",      pass:"••••••••",  dev:"MacBook-Pro-M3",    ts:"14:18:00" },
    { site:"slack.com",        user:"t.brooks",    pass:"••••••••",  dev:"WORKSTATION-WIN11", ts:"09:00:00" },
  ]);

  // ── AI engine state ──
  const [anomalies] = useState([
    { id:"a1", dev:"KIOSK-UBUNTU-07", type:"CPU Spike",         risk:"high",   conf:"94%",  det:"14:31:00", desc:"Sustained 78% CPU — potential crypto miner" },
    { id:"a2", dev:"Galaxy-S24-Ultra",type:"Location Jump",     risk:"medium", conf:"87%",  det:"14:28:00", desc:"Device moved 12km in 3 minutes" },
    { id:"a3", dev:"EXEC-LAPTOP-01",  type:"Credential Access", risk:"high",   conf:"91%",  det:"14:20:00", desc:"Mass credential lookup at 02:00 local time" },
    { id:"a4", dev:"MacBook-Pro-M3",   type:"Network Exfil",    risk:"critical",conf:"98%", det:"14:15:00", desc:"3.4 GB outbound to unknown IP 185.x.x.x" },
  ]);
  const [playbooks, setPlaybooks] = useState([
    { id:"p1", name:"Auto-Lock on Threat",      trigger:"critical anomaly",  action:"Lock device + alert admin",         active:true  },
    { id:"p2", name:"Geofence Breach Response", trigger:"geofence exit",     action:"Enable GPS ping every 30s",         active:true  },
    { id:"p3", name:"Exfil Shutdown",           trigger:"large upload >1GB", action:"Block outbound + capture traffic",  active:false },
    { id:"p4", name:"Offline Escalation",       trigger:"device offline 1h", action:"Send SMS alert + enable offline rec",active:true },
  ]);
  const [faceEvents] = useState([
    { ts:"14:30:00", dev:"iPhone-15-Pro",    match:"Known — Raj Patel",    conf:"97%", action:"Unlocked" },
    { ts:"14:28:00", dev:"Galaxy-S24-Ultra", match:"Unknown face",          conf:"—",   action:"Alert sent" },
    { ts:"14:15:00", dev:"Mate60-Pro",       match:"Known — Lei Wei",       conf:"99%", action:"Unlocked" },
  ]);

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
  const [c2Status] = useState({ tunnel:"Tor", hops:3, latency:"340ms", encrypted:true, active:true });
  const [cmdQueue, setCmdQueue] = useState([
    { id:"c1", dev:"EXEC-LAPTOP-01",  cmd:"screenshot",          status:"pending",  ts:"14:32:00" },
    { id:"c2", dev:"KIOSK-UBUNTU-07", cmd:"keylog --dump 100",   status:"running",  ts:"14:31:50" },
    { id:"c3", dev:"MacBook-Pro-M3",   cmd:"file-pull /etc/hosts",status:"complete", ts:"14:31:00" },
  ]);
  const [newCmd, setNewCmd] = useState("");
  const [newCmdDev, setNewCmdDev] = useState("EXEC-LAPTOP-01");

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

  // device filters
  const [search, setSearch]           = useState("");
  const [fStatus, setFStatus]         = useState<DeviceStatus|"all">("all");
  const [fType, setFType]             = useState<"all"|"desktop"|"mobile">("all");
  const [fCountry, setFCountry]       = useState<string>("all");
  const [viewMode, setViewMode]       = useState<"grid"|"list">("grid");

  // modals
  const [showAdd,     setShowAdd]     = useState(false);
  const [showManage,  setShowManage]  = useState(false);
  const [showByIP,    setShowByIP]    = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);
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

  // add-user form
  const [uName,  setUName]  = useState("");
  const [uEmail, setUEmail] = useState("");
  const [uRole,  setURole]  = useState<AppUser["role"]>("viewer");

  // connect-by-IP form
  const [bName, setBName] = useState("");
  const [bIP,   setBIP]   = useState("");
  const [bPort, setBPort] = useState("4433");
  const [bUser, setBUser] = useState("");
  const [bPass, setBPass] = useState("");

  // live metric ticker
  useEffect(() => {
    const iv = setInterval(() => {
      setDevices(prev => prev.map(d => d.status === "offline" ? d : {
        ...d,
        cpu: Math.min(99, Math.max(1, d.cpu + Math.floor(Math.random()*7)-3)),
        ram: Math.min(99, Math.max(10, d.ram + Math.floor(Math.random()*5)-2)),
      }));
    }, 4000);
    return () => clearInterval(iv);
  }, []);

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
    const storedToken = sessionStorage.getItem("admin_token");
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
            sessionStorage.setItem("admin_token", data.token);
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
    setDevices(p => p.filter(d => d.id!==manageDev.id));
    show(`Device removed`, "info"); setShowManage(false);
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

  const handleAddUser = () => {
    if (!uName || !uEmail) { show("Enter name and email", "error"); return; }
    setUsers(p => [...p, { id:`u${Date.now()}`, name:uName, email:uEmail, role:uRole, status:"active", lastLogin:"Never", devices:0 }]);
    show(`User "${uName}" added`); setShowAddUser(false); setUName(""); setUEmail(""); setURole("viewer");
  };

  const handleEndSession   = (id: string) => { setSessions(p => p.filter(s => s.id!==id)); show("Session ended","info"); };
  const handleToggleSess   = (id: string) => {
    setSessions(p => p.map(s => s.id===id ? {...s, status: s.status==="active"?"paused":"active"} : s));
    show("Session updated");
  };
  const handleToggleUser   = (id: string) => {
    setUsers(p => p.map(u => u.id===id ? {...u, status: u.status==="active"?"inactive":"active"} : u));
    show("User status updated");
  };
  const handleRemoveUser   = (id: string) => {
    const u = users.find(x => x.id===id);
    setUsers(p => p.filter(x => x.id!==id));
    show(`"${u?.name}" removed`, "info");
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
    const iv = setInterval(() => {
      setOtaPct(p => {
        if (p===null || p>=100) { clearInterval(iv); show(`OTA pushed to ${online} devices`); setOtaPct(null); return null; }
        return Math.min(p + 10, 100);
      });
    }, 180);
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
    { id:"users",        label:"Users",          badge: users.length    },
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

          {/* Toolbar row 2 — status + type filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex gap-1 p-1 rounded-xl" style={{ background:"#0a1628", border:"1px solid rgba(59,130,246,0.22)" }}>
              {(["all","online","warning","offline"] as const).map(f => (
                <button key={f} onClick={() => setFStatus(f)}
                  className="px-3 py-1.5 rounded-lg text-xs font-mono capitalize transition-all"
                  style={{ background:fStatus===f?"rgba(59,130,246,0.22)":"transparent", color:fStatus===f?"#3b82f6":"#6b8ab0" }}>
                  {f}
                  <span className="ml-1 text-[9px] opacity-60">
                    {f==="all" ? devices.length : devices.filter(d=>d.status===f).length}
                  </span>
                </button>
              ))}
            </div>
            <div className="flex gap-1 p-1 rounded-xl" style={{ background:"#0a1628", border:"1px solid rgba(59,130,246,0.22)" }}>
              {(["all","desktop","mobile"] as const).map(f => (
                <button key={f} onClick={() => setFType(f)}
                  className="px-3 py-1.5 rounded-lg text-xs font-mono capitalize transition-all"
                  style={{ background:fType===f?"rgba(6,182,212,0.2)":"transparent", color:fType===f?"#10d9a0":"#6b8ab0" }}>
                  {f}
                </button>
              ))}
            </div>

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
                <button onClick={() => { setSearch(""); setFStatus("all"); setFType("all"); setFCountry("all"); }}
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
              const sc = d.status==="online"?"#10b981":d.status==="warning"?"#f59e0b":"#6b8ab0";
              return (
                <div key={d.id} className="p-5 rounded-2xl border transition-all duration-200 hover:border-purple-500/50 flex flex-col gap-4"
                  style={{ background:"#0a1628", borderColor:"rgba(59,130,246,0.2)" }}>
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

                  {/* meta */}
                  <div className="text-[10px] font-mono" style={{ color:"#6b8ab0" }}>
                    {d.ip} · {d.location} · Last seen {d.lastSeen}
                  </div>

                  {/* actions */}
                  <div className="flex gap-2 pt-2 border-t" style={{ borderColor:"rgba(59,130,246,0.15)" }}>
                    <button
                      onClick={() => d.status!=="offline" && onControl(d)}
                      disabled={d.status==="offline"}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all hover:opacity-85 disabled:opacity-30 disabled:cursor-not-allowed"
                      style={{ background:"linear-gradient(135deg,#2563eb,#3b82f6)", color:"#fff" }}>
                      <Monitor size={12}/>Connect
                    </button>
                    <button onClick={() => openManage(d)}
                      className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold transition-all hover:opacity-85"
                      style={{ background:"rgba(6,182,212,0.15)", color:"#10d9a0", border:"1px solid rgba(6,182,212,0.3)" }}>
                      <Settings size={12}/>Manage
                    </button>
                    <button onClick={() => show(`Screenshot captured from ${d.name}`,"info")} title="Screenshot"
                      className="p-2 rounded-xl transition-all hover:opacity-85"
                      style={{ background:"rgba(59,130,246,0.1)", color:"#3b82f6", border:"1px solid rgba(59,130,246,0.25)" }}>
                      <Camera size={13}/>
                    </button>
                    <button onClick={() => show(`Shell opened on ${d.name}`,"info")} title="Remote Shell"
                      className="p-2 rounded-xl transition-all hover:opacity-85"
                      style={{ background:"rgba(16,185,129,0.1)", color:"#10b981", border:"1px solid rgba(16,185,129,0.25)" }}>
                      <Terminal size={13}/>
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
              const sc = d.status==="online"?"#10b981":d.status==="warning"?"#f59e0b":"#6b8ab0";
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
                    <button onClick={() => show(`Screenshot from ${d.name}`,"info")} title="Screenshot"
                      className="p-1.5 rounded-lg transition-all hover:opacity-80"
                      style={{ background:"rgba(16,185,129,0.1)", color:"#10b981" }}>
                      <Camera size={12}/>
                    </button>
                    <button onClick={() => show(`Shell opened on ${d.name}`,"info")} title="Remote Shell"
                      className="p-1.5 rounded-lg transition-all hover:opacity-80"
                      style={{ background:"rgba(245,158,11,0.1)", color:"#f59e0b" }}>
                      <Terminal size={12}/>
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

          {/* Quick actions */}
          <div className="rounded-2xl border p-5" style={{ background:"#0a1628", borderColor:"rgba(59,130,246,0.2)" }}>
            <div className="text-[10px] font-mono uppercase tracking-widest mb-3" style={{ color:"#6b8ab0" }}>Quick Actions</div>
            <div className="flex flex-wrap gap-3">
              <ActionBtn onClick={handleOTA} color="#3b82f6" outline>
                <Upload size={13}/>
                {otaPct !== null ? `Pushing… ${otaPct}%` : "Push OTA Update to All"}
              </ActionBtn>
              <ActionBtn onClick={() => setShowQR(true)} color="#10d9a0" outline><Signal size={13}/>Generate Enroll QR</ActionBtn>
              <ActionBtn onClick={() => show("Audit log exported (audit_2026-07-01.csv)","info")} color="#10b981" outline><FileText size={13}/>Export Audit Log</ActionBtn>
              <ActionBtn onClick={() => show("AI health scan complete — all systems nominal")} color="#f59e0b" outline><Activity size={13}/>Run AI Health Scan</ActionBtn>
              <ActionBtn onClick={() => show("Screenshots captured from all online devices","info")} color="#a855f7" outline><Camera size={13}/>Screenshot All</ActionBtn>
              <ActionBtn onClick={() => { setDevices(SEED_DEVICES); show("Devices refreshed"); }} color="#6b8ab0" outline><RefreshCw size={13}/>Refresh</ActionBtn>
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

      {/* ══ USERS ══ */}
      {tab === "users" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="font-black text-lg" style={{ color:"#e2eaf6" }}>User Management</h2>
              <p className="text-xs mt-0.5" style={{ color:"#6b8ab0" }}>{users.filter(u=>u.status==="active").length} active · {users.length} total</p>
            </div>
            <ActionBtn onClick={() => setShowAddUser(true)} color="#3b82f6"><User size={13}/>Add User</ActionBtn>
          </div>
          <div className="rounded-2xl overflow-hidden border" style={{ background:"#0a1628", borderColor:"rgba(59,130,246,0.2)" }}>
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr style={{ borderBottom:"1px solid rgba(59,130,246,0.15)", background:"#0d1930" }}>
                  {["Name","Email","Role","Status","Last Login","Devices","Actions"].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[10px] font-mono uppercase tracking-wider" style={{ color:"#6b8ab0" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className="transition-colors" style={{ borderBottom:"1px solid rgba(59,130,246,0.08)" }}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black" style={{ background:"rgba(59,130,246,0.2)", color:"#3b82f6" }}>
                          {u.name.charAt(0)}
                        </div>
                        <span className="font-semibold text-xs" style={{ color:"#e2eaf6" }}>{u.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs font-mono" style={{ color:"#6b8ab0" }}>{u.email}</td>
                    <td className="px-4 py-3"><Chip color={ROLE_COLOR[u.role]}>{u.role}</Chip></td>
                    <td className="px-4 py-3 text-[10px] font-mono font-bold" style={{ color:u.status==="active"?"#10b981":"#6b8ab0" }}>{u.status}</td>
                    <td className="px-4 py-3 text-xs font-mono" style={{ color:"#6b8ab0" }}>{u.lastLogin}</td>
                    <td className="px-4 py-3 text-xs font-mono" style={{ color:"#b8cce8" }}>{u.devices}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5">
                        <button onClick={() => handleToggleUser(u.id)} title={u.status==="active"?"Deactivate":"Activate"}
                          className="p-1.5 rounded-lg transition-all hover:opacity-80"
                          style={{ background:u.status==="active"?"rgba(239,68,68,0.12)":"rgba(16,185,129,0.12)", color:u.status==="active"?"#ef4444":"#10b981" }}>
                          <Power size={11}/>
                        </button>
                        <button onClick={() => show(`Password reset sent to ${u.email}`,"info")} title="Reset Password"
                          className="p-1.5 rounded-lg transition-all hover:opacity-80"
                          style={{ background:"rgba(59,130,246,0.12)", color:"#3b82f6" }}>
                          <Key size={11}/>
                        </button>
                        <button onClick={() => handleRemoveUser(u.id)} title="Remove"
                          className="p-1.5 rounded-lg transition-all hover:opacity-80"
                          style={{ background:"rgba(239,68,68,0.12)", color:"#ef4444" }}>
                          <X size={11}/>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Authentication Security Panel ── */}
          <div>
            <h3 className="font-black text-base mb-3 flex items-center gap-2" style={{ color:"#e2eaf6" }}>
              <Shield size={16} color="#3b82f6"/> Authentication Security
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Auth health */}
              <div className="col-span-1 p-5 rounded-2xl border" style={{ background:"#0a1628", borderColor:"rgba(59,130,246,0.25)" }}>
                <div className="text-xs font-mono font-bold mb-3" style={{ color:"#3b82f6" }}>AUTH HEALTH</div>
                {[
                  { label:"Brute-Force Guard",  ok:true,  detail:"5-attempt lockout · 60s cooldown" },
                  { label:"TOTP Enforcement",   ok:true,  detail:"6-digit · 30s expiry · 3 tries max" },
                  { label:"Session Timeout",    ok:true,  detail:"15 min inactivity auto-logout" },
                  { label:"Token in URL",       ok:false, detail:"WebSocket token moved to subprotocol" },
                  { label:"Hardcoded Creds",    ok:false, detail:"Removed — server-side cookie auth" },
                  { label:"Device Fingerprint", ok:true,  detail:"Per-session UUID bound to browser" },
                  { label:"Audit Logging",      ok:true,  detail:"Immutable — every attempt recorded" },
                  { label:"IP Restrictions",    ok:true,  detail:"Geo-velocity anomaly detection" },
                ].map(item => (
                  <div key={item.label} className="flex items-start gap-2 py-2 border-b" style={{ borderColor:"rgba(59,130,246,0.08)" }}>
                    <span className="text-[11px] mt-0.5 flex-shrink-0" style={{ color: item.ok ? "#10d9a0" : "#ef4444" }}>
                      {item.ok ? "✓" : "✗"}
                    </span>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold" style={{ color: item.ok ? "#e2eaf6" : "#ef4444" }}>{item.label}</div>
                      <div className="text-[10px] font-mono" style={{ color:"#6b8ab0" }}>{item.detail}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Policy controls */}
              <div className="p-5 rounded-2xl border" style={{ background:"#0a1628", borderColor:"rgba(16,217,160,0.25)" }}>
                <div className="text-xs font-mono font-bold mb-3" style={{ color:"#10d9a0" }}>SECURITY POLICIES</div>
                {Object.entries(secPolicies).map(([label, on]) => (
                  <div key={label} className="flex items-center justify-between py-2.5 border-b" style={{ borderColor:"rgba(59,130,246,0.08)" }}>
                    <span className="text-xs" style={{ color: on ? "#b8cce8" : "#6b8ab0" }}>{label}</span>
                    <button
                      onClick={() => {
                        const next = !on;
                        setSecPolicies(p => ({ ...p, [label]: next }));
                        show(`${label}: ${next ? "ON" : "OFF"}`);
                      }}
                      className="w-9 h-5 rounded-full relative flex-shrink-0 transition-all"
                      style={{ background: on ? "#10d9a0" : "#0f1e3a" }}>
                      <div className="absolute top-0.5 w-4 h-4 rounded-full transition-all" style={{ left: on ? "17px" : "2px", background:"#fff" }}/>
                    </button>
                  </div>
                ))}
                <div className="mt-3">
                  <ActionBtn onClick={() => show("Security policy snapshot saved","success")} color="#10d9a0" full>
                    <Shield size={12}/> Save Policies
                  </ActionBtn>
                </div>
              </div>

              {/* Recent auth events */}
              <div className="p-5 rounded-2xl border" style={{ background:"#0a1628", borderColor:"rgba(245,158,11,0.25)" }}>
                <div className="text-xs font-mono font-bold mb-3" style={{ color:"#f59e0b" }}>RECENT AUTH EVENTS</div>
                {[
                  { ok:true,  ts:"14:32:11", actor:"admin@bixtx.com",  event:"Login success · 2FA verified",       ip:"192.168.1.42" },
                  { ok:false, ts:"14:20:03", actor:"unknown",           event:"Failed login · bad password (3/5)",  ip:"45.33.32.156" },
                  { ok:false, ts:"13:58:44", actor:"unknown",           event:"Brute-force blocked · 5 attempts",   ip:"45.33.32.156" },
                  { ok:true,  ts:"13:10:07", actor:"ops@bixtx.com",    event:"Login success · 2FA verified",       ip:"10.0.0.15" },
                  { ok:false, ts:"12:44:20", actor:"unknown",           event:"Invalid TOTP code (3/3) · locked",   ip:"198.51.100.9" },
                  { ok:true,  ts:"09:01:55", actor:"admin@bixtx.com",  event:"Session expired · auto-logout",      ip:"192.168.1.42" },
                ].map((ev, i) => (
                  <div key={i} className="flex items-start gap-2 py-2 border-b" style={{ borderColor:"rgba(59,130,246,0.08)" }}>
                    <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: ev.ok ? "#10d9a0" : "#ef4444" }}/>
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] font-mono" style={{ color: ev.ok ? "#10d9a0" : "#ef4444" }}>{ev.ts} · {ev.ip}</div>
                      <div className="text-xs font-semibold truncate" style={{ color:"#b8cce8" }}>{ev.actor}</div>
                      <div className="text-[10px]" style={{ color:"#6b8ab0" }}>{ev.event}</div>
                    </div>
                  </div>
                ))}
                <div className="mt-3">
                  <ActionBtn onClick={() => show("Full audit log exported","info")} color="#f59e0b" outline full>
                    <Download size={12}/> Export Audit Log
                  </ActionBtn>
                </div>
              </div>
            </div>
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
              {[
                { id:"c1", dev:"Galaxy-S24-Ultra", from:"+1-555-0142", to:"r.okafor",    dir:"incoming", dur:"4:32", size:"3.1 MB", ts:"14:28:00", status:"recorded" },
                { id:"c2", dev:"iPhone-15-Pro",    from:"a.patel",    to:"+91-98201-xxxx",dir:"outgoing", dur:"12:07",size:"8.4 MB", ts:"14:15:00", status:"recorded" },
                { id:"c3", dev:"Mate60-Pro",       from:"+86-139-xxxx",to:"l.wei",       dir:"incoming", dur:"2:18", size:"1.6 MB", ts:"13:55:00", status:"recorded" },
                { id:"c4", dev:"EXEC-LAPTOP-01",   from:"j.morgan",   to:"+1-555-0001",   dir:"outgoing", dur:"8:44", size:"6.1 MB", ts:"13:30:00", status:"recorded" },
                { id:"c5", dev:"Galaxy-S24-Ultra", from:"Unknown",    to:"r.okafor",      dir:"incoming", dur:"0:43", size:"0.5 MB", ts:"13:10:00", status:"flagged"  },
              ].map(call => (
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
              const ALL_MESSAGES = [
                { platform:"WhatsApp",  icon:"💚", color:"#25d366", dev:"Galaxy-S24-Ultra", from:"r.okafor",       to:"Sarah M.",       msg:"The package will arrive tomorrow. Don't tell anyone.",          ts:"14:31", type:"text",  flagged:true  },
                { platform:"Telegram",  icon:"✈️", color:"#0088cc", dev:"DEVBOX-ARCH",      from:"k.ivanov",       to:"@secure_chan",    msg:"Files uploaded to channel. Check the link.",                    ts:"14:28", type:"text",  flagged:true  },
                { platform:"Instagram", icon:"📸", color:"#e1306c", dev:"iPhone-15-Pro",    from:"a.patel",        to:"@partner_acc",   msg:"[Voice Message — 0:34]",                                        ts:"14:25", type:"voice", flagged:false },
                { platform:"Messenger", icon:"🔵", color:"#0084ff", dev:"EXEC-LAPTOP-01",   from:"j.morgan",       to:"Board Group",    msg:"Acquisition confirmed for Q3. Keep this between us.",           ts:"14:20", type:"text",  flagged:true  },
                { platform:"WhatsApp",  icon:"💚", color:"#25d366", dev:"iPhone-15-Pro",    from:"+91-98201-xxxx", to:"a.patel",        msg:"Your OTP is 847291. Do not share with anyone.",                ts:"14:18", type:"text",  flagged:false },
                { platform:"WeChat",    icon:"🟢", color:"#07c160", dev:"Mate60-Pro",       from:"l.wei",          to:"李总",            msg:"[Image Attachment — 2.3 MB]",                                  ts:"14:15", type:"image", flagged:false },
                { platform:"Telegram",  icon:"✈️", color:"#0088cc", dev:"EXEC-LAPTOP-01",   from:"j.morgan",       to:"@anon_drop",     msg:"Password: C0nfident!al2026",                                   ts:"14:10", type:"text",  flagged:true  },
                { platform:"X/Twitter", icon:"🐦", color:"#1da1f2", dev:"MacBook-Pro-M3",   from:"s.chen",         to:"@dm_contact",    msg:"Can we talk privately? Something important came up.",           ts:"14:05", type:"dm",    flagged:false },
                { platform:"Snapchat",  icon:"👻", color:"#fffc00", dev:"Galaxy-S24-Ultra", from:"r.okafor",       to:"@snap_contact",  msg:"[Disappearing Photo — captured before delete]",                 ts:"14:00", type:"snap",  flagged:true  },
                { platform:"TikTok",    icon:"🎵", color:"#69c9d0", dev:"iPhone-15-Pro",    from:"a.patel",        to:"@tiktok_user",   msg:"[DM: Hey, saw your post. Meet me at the location?]",           ts:"13:55", type:"dm",    flagged:false },
                { platform:"Instagram", icon:"📸", color:"#e1306c", dev:"Galaxy-S24-Ultra", from:"r.okafor",       to:"@insta_user",    msg:"Story reply: Come to the meet point tonight",                   ts:"13:40", type:"dm",    flagged:true  },
                { platform:"Snapchat",  icon:"👻", color:"#fffc00", dev:"iPhone-15-Pro",    from:"a.patel",        to:"@snap2",         msg:"[Disappearing Video — 15s captured before delete]",             ts:"13:35", type:"snap",  flagged:false },
              ];
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
              const CAM_RECS = [
                { id:"cr1", dev:"EXEC-LAPTOP-01",  cam:"Front Camera",  trigger:"motion",    dur:"0:42", size:"28 MB",  ts:"14:31:00", flagged:true,  thumb:"👤" },
                { id:"cr2", dev:"iPhone-15-Pro",   cam:"Front Camera",  trigger:"scheduled", dur:"5:00", size:"180 MB", ts:"14:30:00", flagged:false, thumb:"🌆" },
                { id:"cr3", dev:"Galaxy-S24-Ultra",cam:"Rear Camera",   trigger:"manual",    dur:"2:15", size:"96 MB",  ts:"14:25:00", flagged:false, thumb:"🏙" },
                { id:"cr4", dev:"MacBook-Pro-M3",  cam:"FaceTime HD",   trigger:"motion",    dur:"1:08", size:"41 MB",  ts:"14:20:00", flagged:true,  thumb:"👥" },
                { id:"cr5", dev:"Mate60-Pro",       cam:"Rear 50MP",    trigger:"scheduled", dur:"10:00",size:"620 MB", ts:"14:00:00", flagged:false, thumb:"🌃" },
                { id:"cr6", dev:"KIOSK-UBUNTU-07", cam:"USB Webcam",    trigger:"motion",    dur:"0:15", size:"8 MB",   ts:"13:55:00", flagged:true,  thumb:"🚨" },
              ];
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
            {[
              { dev:"EXEC-LAPTOP-01",  pattern:"Stationary — Office",       risk:"low",    insight:"Daily routine normal. Always at 40.71°N on weekdays.",          anomaly:false },
              { dev:"Galaxy-S24-Ultra",pattern:"High-Speed Movement",       risk:"high",   insight:"42 km/h movement detected — possible vehicle. Route deviates.",  anomaly:true  },
              { dev:"iPhone-15-Pro",   pattern:"Stationary — Residential",  risk:"low",    insight:"Home location 19.07°N. Movement matches commute baseline.",      anomaly:false },
              { dev:"MacBook-Pro-M3",  pattern:"Office — Singapore CBD",    risk:"low",    insight:"Static in Singapore HQ. Last exit: Yesterday 18:30.",            anomaly:false },
              { dev:"Mate60-Pro",      pattern:"Urban Movement",            risk:"medium", insight:"Moving through Shanghai Pudong. Unusual late-night activity.",    anomaly:true  },
            ].map((m,i) => (
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
        const devData   = DEVICE_EXTRACT_DATA[devLabel] ?? DEVICE_EXTRACT_DATA["iPhone-15-Pro"];
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
              {[
                { from:"+1-555-0142", to:"Galaxy-S24-Ultra", msg:"Meeting at 3pm — bring the documents",        ts:"14:28" },
                { from:"Galaxy-S24-Ultra", to:"+1-555-0198", msg:"Ok confirmed. Transfer done.",                ts:"14:27" },
                { from:"+44-7700-900142", to:"iPhone-15-Pro", msg:"Hi Raj, password for portal is Raj2024!", ts:"14:20" },
                { from:"iPhone-15-Pro",   to:"+91-98201-xxxxx",msg:"Got it. Will login now",                   ts:"14:21" },
                { from:"+86-139-xxxx",    to:"Mate60-Pro",    msg:"文件已发送 (Files sent)",                    ts:"14:15" },
              ].map((s,i) => (
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
              {[
                { name:"Sarah Mitchell",   phone:"+1-555-0198", email:"s.mitchell@corp.io",  dev:"EXEC-LAPTOP-01" },
                { name:"Dr. Ahmed Hassan", phone:"+44-7700-9001",email:"a.hassan@gov.uk",    dev:"iPhone-15-Pro"  },
                { name:"李明 (Li Ming)",   phone:"+86-139-0001", email:"li.ming@cn-corp.com", dev:"Mate60-Pro"     },
                { name:"Dmitri Volkov",    phone:"+7-916-5559",  email:"d.volkov@fsb.ru",    dev:"DEVBOX-ARCH"    },
                { name:"CEO — Board Line", phone:"+1-555-0001",  email:"ceo@headquarters.io", dev:"EXEC-LAPTOP-01"},
              ].map((ct,i) => (
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
                {[
                  {name:"James Morgan",conf:"99.1%",last:"14:32",dev:"EXEC-LAPTOP-01",status:"matched"},
                  {name:"Sofia Chen",  conf:"97.8%",last:"14:28",dev:"MacBook-Pro-M3", status:"matched"},
                  {name:"UNKNOWN",     conf:"—",    last:"14:25",dev:"Galaxy-S24-Ultra",status:"alert"},
                  {name:"Lei Wei",     conf:"98.4%",last:"14:20",dev:"Mate60-Pro",     status:"matched"},
                ].map((v,i) => (
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
              {[
                { ts:"14:31:58", dev:"MacBook-Pro-M3",   kw:"secret",     ctx:"...the secret API key is sk-ant...", risk:"high"   },
                { ts:"14:30:44", dev:"EXEC-LAPTOP-01",  kw:"acquisition", ctx:"...the acquisition deal closes...",  risk:"medium" },
                { ts:"14:29:12", dev:"KIOSK-UBUNTU-07", kw:"password",    ctx:"...new password: P@ssw0rd123...",    risk:"critical"},
                { ts:"14:28:00", dev:"iPhone-15-Pro",   kw:"bitcoin",     ctx:"...send 0.5 BTC to wallet...",       risk:"high"   },
              ].map((m,i) => (
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
              {[
                { name:"James Morgan",  conf:"99.1%", last:"14:32:00", dev:"EXEC-LAPTOP-01",  status:"matched" },
                { name:"Sofia Chen",    conf:"97.8%", last:"14:28:00", dev:"MacBook-Pro-M3",   status:"matched" },
                { name:"UNKNOWN VOICE", conf:"—",     last:"14:25:00", dev:"Galaxy-S24-Ultra", status:"alert"   },
                { name:"Lei Wei",       conf:"98.4%", last:"14:20:00", dev:"Mate60-Pro",       status:"matched" },
              ].map((v,i) => (
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
                {val:"online",label:"Online"},{val:"offline",label:"Offline"},{val:"warning",label:"Warning"},
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

      {/* ══ ADD USER MODAL ══ */}
      <Modal open={showAddUser} onClose={() => setShowAddUser(false)} title="Add New User">
        <div className="space-y-4">
          <FLabel label="Full Name"><FInput value={uName} onChange={setUName} placeholder="e.g. Jane Smith"/></FLabel>
          <FLabel label="Email Address"><FInput value={uEmail} onChange={setUEmail} placeholder="jane@corp.io"/></FLabel>
          <FLabel label="Role">
            <FSelect value={uRole} onChange={v => setURole(v as AppUser["role"])} options={[
              {val:"admin",    label:"Admin — full access"},
              {val:"operator", label:"Operator — manage devices"},
              {val:"viewer",   label:"Viewer — read only"},
            ]}/>
          </FLabel>
          <div className="flex justify-end gap-3 pt-2 border-t" style={{ borderColor:"rgba(59,130,246,0.15)" }}>
            <ActionBtn onClick={() => setShowAddUser(false)} color="#6b8ab0" outline>Cancel</ActionBtn>
            <ActionBtn onClick={handleAddUser} color="#3b82f6"><User size={13}/>Add User</ActionBtn>
          </div>
        </div>
      </Modal>

      {/* ══ QR MODAL ══ */}
      {showQR && <AdminQRModal onClose={() => setShowQR(false)} show={show} />}
    </div>
  );
}


