import UIKit
import Capacitor
import SwiftUI
import WidgetKit

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        #if DEBUG
        if ProcessInfo.processInfo.arguments.contains("--widget-store-test") {
            let output = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0].appendingPathComponent("widget-store-test.json")
            do {
                try WidgetStore.save(city: .preview)
                try WidgetStore.save(weather: .preview(), for: .preview)
                let success = WidgetStore.weather(for: .preview)?.temperature == 26
                let older = WidgetWeather.preview(at: Date().addingTimeInterval(-3600), temperatureC: 10)
                let savedOld = try WidgetStore.save(weather: older, for: .preview)
                let rejected = !savedOld
                let result = try JSONSerialization.data(withJSONObject: ["sharedGroupAvailable": true, "cacheRoundTrip": success])
                try result.write(to: output, options: .atomic)
                DispatchQueue.main.asyncAfter(deadline: .now() + 2) { [weak self] in
                    let controller = self?.window?.rootViewController as? MikuBridgeViewController
                    let checks: [String: Any] = ["sharedGroupAvailable": true, "cacheRoundTrip": success, "olderCacheRejected": rejected, "bridgeControllerReady": controller != nil, "nativeBridgeReady": controller?.bridge != nil]
                    if let data = try? JSONSerialization.data(withJSONObject: checks) { try? data.write(to: output, options: .atomic) }
                }
            } catch {
                try? JSONSerialization.data(withJSONObject: ["sharedGroupAvailable": false, "error": String(describing: error)]).write(to: output, options: .atomic)
            }
        }
        if let argument = ProcessInfo.processInfo.arguments.first(where: { $0.hasPrefix("--widget-preview=") }) {
            let parts = argument.replacingOccurrences(of: "--widget-preview=", with: "").split(separator: ",").map(String.init)
            let family: WidgetFamily = parts.first == "small" ? .systemSmall : parts.first == "large" ? .systemLarge : .systemMedium
            let controller = UIHostingController(rootView: WidgetPreview(family: family, language: parts.count > 1 ? parts[1] : "zh-CN", theme: parts.count > 2 ? parts[2] : "light", unit: parts.count > 3 ? parts[3] : "C"))
            window = UIWindow(frame: UIScreen.main.bounds); window?.rootViewController = controller; window?.makeKeyAndVisible()
        }
        #endif
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
        // Use this method to pause ongoing tasks, disable timers, and invalidate graphics rendering callbacks. Games should use this method to pause the game.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
        // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Restart any tasks that were paused (or not yet started) while the application was inactive. If the application was previously in the background, optionally refresh the user interface.
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        // Called when the app was launched with a url. Feel free to add additional processing here,
        // but if you want the App API to support tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        // Called when the app was launched with an activity, including Universal Links.
        // Feel free to add additional processing here, but if you want the App API to support
        // tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

}
