import Capacitor
import WidgetKit

@objc(MikuWeatherPlugin)
public class MikuWeatherPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "MikuWeatherPlugin"
    public let jsName = "MikuWeather"
    public let pluginMethods: [CAPPluginMethod] = [CAPPluginMethod(name: "selectCity", returnType: CAPPluginReturnPromise)]

    @objc func selectCity(_ call: CAPPluginCall) {
        do {
            guard let object = call.getObject("city") else { throw WidgetFailure.invalidCity }
            let city = try WidgetCity.make(city: object, unit: call.getString("unit") ?? "C", theme: call.getString("theme") ?? "solar", language: call.getString("language") ?? "zh-CN")
            try WidgetStore.save(city: city)
            if let data = call.getObject("weather"), let weather = try? WidgetWeather.fromApp(data, city: city) { try WidgetStore.save(weather: weather, for: city) }
            WidgetCenter.shared.reloadTimelines(ofKind: WidgetStore.kind)
            call.resolve(["synced": true])
        } catch WidgetFailure.unavailableGroup {
            call.reject("小组件数据共享未启用，请使用包含 App Groups 权限的签名", "WIDGET_APP_GROUP")
        } catch { call.reject("小组件城市信息无效", "WIDGET_CITY") }
    }
}

class MikuBridgeViewController: CAPBridgeViewController {
    override func capacitorDidLoad() { bridge?.registerPluginInstance(MikuWeatherPlugin()) }
}
