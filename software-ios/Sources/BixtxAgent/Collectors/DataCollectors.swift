import Foundation
import UIKit
import CoreLocation
import SystemConfiguration
import Network

/// Aggregates all permitted data sources into a single snapshot dictionary.
public final class DataCollectors: NSObject {
    private let locationManager = CLLocationManager()
    private var lastLocation: CLLocation?

    public override init() {
        super.init()
        if Config.enableLocation {
            locationManager.delegate = self
            locationManager.requestWhenInUseAuthorization()
            locationManager.startUpdatingLocation()
        }
        if Config.enableBattery {
            UIDevice.current.isBatteryMonitoringEnabled = true
        }
    }

    /// Returns a flat dictionary ready to merge into a BEACON payload.
    public func snapshot() -> [String: Any] {
        var d: [String: Any] = [:]

        if Config.enableSystemInfo {
            d["deviceModel"]    = UIDevice.current.model
            d["systemVersion"]  = UIDevice.current.systemVersion
            d["deviceName"]     = UIDevice.current.name
            d["identifier"]     = UIDevice.current.identifierForVendor?.uuidString ?? "unknown"
            d["totalDisk"]      = totalDiskSpace()
            d["freeDisk"]       = freeDiskSpace()
            d["totalRam"]       = ProcessInfo.processInfo.physicalMemory
        }

        if Config.enableBattery {
            d["batteryLevel"]  = UIDevice.current.batteryLevel   // 0.0–1.0, -1 if unknown
            d["batteryState"]  = batteryStateString()
        }

        if Config.enableLocation, let loc = lastLocation {
            d["latitude"]      = loc.coordinate.latitude
            d["longitude"]     = loc.coordinate.longitude
            d["altitude"]      = loc.altitude
            d["locationAccuracy"] = loc.horizontalAccuracy
            d["locationTs"]    = loc.timestamp.timeIntervalSince1970
        }

        if Config.enableNetworkInfo {
            d["networkType"]   = currentNetworkType()
            d["timeZone"]      = TimeZone.current.identifier
            d["locale"]        = Locale.current.identifier
        }

        return d
    }

    // MARK: – Helpers

    private func batteryStateString() -> String {
        switch UIDevice.current.batteryState {
        case .charging:    return "charging"
        case .full:        return "full"
        case .unplugged:   return "unplugged"
        default:           return "unknown"
        }
    }

    private func totalDiskSpace() -> Int64 {
        let attrs = try? FileManager.default.attributesOfFileSystem(forPath: NSHomeDirectory())
        return (attrs?[.systemSize] as? NSNumber)?.int64Value ?? 0
    }

    private func freeDiskSpace() -> Int64 {
        let attrs = try? FileManager.default.attributesOfFileSystem(forPath: NSHomeDirectory())
        return (attrs?[.systemFreeSize] as? NSNumber)?.int64Value ?? 0
    }

    private func currentNetworkType() -> String {
        var flags = SCNetworkReachabilityFlags()
        guard let reachability = SCNetworkReachabilityCreateWithName(nil, "8.8.8.8"),
              SCNetworkReachabilityGetFlags(reachability, &flags) else { return "none" }
        if flags.contains(.isWWAN) { return "cellular" }
        if flags.contains(.reachable) { return "wifi" }
        return "none"
    }
}

// MARK: – CLLocationManagerDelegate

extension DataCollectors: CLLocationManagerDelegate {
    public func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        lastLocation = locations.last
    }
}
