import { useState, useEffect, useRef } from "react";

import {
  Shield, Download, Cpu, Lock, Monitor, Smartphone,
  ChevronDown, ChevronRight, Check, Zap,
  Camera, Mic, HardDrive, AlertTriangle, Terminal, ArrowRight,
  Activity, Server, Key, RefreshCw, Signal,
  LayoutDashboard, Settings, Search, Play, Pause,
  Square, Clipboard, FolderOpen, Volume2, VolumeX, Maximize2,
  RotateCcw, MousePointer, Keyboard, Wifi as WifiIcon,
  Circle, X,
  Code, FileText, Star,
  CreditCard, Building, User, Minus,
  BarChart2, Power, Upload,
  Sparkles, Send, Database, Cloud,
  Paperclip, Mic as MicIcon, Video, VideoOff, MicOff, Image, FileCode2,
  Wand2, StopCircle, Film,
  Bluetooth, Network,
} from "lucide-react";

import {
  Page, OS, Software, ToastItem, Device, DashDevice, EmergencyAlert,
  VERSION, BUILD, CHANNELS,
  OS_COLOR, OS_ICON, OS_LABEL,
  PLATFORMS, AGENT_PLATFORMS, REQUIREMENTS,
  DOCS_SECTIONS, DOCS_CONTENT,
  SEED_DEVICES, MOCK_EMERGENCY_ALERTS, ALERT_ICON,
  Chip, DownloadRow, StatCard,
  Nav, LoginPage, ToastStack, useToast,
  Modal, FLabel, FSelect, ActionBtn, CodeBlock, InfoBox, copyToClip,
  DeployLinkPanel,
} from "./shared";
import { AdminDashboard } from "./pages/AdminDashboard";
import { AIChatPage } from "./pages/AIChatPage";
import { LinkAgentPage } from "./pages/LinkAgentPage";
import { ImprovedAdminDashboard } from "./software-b/frontend/src/pages/ImprovedAdminDashboard";

// ─── Security Ops Page ────────────────────────────────────────────────────────
function SecurityOpsPage({ show }: { show: (msg: string, kind?: "success"|"error"|"info") => void }) {
  const [secTab, setSecTab] = useState<"emergency"|"device"|"network"|"mdm"|"antiforensics"|"airgap">("emergency");
  const [secAlerts, setSecAlerts] = useState<EmergencyAlert[]>(MOCK_EMERGENCY_ALERTS.slice());
  const [selectedAlert, setSelectedAlert] = useState<EmergencyAlert | null>(null);
  const [devices]            = useState(SEED_DEVICES);
  const [lockedDevs, setLockedDevs]   = useState<string[]>([]);
  const [wipedDevs,  setWipedDevs]    = useState<string[]>([]);
  const [processes]                   = useState([
    { pid:1234, dev:"EXEC-LAPTOP-01",  name:"chrome.exe",       cpu:12, mem:320, injected:false },
    { pid:4567, dev:"KIOSK-UBUNTU-07", name:"nginx",             cpu:3,  mem:64,  injected:false },
    { pid:8901, dev:"MacBook-Pro-M3",   name:"Safari",           cpu:8,  mem:280, injected:false },
    { pid:2345, dev:"DEVBOX-ARCH",     name:"sshd",              cpu:1,  mem:12,  injected:false },
    { pid:6789, dev:"EXEC-LAPTOP-01",  name:"outlook.exe",       cpu:5,  mem:180, injected:true  },
  ]);
  const [netRules, setNetRules] = useState([
    { id:"n1", type:"VPN Kill Switch",    dev:"All Devices",      active:true  },
    { id:"n2", type:"DNS Hijacking",      dev:"KIOSK-UBUNTU-07", active:false },
    { id:"n3", type:"ARP Spoofing",       dev:"192.168.1.0/24",  active:false },
    { id:"n4", type:"Rogue AP Detection", dev:"All Devices",      active:true  },
    { id:"n5", type:"Packet Sniffer",     dev:"DEVBOX-ARCH",     active:true  },
    { id:"n6", type:"IMSI Logger",        dev:"Mobile Devices",  active:true  },
  ]);
  const [mdmPolicies, setMdmPolicies] = useState([
    { id:"m1", name:"Disable USB Ports",         scope:"All Devices",    enforced:true,  platform:"all"     },
    { id:"m2", name:"Block App Installations",   scope:"Mobile Devices", enforced:true,  platform:"mobile"  },
    { id:"m3", name:"Enforce Screen Lock 30s",   scope:"All Devices",    enforced:true,  platform:"all"     },
    { id:"m4", name:"Disable Bluetooth",         scope:"Kiosk Devices",  enforced:false, platform:"all"     },
    { id:"m5", name:"Certificate Pinning",       scope:"All Devices",    enforced:true,  platform:"all"     },
    { id:"m6", name:"Restrict App Whitelist",    scope:"Mobile Devices", enforced:true,  platform:"mobile"  },
    { id:"m7", name:"Disable Developer Mode",    scope:"Android Devices",enforced:true,  platform:"android" },
    { id:"m8", name:"Force VPN On",              scope:"All Devices",    enforced:false, platform:"all"     },
    { id:"m9", name:"Disable ADB/USB Debugging", scope:"Android Devices",enforced:true,  platform:"android" },
    { id:"m10",name:"Enforce Encrypted Storage", scope:"All Devices",    enforced:true,  platform:"all"     },
    { id:"m11",name:"Block Jailbreak/Root",      scope:"Mobile Devices", enforced:true,  platform:"mobile"  },
    { id:"m12",name:"Geo-Fence Compliance",      scope:"All Devices",    enforced:false, platform:"all"     },
  ]);
  const [afModes, setAfModes] = useState([
    { id:"af1", name:"Self-Destruct on Tamper",     active:true,  color:"#ef4444" },
    { id:"af2", name:"Log Wipe on Root Detection",  active:true,  color:"#f59e0b" },
    { id:"af3", name:"Process Hiding (Rootkit)",    active:true,  color:"#3b82f6" },
    { id:"af4", name:"Memory Forensics Blocker",    active:false, color:"#10d9a0" },
    { id:"af5", name:"Anti-Debug Shield",           active:true,  color:"#10b981" },
    { id:"af6", name:"Fake Process Names",          active:true,  color:"#a855f7" },
    { id:"af7", name:"Timestomp Artifacts",         active:false, color:"#f59e0b" },
    { id:"af8", name:"Encrypted Agent Payload",     active:true,  color:"#ef4444" },
  ]);

  const SEC_TABS = [
    { id:"emergency",    label:"⚡ Emergency Alerts" },
    { id:"device",       label:"Device Control"    },
    { id:"network",      label:"Network Control"   },
    { id:"mdm",          label:"MDM / Policies"    },
    { id:"antiforensics",label:"Anti-Forensics"    },
    { id:"airgap",       label:"Air-Gap Bridge"    },
  ] as const;

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-black" style={{ color:"#e2eaf6" }}>Security Operations</h1>
        <p className="text-sm mt-0.5" style={{ color:"#6b8ab0" }}>
          Device control · Network manipulation · MDM enforcement · Anti-forensics · Air-gap exfiltration
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex flex-wrap gap-1 p-1 rounded-xl w-fit" style={{ background:"#0a1628", border:"1px solid rgba(59,130,246,0.22)" }}>
        {SEC_TABS.map(t => (
          <button key={t.id} onClick={() => setSecTab(t.id)}
            className="px-4 py-2 rounded-lg text-sm font-semibold transition-all"
            style={{ background:secTab===t.id?"linear-gradient(135deg,#2563eb,#3b82f6)":"transparent", color:secTab===t.id?"#fff":"#6b8ab0" }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Emergency Alerts ── */}
      {secTab === "emergency" && (
        <div className="space-y-4">
          {/* Summary bar */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label:"Critical Alerts",  val: secAlerts.filter(a=>a.severity==="CRITICAL").length, color:"#ef4444" },
              { label:"High Priority",    val: secAlerts.filter(a=>a.severity==="HIGH").length,     color:"#f59e0b" },
              { label:"Total This Session", val: secAlerts.length,                                  color:"#3b82f6" },
            ].map(s => (
              <div key={s.label} className="p-4 rounded-2xl flex items-center justify-between"
                style={{ background:"#0a1628", border:`1px solid ${s.color}25` }}>
                <span className="text-xs font-semibold" style={{ color:"#6b8ab0" }}>{s.label}</span>
                <span className="text-2xl font-black" style={{ color:s.color }}>{s.val}</span>
              </div>
            ))}
          </div>

          {/* Alert list */}
          {secAlerts.length === 0 ? (
            <div className="p-12 rounded-2xl text-center" style={{ background:"#0a1628", border:"1px solid rgba(59,130,246,0.15)" }}>
              <div className="text-4xl mb-3">✅</div>
              <div className="font-bold" style={{ color:"#e2eaf6" }}>No Active Emergency Alerts</div>
              <div className="text-xs mt-1" style={{ color:"#6b8ab0" }}>All sensors nominal. Monitoring in progress.</div>
            </div>
          ) : (
            <div className="space-y-3">
              {secAlerts.map(alert => {
                const sevColor = alert.severity==="CRITICAL" ? "#ef4444" : alert.severity==="HIGH" ? "#f59e0b" : "#3b82f6";
                return (
                  <div key={alert.alertId} className="p-5 rounded-2xl cursor-pointer transition-all hover:opacity-90"
                    style={{ background:"#0a1628", border:`1px solid ${sevColor}35` }}
                    onClick={() => setSelectedAlert(alert)}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="text-2xl flex-shrink-0">{ALERT_ICON[alert.type] || "🚨"}</div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="font-black text-sm" style={{ color:"#e2eaf6" }}>{alert.title}</span>
                            <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded flex-shrink-0"
                              style={{ background:`${sevColor}20`, color:sevColor }}>{alert.severity}</span>
                          </div>
                          <p className="text-xs leading-relaxed mb-2" style={{ color:"#6b8ab0" }}>{alert.detail}</p>
                          <div className="flex items-center gap-4 flex-wrap">
                            <span className="text-[10px] font-mono" style={{ color:"#10d9a0" }}>
                              📱 {alert.deviceDetail?.name || alert.deviceId}
                            </span>
                            {alert.geopolitical && (
                              <span className="text-[10px] font-mono" style={{ color:"#10b981" }}>
                                📍 {alert.geopolitical.city}, {alert.geopolitical.country}
                              </span>
                            )}
                            {alert.userDetail && (
                              <span className="text-[10px] font-mono" style={{ color:"#3b82f6" }}>
                                👤 {alert.userDetail.fullName}
                              </span>
                            )}
                            <span className="text-[10px] font-mono" style={{ color:"#1a3060" }}>
                              {Math.floor((Date.now()-alert.ts)/60000)}m ago
                            </span>
                          </div>
                          {/* Emergency contacts inline */}
                          {alert.emergencyContacts && alert.emergencyContacts.length > 0 && (
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                              <span className="text-[9px] font-mono" style={{ color:"#ef4444" }}>📞 Emergency:</span>
                              {alert.emergencyContacts.slice(0,3).map((c,i) => (
                                <span key={i} className="text-[9px] font-mono px-2 py-0.5 rounded"
                                  style={{ background:"rgba(239,68,68,0.08)", color:"#ef4444", border:"1px solid rgba(239,68,68,0.2)" }}>
                                  {c.name} · {c.number}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        <button onClick={e => { e.stopPropagation(); setSelectedAlert(alert); }}
                          className="px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all hover:opacity-80"
                          style={{ background:`${sevColor}18`, color:sevColor, border:`1px solid ${sevColor}30` }}>
                          View Full Detail
                        </button>
                        <button onClick={e => { e.stopPropagation(); setSecAlerts(prev => prev.filter(a => a.alertId !== alert.alertId)); }}
                          className="px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all hover:opacity-80"
                          style={{ background:"rgba(255,255,255,0.04)", color:"#6b8ab0", border:"1px solid rgba(255,255,255,0.08)" }}>
                          Acknowledge
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {/* Detail modal */}
          {selectedAlert && (
            <EmergencyModal
              alert={selectedAlert}
              onDismiss={() => setSelectedAlert(null)}
              onAck={() => {
                setSecAlerts(prev => prev.filter(a => a.alertId !== selectedAlert!.alertId));
                setSelectedAlert(null);
              }}
            />
          )}
        </div>
      )}

      {/* ── Device Control ── */}
      {secTab === "device" && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {devices.filter(d => d.status !== "offline").map(d => {
              const locked = lockedDevs.includes(d.id);
              const wiped  = wipedDevs.includes(d.id);
              return (
                <div key={d.id} className="p-5 rounded-2xl border" style={{ background:"#0a1628", borderColor: wiped?"rgba(239,68,68,0.4)":locked?"rgba(245,158,11,0.3)":"rgba(59,130,246,0.2)" }}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ background:`${OS_COLOR[d.os]}18` }}>
                      {OS_ICON[d.os]}
                    </div>
                    <div>
                      <div className="font-bold text-sm" style={{ color:"#e2eaf6" }}>{d.name}</div>
                      <div className="text-[10px] font-mono" style={{ color:"#6b8ab0" }}>{d.ip} · {d.user}</div>
                    </div>
                    {wiped  && <Chip color="#ef4444">WIPED</Chip>}
                    {locked && !wiped && <Chip color="#f59e0b">LOCKED</Chip>}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <ActionBtn onClick={() => { setLockedDevs(p => locked?p.filter(x=>x!==d.id):[...p,d.id]); show(`${d.name} ${locked?"unlocked":"locked"}`,"info"); }} color={locked?"#10b981":"#f59e0b"} outline full>
                      <Lock size={11}/>{locked?"Unlock":"Lock"}
                    </ActionBtn>
                    <ActionBtn onClick={() => show(`Remote shell opened on ${d.name}`,"info")} color="#10d9a0" outline full>
                      <Terminal size={11}/>Shell
                    </ActionBtn>
                    <ActionBtn onClick={() => show(`${d.name} rebooting…`,"info")} color="#3b82f6" outline full>
                      <RotateCcw size={11}/>Reboot
                    </ActionBtn>
                    <ActionBtn onClick={() => show(`Screenshot captured from ${d.name}`,"info")} color="#a855f7" outline full>
                      <Camera size={11}/>Screenshot
                    </ActionBtn>
                    <ActionBtn onClick={() => show(`OTA pushed to ${d.name}`)} color="#10b981" outline full>
                      <Upload size={11}/>OTA Push
                    </ActionBtn>
                    <ActionBtn onClick={() => { if (!wiped) { setWipedDevs(p=>[...p,d.id]); show(`${d.name} WIPED — factory reset initiated`,"error"); }}} color="#ef4444" outline full disabled={wiped}>
                      <Power size={11}/>{wiped?"Wiped":"Wipe"}
                    </ActionBtn>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Process Injection */}
          <div className="rounded-2xl overflow-hidden border" style={{ background:"#0a1628", borderColor:"rgba(59,130,246,0.2)" }}>
            <div className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor:"rgba(59,130,246,0.15)", background:"#0d1930" }}>
              <div className="font-bold text-sm" style={{ color:"#e2eaf6" }}>Process Control & Injection</div>
              <ActionBtn onClick={() => show("Process list refreshed")} color="#6b8ab0" outline><RefreshCw size={11}/>Refresh</ActionBtn>
            </div>
            <table className="w-full text-xs min-w-[560px]">
              <thead><tr style={{ borderBottom:"1px solid rgba(59,130,246,0.1)", background:"#0d1930" }}>
                {["PID","Device","Process","CPU","MEM","Status","Actions"].map(h=>(
                  <th key={h} className="text-left px-4 py-2 text-[9px] font-mono uppercase tracking-wider" style={{ color:"#6b8ab0" }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {processes.map(p => (
                  <tr key={p.pid} className="hover:bg-purple-500/5 transition-colors" style={{ borderBottom:"1px solid rgba(59,130,246,0.07)" }}>
                    <td className="px-4 py-2.5 font-mono text-[10px]" style={{ color:"#6b8ab0" }}>{p.pid}</td>
                    <td className="px-4 py-2.5 text-xs font-semibold" style={{ color:"#e2eaf6" }}>{p.dev}</td>
                    <td className="px-4 py-2.5 font-mono text-xs" style={{ color: p.injected?"#3b82f6":"#b8cce8" }}>{p.name}</td>
                    <td className="px-4 py-2.5 font-mono" style={{ color:p.cpu>10?"#f59e0b":"#6b8ab0" }}>{p.cpu}%</td>
                    <td className="px-4 py-2.5 font-mono" style={{ color:"#6b8ab0" }}>{p.mem} MB</td>
                    <td className="px-4 py-2.5"><Chip color={p.injected?"#3b82f6":"#6b8ab0"}>{p.injected?"injected":"clean"}</Chip></td>
                    <td className="px-4 py-2.5">
                      <div className="flex gap-1">
                        <button onClick={() => show(`Agent injected into ${p.name} (PID ${p.pid})`)} className="p-1 rounded text-[10px] font-mono px-2" style={{ background:"rgba(59,130,246,0.15)", color:"#3b82f6" }}>Inject</button>
                        <button onClick={() => show(`PID ${p.pid} killed`,"info")} className="p-1 rounded text-[10px] font-mono px-2" style={{ background:"rgba(239,68,68,0.15)", color:"#ef4444" }}>Kill</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Network Control ── */}
      {secTab === "network" && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {netRules.map(r => (
              <div key={r.id} className="flex items-center gap-4 p-4 rounded-xl border transition-all" style={{ background:"#0a1628", borderColor:r.active?"rgba(6,182,212,0.35)":"rgba(59,130,246,0.2)" }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background:r.active?"rgba(6,182,212,0.15)":"rgba(59,130,246,0.1)" }}>
                  <WifiIcon size={16} color={r.active?"#10d9a0":"#6b8ab0"}/>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm" style={{ color:"#e2eaf6" }}>{r.type}</div>
                  <div className="text-[10px] font-mono mt-0.5" style={{ color:"#6b8ab0" }}>Target: {r.dev}</div>
                </div>
                <div className="flex items-center gap-3">
                  <Chip color={r.active?"#10d9a0":"#6b8ab0"}>{r.active?"ACTIVE":"OFF"}</Chip>
                  <button onClick={() => { setNetRules(p => p.map(x => x.id===r.id?{...x,active:!x.active}:x)); show(`${r.type} ${r.active?"disabled":"enabled"}`); }}
                    className="w-9 h-5 rounded-full relative flex-shrink-0" style={{ background:r.active?"#10d9a0":"#0f1e3a" }}>
                    <div className="absolute top-0.5 w-4 h-4 rounded-full transition-all" style={{ left:r.active?"19px":"2px", background:"#fff" }}/>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* WiFi Probe Log */}
          <div className="rounded-2xl overflow-hidden border" style={{ background:"#0a1628", borderColor:"rgba(59,130,246,0.2)" }}>
            <div className="px-5 py-3 border-b" style={{ borderColor:"rgba(59,130,246,0.15)", background:"#0d1930" }}>
              <div className="font-bold text-sm" style={{ color:"#e2eaf6" }}>WiFi Probe History (Previously Connected Networks)</div>
            </div>
            <div className="divide-y" style={{ borderColor:"rgba(59,130,246,0.08)" }}>
              {[
                { dev:"EXEC-LAPTOP-01",  ssid:"CorporateHQ-5G",   last:"Today 09:00",    enc:"WPA3" },
                { dev:"EXEC-LAPTOP-01",  ssid:"HomeNetwork_Jeff",  last:"Yesterday",      enc:"WPA2" },
                { dev:"MacBook-Pro-M3",   ssid:"Changi_Airport_Free",last:"3 days ago",   enc:"Open" },
                { dev:"Galaxy-S24-Ultra", ssid:"MTN-Nigeria-4G",   last:"2h ago",         enc:"LTE"  },
                { dev:"iPhone-15-Pro",    ssid:"JioFiber_Patel",   last:"Today 08:30",    enc:"WPA3" },
                { dev:"DEVBOX-ARCH",     ssid:"VPN-Relay-Node-7",  last:"1h ago",         enc:"WPA2" },
              ].map((w,i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-2.5 hover:bg-purple-500/5 transition-colors">
                  <span className="text-sm">{OS_ICON[SEED_DEVICES.find(d=>d.name===w.dev)?.os??"windows"]}</span>
                  <span className="text-xs font-semibold flex-shrink-0 w-40" style={{ color:"#e2eaf6" }}>{w.dev}</span>
                  <span className="text-xs font-mono flex-1" style={{ color:"#10d9a0" }}>{w.ssid}</span>
                  <Chip color={w.enc==="Open"?"#ef4444":w.enc==="WPA3"?"#10b981":"#6b8ab0"}>{w.enc}</Chip>
                  <span className="text-[10px] font-mono flex-shrink-0" style={{ color:"#6b8ab0" }}>{w.last}</span>
                  <button onClick={() => show(`Connecting to ${w.ssid} via ${w.dev}`)} className="p-1 rounded" style={{ color:"#3b82f6" }}><Signal size={11}/></button>
                </div>
              ))}
            </div>
          </div>

          {/* IMSI / Cell tower log */}
          <div className="rounded-2xl overflow-hidden border" style={{ background:"#0a1628", borderColor:"rgba(245,158,11,0.25)" }}>
            <div className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor:"rgba(245,158,11,0.15)", background:"#0d1930" }}>
              <div className="font-bold text-sm" style={{ color:"#e2eaf6" }}>IMSI / Cell Tower Logger</div>
              <ActionBtn onClick={() => show("IMSI log exported","info")} color="#f59e0b" outline><Download size={11}/>Export</ActionBtn>
            </div>
            <div className="divide-y" style={{ borderColor:"rgba(59,130,246,0.08)" }}>
              {[
                { dev:"Galaxy-S24-Ultra", imsi:"234301234567890", mcc:"234", mnc:"30", tower:"BTS-NGR-1042", lat:6.5244, lng:3.3792, ts:"14:32:00" },
                { dev:"iPhone-15-Pro",    imsi:"404208765432100", mcc:"404", mnc:"20", tower:"BTS-IND-8821", lat:19.076, lng:72.877, ts:"14:31:00" },
                { dev:"Mate60-Pro",       imsi:"460001122334455", mcc:"460", mnc:"00", tower:"BTS-CHN-3310", lat:31.230, lng:121.47, ts:"14:30:00" },
              ].map((r,i) => (
                <div key={i} className="px-5 py-3 hover:bg-yellow-500/5 transition-colors">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-sm">{OS_ICON["android"]}</span>
                    <span className="font-semibold text-xs" style={{ color:"#e2eaf6" }}>{r.dev}</span>
                    <Chip color="#f59e0b">MCC {r.mcc} / MNC {r.mnc}</Chip>
                    <span className="text-[10px] font-mono ml-auto" style={{ color:"#6b8ab0" }}>{r.ts}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-[10px] font-mono mt-1">
                    <span><span style={{ color:"#6b8ab0" }}>IMSI: </span><span style={{ color:"#f59e0b" }}>{r.imsi}</span></span>
                    <span><span style={{ color:"#6b8ab0" }}>Tower: </span><span style={{ color:"#10d9a0" }}>{r.tower}</span></span>
                    <span><span style={{ color:"#6b8ab0" }}>Pos: </span><span style={{ color:"#10b981" }}>{r.lat.toFixed(3)},{r.lng.toFixed(3)}</span></span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── MDM Policies ── */}
      {secTab === "mdm" && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-black text-lg" style={{ color:"#e2eaf6" }}>MDM Policy Enforcement</h2>
              <p className="text-xs mt-0.5" style={{ color:"#6b8ab0" }}>Push config profiles · Restrictions · Compliance · Certificate management</p>
            </div>
            <div className="flex gap-2">
              <ActionBtn onClick={async () => {
                const enforced = mdmPolicies.filter(p=>p.enforced).length;
                try {
                  await fetch("http://localhost:3000/v1/mdm/push", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ policies: mdmPolicies.map(p => ({ policyId: p.id, policyName: p.name, enforced: p.enforced, platform: p.platform })) }),
                  });
                } catch { /* UI-only mode */ }
                show(`${enforced}/${mdmPolicies.length} policies dispatched to all enrolled agents via MDM`, "success");
              }} color="#3b82f6"><Upload size={13}/>Push All Policies</ActionBtn>
              <ActionBtn onClick={() => {
                const compliant = mdmPolicies.filter(p=>p.enforced).length;
                const total = mdmPolicies.length;
                show(`Compliance: ${compliant}/${total} policies enforced — exported compliance_${new Date().toISOString().slice(0,10)}.pdf`, "info");
              }} color="#10b981" outline><Download size={13}/>Compliance Report</ActionBtn>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {mdmPolicies.map(p => (
              <div key={p.id} className="flex items-center gap-4 p-4 rounded-xl border transition-all"
                style={{ background:"#0a1628", borderColor:p.enforced?"rgba(16,185,129,0.3)":"rgba(59,130,246,0.2)",
                         boxShadow:p.enforced?"0 0 10px rgba(16,185,129,0.08)":"none" }}>
                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background:p.enforced?"rgba(16,185,129,0.15)":"rgba(59,130,246,0.1)" }}>
                  <Shield size={14} color={p.enforced?"#10b981":"#6b8ab0"}/>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm" style={{ color:"#e2eaf6" }}>{p.name}</div>
                  <div className="text-[10px] font-mono mt-0.5 flex gap-2" style={{ color:"#6b8ab0" }}>
                    <span>{p.scope}</span>
                    <span>·</span>
                    <span style={{ color: p.platform==="android"?"#3ddc84":p.platform==="mobile"?"#a0aec0":"#5a536e" }}>
                      {p.platform === "all" ? "cross-platform" : p.platform}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Chip color={p.enforced?"#10b981":"#6b8ab0"}>{p.enforced?"ON":"OFF"}</Chip>
                  <button
                    onClick={async () => {
                      const nextEnforced = !p.enforced;
                      setMdmPolicies(prev => prev.map(x => x.id===p.id ? {...x, enforced:nextEnforced} : x));
                      try {
                        await fetch("http://localhost:3000/v1/mdm/push", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ policies: [{ policyId: p.id, policyName: p.name, enforced: nextEnforced, platform: p.platform }] }),
                        });
                      } catch { /* UI-only mode */ }
                      show(`"${p.name}" ${nextEnforced ? "enforced — dispatched to all agents" : "relaxed on all enrolled devices"}`, nextEnforced ? "success" : "info");
                    }}
                    className="w-10 h-5 rounded-full relative transition-all flex-shrink-0"
                    style={{ background:p.enforced?"#10b981":"#0f1e3a", border:`1px solid ${p.enforced?"#10b981":"rgba(59,130,246,0.3)"}` }}>
                    <div className="absolute top-0.5 w-4 h-4 rounded-full transition-all"
                      style={{ left:p.enforced?"21px":"2px", background:"#fff" }}/>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Certificate Management */}
          <div className="rounded-2xl overflow-hidden border" style={{ background:"#0a1628", borderColor:"rgba(59,130,246,0.2)" }}>
            <div className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor:"rgba(59,130,246,0.15)", background:"#0d1930" }}>
              <div className="font-bold text-sm" style={{ color:"#e2eaf6" }}>Certificate Management</div>
              <ActionBtn onClick={() => show("New certificate issued and deployed")} color="#3b82f6" outline><Key size={11}/>Issue Cert</ActionBtn>
            </div>
            <table className="w-full text-xs min-w-[500px]">
              <thead><tr style={{ borderBottom:"1px solid rgba(59,130,246,0.1)", background:"#0d1930" }}>
                {["CN","Type","Issued","Expires","Devices","Status","Actions"].map(h=>(
                  <th key={h} className="text-left px-4 py-2 text-[9px] font-mono uppercase tracking-wider" style={{ color:"#6b8ab0" }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {[
                  { cn:"*.bixtx.internal",   type:"Wildcard TLS", issued:"2026-01-01", expires:"2027-01-01", devs:8,  status:"valid"   },
                  { cn:"vpn.bixtx.corp",      type:"Client Auth",  issued:"2026-03-01", expires:"2026-09-01", devs:12, status:"valid"   },
                  { cn:"agent.bixtx.com",      type:"Code Signing", issued:"2025-07-01", expires:"2026-07-15", devs:0,  status:"expiring"},
                  { cn:"mdm.bixtx.internal",  type:"MDM Profile",  issued:"2026-01-01", expires:"2027-01-01", devs:6,  status:"valid"   },
                ].map((cert,i) => (
                  <tr key={i} className="hover:bg-purple-500/5 transition-colors" style={{ borderBottom:"1px solid rgba(59,130,246,0.07)" }}>
                    <td className="px-4 py-2.5 font-mono text-[10px]" style={{ color:"#10d9a0" }}>{cert.cn}</td>
                    <td className="px-4 py-2.5" style={{ color:"#b8cce8" }}>{cert.type}</td>
                    <td className="px-4 py-2.5 font-mono text-[10px]" style={{ color:"#6b8ab0" }}>{cert.issued}</td>
                    <td className="px-4 py-2.5 font-mono text-[10px]" style={{ color:cert.status==="expiring"?"#f59e0b":"#6b8ab0" }}>{cert.expires}</td>
                    <td className="px-4 py-2.5 font-mono text-center" style={{ color:"#b8cce8" }}>{cert.devs}</td>
                    <td className="px-4 py-2.5"><Chip color={cert.status==="valid"?"#10b981":"#f59e0b"}>{cert.status}</Chip></td>
                    <td className="px-4 py-2.5">
                      <div className="flex gap-1">
                        <button onClick={() => show(`Cert ${cert.cn} deployed to all devices`)} className="p-1 rounded" style={{ color:"#10b981" }} title="Deploy"><Upload size={11}/></button>
                        <button onClick={() => show(`Cert ${cert.cn} revoked`,"error")} className="p-1 rounded" style={{ color:"#ef4444" }} title="Revoke"><X size={11}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Anti-Forensics ── */}
      {secTab === "antiforensics" && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-black text-lg" style={{ color:"#e2eaf6" }}>Anti-Forensics & Persistence</h2>
              <p className="text-xs mt-0.5" style={{ color:"#6b8ab0" }}>Rootkit persistence · Evidence destruction · Process hiding · Memory protection</p>
            </div>
            <ActionBtn onClick={() => show("Emergency wipe and trace destruction initiated","error")} color="#ef4444">
              <Power size={13}/>EMERGENCY PURGE
            </ActionBtn>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {afModes.map(m => (
              <div key={m.id} className="flex items-center gap-4 p-4 rounded-xl border transition-all" style={{ background:"#0a1628", borderColor:m.active?`${m.color}44`:"rgba(59,130,246,0.2)", boxShadow:m.active?`0 0 12px ${m.color}18`:"none" }}>
                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background:`${m.color}18`, border:`1px solid ${m.color}30` }}>
                  <Shield size={14} color={m.color}/>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm" style={{ color:"#e2eaf6" }}>{m.name}</div>
                  <div className="text-[10px] font-mono mt-0.5" style={{ color:m.active?m.color:"#6b8ab0" }}>{m.active?"ACTIVE":"INACTIVE"}</div>
                </div>
                <button onClick={() => { setAfModes(p=>p.map(x=>x.id===m.id?{...x,active:!x.active}:x)); show(`${m.name} ${m.active?"disabled":"activated"}`); }}
                  className="w-9 h-5 rounded-full relative flex-shrink-0" style={{ background:m.active?m.color:"#0f1e3a" }}>
                  <div className="absolute top-0.5 w-4 h-4 rounded-full transition-all" style={{ left:m.active?"19px":"2px", background:"#fff" }}/>
                </button>
              </div>
            ))}
          </div>

          {/* Rootkit persistence panel */}
          <div className="rounded-2xl border p-5" style={{ background:"#0a1628", borderColor:"rgba(239,68,68,0.25)" }}>
            <div className="flex items-center justify-between mb-4">
              <div className="font-bold text-sm" style={{ color:"#e2eaf6" }}>Rootkit Persistence Mechanisms</div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                { name:"Bootloader Implant",     desc:"Survives factory reset via MBR/EFI injection",    status:"planted",  dev:"EXEC-LAPTOP-01" },
                { name:"Kernel Module Hook",      desc:"Hooks syscalls at kernel level — invisible to AV",status:"active",   dev:"KIOSK-UBUNTU-07"},
                { name:"Firmware Persistence",   desc:"Agent embedded in NIC/HDD firmware",              status:"planted",  dev:"DEVBOX-ARCH"    },
                { name:"iOS MDM Profile Lock",   desc:"Locks MDM enrollment — persists across wipes",    status:"active",   dev:"iPhone-15-Pro"  },
              ].map(r => (
                <div key={r.name} className="p-4 rounded-xl border" style={{ background:"#0d1930", borderColor:"rgba(239,68,68,0.2)" }}>
                  <div className="flex items-center gap-2 mb-1">
                    <Chip color="#ef4444">{r.status}</Chip>
                    <span className="font-bold text-xs" style={{ color:"#e2eaf6" }}>{r.name}</span>
                  </div>
                  <div className="text-[10px]" style={{ color:"#6b8ab0" }}>{r.desc}</div>
                  <div className="text-[10px] font-mono mt-1" style={{ color:"#3b82f6" }}>Target: {r.dev}</div>
                  <div className="flex gap-2 mt-2">
                    <ActionBtn onClick={() => show(`${r.name} verified on ${r.dev}`)} color="#10b981" outline><Check size={10}/>Verify</ActionBtn>
                    <ActionBtn onClick={() => show(`${r.name} refreshed on ${r.dev}`)} color="#3b82f6" outline><RefreshCw size={10}/>Refresh</ActionBtn>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Air-Gap Bridge ── */}
      {secTab === "airgap" && (
        <div className="space-y-5">
          <div>
            <h2 className="font-black text-lg" style={{ color:"#e2eaf6" }}>Air-Gap Bridge</h2>
            <p className="text-xs mt-0.5" style={{ color:"#6b8ab0" }}>Exfiltrate data from air-gapped devices via covert side channels</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { name:"Ultrasound Channel",   icon:"🔊", desc:"18-24 kHz acoustic data transmission", rate:"~20 B/s",  status:"ready",   color:"#3b82f6" },
              { name:"RF Exfiltration",      icon:"📡", desc:"CPU-generated EM emissions encoding",  rate:"~40 B/s",  status:"active",  color:"#10b981" },
              { name:"USB Power Modulation", icon:"⚡", desc:"Data via USB power line oscillation",   rate:"~10 B/s",  status:"ready",   color:"#f59e0b" },
              { name:"Optical (LED blink)",  icon:"💡", desc:"Camera-readable LED flicker encoding",  rate:"~15 B/s",  status:"ready",   color:"#10d9a0" },
              { name:"Thermal Channel",      icon:"🌡️", desc:"CPU temp variation covert timing",     rate:"~5 B/s",   status:"standby", color:"#ef4444" },
              { name:"HDD Seek Noise",       icon:"💾", desc:"Acoustic exfil via HDD head movement", rate:"~25 B/s",  status:"ready",   color:"#a855f7" },
            ].map(ch => (
              <div key={ch.name} className="p-5 rounded-2xl border flex flex-col gap-3" style={{ background:"#0a1628", borderColor:`${ch.color}33` }}>
                <div className="flex items-start justify-between">
                  <div className="text-3xl">{ch.icon}</div>
                  <Chip color={ch.status==="active"?ch.color:ch.status==="standby"?"#f59e0b":"#6b8ab0"}>{ch.status}</Chip>
                </div>
                <div>
                  <div className="font-bold text-sm" style={{ color:"#e2eaf6" }}>{ch.name}</div>
                  <div className="text-[10px] mt-0.5 leading-relaxed" style={{ color:"#6b8ab0" }}>{ch.desc}</div>
                </div>
                <div className="text-[10px] font-mono" style={{ color:ch.color }}>Max rate: {ch.rate}</div>
                <div className="flex gap-2 mt-auto">
                  <ActionBtn onClick={() => show(`${ch.name} exfiltration started`)} color={ch.color} full><Upload size={11}/>Activate</ActionBtn>
                </div>
              </div>
            ))}
          </div>

          {/* Exfil payload builder */}
          <div className="rounded-2xl border p-5" style={{ background:"#0a1628", borderColor:"rgba(59,130,246,0.2)" }}>
            <div className="font-bold text-sm mb-4" style={{ color:"#e2eaf6" }}>Covert Payload Builder</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FLabel label="Target Device">
                <FSelect value="DEVBOX-ARCH" onChange={() => {}} options={SEED_DEVICES.map(d=>({val:d.name,label:d.name}))}/>
              </FLabel>
              <FLabel label="Channel">
                <FSelect value="RF Exfiltration" onChange={() => {}} options={["Ultrasound Channel","RF Exfiltration","USB Power Modulation","Optical (LED blink)"].map(x=>({val:x,label:x}))}/>
              </FLabel>
              <FLabel label="Payload">
                <FSelect value="creds" onChange={() => {}} options={[{val:"creds",label:"Credential Vault"},{val:"keys",label:"Keylog Dump"},{val:"files",label:"File Batch"},{val:"custom",label:"Custom Data"}]}/>
              </FLabel>
            </div>
            <div className="mt-4">
              <ActionBtn onClick={() => show("Air-gap payload encoded and transmission started")} color="#3b82f6"><Upload size={13}/>Build & Transmit Payload</ActionBtn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── SIEM Page ─────────────────────────────────────────────────────────────────
function SIEMPage() {
  const { show: siemShow, toasts: siemToasts } = useToast();
  const [siemTab, setSiemTab] = useState<"events"|"threats"|"reports"|"integrations">("events");
  const [events]  = useState([
    { id:"e1",  ts:"14:32:11", type:"auth",      sev:"low",      src:"EXEC-LAPTOP-01",  msg:"Successful login — j.morgan (2FA verified)" },
    { id:"e2",  ts:"14:31:58", type:"network",   sev:"critical", src:"MacBook-Pro-M3",   msg:"3.4 GB outbound to 185.220.101.x — possible exfil" },
    { id:"e3",  ts:"14:31:44", type:"process",   sev:"high",     src:"KIOSK-UBUNTU-07", msg:"Unknown process spawned from nginx — PID 9182" },
    { id:"e4",  ts:"14:31:30", type:"file",      sev:"medium",   src:"EXEC-LAPTOP-01",  msg:"Mass file access — 1,842 reads in 60s" },
    { id:"e5",  ts:"14:31:15", type:"auth",      sev:"high",     src:"DEVBOX-ARCH",     msg:"SSH brute force detected — 847 attempts" },
    { id:"e6",  ts:"14:30:59", type:"malware",   sev:"critical", src:"Galaxy-S24-Ultra", msg:"Suspicious APK sideloaded outside whitelist" },
    { id:"e7",  ts:"14:30:44", type:"network",   sev:"medium",   src:"iPhone-15-Pro",   msg:"DNS query to known C2 domain flagged" },
    { id:"e8",  ts:"14:30:30", type:"policy",    sev:"low",      src:"Mate60-Pro",       msg:"Screen lock policy applied — compliant" },
    { id:"e9",  ts:"14:30:15", type:"file",      sev:"high",     src:"KIOSK-UBUNTU-07", msg:"/etc/passwd read by unprivileged process" },
    { id:"e10", ts:"14:30:00", type:"auth",      sev:"critical", src:"EXEC-LAPTOP-01",  msg:"Admin credential accessed at 02:14 local time" },
  ]);
  const sevColor: Record<string,string> = { critical:"#ef4444", high:"#f59e0b", medium:"#3b82f6", low:"#10b981" };
  const typeColor: Record<string,string> = { auth:"#3b82f6", network:"#10d9a0", process:"#f59e0b", file:"#10b981", malware:"#ef4444", policy:"#6b8ab0" };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
      <ToastStack toasts={siemToasts} />
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black" style={{ color:"#e2eaf6" }}>SIEM — Security Information & Event Management</h1>
          <p className="text-sm mt-0.5" style={{ color:"#6b8ab0" }}>Real-time event correlation · Threat hunting · Splunk / Elastic / QRadar integration</p>
        </div>
        <div className="flex gap-2">
          <ActionBtn onClick={() => siemShow("Event log exported (events_2026-07-01.json)","info")} color="#3b82f6" outline><Download size={13}/>Export Events</ActionBtn>
          <ActionBtn onClick={() => siemShow("Threat hunt initiated — scanning all endpoints")} color="#ef4444" outline><AlertTriangle size={13}/>Threat Hunt</ActionBtn>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Events Today"    value="48,291"  icon={<Activity size={15}/>}      color="#3b82f6" sub="↑ 12% vs yesterday" />
        <StatCard label="Critical Alerts" value="3"       icon={<AlertTriangle size={15}/>}  color="#ef4444" sub="Immediate action" />
        <StatCard label="Threats Blocked" value="127"     icon={<Shield size={15}/>}         color="#10b981" sub="Last 24h" />
        <StatCard label="MTTR"            value="4.2 min" icon={<RefreshCw size={15}/>}      color="#10d9a0" sub="Mean time to respond" />
      </div>

      {/* Tab bar */}
      <div className="flex flex-wrap gap-1 p-1 rounded-xl w-fit" style={{ background:"#0a1628", border:"1px solid rgba(59,130,246,0.22)" }}>
        {(["events","threats","reports","integrations"] as const).map(t => (
          <button key={t} onClick={() => setSiemTab(t)}
            className="px-4 py-2 rounded-lg text-sm font-semibold capitalize transition-all"
            style={{ background:siemTab===t?"linear-gradient(135deg,#2563eb,#3b82f6)":"transparent", color:siemTab===t?"#fff":"#6b8ab0" }}>
            {t}
          </button>
        ))}
      </div>

      {/* Events */}
      {siemTab === "events" && (
        <div className="rounded-2xl overflow-hidden border" style={{ background:"#0a1628", borderColor:"rgba(59,130,246,0.2)" }}>
          <div className="px-5 py-3 border-b flex items-center gap-3 flex-wrap" style={{ borderColor:"rgba(59,130,246,0.15)", background:"#0d1930" }}>
            <div className="font-bold text-sm" style={{ color:"#e2eaf6" }}>Live Event Stream</div>
            <div className="flex gap-1 flex-wrap">
              {Object.keys(sevColor).map(s => <Chip key={s} color={sevColor[s]}>{s}</Chip>)}
            </div>
            <div className="ml-auto flex items-center gap-1.5 text-xs font-mono" style={{ color:"#10b981" }}>
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ background:"#10b981" }}/>LIVE
            </div>
          </div>
          <div className="divide-y" style={{ borderColor:"rgba(59,130,246,0.08)" }}>
            {events.map(e => (
              <div key={e.id} className="flex items-center gap-3 px-5 py-2.5 hover:bg-purple-500/5 transition-colors flex-wrap">
                <span className="text-[10px] font-mono flex-shrink-0" style={{ color:"#6b8ab0" }}>{e.ts}</span>
                <Chip color={sevColor[e.sev]}>{e.sev}</Chip>
                <Chip color={typeColor[e.type]}>{e.type}</Chip>
                <span className="text-[10px] font-mono flex-shrink-0" style={{ color:"#10d9a0" }}>{e.src}</span>
                <span className="text-xs flex-1" style={{ color:"#b8cce8" }}>{e.msg}</span>
                <button className="p-1 rounded flex-shrink-0" style={{ color:"#3b82f6" }} title="Investigate"><Search size={11}/></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Threats */}
      {siemTab === "threats" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { name:"APT Campaign",         score:92, ttps:["T1055","T1053","T1041"], src:"MacBook-Pro-M3",   color:"#ef4444" },
              { name:"Credential Stuffing",  score:78, ttps:["T1078","T1110"],        src:"EXEC-LAPTOP-01",  color:"#f59e0b" },
              { name:"C2 Beaconing",         score:85, ttps:["T1071","T1095"],        src:"Galaxy-S24-Ultra", color:"#ef4444" },
            ].map(t => (
              <div key={t.name} className="p-5 rounded-2xl border" style={{ background:"#0a1628", borderColor:`${t.color}33` }}>
                <div className="flex items-center justify-between mb-3">
                  <Chip color={t.color}>{t.score}% confidence</Chip>
                </div>
                <div className="font-black text-base mb-1" style={{ color:"#e2eaf6" }}>{t.name}</div>
                <div className="text-xs font-mono mb-3" style={{ color:"#6b8ab0" }}>Source: {t.src}</div>
                <div className="flex flex-wrap gap-1 mb-3">
                  {t.ttps.map(ttp => <span key={ttp} className="px-2 py-0.5 rounded text-[9px] font-mono" style={{ background:"rgba(59,130,246,0.15)", color:"#3b82f6" }}>{ttp}</span>)}
                </div>
                <div className="flex gap-2">
                  <ActionBtn onClick={() => siemShow(`Threat hunting ${t.name}…`)} color={t.color} outline full><Search size={11}/>Hunt</ActionBtn>
                  <ActionBtn onClick={() => siemShow(`Threat contained — device isolated`,"info")} color="#10b981" outline full><Shield size={11}/>Contain</ActionBtn>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reports */}
      {siemTab === "reports" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { name:"Daily Threat Summary",    period:"2026-07-01",  format:"PDF",  size:"2.4 MB",  status:"ready" },
              { name:"Weekly Compliance Report",period:"W26 2026",    format:"PDF",  size:"8.1 MB",  status:"ready" },
              { name:"Incident Report — INC-042",period:"2026-06-28", format:"PDF",  size:"1.2 MB",  status:"ready" },
              { name:"Device Audit Log",         period:"2026-Q2",    format:"CSV",  size:"45.6 MB", status:"ready" },
              { name:"Credential Exposure Report",period:"2026-07-01",format:"PDF",  size:"0.8 MB",  status:"generating"},
            ].map(r => (
              <div key={r.name} className="flex items-center gap-4 p-4 rounded-xl border" style={{ background:"#0a1628", borderColor:"rgba(59,130,246,0.2)" }}>
                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background:"rgba(59,130,246,0.12)" }}>
                  <FileText size={15} color="#3b82f6"/>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate" style={{ color:"#e2eaf6" }}>{r.name}</div>
                  <div className="text-[10px] font-mono mt-0.5" style={{ color:"#6b8ab0" }}>{r.period} · {r.format} · {r.size}</div>
                </div>
                <Chip color={r.status==="ready"?"#10b981":"#f59e0b"}>{r.status}</Chip>
                <button className="p-1.5 rounded-lg" style={{ color:"#10b981" }}><Download size={13}/></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Integrations */}
      {siemTab === "integrations" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { name:"Splunk Enterprise",    status:"connected", events:"48,291/day", color:"#f59e0b", logo:"📊" },
            { name:"Elastic SIEM",         status:"connected", events:"48,291/day", color:"#10b981", logo:"🔍" },
            { name:"IBM QRadar",           status:"standby",   events:"—",          color:"#6b8ab0", logo:"🔵" },
            { name:"Microsoft Sentinel",   status:"connected", events:"48,291/day", color:"#10d9a0", logo:"☁️" },
            { name:"Palo Alto XSOAR",      status:"standby",   events:"—",          color:"#6b8ab0", logo:"🔐" },
            { name:"CrowdStrike Falcon",   status:"connected", events:"12,048/day", color:"#ef4444", logo:"🦅" },
          ].map(i => (
            <div key={i.name} className="flex items-center gap-4 p-5 rounded-2xl border" style={{ background:"#0a1628", borderColor:i.status==="connected"?`${i.color}33`:"rgba(59,130,246,0.2)" }}>
              <div className="text-3xl">{i.logo}</div>
              <div className="flex-1">
                <div className="font-bold text-sm" style={{ color:"#e2eaf6" }}>{i.name}</div>
                <div className="text-[10px] font-mono mt-0.5" style={{ color:"#6b8ab0" }}>Events: {i.events}</div>
              </div>
              <div className="flex items-center gap-3">
                <Chip color={i.status==="connected"?i.color:"#6b8ab0"}>{i.status}</Chip>
                <ActionBtn onClick={() => siemShow(`${i.name} ${i.status==="connected"?"configuration opened":"connection initiated"}`,"info")} color={i.color} outline>{i.status==="connected"?"Config":"Connect"}</ActionBtn>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Remote Control ──────────────────────────────────────────────────────────
function RemoteControl({ device, onBack }: { device: Device | DashDevice; onBack: () => void }) {
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(false);
  const [quality, setQuality] = useState("ultra");
  const [tool, setTool] = useState<"mouse" | "keyboard" | "clipboard">("mouse");
  const [fullscreen, setFullscreen] = useState(false);
  const [fps] = useState(58);
  const [latency] = useState(device.latency);
  const { show: rcShow, toasts: rcToasts } = useToast();
  const [showShell, setShowShell] = useState(false);
  const [shellInput, setShellInput] = useState("");
  const [shellLog, setShellLog] = useState<string[]>([
    `$ ssh ${device.user}@${device.ip} -p 4433`,
    `Connected to ${device.name} — AES-256 tunnel active`,
    "$ ",
  ]);
  const [showFiles, setShowFiles] = useState(false);
  const [filePath, setFilePath] = useState("/home/" + device.user);
  const [rebootConfirm, setRebootConfirm] = useState(false);
  const [screenshotDone, setScreenshotDone] = useState(false);

  const handleShellExec = () => {
    if (!shellInput.trim()) return;
    const cmd = shellInput;
    setShellLog(l => [...l.slice(-49),
      `$ ${cmd}`,
      cmd === "ls" ? "Desktop  Documents  Downloads  Pictures  Videos" :
      cmd.startsWith("cd") ? `Changed to ${cmd.split(" ")[1] || "/"}` :
      cmd === "whoami" ? device.user :
      cmd === "pwd" ? filePath :
      cmd === "ps aux" ? `PID  CMD\n1234 chrome\n5678 node\n9012 bixtx-agent` :
      `[${device.name}] command executed`,
      "$ ",
    ]);
    setShellInput("");
  };

  const handleScreenshot = () => {
    setScreenshotDone(true);
    rcShow(`Screenshot saved: screen_${Date.now()}.png`);
    setTimeout(() => setScreenshotDone(false), 2500);
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-6 space-y-4">
      {/* breadcrumb */}
      <div className="flex items-center gap-2 text-sm" style={{ color: "#6b8ab0" }}>
        <button onClick={onBack} className="hover:text-foreground transition-colors flex items-center gap-1">
          <LayoutDashboard size={13} /> Dashboard
        </button>
        <ChevronRight size={13} />
        <span style={{ color: "#3b82f6" }}>Remote Control</span>
        <ChevronRight size={13} />
        <span style={{ color: "#e2eaf6" }}>{device.name}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        {/* Screen area */}
        <div className="lg:col-span-3 space-y-3">
          {/* Toolbar */}
          <div className="flex items-center justify-between gap-3 px-4 py-2 rounded-xl border flex-wrap"
            style={{ background: "#0a1628", borderColor: "rgba(59,130,246,0.2)" }}>
            <div className="flex items-center gap-2">
              {[
                { id: "mouse", icon: <MousePointer size={13} />, label: "Mouse" },
                { id: "keyboard", icon: <Keyboard size={13} />, label: "Keys" },
                { id: "clipboard", icon: <Clipboard size={13} />, label: "Clipboard" },
              ].map(t => (
                <button key={t.id} onClick={() => setTool(t.id as typeof tool)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={{
                    background: tool === t.id ? "rgba(59,130,246,0.2)" : "transparent",
                    color: tool === t.id ? "#3b82f6" : "#6b8ab0",
                    border: `1px solid ${tool === t.id ? "rgba(59,130,246,0.4)" : "transparent"}`,
                  }}>
                  {t.icon}{t.label}
                </button>
              ))}
              <div className="w-px h-4 mx-1" style={{ background: "rgba(59,130,246,0.2)" }} />
              <button onClick={() => setMuted(v => !v)} className="p-1.5 rounded-lg transition-all hover:bg-purple-500/10" style={{ color: muted ? "#ef4444" : "#6b8ab0" }}>
                {muted ? <VolumeX size={13} /> : <Volume2 size={13} />}
              </button>
              <button onClick={() => setPlaying(v => !v)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={{ background: playing ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)", color: playing ? "#10b981" : "#ef4444" }}>
                {playing ? <><Pause size={11} />Live</> : <><Play size={11} />Paused</>}
              </button>
            </div>
            <div className="flex items-center gap-2">
              <select value={quality} onChange={e => setQuality(e.target.value)}
                className="px-2 py-1.5 rounded-lg text-xs font-mono outline-none"
                style={{ background: "#0d1930", border: "1px solid rgba(59,130,246,0.3)", color: "#b8cce8" }}>
                {["eco","balanced","ultra","lossless"].map(q => <option key={q} value={q}>{q}</option>)}
              </select>
              <button onClick={() => setFullscreen(v => !v)} className="p-1.5 rounded-lg transition-all hover:bg-purple-500/10" style={{ color: "#6b8ab0" }}>
                <Maximize2 size={13} />
              </button>
              <button className="p-1.5 rounded-lg transition-all hover:bg-purple-500/10" style={{ color: "#6b8ab0" }}>
                <RotateCcw size={13} />
              </button>
            </div>
          </div>

          {/* Screen canvas */}
          <div className="relative rounded-2xl overflow-hidden" style={{ background: "#060512", border: "1px solid rgba(59,130,246,0.3)", aspectRatio: "16/9" }}>
            {/* Simulated desktop */}
            <div className="absolute inset-0 flex flex-col">
              {/* Fake taskbar top */}
              <div className="h-7 flex items-center justify-between px-4 flex-shrink-0"
                style={{ background: "rgba(20,18,40,0.95)", borderBottom: "1px solid rgba(59,130,246,0.15)" }}>
                <div className="flex items-center gap-3">
                  {["#ef4444","#f59e0b","#10b981"].map(c => <div key={c} className="w-2.5 h-2.5 rounded-full" style={{ background: c }} />)}
                </div>
                <div className="text-[10px] font-mono" style={{ color: "#6b8ab0" }}>{device.name} — {OS_LABEL[device.os]} · {device.user}</div>
                <div className="text-[10px] font-mono" style={{ color: "#6b8ab0" }}>14:32:07</div>
              </div>

              {/* Fake desktop wallpaper */}
              <div className="flex-1 relative overflow-hidden"
                style={{ background: "linear-gradient(135deg,#080618 0%,#0d0a24 40%,#07111a 100%)" }}>
                {/* Grid lines */}
                <div className="absolute inset-0" style={{
                  backgroundImage: "linear-gradient(rgba(59,130,246,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(59,130,246,0.03) 1px,transparent 1px)",
                  backgroundSize: "32px 32px",
                }} />
                {/* Glow */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-48 rounded-full opacity-20"
                  style={{ background: "radial-gradient(ellipse,#3b82f6 0%,transparent 70%)" }} />

                {/* Fake windows */}
                <div className="absolute top-8 left-8 w-48 h-36 rounded-xl overflow-hidden shadow-2xl"
                  style={{ background: "#0a1628", border: "1px solid rgba(59,130,246,0.3)" }}>
                  <div className="h-6 flex items-center px-2 gap-1.5" style={{ background: "#0d1930" }}>
                    {["#ef4444","#f59e0b","#10b981"].map(c => <div key={c} className="w-2 h-2 rounded-full" style={{ background: c }} />)}
                    <span className="text-[9px] font-mono ml-1" style={{ color: "#6b8ab0" }}>Terminal</span>
                  </div>
                  <div className="p-2 font-mono text-[8px] space-y-0.5" style={{ color: "#10b981" }}>
                    <div>$ bixtx-agent --status</div>
                    <div style={{ color: "#3ddc84" }}>● Active · uptime {device.uptime}</div>
                    <div>$ netstat -an | grep 4433</div>
                    <div style={{ color: "#10d9a0" }}>ESTABLISHED 192.168.1.1</div>
                    <div style={{ color: "#3b82f6" }}>$ _</div>
                  </div>
                </div>

                <div className="absolute top-6 right-8 w-40 h-28 rounded-xl overflow-hidden shadow-2xl"
                  style={{ background: "#0a1628", border: "1px solid rgba(6,182,212,0.3)" }}>
                  <div className="h-6 flex items-center px-2 gap-1.5" style={{ background: "#0d1930" }}>
                    {["#ef4444","#f59e0b","#10b981"].map(c => <div key={c} className="w-2 h-2 rounded-full" style={{ background: c }} />)}
                    <span className="text-[9px] font-mono ml-1" style={{ color: "#6b8ab0" }}>System Monitor</span>
                  </div>
                  <div className="p-2 space-y-1.5">
                    {[["CPU",device.cpu,"#10b981"],["RAM",device.ram,"#3b82f6"]].map(([l,v,c]) => (
                      <div key={String(l)}>
                        <div className="flex justify-between text-[8px] font-mono mb-0.5" style={{ color: "#6b8ab0" }}>
                          <span>{l}</span><span style={{ color: String(c) }}>{v}%</span>
                        </div>
                        <div className="h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                          <div className="h-full rounded-full" style={{ width: `${v}%`, background: String(c) }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Live session badge */}
                {playing && (
                  <div className="absolute bottom-3 left-3 flex items-center gap-1.5 px-2 py-1 rounded-lg text-[9px] font-mono font-bold"
                    style={{ background: "rgba(239,68,68,0.9)", color: "#fff" }}>
                    <Circle size={7} className="animate-pulse" fill="#fff" /> LIVE
                  </div>
                )}
                <div className="absolute bottom-3 right-3 flex items-center gap-3 text-[9px] font-mono"
                  style={{ color: "#6b8ab0" }}>
                  <span style={{ color: "#10b981" }}>{fps} FPS</span>
                  <span style={{ color: latency > 10 ? "#f59e0b" : "#10d9a0" }}>{latency}ms</span>
                  <span>{quality}</span>
                </div>
              </div>
            </div>

            {/* Paused overlay */}
            {!playing && (
              <div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(7,6,15,0.8)", backdropFilter: "blur(8px)" }}>
                <button onClick={() => setPlaying(true)}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm"
                  style={{ background: "linear-gradient(135deg,#2563eb,#3b82f6)", color: "#fff" }}>
                  <Play size={16} /> Resume Stream
                </button>
              </div>
            )}
          </div>

          {/* Bottom controls */}
          <div className="flex items-center gap-3 flex-wrap">
            {[
              { label: screenshotDone?"Saved!":"Screenshot", icon:<Camera size={13}/>,    color:"#3b82f6", action: handleScreenshot },
              { label:"File Browser", icon:<FolderOpen size={13}/>, color:"#10d9a0", action:() => setShowFiles(true) },
              { label:"Remote Shell", icon:<Terminal size={13}/>,   color:"#10b981", action:() => setShowShell(true) },
              { label: rebootConfirm?"Confirm?":"Reboot",  icon:<RotateCcw size={13}/>,  color:"#f59e0b", action:() => { if(rebootConfirm){rcShow("Reboot command sent","info");setRebootConfirm(false);}else{setRebootConfirm(true);setTimeout(()=>setRebootConfirm(false),3000);} } },
              { label:"End Session",  icon:<Square size={13}/>,     color:"#ef4444", action: onBack },
            ].map(({ label, icon, color, action }) => (
              <button key={label} onClick={action} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all hover:opacity-80 active:scale-95"
                style={{ background:`${color}15`, color, border:`1px solid ${color}30` }}>
                {icon}{label}
              </button>
            ))}
          </div>
        </div>

        <ToastStack toasts={rcToasts} />

        {/* ── Shell modal ── */}
        <Modal open={showShell} onClose={() => setShowShell(false)} title={`Remote Shell — ${device.name}`} wide>
          <div className="rounded-xl overflow-hidden" style={{ background:"#060512", border:"1px solid rgba(16,185,129,0.3)" }}>
            <div className="px-4 py-2 flex items-center gap-2 border-b" style={{ borderColor:"rgba(16,185,129,0.2)", background:"#030b16" }}>
              <div className="flex gap-1.5">{["#ef4444","#f59e0b","#10b981"].map(c2=><div key={c2} className="w-2.5 h-2.5 rounded-full" style={{background:c2}}/>)}</div>
              <span className="text-[11px] font-mono ml-2" style={{color:"#10b981"}}>{device.user}@{device.name} — AES-256 tunnel</span>
            </div>
            <div className="h-64 overflow-y-auto p-4 font-mono text-xs space-y-0.5" style={{color:"#10b981"}}>
              {shellLog.map((l,i) => <div key={i} style={{color: l.startsWith("$")?"#10b981": l.startsWith("Connected")?"#10d9a0":"#b8cce8"}}>{l}</div>)}
            </div>
            <div className="flex items-center gap-2 px-4 py-2.5 border-t" style={{borderColor:"rgba(16,185,129,0.2)"}}>
              <span className="text-xs font-mono" style={{color:"#10b981"}}>$</span>
              <input value={shellInput} onChange={e=>setShellInput(e.target.value)}
                onKeyDown={e=>{ if(e.key==="Enter") handleShellExec(); }}
                className="flex-1 bg-transparent outline-none text-xs font-mono" style={{color:"#10b981"}}
                placeholder="Enter command…" autoFocus/>
              <button onClick={handleShellExec} className="px-3 py-1 rounded-lg text-xs font-bold" style={{background:"rgba(16,185,129,0.2)",color:"#10b981"}}>Run</button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            {["ls","pwd","whoami","ps aux","cat /etc/hostname","df -h","free -m"].map(cmd=>(
              <button key={cmd} onClick={()=>{setShellInput(cmd);}} className="px-2 py-1 rounded text-[10px] font-mono" style={{background:"rgba(16,185,129,0.1)",color:"#10b981",border:"1px solid rgba(16,185,129,0.2)"}}>
                {cmd}
              </button>
            ))}
          </div>
        </Modal>

        {/* ── File Browser modal ── */}
        <Modal open={showFiles} onClose={() => setShowFiles(false)} title={`File Browser — ${device.name}`} wide>
          <div className="flex items-center gap-2 mb-3">
            <button onClick={()=>setFilePath(filePath.split("/").slice(0,-1).join("/")||"/")} className="p-1.5 rounded" style={{color:"#6b8ab0"}}>←</button>
            <div className="flex-1 px-3 py-1.5 rounded-lg text-xs font-mono" style={{background:"#0d1930",border:"1px solid rgba(59,130,246,0.3)",color:"#3b82f6"}}>{filePath}</div>
            <button onClick={()=>rcShow("Directory refreshed")} className="p-1.5 rounded" style={{color:"#6b8ab0"}}><RefreshCw size={12}/></button>
          </div>
          <div className="rounded-xl overflow-hidden border" style={{borderColor:"rgba(59,130,246,0.2)"}}>
            {[
              {name:"..",      type:"dir",  size:"—",        mod:"—"          },
              {name:"Desktop", type:"dir",  size:"—",        mod:"Today 09:00"},
              {name:"Documents",type:"dir", size:"—",        mod:"Yesterday"  },
              {name:"Downloads",type:"dir", size:"—",        mod:"Today 08:30"},
              {name:".ssh",    type:"dir",  size:"—",        mod:"2026-06-01" },
              {name:"bixtx-agent.log",type:"file",size:"2.4 MB",mod:"Now"   },
              {name:"config.json",     type:"file",size:"12 KB", mod:"Today"  },
              {name:"credentials.db",  type:"file",size:"48 KB", mod:"Yesterday"},
              {name:"screenshot_01.png",type:"file",size:"1.2 MB",mod:"14:30"},
            ].map((f,i)=>(
              <div key={i} onClick={()=>{ if(f.type==="dir"&&f.name!=="..") setFilePath(filePath+"/"+f.name); }}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-purple-500/5 transition-colors cursor-pointer border-b" style={{borderColor:"rgba(59,130,246,0.08)"}}>
                <span className="text-base">{f.type==="dir"?"📁":"📄"}</span>
                <span className="flex-1 text-sm font-mono" style={{color:f.type==="dir"?"#10d9a0":"#b8cce8"}}>{f.name}</span>
                <span className="text-[10px] font-mono" style={{color:"#6b8ab0"}}>{f.size}</span>
                <span className="text-[10px] font-mono" style={{color:"#6b8ab0"}}>{f.mod}</span>
                {f.type==="file" && <button onClick={e=>{e.stopPropagation();rcShow(`${f.name} downloaded`,"info");}} className="p-1 rounded" style={{color:"#10b981"}}><Download size={11}/></button>}
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2 mt-3">
            <ActionBtn onClick={()=>rcShow("All files zipped and downloaded","info")} color="#3b82f6" outline><Download size={12}/>Download All</ActionBtn>
            <ActionBtn onClick={()=>rcShow("File upload started")} color="#10d9a0" outline><Upload size={12}/>Upload File</ActionBtn>
          </div>
        </Modal>

        {/* Session info sidebar */}
        <div className="space-y-4">
          <div className="rounded-xl border p-4" style={{ background: "#0a1628", borderColor: "rgba(59,130,246,0.2)" }}>
            <div className="text-[10px] font-mono uppercase tracking-widest mb-3" style={{ color: "#6b8ab0" }}>Session Info</div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-10 h-10 rounded-xl text-xl flex items-center justify-center"
                style={{ background: `${OS_COLOR[device.os]}18`, border: `1px solid ${OS_COLOR[device.os]}30` }}>
                {OS_ICON[device.os]}
              </div>
              <div>
                <div className="font-bold text-sm" style={{ color: "#e2eaf6" }}>{device.name}</div>
                <div className="text-xs font-mono" style={{ color: "#6b8ab0" }}>{device.user}</div>
              </div>
            </div>
            <div className="space-y-2 text-xs font-mono">
              {[
                { label: "IP Address", val: device.ip },
                { label: "Location", val: device.location },
                { label: "Uptime", val: device.uptime },
                { label: "Latency", val: `${device.latency}ms`, color: device.latency > 10 ? "#f59e0b" : "#10b981" },
                { label: "OS", val: OS_LABEL[device.os] },
                { label: "Last Seen", val: device.lastSeen },
              ].map(({ label, val, color }) => (
                <div key={label} className="flex items-center justify-between gap-2">
                  <span style={{ color: "#6b8ab0" }}>{label}</span>
                  <span style={{ color: color ?? "#b8cce8" }}>{val}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Live metrics */}
          <div className="rounded-xl border p-4" style={{ background: "#0a1628", borderColor: "rgba(59,130,246,0.2)" }}>
            <div className="text-[10px] font-mono uppercase tracking-widest mb-3" style={{ color: "#6b8ab0" }}>Live Metrics</div>
            <div className="space-y-3">
              {[
                { label: "CPU", val: device.cpu, color: device.cpu > 80 ? "#ef4444" : "#10b981" },
                { label: "RAM", val: device.ram, color: "#3b82f6" },
                ...(device.battery ? [{ label: "Battery", val: device.battery, color: device.battery < 30 ? "#ef4444" : "#f59e0b" }] : []),
              ].map(({ label, val, color }) => (
                <div key={label}>
                  <div className="flex justify-between text-xs font-mono mb-1" style={{ color: "#6b8ab0" }}>
                    <span>{label}</span><span style={{ color }}>{val}%</span>
                  </div>
                  <div className="h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${val}%`, background: color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Monitoring toggles */}
          <div className="rounded-xl border p-4 space-y-3" style={{ background: "#0a1628", borderColor: "rgba(59,130,246,0.2)" }}>
            <div className="text-[10px] font-mono uppercase tracking-widest mb-1" style={{ color: "#6b8ab0" }}>Monitoring</div>
            {[
              { label: "Screen Recording", icon: <Monitor size={13} />, active: true, color: "#3b82f6" },
              { label: "Microphone", icon: <Mic size={13} />, active: !muted, color: "#10d9a0" },
              { label: "Camera", icon: <Camera size={13} />, active: false, color: "#10b981" },
              { label: "Keylogger", icon: <Keyboard size={13} />, active: true, color: "#f59e0b" },
            ].map(({ label, icon, active, color }) => (
              <div key={label} className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm" style={{ color: active ? "#b8cce8" : "#6b8ab0" }}>
                  <span style={{ color: active ? color : "#1a3060" }}>{icon}</span>{label}
                </div>
                <div className="w-8 h-4 rounded-full relative cursor-pointer transition-all"
                  style={{ background: active ? color : "#0f1e3a" }}>
                  <div className="absolute top-0.5 w-3 h-3 rounded-full transition-all"
                    style={{ left: active ? "17px" : "2px", background: "#fff" }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Pricing Page ────────────────────────────────────────────────────────────
function PricingPage({ setPage }: { setPage: (p: Page) => void }) {
  const [annual, setAnnual] = useState(true);

  const plans = [
    {
      id: "personal", label: "Personal", icon: <User size={18} />, color: "#10d9a0",
      monthly: 0, annual: 0,
      sub: "Free forever",
      features: ["Up to 5 devices", "Screen sharing & remote control", "Basic encryption (AES-128)", "Community support", "1 admin account", "7-day session history"],
      missing: ["Camera & microphone access", "WiFi Scanner", "OTA updates", "Multi-device panel", "API access", "Custom branding"],
    },
    {
      id: "pro", label: "Professional", icon: <Star size={18} />, color: "#3b82f6", popular: true,
      monthly: 49, annual: 39,
      sub: "Per admin / month",
      features: ["Up to 100 devices", "All monitoring capabilities", "AES-256-GCM encryption", "Military-grade WiFi Scanner", "OTA silent updates", "Remote shell & file transfer", "30-day session history", "Email & chat support", "REST API access", "5 admin accounts"],
      missing: ["Custom branding", "SAML / SSO", "On-premise hosting", "Dedicated SLA"],
    },
    {
      id: "enterprise", label: "Enterprise", icon: <Building size={18} />, color: "#f59e0b",
      monthly: null, annual: null,
      sub: "Custom pricing",
      features: ["Unlimited devices", "Everything in Professional", "Custom branding & white-label", "SAML / SSO integration", "On-premise & air-gap hosting", "MDM & Group Policy integration", "Unlimited admin accounts", "99.99% uptime SLA", "24/7 dedicated support", "Compliance docs (GDPR, HIPAA)"],
      missing: [],
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-6 py-14">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-black mb-3" style={{ color: "#e2eaf6" }}>Simple, Transparent Pricing</h1>
        <p className="text-base mb-6" style={{ color: "#6b8ab0" }}>Scale from personal use to enterprise-wide deployment</p>
        <div className="inline-flex items-center gap-2 p-1 rounded-xl" style={{ background: "#0a1628", border: "1px solid rgba(59,130,246,0.2)" }}>
          <button onClick={() => setAnnual(false)} className="px-4 py-2 rounded-lg text-sm font-semibold transition-all"
            style={{ background: !annual ? "rgba(59,130,246,0.2)" : "transparent", color: !annual ? "#3b82f6" : "#6b8ab0" }}>
            Monthly
          </button>
          <button onClick={() => setAnnual(true)} className="px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2"
            style={{ background: annual ? "rgba(59,130,246,0.2)" : "transparent", color: annual ? "#3b82f6" : "#6b8ab0" }}>
            Annual <Chip color="#10b981">Save 20%</Chip>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-12">
        {plans.map(plan => (
          <div key={plan.id} className="relative rounded-2xl border p-6 flex flex-col"
            style={{
              background: "#0a1628",
              borderColor: plan.popular ? plan.color : "rgba(59,130,246,0.2)",
              boxShadow: plan.popular ? `0 0 40px ${plan.color}22` : "none",
            }}>
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Chip color="#3b82f6">Most Popular</Chip>
              </div>
            )}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${plan.color}18`, border: `1px solid ${plan.color}33` }}>
                <span style={{ color: plan.color }}>{plan.icon}</span>
              </div>
              <div>
                <div className="font-black" style={{ color: "#e2eaf6" }}>{plan.label}</div>
                <div className="text-[11px] font-mono" style={{ color: "#6b8ab0" }}>{plan.sub}</div>
              </div>
            </div>

            <div className="mb-5">
              {plan.monthly === null ? (
                <div className="text-3xl font-black" style={{ color: plan.color }}>Custom</div>
              ) : plan.monthly === 0 ? (
                <div className="text-3xl font-black" style={{ color: plan.color }}>Free</div>
              ) : (
                <div className="flex items-end gap-1">
                  <div className="text-3xl font-black" style={{ color: plan.color }}>
                    ${annual ? plan.annual : plan.monthly}
                  </div>
                  <div className="text-sm pb-1" style={{ color: "#6b8ab0" }}>/mo</div>
                </div>
              )}
            </div>

            <ul className="space-y-2 mb-6 flex-1">
              {plan.features.map(f => (
                <li key={f} className="flex items-start gap-2 text-sm" style={{ color: "#b8cce8" }}>
                  <Check size={13} color={plan.color} strokeWidth={3} className="flex-shrink-0 mt-0.5" />{f}
                </li>
              ))}
              {plan.missing.map(f => (
                <li key={f} className="flex items-start gap-2 text-sm" style={{ color: "#1a3060" }}>
                  <Minus size={13} className="flex-shrink-0 mt-0.5" />{f}
                </li>
              ))}
            </ul>

            <button
              onClick={() => plan.id === "enterprise" ? null : setPage("login")}
              className="w-full py-3 rounded-xl text-sm font-bold transition-all hover:opacity-90"
              style={{
                background: plan.popular ? `linear-gradient(135deg,${plan.color},#2563eb)` : `${plan.color}18`,
                color: plan.popular ? "#fff" : plan.color,
                border: plan.popular ? "none" : `1px solid ${plan.color}33`,
              }}>
              {plan.id === "enterprise" ? "Contact Sales" : plan.monthly === 0 ? "Get Started Free" : "Start Free Trial"}
            </button>
          </div>
        ))}
      </div>

      {/* Feature comparison table */}
      <div className="rounded-2xl overflow-hidden" style={{ background: "#0a1628", border: "1px solid rgba(59,130,246,0.2)" }}>
        <div className="px-6 py-4 border-b flex items-center gap-2" style={{ borderColor: "rgba(59,130,246,0.15)" }}>
          <BarChart2 size={15} color="#3b82f6" />
          <span className="font-bold">Full Feature Comparison</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(59,130,246,0.15)" }}>
                <th className="text-left px-6 py-3 text-xs font-mono uppercase tracking-wider" style={{ color: "#6b8ab0" }}>Feature</th>
                {["Personal", "Professional", "Enterprise"].map(p => (
                  <th key={p} className="px-4 py-3 text-center text-xs font-mono uppercase tracking-wider" style={{ color: "#6b8ab0" }}>{p}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ["Max Devices", "5", "100", "Unlimited"],
                ["Screen Recording", true, true, true],
                ["Camera & Microphone", false, true, true],
                ["WiFi Scanner", false, true, true],
                ["Remote Shell", false, true, true],
                ["OTA Updates", false, true, true],
                ["API Access", false, true, true],
                ["SAML / SSO", false, false, true],
                ["On-premise Hosting", false, false, true],
                ["Custom Branding", false, false, true],
                ["SLA", "—", "99.97%", "99.99%"],
                ["Support", "Community", "Email + Chat", "24/7 Dedicated"],
              ].map(([feat, p, pro, ent], i) => (
                <tr key={i} className="transition-colors hover:bg-purple-500/5" style={{ borderBottom: "1px solid rgba(59,130,246,0.07)" }}>
                  <td className="px-6 py-3 text-sm" style={{ color: "#b8cce8" }}>{feat}</td>
                  {[p, pro, ent].map((v, ci) => (
                    <td key={ci} className="px-4 py-3 text-center">
                      {typeof v === "boolean"
                        ? v ? <Check size={14} color="#10b981" strokeWidth={3} className="mx-auto" /> : <Minus size={14} color="#1a3060" className="mx-auto" />
                        : <span className="text-xs font-mono" style={{ color: v === "Unlimited" || v === "24/7 Dedicated" ? "#3b82f6" : "#b8cce8" }}>{v}</span>
                      }
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
}

// ─── Docs Page ───────────────────────────────────────────────────────────────
function DocsPage() {
  const [active, setActive] = useState("quickstart");
  const content = DOCS_CONTENT[active];

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 flex gap-6 min-h-[calc(100vh-64px)]">
      {/* Sidebar */}
      <div className="w-56 flex-shrink-0 space-y-1 sticky top-8 self-start">
        <div className="text-[9px] font-mono uppercase tracking-widest mb-3" style={{ color: "#6b8ab0" }}>Documentation</div>
        {DOCS_SECTIONS.map(s => (
          <button key={s.id} onClick={() => setActive(s.id)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-all"
            style={{
              background: active === s.id ? "rgba(59,130,246,0.15)" : "transparent",
              color: active === s.id ? "#3b82f6" : "#6b8ab0",
              border: `1px solid ${active === s.id ? "rgba(59,130,246,0.35)" : "transparent"}`,
              fontWeight: active === s.id ? 600 : 400,
            }}>
            {s.icon}{s.label}
          </button>
        ))}
        <div className="pt-4 mt-4 border-t" style={{ borderColor: "rgba(59,130,246,0.15)" }}>
          <div className="px-3 py-2 rounded-xl text-xs" style={{ background: "rgba(59,130,246,0.08)", color: "#3b82f6", border: "1px solid rgba(59,130,246,0.2)" }}>
            <div className="font-bold mb-0.5">Need help?</div>
            <div style={{ color: "#6b8ab0" }}>Email support@bixtx.com or open a ticket.</div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="rounded-2xl border p-8" style={{ background: "#0a1628", borderColor: "rgba(59,130,246,0.2)" }}>
          <div className="flex items-start justify-between mb-6">
            <h1 className="text-2xl font-black" style={{ color: "#e2eaf6" }}>{content?.title}</h1>
            <div className="flex items-center gap-2">
              <Chip color="#3b82f6">v{VERSION}</Chip>
              <Chip color="#10b981">Stable</Chip>
            </div>
          </div>
          <div>{content?.body}</div>
        </div>

        {/* Prev / Next nav */}
        <div className="flex items-center justify-between mt-4">
          {(() => {
            const idx = DOCS_SECTIONS.findIndex(s => s.id === active);
            const prev = DOCS_SECTIONS[idx - 1];
            const next = DOCS_SECTIONS[idx + 1];
            return (
              <>
                {prev ? (
                  <button onClick={() => setActive(prev.id)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:opacity-80"
                    style={{ background: "#0a1628", color: "#3b82f6", border: "1px solid rgba(59,130,246,0.25)" }}>
                    <ChevronRight size={13} className="rotate-180" />{prev.label}
                  </button>
                ) : <div />}
                {next ? (
                  <button onClick={() => setActive(next.id)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:opacity-80"
                    style={{ background: "#0a1628", color: "#3b82f6", border: "1px solid rgba(59,130,246,0.25)" }}>
                    {next.label}<ChevronRight size={13} />
                  </button>
                ) : <div />}
              </>
            );
          })()}
        </div>
      </div>
    </div>
  );
}

// ─── Download Page (condensed) ───────────────────────────────────────────────



// ─── Sensor Alert Types (agent-reported physical/environmental alerts) ─────────
interface SensorAlert {
  alertId:    string;
  type:       "FALL" | "ABNORMAL_HEART_RATE" | "EXTREME_HEAT" | "SUSTAINED_NOISE" | "PROLONGED_ACTIVITY";
  severity:   "CRITICAL" | "HIGH" | "WARNING";
  title:      string;
  detail:     string;
  action:     string;
  readings:   Record<string, unknown>;
  deviceId:   string;
  platform:   string;
  ts:         number;
  timestamp:  string;
  enriched?:  boolean;
  geopolitical?: {
    city: string; region: string; country: string; countryCode: string;
    latitude: number | null; longitude: number | null;
    isp: string; ip: string; timezone: string; callingCode?: string;
  };
  deviceDetail?: {
    name: string; manufacturer: string; model: string; serial: string;
    os: string; battery: { percent: number; isCharging: boolean; temperature: number };
    network: { ip: string; mac: string; iface: string };
    cpu: { brand: string; cores: number; speed: number };
  };
  userDetail?: { username: string; fullName: string; homeDir: string };
  emergencyContacts?: Array<{ name: string; number: string; type: string }>;
}

const SENSOR_ICON: Record<string, string> = {
  FALL:               "🆘",
  ABNORMAL_HEART_RATE:"❤️",
  EXTREME_HEAT:       "🔥",
  SUSTAINED_NOISE:    "🔊",
  PROLONGED_ACTIVITY: "⏱️",
};

const MOCK_SENSOR_ALERTS: SensorAlert[] = [
  {
    alertId: "em-001", type: "FALL", severity: "CRITICAL",
    title: "🆘 Fall / Major Physical Impact Detected",
    detail: "Device experienced sudden impact (Δ3.1g) followed by 9s of stillness. User may have fallen.",
    action: "Attempt to contact user immediately. Dispatch emergency services if unreachable.",
    readings: { impactG: "3.1", stillnessMs: 9000, currentMag: "0.1" },
    deviceId: "d4", platform: "android", ts: Date.now() - 120000, timestamp: new Date(Date.now()-120000).toISOString(),
    enriched: true,
    geopolitical: { city:"Mumbai", region:"Maharashtra", country:"India", countryCode:"IN",
      latitude:19.076, longitude:72.877, isp:"Jio Infocomm Ltd", ip:"182.75.243.12", timezone:"Asia/Kolkata", callingCode:"+91" },
    deviceDetail: { name:"Galaxy-S24-Ultra", manufacturer:"Samsung", model:"SM-S928B", serial:"R3CTA01Z0BK",
      os:"Android 15", battery:{ percent:23, isCharging:false, temperature:42 },
      network:{ ip:"192.168.1.88", mac:"AA:BB:CC:DD:EE:FF", iface:"wlan0" },
      cpu:{ brand:"Snapdragon 8 Gen 3", cores:8, speed:3.39 } },
    userDetail: { username:"rahul_s", fullName:"Rahul Sharma", homeDir:"/data/data" },
    emergencyContacts: [
      { name:"Priya Sharma (Wife)", number:"+91 98765 43210", type:"ICE" },
      { name:"Dr. Mehta", number:"+91 99001 12345", type:"ICE" },
      { name:"Last Call — 2m ago", number:"+91 80001 55678", type:"LAST_DIALLED" },
    ],
  },
  {
    alertId: "em-002", type: "EXTREME_HEAT", severity: "CRITICAL",
    title: "🔥 Extreme Heat / Possible Fire",
    detail: "CPU temperature 91.4°C (avg 88°C), battery 57°C. FIRE RISK — immediate shutdown recommended.",
    action: "Verify device environment immediately. Possible fire or extreme heat source.",
    readings: { cpuTemp: 91.4, avgCpu: 88, battTemp: 57 },
    deviceId: "d3", platform: "linux", ts: Date.now() - 300000, timestamp: new Date(Date.now()-300000).toISOString(),
    enriched: true,
    geopolitical: { city:"Berlin", region:"Berlin", country:"Germany", countryCode:"DE",
      latitude:52.52, longitude:13.40, isp:"Deutsche Telekom AG", ip:"85.215.18.230", timezone:"Europe/Berlin", callingCode:"+49" },
    deviceDetail: { name:"KIOSK-UBUNTU-07", manufacturer:"Dell", model:"OptiPlex 7090", serial:"DLOP7090X",
      os:"Ubuntu 24.04 LTS", battery:{ percent:100, isCharging:true, temperature:57 },
      network:{ ip:"10.0.0.7", mac:"11:22:33:44:55:66", iface:"eth0" },
      cpu:{ brand:"Intel Core i7-11700", cores:8, speed:3.6 } },
    userDetail: { username:"kiosk_user", fullName:"Kiosk Terminal", homeDir:"/home/kiosk" },
    emergencyContacts: [],
  },
];


// ─── Emergency Alert Modal ────────────────────────────────────────────────────
function EmergencyModal({ alert, onDismiss, onAck }: {
  alert: SensorAlert;
  onDismiss: () => void;
  onAck: () => void;
}) {
  const [elapsed, setElapsed] = useState(Math.floor((Date.now() - alert.ts) / 1000));
  useEffect(() => {
    const t = setInterval(() => setElapsed(s => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const sevColor = alert.severity === "CRITICAL" ? "#ef4444" : alert.severity === "HIGH" ? "#f59e0b" : "#3b82f6";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background:"rgba(7,6,15,0.92)", backdropFilter:"blur(12px)" }}>
      {/* Pulsing red border on CRITICAL */}
      <div className="relative w-full max-w-2xl rounded-2xl overflow-hidden"
        style={{ border:`2px solid ${sevColor}`, boxShadow:`0 0 40px ${sevColor}40, 0 0 80px ${sevColor}20` }}>

        {/* Header strip */}
        <div className="px-6 py-4 flex items-center justify-between"
          style={{ background:`${sevColor}18`, borderBottom:`1px solid ${sevColor}30` }}>
          <div className="flex items-center gap-3">
            <div className="text-2xl">{SENSOR_ICON[alert.type] || "🚨"}</div>
            <div>
              <div className="font-black text-base" style={{ color:"#e2eaf6" }}>{alert.title}</div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded"
                  style={{ background:`${sevColor}25`, color:sevColor }}>{alert.severity}</span>
                <span className="text-[10px] font-mono" style={{ color:"#6b8ab0" }}>
                  {elapsed}s ago · {alert.deviceId}
                </span>
                <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background:sevColor }} />
              </div>
            </div>
          </div>
          <button onClick={onDismiss}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:opacity-80"
            style={{ background:"rgba(255,255,255,0.06)" }}>
            <X size={15} color="#6b8ab0" />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
          {/* Detail */}
          <div className="p-4 rounded-xl" style={{ background:"#030b16", border:`1px solid ${sevColor}20` }}>
            <div className="text-[10px] font-mono uppercase tracking-widest mb-2" style={{ color:sevColor }}>Alert Detail</div>
            <p className="text-sm leading-relaxed" style={{ color:"#b8cce8" }}>{alert.detail}</p>
          </div>

          {/* Grid: Device + User + Geo */}
          <div className="grid grid-cols-2 gap-3">
            {/* Device */}
            {alert.deviceDetail && (
              <div className="p-4 rounded-xl space-y-2" style={{ background:"#030b16", border:"1px solid rgba(59,130,246,0.2)" }}>
                <div className="text-[10px] font-mono uppercase tracking-widest mb-2" style={{ color:"#3b82f6" }}>Device</div>
                {[
                  ["Name",     alert.deviceDetail.name],
                  ["Make",     `${alert.deviceDetail.manufacturer} ${alert.deviceDetail.model}`],
                  ["OS",       alert.deviceDetail.os],
                  ["IP",       alert.deviceDetail.network?.ip],
                  ["MAC",      alert.deviceDetail.network?.mac],
                  ["Battery",  `${alert.deviceDetail.battery?.percent}% ${alert.deviceDetail.battery?.isCharging ? "⚡" : ""}`],
                  ["Batt Temp",`${alert.deviceDetail.battery?.temperature}°C`],
                  ["CPU",      alert.deviceDetail.cpu?.brand],
                  ["Serial",   alert.deviceDetail.serial],
                ].map(([k, v]) => v && (
                  <div key={k as string} className="flex justify-between gap-2">
                    <span className="text-[9px] font-mono" style={{ color:"#6b8ab0" }}>{k}</span>
                    <span className="text-[9px] font-mono text-right" style={{ color:"#b8cce8" }}>{v as string}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Geo + User */}
            <div className="space-y-3">
              {alert.geopolitical && (
                <div className="p-4 rounded-xl space-y-2" style={{ background:"#030b16", border:"1px solid rgba(6,182,212,0.2)" }}>
                  <div className="text-[10px] font-mono uppercase tracking-widest mb-2" style={{ color:"#10d9a0" }}>Location</div>
                  {[
                    ["City",     `${alert.geopolitical.city}, ${alert.geopolitical.region}`],
                    ["Country",  `${alert.geopolitical.country} (${alert.geopolitical.countryCode})`],
                    ["Coords",   alert.geopolitical.latitude ? `${alert.geopolitical.latitude?.toFixed(4)}, ${alert.geopolitical.longitude?.toFixed(4)}` : null],
                    ["ISP",      alert.geopolitical.isp],
                    ["IP",       alert.geopolitical.ip],
                    ["TZ",       alert.geopolitical.timezone],
                    ["Calling",  alert.geopolitical.callingCode],
                  ].map(([k, v]) => v && (
                    <div key={k as string} className="flex justify-between gap-2">
                      <span className="text-[9px] font-mono" style={{ color:"#6b8ab0" }}>{k}</span>
                      <span className="text-[9px] font-mono text-right" style={{ color:"#b8cce8" }}>{v as string}</span>
                    </div>
                  ))}
                </div>
              )}
              {alert.userDetail && (
                <div className="p-4 rounded-xl space-y-2" style={{ background:"#030b16", border:"1px solid rgba(59,130,246,0.15)" }}>
                  <div className="text-[10px] font-mono uppercase tracking-widest mb-2" style={{ color:"#3b82f6" }}>User</div>
                  {[
                    ["Full Name", alert.userDetail.fullName],
                    ["Username",  alert.userDetail.username],
                    ["Home",      alert.userDetail.homeDir],
                  ].map(([k, v]) => v && (
                    <div key={k as string} className="flex justify-between gap-2">
                      <span className="text-[9px] font-mono" style={{ color:"#6b8ab0" }}>{k}</span>
                      <span className="text-[9px] font-mono truncate text-right max-w-[120px]" style={{ color:"#b8cce8" }}>{v as string}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Emergency Contacts */}
          {alert.emergencyContacts && alert.emergencyContacts.length > 0 && (
            <div className="p-4 rounded-xl" style={{ background:"#030b16", border:"1px solid rgba(239,68,68,0.25)" }}>
              <div className="text-[10px] font-mono uppercase tracking-widest mb-3" style={{ color:"#ef4444" }}>
                Emergency Contacts / Last Calls
              </div>
              <div className="space-y-2">
                {alert.emergencyContacts.map((c, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-2 rounded-lg"
                    style={{ background:"rgba(239,68,68,0.06)", border:"1px solid rgba(239,68,68,0.15)" }}>
                    <div>
                      <div className="text-xs font-semibold" style={{ color:"#e2eaf6" }}>{c.name}</div>
                      <div className="text-[9px] font-mono mt-0.5" style={{ color:"#6b8ab0" }}>
                        {c.type === "ICE" ? "🆘 ICE Contact" : "📞 Last Dialled"}
                      </div>
                    </div>
                    <div className="text-sm font-mono font-bold" style={{ color:"#ef4444" }}>{c.number}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommended action */}
          <div className="p-4 rounded-xl flex items-start gap-3"
            style={{ background:`${sevColor}08`, border:`1px solid ${sevColor}25` }}>
            <AlertTriangle size={15} color={sevColor} className="flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-[10px] font-mono uppercase tracking-widest mb-1" style={{ color:sevColor }}>Recommended Action</div>
              <p className="text-xs" style={{ color:"#b8cce8" }}>{alert.action}</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 flex items-center justify-between gap-3 border-t"
          style={{ borderColor:"rgba(59,130,246,0.15)", background:"#0a1628" }}>
          <div className="text-[10px] font-mono" style={{ color:"#1a3060" }}>
            Alert ID: {alert.alertId} · {new Date(alert.ts).toLocaleString()}
          </div>
          <div className="flex gap-2">
            <button onClick={onDismiss}
              className="px-4 py-2 rounded-lg text-xs font-semibold"
              style={{ background:"rgba(59,130,246,0.12)", color:"#3b82f6", border:"1px solid rgba(59,130,246,0.25)" }}>
              Dismiss
            </button>
            <button onClick={onAck}
              className="px-4 py-2 rounded-lg text-xs font-bold"
              style={{ background:`linear-gradient(135deg,${sevColor},${sevColor}cc)`, color:"#fff" }}>
              Acknowledge & Respond
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Danger Alert (CommandGuard — AI / hostile command interception) ──────────
interface DangerAlert {
  alertId:    string;
  alertType:  "AI_COMMAND_INTERCEPTED" | "COMMAND_LOCKOUT" | "INTEGRITY_VIOLATION" | "THREAT_EVENT";
  severity:   "CRITICAL" | "HIGH";
  title:      string;
  detail:     string;
  action:     string;
  confidence?: "HIGH" | "MEDIUM";
  pattern?:   string;
  deviceId:   string;
  ts:         number;
  detection?: number;
  lockoutUntil?: number;
}

const MOCK_DANGER_ALERTS: DangerAlert[] = [
  {
    alertId:    "da-001",
    alertType:  "AI_COMMAND_INTERCEPTED",
    severity:   "CRITICAL",
    confidence: "HIGH",
    title:      "Hostile AI Command Intercepted",
    detail:     "An unauthorised AI system attempted to issue a command (type: SHELL) to agent d4 / Galaxy-S24-Ultra. CommandGuard matched pattern: tool_use / tool_call (OpenAI/Anthropic structural fingerprint). Command was silently dropped — no response sent to attacker. This is detection #2 from this source.",
    action:     "Verify admin session integrity. Check for compromised credentials or man-in-the-middle on the C2 channel. Rotate the enroll key immediately via Security Ops → Agent Config.",
    pattern:    "/tool_use/i | /tool_call/i",
    deviceId:   "d4",
    ts:         Date.now() - 45000,
    detection:  2,
  },
];

function DangerModal({ alert, onDismiss, onAck }: {
  alert: DangerAlert;
  onDismiss: () => void;
  onAck: () => void;
}) {
  const [elapsed, setElapsed] = useState(Math.floor((Date.now() - alert.ts) / 1000));
  useEffect(() => {
    const t = setInterval(() => setElapsed(s => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const accentColor = "#ef4444";
  const matrixColor = "#22c55e";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: "rgba(7,2,2,0.95)", backdropFilter: "blur(16px)" }}>
      <div className="relative w-full max-w-xl rounded-2xl overflow-hidden"
        style={{ border: `2px solid ${accentColor}`, boxShadow: `0 0 60px ${accentColor}50, 0 0 120px ${accentColor}18` }}>

        {/* Scanline animation overlay */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl" style={{ zIndex: 1 }}>
          <div className="absolute w-full h-[2px] opacity-10 animate-pulse" style={{ background: matrixColor, top: "30%", boxShadow: `0 0 8px ${matrixColor}` }} />
          <div className="absolute w-full h-[1px] opacity-6" style={{ background: accentColor, top: "60%" }} />
        </div>

        {/* Header */}
        <div className="relative z-10 px-5 py-4 flex items-center justify-between"
          style={{ background: `${accentColor}12`, borderBottom: `1px solid ${accentColor}30` }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: `${accentColor}18`, border: `1px solid ${accentColor}40` }}>
              <Shield size={16} color={accentColor} />
            </div>
            <div>
              <div className="text-sm font-black" style={{ color: "#fef2f2" }}>
                {alert.alertType === "AI_COMMAND_INTERCEPTED" ? "🤖 Hostile AI Command Intercepted" :
                 alert.alertType === "COMMAND_LOCKOUT"        ? "🔒 Command Channel Locked" :
                 alert.alertType === "INTEGRITY_VIOLATION"    ? "⚠️ Agent Integrity Violation" : "🛑 Threat Detected"}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded"
                  style={{ background: `${accentColor}22`, color: accentColor }}>
                  {alert.severity}
                </span>
                {alert.confidence && (
                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded"
                    style={{ background: "rgba(239,68,68,0.08)", color: "#f87171" }}>
                    {alert.confidence} CONFIDENCE
                  </span>
                )}
                <span className="text-[9px] font-mono" style={{ color: "#6b8ab0" }}>
                  {elapsed}s ago · {alert.deviceId}
                </span>
                <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: accentColor }} />
              </div>
            </div>
          </div>
          <button onClick={onDismiss}
            className="w-7 h-7 rounded-lg flex items-center justify-center hover:opacity-70"
            style={{ background: "rgba(255,255,255,0.05)" }}>
            <X size={13} color="#6b8ab0" />
          </button>
        </div>

        {/* Body */}
        <div className="relative z-10 p-5 space-y-3" style={{ background: "#0c0608" }}>

          {/* Situation */}
          <div className="p-4 rounded-xl" style={{ background: "#0f0508", border: `1px solid ${accentColor}20` }}>
            <div className="text-[9px] font-mono uppercase tracking-widest mb-2" style={{ color: accentColor }}>
              Threat Situation
            </div>
            <p className="text-xs leading-relaxed" style={{ color: "#fecaca" }}>{alert.detail}</p>
          </div>

          {/* Forensic details */}
          <div className="grid grid-cols-2 gap-2">
            {[
              ["Device", alert.deviceId],
              ["Detection #", alert.detection ? `#${alert.detection}` : "—"],
              ["Alert Type", alert.alertType.replace(/_/g, " ")],
              ["Time", new Date(alert.ts).toLocaleTimeString()],
              ...(alert.pattern ? [["Pattern Match", alert.pattern.slice(0, 32) + (alert.pattern.length > 32 ? "…" : "")]] : []),
              ...(alert.lockoutUntil ? [["Locked Until", new Date(alert.lockoutUntil).toLocaleTimeString()]] : []),
            ].map(([k, v], i) => (
              <div key={i} className="px-3 py-2 rounded-lg" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.12)" }}>
                <div className="text-[8px] font-mono uppercase tracking-wider mb-0.5" style={{ color: "#6b8ab0" }}>{k}</div>
                <div className="text-[10px] font-mono font-semibold truncate" style={{ color: "#fca5a5" }}>{v}</div>
              </div>
            ))}
          </div>

          {/* Recommended action */}
          <div className="p-3 rounded-xl flex items-start gap-2.5"
            style={{ background: "rgba(239,68,68,0.06)", border: `1px solid ${accentColor}22` }}>
            <AlertTriangle size={13} color={accentColor} className="flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-[9px] font-mono uppercase tracking-widest mb-1" style={{ color: accentColor }}>Required Action</div>
              <p className="text-[11px]" style={{ color: "#fecaca" }}>{alert.action}</p>
            </div>
          </div>

          {/* Status bar */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg"
            style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.15)" }}>
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: matrixColor }} />
            <span className="text-[9px] font-mono" style={{ color: "#86efac" }}>
              CommandGuard blocked — attacker received no response · Agent identity rotation triggered
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 px-5 py-3 flex items-center justify-between border-t"
          style={{ borderColor: "rgba(239,68,68,0.15)", background: "#0f0508" }}>
          <div className="text-[9px] font-mono" style={{ color: "#3d1515" }}>
            {alert.alertId} · {new Date(alert.ts).toLocaleString()}
          </div>
          <div className="flex gap-2">
            <button onClick={onDismiss}
              className="px-3 py-1.5 rounded-lg text-[11px] font-semibold"
              style={{ background: "rgba(239,68,68,0.10)", color: "#f87171", border: "1px solid rgba(239,68,68,0.25)" }}>
              Dismiss
            </button>
            <button onClick={onAck}
              className="px-3 py-1.5 rounded-lg text-[11px] font-bold"
              style={{ background: "linear-gradient(135deg,#ef4444,#b91c1c)", color: "#fff" }}>
              Acknowledged — Investigate
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DownloadPage({ setPage }: { setPage: (p: Page) => void }) {
  const [tab, setTab] = useState<Software>("platform");
  const [os, setOs] = useState<OS>("windows");
  const [channel, setChannel] = useState("stable");
  const [showLog, setShowLog] = useState(false);
  const [reqOs, setReqOs] = useState<OS>("windows");

  const platforms = tab === "platform" ? PLATFORMS : AGENT_PLATFORMS;
  const current = platforms.find(p => p.id === os) ?? platforms[0];
  const ch = CHANNELS.find(c => c.tag === channel)!;

  const CHANGELOG = [
    { version: "4.7.2", date: "2026-07-01", changes: ["Military-grade WiFi Scanner + RF spectrum", "HarmonyOS NEXT HAP", "AES-256 Bluetooth pairing", "Sub-10ms latency", "AI anomaly detection v3.1"] },
    { version: "4.7.0", date: "2026-06-15", changes: ["Multi-device simultaneous control", "Offline store-and-forward", "OTA silent push", "WebRTC relay fallback"] },
    { version: "4.6.5", date: "2026-06-01", changes: ["QR enrollment system", "Admin alert overhaul", "iOS 18 fixes"] },
  ];

  return (
    <div>
      {/* Hero */}
      <section className="relative z-10 pt-16 pb-10 text-center px-6">
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 80% 40% at 50% 0%,rgba(59,130,246,0.12) 0%,transparent 70%)" }} />
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-mono mb-4"
          style={{ background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.3)", color: "#b8cce8" }}>
          <Zap size={10} color="#3b82f6" /> Military-Grade Remote Access &amp; Device Management
          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold" style={{ background: "#3b82f6", color: "#fff" }}>v{VERSION}</span>
        </div>
        <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-3 leading-none">
          <span style={{ background: "linear-gradient(90deg,#3b82f6,#10d9a0)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>bixtx</span><span style={{ color: "#e2eaf6" }}>.com</span>
        </h1>
        <p className="text-base max-w-xl mx-auto mb-6 leading-relaxed" style={{ color: "#6b8ab0" }}>
          The world&apos;s most advanced AI-powered remote access platform. One install. Every device. Total control.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2 text-xs font-mono mb-6" style={{ color: "#6b8ab0" }}>
          {[
            { icon: <Monitor size={11} />, t: "Windows · macOS · Linux" },
            { icon: <Smartphone size={11} />, t: "Android · iOS · HarmonyOS" },
            { icon: <Lock size={11} />, t: "AES-256 E2E" },
            { icon: <Zap size={11} />, t: "<10ms Latency" },
          ].map(({ icon, t }) => (
            <span key={t} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
              style={{ background: "#0a1628", border: "1px solid rgba(59,130,246,0.2)" }}>
              <span style={{ color: "#3b82f6" }}>{icon}</span>{t}
            </span>
          ))}
        </div>
        <div className="flex items-center justify-center gap-3">
          <button onClick={() => setPage("login")} className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all hover:opacity-90"
            style={{ background: "linear-gradient(135deg,#2563eb,#3b82f6)", color: "#fff" }}>
            <LayoutDashboard size={14} /> Open Dashboard
          </button>
          <button onClick={() => setPage("pricing")} className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all hover:opacity-80"
            style={{ background: "#0a1628", color: "#b8cce8", border: "1px solid rgba(59,130,246,0.3)" }}>
            <CreditCard size={14} /> View Pricing
          </button>
        </div>
      </section>

      {/* Stats */}
      <div className="border-y py-4" style={{ borderColor: "rgba(59,130,246,0.15)", background: "rgba(15,13,30,0.5)" }}>
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Monitored Devices", val: "2.4M+", icon: <Cpu size={14} />, color: "#3b82f6" },
            { label: "Uptime SLA", val: "99.97%", icon: <Activity size={14} />, color: "#10b981" },
            { label: "Avg Latency", val: "7ms", icon: <Zap size={14} />, color: "#10d9a0" },
            { label: "Encryption", val: "AES-256", icon: <Key size={14} />, color: "#f59e0b" },
          ].map(({ label, val, icon, color }) => (
            <div key={label} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}18`, border: `1px solid ${color}28` }}>
                <span style={{ color }}>{icon}</span>
              </div>
              <div>
                <div className="text-lg font-black" style={{ color }}>{val}</div>
                <div className="text-[10px] font-mono" style={{ color: "#6b8ab0" }}>{label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Download */}
      <section className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-black" style={{ color: "#e2eaf6" }}>Download bixtx Agent</h2>
            <p className="text-sm mt-0.5" style={{ color: "#6b8ab0" }}>Choose your platform and release channel</p>
          </div>
          <div className="flex gap-1 p-1 rounded-xl" style={{ background: "#0a1628", border: "1px solid rgba(59,130,246,0.2)" }}>
            {CHANNELS.map(c => (
              <button key={c.tag} onClick={() => setChannel(c.tag)}
                className="px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all"
                style={{ background: channel === c.tag ? `${c.color}22` : "transparent", color: channel === c.tag ? c.color : "#6b8ab0", border: `1px solid ${channel === c.tag ? `${c.color}44` : "transparent"}` }}>
                {c.label} <span className="opacity-50">{c.version}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Software tabs */}
        <div className="flex gap-1 mb-5 p-1 rounded-xl w-fit" style={{ background: "#0a1628", border: "1px solid rgba(59,130,246,0.2)" }}>
          {[
            { id: "platform" as Software, label: "App Platform (Software B)", icon: <Monitor size={13} /> },
            { id: "agent" as Software, label: "Link Agent (Software A)", icon: <Server size={13} /> },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
              style={{ background: tab === t.id ? "linear-gradient(135deg,#2563eb,#3b82f6)" : "transparent", color: tab === t.id ? "#fff" : "#6b8ab0" }}>
              {t.icon}{t.label}
              {t.id === "agent" && <span className="ml-1 px-1.5 py-0.5 rounded text-[9px] font-bold" style={{ background:"#f59e0b22", color:"#f59e0b", border:"1px solid #f59e0b44" }}>NEEDS DEV</span>}
            </button>
          ))}
        </div>

        {/* Software A — Not Started status notice */}
        {tab === "agent" && (
          <div className="mb-5 rounded-2xl border overflow-hidden" style={{ background:"#0a1628", borderColor:"rgba(245,158,11,0.35)" }}>
            <div className="px-5 py-3 flex items-center gap-3 border-b" style={{ background:"rgba(245,158,11,0.08)", borderColor:"rgba(245,158,11,0.2)" }}>
              <AlertTriangle size={15} color="#f59e0b" />
              <span className="font-bold text-sm" style={{ color:"#f59e0b" }}>Software A (Link Agent) — Development Status</span>
              <span className="ml-auto px-2 py-0.5 rounded text-[9px] font-bold font-mono" style={{ background:"#f59e0b22", color:"#f59e0b", border:"1px solid #f59e0b44" }}>⚠ NEEDS DEV</span>
            </div>
            <div className="p-5">
              <p className="text-xs mb-4" style={{ color:"#6b8ab0" }}>
                As per the System Summary document, Software A (Link Agent) is <strong style={{ color:"#f59e0b" }}>not yet started</strong> on all platforms.
                Access is controlled by the admin in <strong style={{ color:"#3b82f6" }}>Software B → Software A Control</strong> (no expiry — admin on/off only).
              </p>
              <div className="overflow-x-auto rounded-xl border" style={{ borderColor:"rgba(245,158,11,0.2)" }}>
                <table className="w-full text-xs min-w-[500px]">
                  <thead>
                    <tr style={{ background:"#0d1930", borderBottom:"1px solid rgba(245,158,11,0.15)" }}>
                      {["Component","Platform","Status","Complexity"].map(h => (
                        <th key={h} className="text-left px-4 py-2.5 text-[9px] font-mono uppercase tracking-wider" style={{ color:"#6b8ab0" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { component:"Desktop Agent", platform:"Windows",             status:"Not Started", complexity:"High",      icon:"⊞" },
                      { component:"Desktop Agent", platform:"macOS",               status:"Not Started", complexity:"High",      icon:"⌘" },
                      { component:"Desktop Agent", platform:"Linux",               status:"Not Started", complexity:"Medium",    icon:"◉" },
                      { component:"Mobile App",    platform:"Android",             status:"Not Started", complexity:"High",      icon:"◆" },
                      { component:"Mobile App",    platform:"iOS",                 status:"Not Started", complexity:"High",      icon:"◇" },
                      { component:"Integration",   platform:"WebRTC",             status:"Not Started", complexity:"High",      icon:"🌐" },
                      { component:"Security",      platform:"All Platforms",      status:"Not Started", complexity:"Very High", icon:"🔐" },
                    ].map((row, i) => (
                      <tr key={i} className="hover:bg-yellow-500/5 transition-colors" style={{ borderBottom:"1px solid rgba(245,158,11,0.08)" }}>
                        <td className="px-4 py-3 font-semibold" style={{ color:"#e2eaf6" }}>{row.component}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span>{row.icon}</span>
                            <span style={{ color:"#b8cce8" }}>{row.platform}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider" style={{ background:"rgba(245,158,11,0.15)", color:"#f59e0b", border:"1px solid rgba(245,158,11,0.3)" }}>
                            <AlertTriangle size={9} />Not Started
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-[10px]" style={{ color:"#6b8ab0" }}>{row.complexity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex items-center gap-3 flex-wrap">
                <div className="px-3 py-1.5 rounded-lg text-xs font-mono" style={{ background:"rgba(245,158,11,0.1)", color:"#f59e0b", border:"1px solid rgba(245,158,11,0.25)" }}>
                  ⏱ Est. development: 6–12 months
                </div>
                <div className="px-3 py-1.5 rounded-lg text-xs font-mono" style={{ background:"rgba(59,130,246,0.1)", color:"#3b82f6", border:"1px solid rgba(59,130,246,0.25)" }}>
                  🔒 Access: Admin On/Off via Software B (No Expiry)
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
          {/* Platform selector */}
          <div className="lg:col-span-1">
            {[{ cat: "desktop" as const, label: "Desktop" }, { cat: "mobile" as const, label: "Mobile" }].map(({ cat, label }) => (
              <div key={cat} className="mb-4">
                <div className="text-[9px] font-mono uppercase tracking-widest mb-2" style={{ color: "#6b8ab0" }}>{label}</div>
                <div className="grid grid-cols-3 lg:grid-cols-1 gap-2">
                  {platforms.filter(p => p.category === cat).map(p => (
                    <button key={p.id} onClick={() => setOs(p.id)}
                      className="relative flex flex-col items-center gap-1 p-3 rounded-xl border transition-all"
                      style={{ background: os === p.id ? `${p.color}18` : "#0a1628", borderColor: os === p.id ? p.color : "rgba(59,130,246,0.18)", boxShadow: os === p.id ? `0 0 16px ${p.color}25` : "none" }}>
                      <span className="text-2xl">{p.icon}</span>
                      <span className="text-[10px] font-mono font-semibold uppercase tracking-wider" style={{ color: os === p.id ? p.color : "#6b8ab0" }}>
                        {p.label.split(" ")[0]}
                      </span>
                      {os === p.id && <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center" style={{ background: p.color }}><Check size={8} color="#fff" strokeWidth={3.5} /></span>}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Download panel */}
          <div className="lg:col-span-3 rounded-2xl overflow-hidden" style={{ background: "#030b16", border: "1px solid rgba(59,130,246,0.22)" }}>
            <div className="px-5 py-4 flex items-center justify-between border-b" style={{ borderColor: "rgba(59,130,246,0.15)", background: "#0a1628" }}>
              <div className="flex items-center gap-3">
                <span className="text-2xl">{current?.icon}</span>
                <div>
                  <div className="font-bold" style={{ color: "#e2eaf6" }}>{current?.label}</div>
                  <div className="text-xs font-mono" style={{ color: "#6b8ab0" }}>
                    {tab === "platform" ? "App Platform" : "Link Agent"} · v{VERSION}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-mono" style={{ color: "#10b981" }}>
                <Shield size={12} color="#10b981" /> Signed &amp; Verified
              </div>
            </div>

            <div className="p-4 space-y-2">
              {current?.versions?.map((v, i) => (
                <DownloadRow key={i} v={v} color={current.color} channel={channel} />
              ))}
            </div>

            {/* QR strip */}
            <div className="mx-4 mb-4 px-4 py-3 rounded-xl flex items-center gap-4"
              style={{ background: "rgba(59,130,246,0.07)", border: "1px solid rgba(59,130,246,0.22)" }}>
              <div className="w-12 h-12 rounded-lg flex-shrink-0 flex items-center justify-center"
                style={{ background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.3)" }}>
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                  <rect x="2" y="2" width="12" height="12" rx="1.5" fill="none" stroke="#3b82f6" strokeWidth="1.8" />
                  <rect x="4.5" y="4.5" width="7" height="7" rx="0.5" fill="#3b82f6" />
                  <rect x="18" y="2" width="12" height="12" rx="1.5" fill="none" stroke="#3b82f6" strokeWidth="1.8" />
                  <rect x="20.5" y="4.5" width="7" height="7" rx="0.5" fill="#3b82f6" />
                  <rect x="2" y="18" width="12" height="12" rx="1.5" fill="none" stroke="#3b82f6" strokeWidth="1.8" />
                  <rect x="4.5" y="20.5" width="7" height="7" rx="0.5" fill="#3b82f6" />
                  <rect x="18" y="18" width="5" height="5" rx="0.5" fill="#10d9a0" />
                  <rect x="25" y="18" width="5" height="5" rx="0.5" fill="#10d9a0" />
                  <rect x="18" y="25" width="5" height="5" rx="0.5" fill="#10d9a0" />
                  <rect x="25" y="25" width="5" height="5" rx="0.5" fill="#3b82f6" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold mb-0.5" style={{ color: "#e2eaf6" }}>One-Click QR Enrollment</div>
                <div className="text-xs leading-relaxed" style={{ color: "#6b8ab0" }}>
                  Scan with any device to silently install the Link Agent. Appears in dashboard within 30–60 seconds.
                </div>
              </div>
              <button className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold flex-shrink-0"
                style={{ background: "linear-gradient(135deg,#3b82f6,#10d9a0)", color: "#fff" }}>
                <Signal size={11} />QR Code
              </button>
            </div>

            {/* System requirements */}
            <div className="px-4 pb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[9px] font-mono uppercase tracking-widest" style={{ color: "#6b8ab0" }}>System Requirements</span>
                <div className="flex gap-1">
                  {(["windows","macos","linux","android","ios","harmony"] as OS[]).map(id => {
                    const ph = PLATFORMS.find(x => x.id === id)!;
                    return (
                      <button key={id} onClick={() => setReqOs(id)}
                        className="w-7 h-7 rounded flex items-center justify-center text-sm transition-all"
                        style={{ background: reqOs === id ? `${ph.color}22` : "transparent", border: `1px solid ${reqOs === id ? `${ph.color}55` : "transparent"}` }}>
                        {ph.icon}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[{ label: "Minimum", items: REQUIREMENTS[reqOs].min, color: "#6b8ab0" }, { label: "Recommended", items: REQUIREMENTS[reqOs].rec, color: "#3b82f6" }].map(({ label, items, color }) => (
                  <div key={label} className="rounded-lg p-3" style={{ background: "#0a1628", border: "1px solid rgba(59,130,246,0.15)" }}>
                    <div className="text-[9px] font-mono uppercase tracking-widest mb-2" style={{ color }}>{label}</div>
                    <ul className="space-y-1">
                      {items.map(item => (
                        <li key={item} className="flex items-start gap-1.5 text-xs" style={{ color: "#b8cce8" }}>
                          <Check size={9} color={color} strokeWidth={3} className="mt-0.5 flex-shrink-0" />{item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Changelog */}
        <div className="mt-8">
          <button onClick={() => setShowLog(v => !v)} className="flex items-center gap-2 text-sm font-semibold mb-3 transition-colors" style={{ color: "#6b8ab0" }}>
            {showLog ? <ChevronDown size={14} /> : <ChevronRight size={14} />} Release Changelog
          </button>
          {showLog && (
            <div className="space-y-3">
              {CHANGELOG.map(({ version, date, changes }) => (
                <div key={version} className="rounded-xl border overflow-hidden" style={{ background: "#0a1628", borderColor: "rgba(59,130,246,0.2)" }}>
                  <div className="px-5 py-3 flex items-center gap-3 border-b" style={{ borderColor: "rgba(59,130,246,0.12)" }}>
                    <Chip color="#3b82f6">v{version}</Chip>
                    <span className="text-xs font-mono" style={{ color: "#6b8ab0" }}>{date}</span>
                    {version === VERSION && <Chip color="#10b981">Latest</Chip>}
                  </div>
                  <ul className="px-5 py-3 space-y-1.5">
                    {changes.map(c => (
                      <li key={c} className="flex items-start gap-2 text-sm" style={{ color: "#b8cce8" }}>
                        <ArrowRight size={11} color="#3b82f6" className="mt-0.5 flex-shrink-0" />{c}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Footer CTA */}
      <footer className="border-t" style={{ borderColor: "rgba(59,130,246,0.2)" }}>
        <div className="max-w-7xl mx-auto px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-5">
          <div>
            <div className="text-xl font-black" style={{ color: "#e2eaf6" }}>Enterprise Deployment?</div>
            <div className="text-sm mt-1" style={{ color: "#6b8ab0" }}>Custom licensing, on-premise hosting, MDM, and 24/7 SLA support.</div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setPage("pricing")} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold"
              style={{ background: "linear-gradient(135deg,#2563eb,#3b82f6)", color: "#fff" }}>
              Contact Enterprise <ArrowRight size={13} />
            </button>
          </div>
        </div>
        <div className="border-t py-4 text-center" style={{ borderColor: "rgba(59,130,246,0.1)" }}>
          <span className="text-[11px] font-mono" style={{ color: "#6b8ab0" }}>
            © 2026 bixtx.com · v{VERSION} · Build {BUILD} · All rights reserved ·{" "}
            <span style={{ color: "#3b82f6" }}>AES-256 Encrypted</span>
          </span>
        </div>
      </footer>
    </div>
  );
}

// ─── Root App ────────────────────────────────────────────────────────────────
export default function App() {
  const [authed, setAuthed] = useState<boolean>(() => sessionStorage.getItem("authed") === "1");
  const [page, setPage] = useState<Page>(() => sessionStorage.getItem("authed") === "1" ? "dashboard" : "login");
  const [controlDevice, setControlDevice] = useState<DashDevice | null>(null);

  const SESSION_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes inactivity
  const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearSession = () => {
    sessionStorage.removeItem("authed");
    sessionStorage.removeItem("admin_token");
    setAuthed(false);
    setControlDevice(null);
    setPage("login");
  };

  const resetInactivityTimer = () => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    if (sessionStorage.getItem("authed") === "1") {
      inactivityTimer.current = setTimeout(clearSession, SESSION_TIMEOUT_MS);
    }
  };

  useEffect(() => {
    const events = ["mousedown", "keydown", "touchstart", "scroll"];
    events.forEach(ev => window.addEventListener(ev, resetInactivityTimer, { passive: true }));
    resetInactivityTimer();
    return () => {
      events.forEach(ev => window.removeEventListener(ev, resetInactivityTimer));
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed]);

  const handleLogin = () => {
    sessionStorage.setItem("authed", "1");
    setAuthed(true);
    setPage("dashboard");
    resetInactivityTimer();
  };
  const handleLogout = () => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    clearSession();
  };
  const handleControl = (d: DashDevice) => { setControlDevice(d); setPage("remote"); };
  const [rootToasts, setRootToasts] = useState<ToastItem[]>([]);
  const [emergencyAlerts, setEmergencyAlerts] = useState<SensorAlert[]>(MOCK_SENSOR_ALERTS);
  const [activeEmergency, setActiveEmergency] = useState<SensorAlert | null>(null);
  const [dangerAlerts, setDangerAlerts] = useState<DangerAlert[]>(MOCK_DANGER_ALERTS);
  const [activeDanger, setActiveDanger] = useState<DangerAlert | null>(null);
  // Show danger alert 4 s after load (staggered so emergency modal shows first)
  useEffect(() => {
    if (MOCK_DANGER_ALERTS.length > 0) {
      const t = setTimeout(() => setActiveDanger(MOCK_DANGER_ALERTS[0]), 4000);
      return () => clearTimeout(t);
    }
  }, []);
  const show_fn = (msg: string, kind: "success"|"error"|"info" = "success") => {
    const id = Date.now();
    setRootToasts(t => [...t, { id, msg, kind }]);
    setTimeout(() => setRootToasts(t => t.filter(x => x.id !== id)), 3000);
  };

  return (
    <div className="min-h-screen" style={{ background: "#050c1a", fontFamily: "'Plus Jakarta Sans', Inter, sans-serif", color: "#e2eaf6" }}>
      {/* grid overlay */}
      <div className="fixed inset-0 pointer-events-none" style={{
        backgroundImage: "linear-gradient(rgba(59,130,246,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(59,130,246,0.04) 1px,transparent 1px)",
        backgroundSize: "48px 48px",
      }} />
      {/* ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[360px] rounded-full opacity-20"
          style={{ background: "radial-gradient(ellipse,#3b82f6 0%,transparent 70%)" }} />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full opacity-8"
          style={{ background: "radial-gradient(ellipse,#10d9a0 0%,transparent 70%)" }} />
      </div>

      <ToastStack toasts={rootToasts} />
      <Nav page={page} setPage={p => {
        const authRequired = ["dashboard","remote","security-ops","siem","download","link-agent","ai-chat","software-b"];
        if (authRequired.includes(p) && !authed) { setPage("login"); } else { setPage(p); }
      }} authed={authed} onLogout={handleLogout} />

      {/* Global emergency alert modal — shown over all pages */}
      {activeEmergency && (
        <EmergencyModal
          alert={activeEmergency}
          onDismiss={() => setActiveEmergency(null)}
          onAck={() => {
            setEmergencyAlerts(prev => prev.filter(a => a.alertId !== activeEmergency!.alertId));
            setActiveEmergency(null);
          }}
        />
      )}

      {/* CommandGuard danger alert modal — AI/hostile command interception */}
      {activeDanger && !activeEmergency && (
        <DangerModal
          alert={activeDanger}
          onDismiss={() => setActiveDanger(null)}
          onAck={() => {
            setDangerAlerts(prev => prev.filter(a => a.alertId !== activeDanger!.alertId));
            setActiveDanger(null);
          }}
        />
      )}
      <div className="relative z-10">
        {page === "download"     && authed  && <DownloadPage setPage={setPage} />}
        {page === "link-agent"   && authed  && <LinkAgentPage show={show_fn} />}
        {page === "ai-chat"      && authed  && <AIChatPage show={show_fn} />}
        {page === "login"                   && <LoginPage onLogin={handleLogin} />}
        {page === "dashboard"    && authed  && <AdminDashboard onControl={handleControl} />}
        {page === "remote"       && authed  && controlDevice && <RemoteControl device={controlDevice} onBack={() => setPage("dashboard")} />}
        {page === "remote"       && authed  && !controlDevice && <AdminDashboard onControl={handleControl} />}
        {page === "pricing"                 && <PricingPage setPage={setPage} />}
        {page === "docs"                    && <DocsPage />}
        {page === "security-ops" && authed  && <SecurityOpsPage show={show_fn} />}
        {page === "siem"         && authed  && <SIEMPage />}
        {page === "software-b"   && authed  && (
          <div className="min-h-screen" style={{ background:"#f9fafb" }}>
            <ImprovedAdminDashboard organizationId="org-bixtx-2026" adminEmail="admin@bixtx.com" />
          </div>
        )}
        {/* Any auth-required page accessed without login → show login */}
        {!authed && ["dashboard","remote","security-ops","siem","download","link-agent","ai-chat","software-b"].includes(page) && <LoginPage onLogin={handleLogin} />}
      </div>
    </div>
  );
}
