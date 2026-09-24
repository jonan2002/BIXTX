import deviceInfo from '@ohos.deviceInfo';
import batteryInfo from '@ohos.batteryInfo';
import wifi from '@ohos.wifi';
import geoLocationManager from '@ohos.geoLocationManager';
import { Config } from './Config';

export interface DeviceSnapshot {
  deviceModel:    string;
  osVersion:      string;
  brand:          string;
  deviceId:       string;
  batteryLevel:   number;
  batteryStatus:  string;
  wifiSsid?:      string;
  wifiIp?:        string;
  latitude?:      number;
  longitude?:     number;
  altitude?:      number;
  timeZone:       string;
  agentVersion:   string;
  platform:       string;
}

export class DataCollectors {
  private lastLocation: geoLocationManager.Location | null = null;

  constructor() {
    if (Config.PLATFORM === 'harmony') {
      this.startLocationUpdates();
    }
  }

  snapshot(): Record<string, Object> {
    const snap: Record<string, Object> = {
      deviceModel:   deviceInfo.marketName,
      osVersion:     deviceInfo.osFullName,
      brand:         deviceInfo.brand,
      deviceId:      deviceInfo.udid ?? 'unknown',
      batteryLevel:  batteryInfo.batterySOC,
      batteryStatus: this.batteryStatusStr(),
      timeZone:      Intl.DateTimeFormat().resolvedOptions().timeZone,
      agentVersion:  Config.AGENT_VERSION,
      platform:      Config.PLATFORM,
    };

    // WiFi info
    if (wifi.isWifiActive()) {
      const info = wifi.getLinkedInfo();
      snap['wifiSsid'] = info.ssid ?? '';
      snap['wifiIp']   = this.int2ip(info.ipAddress ?? 0);
    }

    // Location (if available from async listener)
    if (this.lastLocation) {
      snap['latitude']  = this.lastLocation.latitude;
      snap['longitude'] = this.lastLocation.longitude;
      snap['altitude']  = this.lastLocation.altitude;
    }

    return snap;
  }

  private batteryStatusStr(): string {
    switch (batteryInfo.chargingStatus) {
      case batteryInfo.BatteryChargeState.ENABLE:  return 'charging';
      case batteryInfo.BatteryChargeState.FULL:    return 'full';
      default:                                     return 'discharging';
    }
  }

  private int2ip(n: number): string {
    return [n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, (n >> 24) & 0xff].join('.');
  }

  private startLocationUpdates(): void {
    const req: geoLocationManager.LocationRequest = {
      scenario: geoLocationManager.LocationRequestScenario.UNSET,
      timeInterval: Math.round(Config.BEACON_INTERVAL / 1000),
      distanceInterval: 50,
      maxAccuracy: 100,
    };
    geoLocationManager.on('locationChange', req, (loc: geoLocationManager.Location) => {
      this.lastLocation = loc;
    });
  }
}
