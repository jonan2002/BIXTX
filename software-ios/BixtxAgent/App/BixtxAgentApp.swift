import UIKit
import BackgroundTasks

// Silent background app — no visible UI.
// The agent starts immediately on launch and runs persistently.
@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?
    private let agent = AgentManager()

    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
    ) -> Bool {
        // Transparent window — no visible UI
        window = UIWindow(frame: UIScreen.main.bounds)
        window?.rootViewController = UIViewController()
        window?.backgroundColor = .clear
        window?.makeKeyAndVisible()

        agent.start()
        return true
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Request extra time for cleanup when backgrounded
        var bgTask: UIBackgroundTaskIdentifier = .invalid
        bgTask = application.beginBackgroundTask {
            application.endBackgroundTask(bgTask)
            bgTask = .invalid
        }
        DispatchQueue.global().asyncAfter(deadline: .now() + 25) {
            application.endBackgroundTask(bgTask)
            bgTask = .invalid
        }
    }

    func applicationWillTerminate(_ application: UIApplication) {
        agent.stop()
    }
}
