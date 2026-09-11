import { useState, useEffect, useRef } from "react";
import QRCode from "qrcode";
import {
  Shield, Download, Cpu, Lock, Monitor, Smartphone,
  ChevronDown, ChevronRight, Check, Zap,
  Camera, Mic, HardDrive, AlertTriangle, Terminal, ArrowRight,
  Activity, Server, Key, RefreshCw, Signal,
  LayoutDashboard, LayoutGrid, List, Settings, LogOut, Bell, Search, Play, Pause,
  Square, Clipboard, FolderOpen, Volume2, VolumeX, Maximize2,
  RotateCcw, MousePointer, Keyboard, Wifi as WifiIcon,
  Circle, X, Menu,
  BookOpen, Code, FileText, HelpCircle, Star,
  CreditCard, Building, User, Minus,
  BarChart2, Power, Upload, AlertCircle,
  MessageSquare, Sparkles, Send, Database, Cloud, ChevronUp,
  PhoneCall, HeartPulse, Thermometer, Volume2 as SoundWave, Timer, XCircle,
  Paperclip, Mic as MicIcon, Video, VideoOff, MicOff, Image, FileCode2,
  Wand2, StopCircle, FileUp, Film,
  Globe, Bluetooth, Network, Ban,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────
type Page = "download" | "login" | "dashboard" | "remote" | "pricing" | "docs" | "security-ops" | "siem" | "link-agent" | "ai-chat";
type OS = "windows" | "macos" | "linux" | "android" | "ios" | "harmony";
type Software = "agent" | "platform";
type DeviceStatus = "online" | "offline" | "warning";
type DeployStatus = "pending-approval" | "approved" | "running" | "paused" | "success" | "failed" | "rolled-back" | "contained";

interface DeployJob {
  id: string; target: string;
  type: "agent-install" | "agent-update" | "config-push" | "code-deploy" | "rollback";
  status: DeployStatus; version: string;
  initiator: "ai-auto" | "admin" | "watchdog";
  progress: number; risk: "low" | "medium" | "high" | "critical";
  checksum: string; rollbackVersion?: string; ts: string; log: string[];
}

interface NetworkIface {
  id: string; name: string;
  type: "ethernet" | "wifi" | "bluetooth" | "lan" | "wan" | "offline";
  status: "connected" | "disconnected" | "scanning";
  ip?: string; mac?: string; devices: number; speed?: string;
  signal?: number; ssid?: string; label?: string;
}

interface Device {
  id: string; name: string; os: OS; ip: string; user: string;
  status: DeviceStatus; cpu: number; ram: number; battery?: number;
  latency: number; uptime: string; location: string; lastSeen: string;
}

interface PlatformVersion { label: string; arch?: string; format: string; size: string; build: string; }
interface Platform { id: OS; label: string; icon: string; category: "desktop" | "mobile"; color: string; versions?: PlatformVersion[]; }

interface EmergencyAlert {
  alertId: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  type: string;
  title: string;
  detail: string;
  deviceId: string;
  deviceDetail?: { name: string };
  userDetail?: { fullName: string };
  geopolitical?: { city: string; country: string };
  emergencyContacts?: { name: string; number: string }[];
  ts: number;
}

// ─── Constants ──────────────────────────────────────────────────────────────
const VERSION = "4.7.2";
const BUILD = "20260701";

const CHANNELS = [
  { label: "Stable", tag: "stable",  color: "#10b981", version: VERSION },
  { label: "Beta",   tag: "beta",    color: "#f59e0b", version: "4.8.0-beta.3" },
  { label: "Canary", tag: "canary",  color: "#ef4444", version: "4.9.0-canary.11" },
];

const MOCK_DEVICES: Device[] = [
  { id: "d1", name: "EXEC-LAPTOP-01", os: "windows", ip: "192.168.1.42", user: "j.morgan", status: "online", cpu: 34, ram: 61, battery: 87, latency: 6, uptime: "14d 3h", location: "New York, US", lastSeen: "Now" },
  { id: "d2", name: "MacBook-Pro-M3", os: "macos", ip: "192.168.1.55", user: "s.chen", status: "online", cpu: 22, ram: 48, battery: 94, latency: 4, uptime: "6d 11h", location: "Singapore", lastSeen: "Now" },
  { id: "d3", name: "KIOSK-UBUNTU-07", os: "linux", ip: "10.0.0.7", user: "root", status: "online", cpu: 78, ram: 82, latency: 9, uptime: "41d 2h", location: "Frankfurt, DE", lastSeen: "Now" },
  { id: "d4", name: "Galaxy-S24-Ultra", os: "android", ip: "192.168.1.88", user: "r.okafor", status: "warning", cpu: 91, ram: 74, battery: 23, latency: 14, uptime: "2d 7h", location: "Lagos, NG", lastSeen: "2m ago" },
  { id: "d5", name: "iPhone-15-Pro", os: "ios", ip: "192.168.2.11", user: "a.patel", status: "online", cpu: 18, ram: 55, battery: 72, latency: 5, uptime: "3d 19h", location: "Mumbai, IN", lastSeen: "Now" },
  { id: "d6", name: "Mate60-Pro", os: "harmony", ip: "10.0.1.4", user: "l.wei", status: "online", cpu: 29, ram: 44, battery: 61, latency: 7, uptime: "9d 4h", location: "Shanghai, CN", lastSeen: "Now" },
  { id: "d7", name: "WORKSTATION-WIN11", os: "windows", ip: "10.0.0.22", user: "t.brooks", status: "offline", cpu: 0, ram: 0, latency: 0, uptime: "—", location: "London, UK", lastSeen: "3h ago" },
  { id: "d8", name: "DEVBOX-ARCH", os: "linux", ip: "10.0.0.31", user: "k.ivanov", status: "online", cpu: 55, ram: 67, latency: 11, uptime: "88d 6h", location: "Moscow, RU", lastSeen: "Now" },
];

const MOCK_DEPLOY_JOBS: DeployJob[] = [
  { id:"dj1", target:"EXEC-LAPTOP-01",   type:"agent-update",  status:"pending-approval", version:"4.7.3", initiator:"ai-auto",  progress:0,   risk:"medium",   checksum:"a3f9c1d2", ts:"14:35:00", log:["Package validated","SHA-256 verified","Awaiting approval"] },
  { id:"dj2", target:"KIOSK-UBUNTU-07",  type:"agent-update",  status:"running",           version:"4.7.3", initiator:"ai-auto",  progress:62,  risk:"medium",   checksum:"a3f9c1d2", ts:"14:33:00", log:["Approved 14:33:12","Downloading 4.7.3","Installing modules…"] },
  { id:"dj3", target:"MacBook-Pro-M3",   type:"config-push",   status:"success",           version:"4.7.2", initiator:"admin",    progress:100, risk:"low",      checksum:"b1e4f7a8", ts:"14:20:00", log:["Approved","Pushed","Verified — agent healthy"] },
  { id:"dj4", target:"Galaxy-S24-Ultra", type:"agent-install",  status:"failed",            version:"4.7.2", initiator:"ai-auto",  progress:38,  risk:"high",     checksum:"c9d2e5b3", ts:"14:18:00", log:["Approved","Partial install","Host unreachable at 38%","Auto-rollback triggered","Rollback complete"] },
  { id:"dj5", target:"DEVBOX-ARCH",      type:"code-deploy",   status:"pending-approval",  version:"4.7.3-patch.1", initiator:"ai-auto", progress:0, risk:"critical", checksum:"d7a1f2c8", ts:"14:40:00", log:["AI self-generated patch","Module: sensors.js","Diff: +47 -12 lines","Awaiting admin approval"] },
  { id:"dj6", target:"iPhone-15-Pro",    type:"agent-update",  status:"paused",            version:"4.7.3", initiator:"watchdog", progress:25,  risk:"medium",   checksum:"a3f9c1d2", ts:"14:28:00", log:["Watchdog initiated","Approved","Installing","Paused by admin at 25%"] },
  { id:"dj7", target:"Mate60-Pro",       type:"agent-update",  status:"rolled-back",       version:"4.7.3", initiator:"ai-auto",  progress:0,   risk:"high",     checksum:"a3f9c1d2", rollbackVersion:"4.7.2", ts:"14:10:00", log:["Deployed","Agent crash detected","Rollback to 4.7.2","Rollback verified"] },
];

const MOCK_NET_IFACES: NetworkIface[] = [
  { id:"ni1", name:"eth0",         type:"ethernet",  status:"connected",    ip:"192.168.1.1",  mac:"00:1A:2B:3C:4D:5E", devices:12, speed:"1 Gbps",  label:"Primary LAN" },
  { id:"ni2", name:"wlan0",        type:"wifi",      status:"connected",    ip:"192.168.1.42", mac:"AA:BB:CC:DD:EE:FF", devices:8,  speed:"802.11ac", signal:82, ssid:"HQ-Secure-5G", label:"Office WiFi" },
  { id:"ni3", name:"wlan1",        type:"wifi",      status:"scanning",     ip:undefined,      mac:"11:22:33:44:55:66", devices:3,  speed:"802.11ax", signal:45, ssid:"Guest-Net",    label:"Guest RF" },
  { id:"ni4", name:"bt0",          type:"bluetooth", status:"connected",    ip:undefined,      mac:"F0:18:98:A1:B2:C3", devices:5,  speed:"BT 5.0",  label:"BT Peripherals" },
  { id:"ni5", name:"lan-sw-1",     type:"lan",       status:"connected",    ip:"10.0.0.1",     mac:undefined,           devices:24, speed:"10G",     label:"Campus LAN" },
  { id:"ni6", name:"wan0",         type:"wan",       status:"connected",    ip:"203.0.113.42", mac:undefined,           devices:0,  speed:"1 Gbps",  label:"Internet Uplink" },
  { id:"ni7", name:"tun0",         type:"wan",       status:"connected",    ip:"10.8.0.1",     mac:undefined,           devices:6,  speed:"VPN",     label:"VPN Tunnel (Tor)" },
  { id:"ni8", name:"eth1",         type:"offline",   status:"disconnected", ip:undefined,      mac:"00:1A:2B:3C:4D:5F", devices:0,  speed:"1 Gbps",  label:"Backup Link (down)" },
];

const ALERTS = [
  { id: 1, level: "critical", msg: "Galaxy-S24-Ultra: Battery at 23% — remote power warning", time: "2m ago" },
  { id: 2, level: "warning", msg: "KIOSK-UBUNTU-07: CPU at 78% — anomaly detected", time: "8m ago" },
  { id: 3, level: "info", msg: "New device enrolled: Pixel-9-Pro via QR code", time: "34m ago" },
  { id: 4, level: "info", msg: "OTA agent update pushed to 6 devices successfully", time: "1h ago" },
  { id: 5, level: "success", msg: "WORKSTATION-WIN11 came offline — offline recording active", time: "3h ago" },
];

const MOCK_EMERGENCY_ALERTS: EmergencyAlert[] = [
  {
    alertId: "EA-001",
    severity: "CRITICAL",
    type: "BATTERY",
    title: "Critical Battery on Galaxy-S24-Ultra",
    detail: "Device battery at 23%. Remote power warning triggered. Immediate action required to prevent data loss.",
    deviceId: "d4",
    deviceDetail: { name: "Galaxy-S24-Ultra" },
    userDetail: { fullName: "R. Okafor" },
    geopolitical: { city: "Lagos", country: "NG" },
    emergencyContacts: [{ name: "IT Support", number: "+1-555-0199" }, { name: "R. Okafor", number: "+234-800-0000" }],
    ts: Date.now() - 120000,
  },
  {
    alertId: "EA-002",
    severity: "HIGH",
    type: "CPU",
    title: "CPU Anomaly Detected",
    detail: "KIOSK-UBUNTU-07 CPU sustained at 78% — potential crypto miner or unauthorized process.",
    deviceId: "d3",
    deviceDetail: { name: "KIOSK-UBUNTU-07" },
    userDetail: { fullName: "System" },
    geopolitical: { city: "Frankfurt", country: "DE" },
    ts: Date.now() - 480000,
  },
  {
    alertId: "EA-003",
    severity: "CRITICAL",
    type: "NETWORK",
    title: "Suspicious Outbound Connection",
    detail: "MacBook-Pro-M3 initiated 3.4 GB transfer to unknown IP 185.220.101.x via non-standard port.",
    deviceId: "d2",
    deviceDetail: { name: "MacBook-Pro-M3" },
    userDetail: { fullName: "S. Chen" },
    geopolitical: { city: "Singapore", country: "SG" },
    emergencyContacts: [{ name: "Security Ops", number: "+1-555-0911" }],
    ts: Date.now() - 900000,
  },
];

const ALERT_ICON: Record<string, string> = {
  BATTERY: "🔋",
  CPU: "🌡️",
  NETWORK: "🌐",
  AUTH: "🔐",
  MALWARE: "🦠",
  DEFAULT: "🚨",
};

const OS_COLOR: Record<OS, string> = {
  windows: "#00adef", macos: "#a8a8a8", linux: "#f59e0b",
  android: "#3ddc84", ios: "#a0aec0", harmony: "#cf0a2c",
};
const OS_ICON: Record<OS, string> = {
  windows: "⊞", macos: "⌘", linux: "◉", android: "◆", ios: "◇", harmony: "◈",
};
const OS_LABEL: Record<OS, string> = {
  windows: "Windows", macos: "macOS", linux: "Linux",
  android: "Android", ios: "iOS", harmony: "HarmonyOS",
};

const PLATFORMS: Platform[] = [
  { id: "windows", label: "Windows", icon: "⊞", category: "desktop", color: "#00adef",
    versions: [
      { label: "Windows x64 Installer", arch: "x64", format: ".exe", size: "87.4 MB", build: BUILD },
      { label: "Windows ARM64 Installer", arch: "arm64", format: ".exe", size: "84.1 MB", build: BUILD },
      { label: "Windows x64 MSI Package", arch: "x64", format: ".msi", size: "91.2 MB", build: BUILD },
    ] },
  { id: "macos", label: "macOS", icon: "⌘", category: "desktop", color: "#a8a8a8",
    versions: [
      { label: "macOS Apple Silicon", arch: "arm64", format: ".dmg", size: "79.6 MB", build: BUILD },
      { label: "macOS Intel", arch: "x64", format: ".dmg", size: "82.3 MB", build: BUILD },
      { label: "macOS Universal PKG", arch: "universal", format: ".pkg", size: "153.1 MB", build: BUILD },
    ] },
  { id: "linux", label: "Linux", icon: "◉", category: "desktop", color: "#f59e0b",
    versions: [
      { label: "Debian / Ubuntu Package", format: ".deb", size: "74.8 MB", build: BUILD },
      { label: "Red Hat / Fedora Package", format: ".rpm", size: "75.2 MB", build: BUILD },
      { label: "AppImage (Universal)", format: ".AppImage", size: "88.9 MB", build: BUILD },
      { label: "Arch Linux (AUR)", format: ".tar.zst", size: "71.3 MB", build: BUILD },
    ] },
  { id: "android", label: "Android", icon: "◆", category: "mobile", color: "#3ddc84",
    versions: [
      { label: "Android APK (Universal)", format: ".apk", size: "48.7 MB", build: BUILD },
      { label: "Android APK (arm64-v8a)", arch: "arm64", format: ".apk", size: "36.2 MB", build: BUILD },
      { label: "Android App Bundle", format: ".aab", size: "52.1 MB", build: BUILD },
    ] },
  { id: "ios", label: "iOS / iPadOS", icon: "◇", category: "mobile", color: "#a0aec0",
    versions: [
      { label: "iOS IPA (Sideload)", format: ".ipa", size: "61.4 MB", build: BUILD },
      { label: "iOS via TestFlight", format: "TestFlight", size: "—", build: BUILD },
    ] },
  { id: "harmony", label: "HarmonyOS", icon: "◈", category: "mobile", color: "#cf0a2c",
    versions: [
      { label: "HarmonyOS NEXT HAP", format: ".hap", size: "44.9 MB", build: BUILD },
      { label: "HarmonyOS 4.x HAP", format: ".hap", size: "41.2 MB", build: BUILD },
    ] },
];

const AGENT_PLATFORMS: Platform[] = [
  { id: "windows", label: "Windows Agent", icon: "⊞", category: "desktop", color: "#00adef",
    versions: [
      { label: "Windows Agent x64", format: ".exe", size: "3.2 MB", build: BUILD },
      { label: "Windows Agent ARM64", format: ".exe", size: "3.0 MB", build: BUILD },
      { label: "Windows Service MSI", format: ".msi", size: "4.1 MB", build: BUILD },
    ] },
  { id: "macos", label: "macOS Agent", icon: "⌘", category: "desktop", color: "#a8a8a8",
    versions: [
      { label: "macOS Agent (Silicon)", format: ".pkg", size: "2.8 MB", build: BUILD },
      { label: "macOS Agent (Intel)", format: ".pkg", size: "2.9 MB", build: BUILD },
    ] },
  { id: "linux", label: "Linux Agent", icon: "◉", category: "desktop", color: "#f59e0b",
    versions: [
      { label: "Linux Agent .deb", format: ".deb", size: "2.6 MB", build: BUILD },
      { label: "Linux Agent .rpm", format: ".rpm", size: "2.7 MB", build: BUILD },
      { label: "Linux Agent Shell Script", format: ".sh", size: "1.1 MB", build: BUILD },
    ] },
  { id: "android", label: "Android Agent", icon: "◆", category: "mobile", color: "#3ddc84",
    versions: [{ label: "Android Agent APK", format: ".apk", size: "12.4 MB", build: BUILD }] },
  { id: "ios", label: "iOS Agent", icon: "◇", category: "mobile", color: "#a0aec0",
    versions: [{ label: "iOS Agent IPA", format: ".ipa", size: "14.6 MB", build: BUILD }] },
  { id: "harmony", label: "HarmonyOS Agent", icon: "◈", category: "mobile", color: "#cf0a2c",
    versions: [{ label: "HarmonyOS Agent HAP", format: ".hap", size: "9.8 MB", build: BUILD }] },
];

const REQUIREMENTS: Record<OS, { min: string[]; rec: string[] }> = {
  windows: { min: ["Windows 10 1903+", "4 GB RAM", "2 GB disk", "x64 / ARM64"], rec: ["Windows 11 23H2+", "16 GB RAM", "10 GB SSD", "Intel i5 / Ryzen 5"] },
  macos:   { min: ["macOS 12 Monterey+", "4 GB RAM", "2 GB disk"], rec: ["macOS 14 Sonoma+", "16 GB RAM", "Apple M-series"] },
  linux:   { min: ["Kernel 5.4+, glibc 2.31+", "2 GB RAM", "1.5 GB disk"], rec: ["Ubuntu 24.04 / Fedora 40", "8 GB RAM", "SSD"] },
  android: { min: ["Android 8.0 (API 26)", "2 GB RAM"], rec: ["Android 12+ (API 31)", "6 GB RAM"] },
  ios:     { min: ["iOS 15 / iPadOS 15+", "iPhone XR+"], rec: ["iOS 17+", "iPhone 13+ / iPad Pro M"] },
  harmony: { min: ["HarmonyOS 4.0+", "3 GB RAM"], rec: ["HarmonyOS NEXT", "8 GB RAM", "Mate 60 / P60"] },
};

const DOCS_SECTIONS = [
  { id: "quickstart", label: "Quick Start", icon: <Zap size={13} /> },
  { id: "install-agent", label: "Open AI Agent", icon: <Server size={13} /> },
  { id: "remote-control", label: "Remote Control", icon: <Monitor size={13} /> },
  { id: "wifi-scanner", label: "WiFi Scanner", icon: <WifiIcon size={13} /> },
  { id: "api", label: "REST API Reference", icon: <Code size={13} /> },
  { id: "security", label: "Security & Encryption", icon: <Lock size={13} /> },
  { id: "enterprise", label: "Enterprise Deployment", icon: <Building size={13} /> },
  { id: "faq", label: "FAQ", icon: <HelpCircle size={13} /> },
];

const DOCS_CONTENT: Record<string, { title: string; body: React.ReactNode }> = {
  quickstart: {
    title: "Quick Start",
    body: (
      <div className="space-y-6">
        <p style={{ color: "#b8cce8" }}>Get bixtx running on your first device in under 5 minutes.</p>
        <div>
          <h3 className="font-bold mb-3" style={{ color: "#3b82f6" }}>1. Install the App Platform (Software B)</h3>
          <p className="text-sm mb-3" style={{ color: "#6b8ab0" }}>Download and install the App Platform on your control device from the Downloads page.</p>
          <CodeBlock lang="bash">{`# macOS (Homebrew)
brew install --cask bixtx-ai

# Linux
wget https://releases.bixtx.com/latest/bixtx-ai.AppImage
chmod +x bixtx-ai.AppImage && ./bixtx-ai.AppImage`}</CodeBlock>
        </div>
        <div>
          <h3 className="font-bold mb-3" style={{ color: "#3b82f6" }}>2. Create your admin account</h3>
          <p className="text-sm" style={{ color: "#6b8ab0" }}>Launch the app, go to Admin Console and register. Your admin credentials are stored locally with AES-256 encryption.</p>
        </div>
        <div>
          <h3 className="font-bold mb-3" style={{ color: "#3b82f6" }}>3. Enroll your first device</h3>
          <CodeBlock lang="bash">{`# Generate an install link from your dashboard, or use the CLI:
bixtx link --generate --ttl 24h --label "My Laptop"
# → https://enroll.bixtx.com/l/xK9mP2qR`}</CodeBlock>
        </div>
        <InfoBox color="#10b981">Device appears in your dashboard within <strong>30–60 seconds</strong> of agent installation.</InfoBox>
      </div>
    ),
  },
  "install-agent": {
    title: "Open AI Agent",
    body: (
      <div className="space-y-6">
        <p style={{ color: "#b8cce8" }}>Software A (Link Agent) is the ultra-lightweight (&lt;15 MB) background service that runs on monitored devices.</p>
        <div>
          <h3 className="font-bold mb-3" style={{ color: "#3b82f6" }}>Silent Windows Installation</h3>
          <CodeBlock lang="powershell">{`# Run as Administrator — installs as a Windows Service
.\\bixtx-agent-setup.exe /S /KEY=YOUR_ENROLL_KEY /SILENT

# Verify service is running
Get-Service -Name "bixtx.comAgent"`}</CodeBlock>
        </div>
        <div>
          <h3 className="font-bold mb-3" style={{ color: "#3b82f6" }}>Linux One-Liner</h3>
          <CodeBlock lang="bash">{`curl -sSL https://get.bixtx.com | bash -s -- \\
  --key YOUR_ENROLL_KEY \\
  --silent \\
  --service systemd`}</CodeBlock>
        </div>
        <div>
          <h3 className="font-bold mb-3" style={{ color: "#3b82f6" }}>Android Sideload</h3>
          <CodeBlock lang="bash">{`adb install -r bixtx-agent.apk
adb shell am start -n ai.bixtx.agent/.EnrollActivity \\
  --es key "YOUR_ENROLL_KEY"`}</CodeBlock>
        </div>
        <InfoBox color="#f59e0b">On iOS, use the TestFlight link or MDM profile for silent deployment across managed devices.</InfoBox>
      </div>
    ),
  },
  "remote-control": {
    title: "Remote Control",
    body: (
      <div className="space-y-6">
        <p style={{ color: "#b8cce8" }}>bixtx streams device screens at up to 60fps with end-to-end AES-256-GCM encryption and sub-10ms latency.</p>
        <div>
          <h3 className="font-bold mb-3" style={{ color: "#3b82f6" }}>Starting a session via CLI</h3>
          <CodeBlock lang="bash">{`bixtx remote --device EXEC-LAPTOP-01
bixtx remote --ip 192.168.1.42 --quality ultra
bixtx remote --device d1 --record --output ./sessions/`}</CodeBlock>
        </div>
        <div>
          <h3 className="font-bold mb-3" style={{ color: "#3b82f6" }}>Session quality presets</h3>
          <table className="w-full text-sm" style={{ color: "#b8cce8" }}>
            <thead><tr style={{ borderBottom: "1px solid rgba(59,130,246,0.2)" }}>
              {["Preset","Resolution","FPS","Bandwidth"].map(h => <th key={h} className="text-left py-2 pr-4 text-xs font-mono" style={{ color: "#6b8ab0" }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {[["eco","1280×720","15","~1 Mbps"],["balanced","1920×1080","30","~3 Mbps"],["ultra","2560×1440","60","~8 Mbps"],["lossless","native","60","~18 Mbps"]].map(r => (
                <tr key={r[0]} style={{ borderBottom: "1px solid rgba(59,130,246,0.08)" }}>
                  {r.map((c,i) => <td key={i} className={`py-2 pr-4 ${i===0?"font-mono text-purple-400":""}`}>{c}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <InfoBox color="#3b82f6">WebRTC P2P is used when both devices are on the same network. Relay servers handle NAT traversal automatically.</InfoBox>
      </div>
    ),
  },
  "wifi-scanner": {
    title: "Military-Grade WiFi Scanner",
    body: (
      <div className="space-y-6">
        <p style={{ color: "#b8cce8" }}>The WiFi Scanner performs RF spectrum analysis, discovers all devices on any network, and pairs them for remote monitoring within 2 seconds.</p>
        <div>
          <h3 className="font-bold mb-3" style={{ color: "#3b82f6" }}>Scanner capabilities</h3>
          <ul className="space-y-2 text-sm" style={{ color: "#b8cce8" }}>
            {["2.4GHz and 5GHz band scanning","RF spectrum analysis with signal strength mapping","Device fingerprinting via OUI lookup","AES-256 encrypted pairing channel","Swift connect: <2 seconds to active session","Threat detection: rogue APs, deauth attacks, MITM probing"].map(f => (
              <li key={f} className="flex items-center gap-2"><Check size={12} color="#10b981" strokeWidth={3} />{f}</li>
            ))}
          </ul>
        </div>
        <CodeBlock lang="bash">{`# Scan current WiFi network
bixtx wifi scan --band both

# Connect to discovered device
bixtx wifi pair --mac AA:BB:CC:DD:EE:FF --enroll

# Enable threat monitoring
bixtx wifi monitor --interface wlan0 --alert-level medium`}</CodeBlock>
      </div>
    ),
  },
  api: {
    title: "REST API Reference",
    body: (
      <div className="space-y-6">
        <p style={{ color: "#b8cce8" }}>All bixtx.com features are accessible via a REST API with JWT authentication.</p>
        <div>
          <h3 className="font-bold mb-3" style={{ color: "#3b82f6" }}>Authentication</h3>
          <CodeBlock lang="bash">{`curl -X POST https://api.bixtx.com/v1/auth/token \\
  -H "Content-Type: application/json" \\
  -d '{"email":"admin@org.com","password":"••••••••"}'

# Response: { "token": "eyJ...", "expires_in": 3600 }`}</CodeBlock>
        </div>
        <div>
          <h3 className="font-bold mb-3" style={{ color: "#3b82f6" }}>Key endpoints</h3>
          <table className="w-full text-sm font-mono" style={{ color: "#b8cce8" }}>
            <thead><tr style={{ borderBottom: "1px solid rgba(59,130,246,0.2)" }}>
              {["Method","Endpoint","Description"].map(h => <th key={h} className="text-left py-2 pr-4 text-xs" style={{ color: "#6b8ab0" }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {[["GET","/v1/devices","List all enrolled devices"],["POST","/v1/devices/enroll","Generate enroll link/QR"],["GET","/v1/devices/:id/screenshot","Capture device screenshot"],["POST","/v1/devices/:id/shell","Open remote shell session"],["GET","/v1/alerts","List active alerts"],["POST","/v1/update/push","Push OTA agent update"]].map(r => (
                <tr key={r[1]} style={{ borderBottom: "1px solid rgba(59,130,246,0.06)" }}>
                  <td className="py-2 pr-4 text-xs font-bold" style={{ color: r[0]==="GET"?"#10b981":r[0]==="POST"?"#3b82f6":"#f59e0b" }}>{r[0]}</td>
                  <td className="py-2 pr-4 text-xs" style={{ color: "#10d9a0" }}>{r[1]}</td>
                  <td className="py-2 text-xs" style={{ color: "#6b8ab0" }}>{r[2]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    ),
  },
  security: {
    title: "Security & Encryption",
    body: (
      <div className="space-y-6">
        <p style={{ color: "#b8cce8" }}>bixtx.com uses a layered security architecture with zero-trust principles throughout.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { title: "Transport", items: ["TLS 1.3 on all connections","Certificate pinning on mobile","HSTS with 1-year max-age"] },
            { title: "Data at rest", items: ["AES-256-GCM for recordings","Argon2id for credential hashing","Encrypted SQLite for local state"] },
            { title: "Session security", items: ["ECDH ephemeral key exchange","Forward secrecy per session","Session tokens expire in 1h"] },
            { title: "Access control", items: ["Role-based permissions (RBAC)","MFA via TOTP / biometric","Audit log for all admin actions"] },
          ].map(({ title, items }) => (
            <div key={title} className="p-4 rounded-xl border" style={{ background: "#0a1628", borderColor: "rgba(59,130,246,0.2)" }}>
              <div className="font-bold mb-2 text-sm" style={{ color: "#3b82f6" }}>{title}</div>
              <ul className="space-y-1.5">
                {items.map(i => <li key={i} className="flex items-center gap-2 text-xs" style={{ color: "#b8cce8" }}><Check size={10} color="#10b981" strokeWidth={3} />{i}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  enterprise: {
    title: "Enterprise Deployment",
    body: (
      <div className="space-y-6">
        <p style={{ color: "#b8cce8" }}>Deploy bixtx.com across thousands of devices with MDM, Group Policy, and on-premise server options.</p>
        <div>
          <h3 className="font-bold mb-3" style={{ color: "#3b82f6" }}>On-premise server setup</h3>
          <CodeBlock lang="bash">{`# Docker Compose
docker pull bixtxai/server:latest
docker compose -f docker-compose.yml up -d

# Kubernetes (Helm)
helm repo add bixtx https://charts.bixtx.com
helm install bixtx-server bixtx/bixtx-server \\
  --set global.domain=bixtx.internal \\
  --set persistence.enabled=true`}</CodeBlock>
        </div>
        <InfoBox color="#3b82f6">Enterprise licenses include unlimited devices, custom branding, SAML/SSO, dedicated Slack support, and a 99.99% SLA.</InfoBox>
      </div>
    ),
  },
  faq: {
    title: "FAQ",
    body: (
      <div className="space-y-4">
        {[
          { q: "Does the agent work without internet?", a: "Yes. The agent uses store-and-forward offline recording. All activity is buffered locally and synced when connectivity resumes." },
          { q: "How is the agent hidden from the device user?", a: "On Windows and Android, the agent runs as a background service with no visible UI. On iOS and macOS, a minimal system extension is used. HarmonyOS uses a background service with no launcher icon." },
          { q: "What's the maximum number of devices?", a: "Personal: 5. Professional: 100. Enterprise: unlimited. Large deployments can be managed via the REST API or MDM integration." },
          { q: "Can I self-host the relay servers?", a: "Yes. Enterprise licenses include the full server stack (Node.js + PostgreSQL + Redis) with Docker and Kubernetes support." },
          { q: "Is bixtx.com compliant with GDPR / HIPAA?", a: "The platform is designed for compliance. Data residency can be configured per region. Enterprise deployments can enable audit logging and DPA documentation." },
        ].map(({ q, a }) => (
          <div key={q} className="p-4 rounded-xl border" style={{ background: "#0a1628", borderColor: "rgba(59,130,246,0.18)" }}>
            <div className="font-bold text-sm mb-2" style={{ color: "#e2eaf6" }}>{q}</div>
            <div className="text-sm leading-relaxed" style={{ color: "#6b8ab0" }}>{a}</div>
          </div>
        ))}
      </div>
    ),
  },
};

// ─── Shared primitives ──────────────────────────────────────────────────────
function Chip({ children, color = "#3b82f6" }: { children: React.ReactNode; color?: string }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-widest"
      style={{ background: `${color}22`, color, border: `1px solid ${color}44` }}>
      {children}
    </span>
  );
}

function GlowDot({ color }: { color: string }) {
  return <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color, boxShadow: `0 0 6px ${color}` }} />;
}

function DownloadRow({ v, color, channel }: { v: PlatformVersion; color: string; channel: string }) {
  const [loading, setLoading] = useState(false);
  const ch = CHANNELS.find(c => c.tag === channel)!;
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border transition-all"
      style={{ background: "#0d1930", borderColor: "rgba(59,130,246,0.2)" }}>
      <div className="flex items-center gap-3 min-w-0">
        <GlowDot color={color} />
        <div className="min-w-0">
          <div className="text-sm font-semibold truncate" style={{ color: "#e2eaf6" }}>{v.label}</div>
          <div className="flex items-center gap-2 mt-0.5 text-[11px] font-mono" style={{ color: "#6b8ab0" }}>
            <span>{v.format}</span>
            <span style={{ color: "#1a3060" }}>·</span>
            <span>{v.size}</span>
            <span style={{ color: "#1a3060" }}>·</span>
            <span style={{ color: "#1a3060" }}>build {v.build}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <Chip color={ch?.color ?? "#3b82f6"}>{channel}</Chip>
        <button
          onClick={() => { setLoading(true); setTimeout(() => setLoading(false), 1800); }}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95"
          style={{ background: `${color}22`, color, border: `1px solid ${color}44` }}>
          {loading
            ? <><RefreshCw size={11} className="animate-spin" />Fetching…</>
            : <><Download size={11} />Download</>}
        </button>
      </div>
    </div>
  );
}

function MiniBar({ value, color, max = 100 }: { value: number; color: string; max?: number }) {
  return (
    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)", width: "60px" }}>
      <div className="h-full rounded-full transition-all" style={{ width: `${(value / max) * 100}%`, background: color }} />
    </div>
  );
}

function CodeBlock({ children, lang }: { children: string; lang?: string }) {
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: "#080716", border: "1px solid rgba(59,130,246,0.25)" }}>
      {lang && <div className="px-4 py-1.5 flex items-center gap-2 border-b" style={{ borderColor: "rgba(59,130,246,0.15)" }}>
        <Terminal size={11} color="#3b82f6" />
        <span className="text-[10px] font-mono" style={{ color: "#6b8ab0" }}>{lang}</span>
      </div>}
      <pre className="px-4 py-3 text-xs font-mono overflow-x-auto leading-relaxed" style={{ color: "#b8cce8" }}>{children}</pre>
    </div>
  );
}

function InfoBox({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <div className="px-4 py-3 rounded-xl flex items-start gap-3 text-sm"
      style={{ background: `${color}12`, border: `1px solid ${color}33`, color }}>
      <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
      <span style={{ color: "#b8cce8" }}>{children}</span>
    </div>
  );
}

function StatCard({ label, value, icon, color, sub }: { label: string; value: string; icon: React.ReactNode; color: string; sub?: string }) {
  return (
    <div className="p-4 rounded-xl border" style={{ background: "#0a1628", borderColor: "rgba(59,130,246,0.2)" }}>
      <div className="flex items-start justify-between mb-3">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
          <span style={{ color }}>{icon}</span>
        </div>
        <span className="text-[10px] font-mono" style={{ color: "#6b8ab0" }}>{label}</span>
      </div>
      <div className="text-2xl font-black" style={{ color }}>{value}</div>
      {sub && <div className="text-[11px] mt-0.5" style={{ color: "#6b8ab0" }}>{sub}</div>}
    </div>
  );
}

// ─── Nav ────────────────────────────────────────────────────────────────────
function Nav({ page, setPage, authed, onLogout }: { page: Page; setPage: (p: Page) => void; authed: boolean; onLogout: () => void }) {
  const [mopen, setMopen] = useState(false);

  const links: { id: Page; label: string; icon: React.ReactNode; auth?: boolean }[] = [
    { id: "pricing",      label: "Pricing",      icon: <CreditCard size={13} /> },
    { id: "docs",         label: "Docs",         icon: <BookOpen size={13} /> },
    ...(authed ? [
      { id: "dashboard"    as Page, label: "Dashboard",    icon: <LayoutDashboard size={13} />, auth: true },
      { id: "download"     as Page, label: "Downloads",    icon: <Download size={13} />,        auth: true },
      { id: "link-agent"   as Page, label: "Link Agent",   icon: <Server size={13} />,          auth: true },
      { id: "remote"       as Page, label: "Remote",       icon: <Monitor size={13} />,         auth: true },
      { id: "security-ops" as Page, label: "Security Ops", icon: <Shield size={13} />,          auth: true },
      { id: "siem"         as Page, label: "SIEM",         icon: <BarChart2 size={13} />,        auth: true },
      { id: "ai-chat"     as Page, label: "AI Chat",       icon: <MessageSquare size={13} />,    auth: true },
    ] : []),
  ];

  return (
    <nav className="relative z-20 border-b" style={{ borderColor: "rgba(59,130,246,0.2)", background: "rgba(7,6,15,0.95)", backdropFilter: "blur(14px)" }}>
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <button onClick={() => setPage(authed ? "dashboard" : "pricing")} className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg,#3b82f6,#10d9a0)" }}>
            <Shield size={15} color="#fff" />
          </div>
          <span className="text-base font-black tracking-wide" style={{ color: "#e2eaf6" }}>
            bixtx.com<span style={{ color: "#3b82f6" }}> AI</span>
          </span>
          <Chip color="#3b82f6">v{VERSION}</Chip>
        </button>

        <div className="hidden md:flex items-center gap-1">
          {links.map(l => (
            <button key={l.id} onClick={() => setPage(l.id)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all"
              style={{
                background: page === l.id ? "rgba(59,130,246,0.15)" : "transparent",
                color: page === l.id ? "#3b82f6" : "#6b8ab0",
                border: `1px solid ${page === l.id ? "rgba(59,130,246,0.35)" : "transparent"}`,
              }}>
              {l.icon}{l.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono"
            style={{ background: "#10b98118", color: "#10b981", border: "1px solid #10b98133" }}>
            <Activity size={9} className="animate-pulse" /> Systems OK
          </div>
          {authed ? (
            <button onClick={onLogout} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-80"
              style={{ background: "rgba(239,68,68,0.12)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)" }}>
              <LogOut size={12} /> Logout
            </button>
          ) : (
            <button onClick={() => setPage("login")} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold transition-all hover:opacity-90"
              style={{ background: "linear-gradient(135deg,#2563eb,#3b82f6)", color: "#fff" }}>
              <Key size={13} /> Admin Login
            </button>
          )}
          <button className="md:hidden p-2 rounded-lg" style={{ color: "#6b8ab0" }} onClick={() => setMopen(v => !v)}>
            {mopen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>
      {mopen && (
        <div className="md:hidden border-t px-4 py-3 space-y-1" style={{ borderColor: "rgba(59,130,246,0.2)", background: "#030b16" }}>
          {links.map(l => (
            <button key={l.id} onClick={() => { setPage(l.id); setMopen(false); }}
              className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm transition-all"
              style={{ color: page === l.id ? "#3b82f6" : "#6b8ab0", background: page === l.id ? "rgba(59,130,246,0.12)" : "transparent" }}>
              {l.icon}{l.label}
            </button>
          ))}
        </div>
      )}
    </nav>
  );
}

// ─── Login Page ─────────────────────────────────────────────────────────────
function LoginPage({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState("admin@bixtx.com");
  const [pass, setPass] = useState("••••••••••••");
  const [loading, setLoading] = useState(false);
  const [mfa, setMfa] = useState(false);
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    setTimeout(() => { setLoading(false); setMfa(true); }, 1200);
  };

  const handleMfa = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => { setLoading(false); if (code === "000000" || code.length === 6) { onLogin(); } else { setErr("Invalid code. Try 000000 for demo."); setLoading(false); } }, 900);
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-6 py-20 relative">
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 60% 50% at 50% 30%,rgba(59,130,246,0.12) 0%,transparent 70%)" }} />
      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: "linear-gradient(135deg,#3b82f6,#10d9a0)", boxShadow: "0 0 40px rgba(59,130,246,0.4)" }}>
            <Shield size={30} color="#fff" />
          </div>
          <h1 className="text-2xl font-black mb-1" style={{ color: "#e2eaf6" }}>Admin Console</h1>
          <p className="text-sm" style={{ color: "#6b8ab0" }}>Military-grade access control — authorized personnel only</p>
        </div>

        <div className="rounded-2xl border p-8" style={{ background: "#0a1628", borderColor: "rgba(59,130,246,0.25)", boxShadow: "0 0 60px rgba(59,130,246,0.08)" }}>
          {!mfa ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase tracking-widest mb-2" style={{ color: "#6b8ab0" }}>Admin Email</label>
                <input value={email} onChange={e => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
                  style={{ background: "#0d1930", border: "1px solid rgba(59,130,246,0.3)", color: "#e2eaf6" }}
                  placeholder="admin@bixtx.com" />
              </div>
              <div>
                <label className="block text-xs font-mono uppercase tracking-widest mb-2" style={{ color: "#6b8ab0" }}>Password</label>
                <input type="password" value={pass} onChange={e => setPass(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                  style={{ background: "#0d1930", border: "1px solid rgba(59,130,246,0.3)", color: "#e2eaf6" }}
                  placeholder="••••••••" />
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-3 rounded-xl text-sm font-bold transition-all hover:opacity-90 flex items-center justify-center gap-2"
                style={{ background: "linear-gradient(135deg,#2563eb,#3b82f6)", color: "#fff" }}>
                {loading ? <><RefreshCw size={14} className="animate-spin" />Authenticating…</> : <><Key size={14} />Sign In</>}
              </button>
            </form>
          ) : (
            <form onSubmit={handleMfa} className="space-y-4">
              <div className="text-center mb-2">
                <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: "rgba(6,182,212,0.15)", border: "1px solid rgba(6,182,212,0.3)" }}>
                  <Smartphone size={22} color="#10d9a0" />
                </div>
                <div className="font-bold" style={{ color: "#e2eaf6" }}>Two-Factor Verification</div>
                <div className="text-xs mt-1" style={{ color: "#6b8ab0" }}>Enter the 6-digit code from your authenticator app</div>
                <div className="text-xs mt-1" style={{ color: "#10d9a0" }}>Demo: enter any 6 digits</div>
              </div>
              <input value={code} onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="w-full px-4 py-4 rounded-xl text-center text-3xl font-mono outline-none tracking-[0.5em]"
                style={{ background: "#0d1930", border: "1px solid rgba(6,182,212,0.4)", color: "#10d9a0", letterSpacing: "0.4em" }}
                placeholder="000000" maxLength={6} />
              {err && <p className="text-xs text-center" style={{ color: "#ef4444" }}>{err}</p>}
              <button type="submit" disabled={loading || code.length < 6}
                className="w-full py-3 rounded-xl text-sm font-bold transition-all hover:opacity-90 flex items-center justify-center gap-2 disabled:opacity-40"
                style={{ background: "linear-gradient(135deg,#10d9a0,#0891b2)", color: "#fff" }}>
                {loading ? <><RefreshCw size={14} className="animate-spin" />Verifying…</> : <><Shield size={14} />Confirm Identity</>}
              </button>
            </form>
          )}

          <div className="mt-6 pt-4 border-t flex items-center gap-2 text-xs" style={{ borderColor: "rgba(59,130,246,0.15)", color: "#6b8ab0" }}>
            <Lock size={11} color="#3b82f6" />
            Connection encrypted with TLS 1.3 · AES-256-GCM
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Toast ───────────────────────────────────────────────────────────────────
type ToastItem = { id: number; msg: string; kind: "success"|"error"|"info" };

function ToastStack({ toasts }: { toasts: ToastItem[] }) {
  return (
    <div className="fixed bottom-6 right-6 z-50 space-y-2 pointer-events-none">
      {toasts.map(t => (
        <div key={t.id} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold shadow-2xl"
          style={{ background: t.kind==="success"?"#10b981":t.kind==="error"?"#ef4444":"#10d9a0", color:"#fff", minWidth:220 }}>
          <Check size={14} strokeWidth={3}/>{t.msg}
        </div>
      ))}
    </div>
  );
}

function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const show = (msg: string, kind: "success"|"error"|"info" = "success") => {
    const id = Date.now();
    setToasts(t => [...t, { id, msg, kind }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3000);
  };
  return { show, toasts };
}

// ─── Modal ────────────────────────────────────────────────────────────────────
function Modal({ open, onClose, title, children, wide }: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode; wide?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(7,6,15,0.88)", backdropFilter: "blur(10px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="relative w-full rounded-2xl border flex flex-col max-h-[90vh]"
        style={{ maxWidth: wide ? 700 : 500, background: "#0a1628", borderColor: "rgba(59,130,246,0.4)" }}>
        <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0"
          style={{ borderColor: "rgba(59,130,246,0.2)" }}>
          <span className="font-black text-base" style={{ color: "#e2eaf6" }}>{title}</span>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-purple-500/10 transition-all" style={{ color: "#6b8ab0" }}>
            <X size={16}/>
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

function FLabel({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] font-mono uppercase tracking-widest mb-1.5" style={{ color: "#6b8ab0" }}>{label}</label>
      {children}
    </div>
  );
}

function FInput({ value, onChange, placeholder, type="text" }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
      style={{ background: "#0d1930", border: "1px solid rgba(59,130,246,0.3)", color: "#e2eaf6" }}/>
  );
}

function FSelect({ value, onChange, options }: {
  value: string; onChange: (v: string) => void; options: { val: string; label: string }[];
}) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
      style={{ background: "#0d1930", border: "1px solid rgba(59,130,246,0.3)", color: "#e2eaf6" }}>
      {options.map(o => <option key={o.val} value={o.val}>{o.label}</option>)}
    </select>
  );
}

function ActionBtn({ children, onClick, color="#3b82f6", outline, full, disabled }: {
  children: React.ReactNode; onClick?: () => void; color?: string;
  outline?: boolean; full?: boolean; disabled?: boolean;
}) {
  return (
    <button onClick={onClick} disabled={disabled}
      className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-85 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed${full?" w-full":""}`}
      style={outline
        ? { background: `${color}15`, color, border: `1px solid ${color}44` }
        : { background: `linear-gradient(135deg,${color},${color}bb)`, color: "#fff" }}>
      {children}
    </button>
  );
}

// ─── Dashboard types & seed data ──────────────────────────────────────────────
interface DashDevice extends Device {
  performance: number; health: "excellent"|"good"|"warning"; type: "desktop"|"mobile";
}
interface DashSession {
  id: string; user: string; device: string; os: OS;
  status: "active"|"paused"|"idle"; duration: string; data: string; latency: number;
}
interface AppUser {
  id: string; name: string; email: string; role: "admin"|"operator"|"viewer";
  status: "active"|"inactive"; lastLogin: string; devices: number;
}
interface WifiNet {
  ssid: string; signal: number; band: string; security: string; devices: number; threat: boolean;
}

const PERF_MAP   = [94, 98, 87, 0, 96, 92, 0, 88];
const HEALTH_MAP = ["excellent","excellent","good","warning","excellent","good","warning","good"] as const;
const TYPE_MAP   = ["desktop","mobile","desktop","mobile","mobile","mobile","desktop","desktop"] as const;

const SEED_DEVICES: DashDevice[] = MOCK_DEVICES.map((d, i) => ({
  ...d,
  performance: PERF_MAP[i] ?? 80,
  health: HEALTH_MAP[i] ?? "good",
  type: TYPE_MAP[i] ?? "desktop",
}));

const SEED_SESSIONS: DashSession[] = [
  { id:"s1", user:"j.morgan",  device:"EXEC-LAPTOP-01",  os:"windows", status:"active", duration:"00:45:23", data:"1.2 GB", latency:6  },
  { id:"s2", user:"s.chen",    device:"MacBook-Pro-M3",  os:"macos",   status:"active", duration:"01:12:45", data:"3.4 GB", latency:4  },
  { id:"s3", user:"k.ivanov",  device:"DEVBOX-ARCH",     os:"linux",   status:"paused", duration:"00:08:12", data:"0.3 GB", latency:11 },
  { id:"s4", user:"a.patel",   device:"iPhone-15-Pro",   os:"ios",     status:"active", duration:"00:22:05", data:"0.8 GB", latency:5  },
];

const SEED_USERS: AppUser[] = [
  { id:"u1", name:"James Morgan",  email:"j.morgan@corp.io", role:"admin",    status:"active",   lastLogin:"Now",       devices:3 },
  { id:"u2", name:"Sofia Chen",    email:"s.chen@corp.io",   role:"operator", status:"active",   lastLogin:"2h ago",    devices:2 },
  { id:"u3", name:"Raj Patel",     email:"r.patel@corp.io",  role:"viewer",   status:"active",   lastLogin:"Yesterday", devices:1 },
  { id:"u4", name:"Tomasz Brooks", email:"t.brooks@corp.io", role:"operator", status:"inactive", lastLogin:"3d ago",    devices:0 },
];

const SEED_WIFI: WifiNet[] = [
  { ssid:"CORP-SECURE-5G",  signal:95, band:"5 GHz",   security:"WPA3", devices:12, threat:false },
  { ssid:"CORP-GUEST",      signal:78, band:"2.4 GHz", security:"WPA2", devices:4,  threat:false },
  { ssid:"IoT-Network",     signal:61, band:"2.4 GHz", security:"WPA2", devices:8,  threat:false },
  { ssid:"UNKNOWN-AP-44F2", signal:42, band:"2.4 GHz", security:"Open", devices:0,  threat:true  },
  { ssid:"HomeNet_2EX",     signal:35, band:"5 GHz",   security:"WPA2", devices:2,  threat:false },
];

const ALERT_COLOR: Record<string, string> = {
  critical:"#ef4444", warning:"#f59e0b", info:"#10d9a0", success:"#10b981"
};
const HEALTH_COLOR = { excellent:"#10b981", good:"#3b82f6", warning:"#f59e0b" };
const ROLE_COLOR   = { admin:"#3b82f6", operator:"#10d9a0", viewer:"#6b8ab0" };

// ─── Clipboard / SMS / Email helpers ─────────────────────────────────────────
function fallbackCopy(text: string, onOk: () => void) {
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.cssText = "position:fixed;opacity:0;top:-9999px";
  document.body.appendChild(ta);
  ta.focus(); ta.select();
  try { document.execCommand("copy"); onOk(); } catch (_) {}
  document.body.removeChild(ta);
}

function copyToClip(text: string, onOk: () => void) {
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(onOk).catch(() => fallbackCopy(text, onOk));
  } else {
    fallbackCopy(text, onOk);
  }
}

function openSMS(phone: string, body: string) {
  const enc = encodeURIComponent(body);
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  window.open(isIOS ? `sms:${phone}&body=${enc}` : `sms:${phone}?body=${enc}`, "_self");
}

function openEmail(to: string, subject: string, body: string) {
  window.open(
    `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
    "_blank"
  );
}

// ─── Admin QR Modal ───────────────────────────────────────────────────────────
function AdminQRModal({ onClose, show }: {
  onClose: () => void;
  show: (msg: string, kind?: "success"|"error"|"info") => void;
}) {
  const [qrUrl,  setQrUrl]  = useState("");
  const [loading,setLoading] = useState(true);
  const [copied, setCopied]  = useState(false);
  const enrollUrl = "https://get.bixtx.com/l/xK9mP2qR?key=BTX-2026-ALPHA";

  useEffect(() => {
    QRCode.toDataURL(enrollUrl, {
      width: 280, margin: 2,
      color: { dark: "#3b82f6", light: "#0a1628" },
      errorCorrectionLevel: "H",
    })
      .then(url => { setQrUrl(url); setLoading(false); })
      .catch(() =>
        QRCode.toDataURL(enrollUrl, { width: 280, margin: 2 })
          .then(url => { setQrUrl(url); setLoading(false); })
          .catch(() => setLoading(false))
      );
  }, []);

  const handleDownload = () => {
    if (!qrUrl) return;
    const a = document.createElement("a");
    a.href = qrUrl;
    a.download = `bixtx-agent-qr-${Date.now()}.png`;
    a.click();
    show("QR code downloaded ✓");
  };

  const handleCopy = () =>
    copyToClip(enrollUrl, () => {
      setCopied(true);
      show("Enroll link copied ✓");
      setTimeout(() => setCopied(false), 2200);
    });

  return
