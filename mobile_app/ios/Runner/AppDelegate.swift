import Flutter
import UIKit
import UserNotifications
import BackgroundTasks

@main
@objc class AppDelegate: FlutterAppDelegate {

    private let channelName = "sa.alsulaim.erp/native_mobile"
    private let bgTaskIdentifier = "sa.alsulaim.erp.bgSync"
    private var bgServiceRunning: Bool = true
    private var heartbeatCount: Int = 1
    private var lastSyncTimestamp: String = "الآن"
    private var backgroundTaskId: UIBackgroundTaskIdentifier = .invalid
    private var heartbeatTimer: Timer?

    override func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
    ) -> Bool {
        GeneratedPluginRegistrant.register(with: self)

        // 1. Configure iOS Native Notification Center Delegate (Banner, Sound, Badge in Foreground & Background)
        UNUserNotificationCenter.current().delegate = self
        requestNotificationAuthorization { _ in }

        // 2. Register iOS BGTaskScheduler for background sync when app is suspended
        if #available(iOS 13.0, *) {
            BGTaskScheduler.shared.register(
                forTaskWithIdentifier: bgTaskIdentifier,
                using: nil
            ) { [weak self] task in
                guard let appRefreshTask = task as? BGAppRefreshTask else {
                    task.setTaskCompleted(success: false)
                    return
                }
                self?.handleIosBackgroundRefresh(task: appRefreshTask)
            }
        }

        // 3. Bind Flutter MethodChannel ("sa.alsulaim.erp/native_mobile")
        if let controller = window?.rootViewController as? FlutterViewController {
            let channel = FlutterMethodChannel(
                name: channelName,
                binaryMessenger: controller.binaryMessenger
            )

            channel.setMethodCallHandler { [weak self] call, result in
                guard let self = self else {
                    result(FlutterError(code: "UNAVAILABLE", message: "AppDelegate released", details: nil))
                    return
                }

                let args = call.arguments as? [String: Any]

                switch call.method {
                case "requestNotificationPermission":
                    self.requestNotificationAuthorization { granted in
                        result(granted)
                    }

                case "showSystemNotification":
                    let title = (args?["title"] as? String) ?? "تنبيه مجموعة خالد السليم"
                    let body = (args?["body"] as? String) ?? ""
                    let companyName = (args?["companyName"] as? String) ?? "مجموعة خالد السليم ERP"
                    self.dispatchIosNotification(
                        title: title,
                        subtitle: companyName,
                        body: body,
                        delaySeconds: 0.2
                    )
                    result(true)

                case "scheduleBackgroundNotification":
                    let delayMs = (args?["delayMs"] as? Double) ?? 5000.0
                    let title = (args?["title"] as? String) ?? "إشعار خلفي — مجموعة خالد السليم"
                    let body = (args?["body"] as? String) ?? "تم تنفيذ العملية في الخلفية بنجاح."
                    let companyName = (args?["companyName"] as? String) ?? "مجموعة خالد السليم ERP"
                    self.beginExtendedBackgroundExecution()
                    self.dispatchIosNotification(
                        title: title,
                        subtitle: companyName,
                        body: body,
                        delaySeconds: max(1.0, delayMs / 1000.0)
                    )
                    result(true)

                case "startBackgroundService":
                    self.bgServiceRunning = true
                    self.startHeartbeatTimer()
                    self.scheduleIosBackgroundRefresh()
                    result(true)

                case "stopBackgroundService":
                    self.bgServiceRunning = false
                    self.heartbeatTimer?.invalidate()
                    self.endExtendedBackgroundExecution()
                    result(false)

                case "getBackgroundServiceStatus":
                    result([
                        "isRunning": self.bgServiceRunning,
                        "heartbeatCount": self.heartbeatCount,
                        "lastSyncTimestamp": self.lastSyncTimestamp
                    ])

                case "setWakeLock":
                    let enable = (args?["enable"] as? Bool) ?? false
                    DispatchQueue.main.async {
                        UIApplication.shared.isIdleTimerDisabled = enable
                    }
                    result(enable)

                case "vibrateDevice":
                    DispatchQueue.main.async {
                        let generator = UIImpactFeedbackGenerator(style: .medium)
                        generator.prepare()
                        generator.impactOccurred()
                    }
                    result(true)

                default:
                    result(FlutterMethodNotImplemented)
                }
            }
        }

        startHeartbeatTimer()
        return super.application(application, didFinishLaunchingWithOptions: launchOptions)
    }

    override func applicationDidEnterBackground(_ application: UIApplication) {
        super.applicationDidEnterBackground(application)
        if bgServiceRunning {
            beginExtendedBackgroundExecution()
            scheduleIosBackgroundRefresh()
        }
    }

    private func requestNotificationAuthorization(completion: @escaping (Bool) -> Void) {
        UNUserNotificationCenter.current().requestAuthorization(
            options: [.alert, .badge, .sound]
        ) { granted, _ in
            DispatchQueue.main.async {
                if granted {
                    UIApplication.shared.registerForRemoteNotifications()
                }
                completion(granted)
            }
        }
    }

    private func dispatchIosNotification(
        title: String,
        subtitle: String,
        body: String,
        delaySeconds: TimeInterval
    ) {
        let content = UNMutableNotificationContent()
        content.title = title
        content.subtitle = subtitle
        content.body = body
        content.sound = .default
        if #available(iOS 15.0, *) {
            content.interruptionLevel = .timeSensitive
        }

        let trigger = UNTimeIntervalNotificationTrigger(
            timeInterval: max(0.1, delaySeconds),
            repeats: false
        )
        let reqId = "alsulaim-notif-\(Int(Date().timeIntervalSince1970 * 1000))"
        let request = UNNotificationRequest(
            identifier: reqId,
            content: content,
            trigger: trigger
        )
        UNUserNotificationCenter.current().add(request, withCompletionHandler: nil)
    }

    private func startHeartbeatTimer() {
        heartbeatTimer?.invalidate()
        heartbeatTimer = Timer.scheduledTimer(withTimeInterval: 25.0, repeats: true) { [weak self] _ in
            guard let self = self, self.bgServiceRunning else { return }
            self.heartbeatCount += 1
            let formatter = DateFormatter()
            formatter.dateFormat = "HH:mm:ss"
            self.lastSyncTimestamp = formatter.string(from: Date())
        }
    }

    private func beginExtendedBackgroundExecution() {
        endExtendedBackgroundExecution()
        backgroundTaskId = UIApplication.shared.beginBackgroundTask(withName: "AlsulaimErpBgSync") { [weak self] in
            self?.endExtendedBackgroundExecution()
        }
    }

    private func endExtendedBackgroundExecution() {
        if backgroundTaskId != .invalid {
            UIApplication.shared.endBackgroundTask(backgroundTaskId)
            backgroundTaskId = .invalid
        }
    }

    private func scheduleIosBackgroundRefresh() {
        if #available(iOS 13.0, *) {
            let request = BGAppRefreshTaskRequest(identifier: bgTaskIdentifier)
            request.earliestBeginDate = Date(timeIntervalSinceNow: 15 * 60)
            try? BGTaskScheduler.shared.submit(request)
        }
    }

    @available(iOS 13.0, *)
    private func handleIosBackgroundRefresh(task: BGAppRefreshTask) {
        scheduleIosBackgroundRefresh()
        heartbeatCount += 1
        let formatter = DateFormatter()
        formatter.dateFormat = "HH:mm:ss"
        lastSyncTimestamp = formatter.string(from: Date())

        task.expirationHandler = {
            task.setTaskCompleted(success: false)
        }
        task.setTaskCompleted(success: true)
    }

    // Ensure notifications show banner + sound even while app is open in foreground on iPhone
    override func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        if #available(iOS 14.0, *) {
            completionHandler([.banner, .list, .sound, .badge])
        } else {
            completionHandler([.alert, .sound, .badge])
        }
    }
}
