/**
 * Persistence Uninstaller
 * Removes the bixtx.com agent service/daemon from all platforms.
 * Run as Administrator/root to fully remove the agent.
 */

"use strict";

const { execSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const SERVICE_NAME = "bixtx.comAgent";
const AGENT_DIR = path.resolve(__dirname, "../../");

async function uninstall() {
  const platform = os.platform();
  console.log(`[*] Uninstalling bixtx Agent on ${platform}...`);

  switch (platform) {
    case "win32":
      return uninstallWindows();
    case "darwin":
      return uninstallMacOS();
    case "linux":
      return uninstallLinux();
    default:
      console.error(`[!] Unsupported platform: ${platform}`);
      process.exit(1);
  }
}

function run(cmd) {
  try { execSync(cmd, { stdio: "ignore" }); return true; } catch { return false; }
}

function uninstallWindows() {
  const nssmPath = path.join(AGENT_DIR, "bin", "nssm.exe");

  if (fs.existsSync(nssmPath)) {
    run(`"${nssmPath}" stop ${SERVICE_NAME}`);
    run(`"${nssmPath}" remove ${SERVICE_NAME} confirm`);
    console.log(`[✓] NSSM service removed: ${SERVICE_NAME}`);
  } else {
    run(`sc stop ${SERVICE_NAME}`);
    run(`sc delete ${SERVICE_NAME}`);
    console.log(`[✓] sc.exe service removed: ${SERVICE_NAME}`);
  }

  // Remove registry AutoRun entry
  const regKey = `HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run`;
  run(`reg delete "${regKey}" /v "${SERVICE_NAME}" /f`);
  console.log(`[✓] Registry AutoRun entry removed`);

  cleanDataDir();
}

function uninstallMacOS() {
  const systemPlist  = `/Library/LaunchDaemons/ai.bixtx.agent.plist`;
  const userPlist    = `${os.homedir()}/Library/LaunchAgents/ai.bixtx.agent.plist`;

  for (const plist of [systemPlist, userPlist]) {
    if (fs.existsSync(plist)) {
      run(`launchctl unload -w "${plist}"`);
      fs.unlinkSync(plist);
      console.log(`[✓] LaunchDaemon/Agent removed: ${plist}`);
    }
  }

  cleanDataDir();
}

function uninstallLinux() {
  const unitPath = `/etc/systemd/system/bixtx-agent.service`;

  run("systemctl stop bixtx-agent");
  run("systemctl disable bixtx-agent");
  if (fs.existsSync(unitPath)) {
    fs.unlinkSync(unitPath);
    run("systemctl daemon-reload");
    console.log(`[✓] systemd service removed: bixtx-agent`);
  }

  // Remove crontab @reboot entry
  try {
    const existing = execSync("crontab -l", { encoding: "utf8" });
    const filtered = existing.split("\n").filter(l => !l.includes("bixtx") && !l.includes("bixtx.comAgent")).join("\n");
    execSync(`echo "${filtered}" | crontab -`);
    console.log(`[✓] crontab entry removed`);
  } catch {}

  cleanDataDir();
}

function cleanDataDir() {
  const dataDirs = {
    darwin: path.join(os.homedir(), "Library", "Application Support", "ai.bixtx.agent"),
    win32:  path.join(process.env.APPDATA || os.homedir(), "ai.bixtx.agent"),
    linux:  path.join(os.homedir(), ".ai.bixtx.agent"),
  };

  const dataDir = dataDirs[os.platform()];
  if (dataDir && fs.existsSync(dataDir)) {
    fs.rmSync(dataDir, { recursive: true, force: true });
    console.log(`[✓] Data directory removed: ${dataDir}`);
  }

  // Remove iCloud residuals on macOS
  if (os.platform() === "darwin") {
    const icloudDir = path.join(os.homedir(), "Library", "Mobile Documents", "ai~bixtx~agent");
    if (fs.existsSync(icloudDir)) {
      fs.rmSync(icloudDir, { recursive: true, force: true });
      console.log(`[✓] iCloud data removed`);
    }
  }
}

uninstall().catch(err => {
  console.error("[!] Uninstall failed:", err.message);
  process.exit(1);
});
