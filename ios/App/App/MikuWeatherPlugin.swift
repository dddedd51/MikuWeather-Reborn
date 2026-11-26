import Capacitor

@objc(MikuWeatherPlugin)
public class MikuWeatherPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "MikuWeatherPlugin"
    public let jsName = "MikuWeather"
    public let pluginMethods: [CAPPluginMethod] = [CAPPluginMethod(name: "widgetSupport", returnType: CAPPluginReturnPromise)]

    @objc func widgetSupport(_ call: CAPPluginCall) {
        let plugin = Bundle.main.builtInPlugInsURL?.appendingPathComponent("MikuWeatherWidgetExtension.appex")
        call.resolve(["embedded": plugin.map { FileManager.default.fileExists(atPath: $0.path) } ?? false])
    }
}

class MikuBridgeViewController: CAPBridgeViewController {
    override func capacitorDidLoad() { bridge?.registerPluginInstance(MikuWeatherPlugin()) }
}
