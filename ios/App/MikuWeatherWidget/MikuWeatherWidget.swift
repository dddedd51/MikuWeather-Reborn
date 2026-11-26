import SwiftUI
import WidgetKit
import Intents

struct MikuWeatherProvider: IntentTimelineProvider {
    private static let cityCatalog: [[String: Any]] = {
        guard let url = Bundle.main.url(forResource: "china", withExtension: "json"), let data = try? Data(contentsOf: url) else { return [] }
        return (try? JSONSerialization.jsonObject(with: data) as? [[String: Any]]) ?? []
    }()

    private func city(for configuration: WeatherLocationIntent) -> WidgetCity? {
        WidgetCity.configured(configuration.city, catalog: Self.cityCatalog)
    }

    func placeholder(in context: Context) -> MikuWeatherEntry { sample() }
    func getSnapshot(for configuration: WeatherLocationIntent, in context: Context, completion: @escaping (MikuWeatherEntry) -> Void) {
        if context.isPreview { completion(sample()); return }
        let city = self.city(for: configuration), now = Date()
        completion(MikuWeatherEntry(date: now, city: city, weather: city.flatMap { WidgetStore.weather(for: $0, at: now) }, offline: false, preview: false))
    }
    func getTimeline(for configuration: WeatherLocationIntent, in context: Context, completion: @escaping (Timeline<MikuWeatherEntry>) -> Void) {
        guard let city = self.city(for: configuration) else {
            completion(timeline(city: nil, weather: nil, offline: false, now: Date()))
            return
        }
        let client = WidgetWeatherClient()
        client.fetch(city: city) { result in
            let now = Date()
            if let result = result { _ = try? WidgetStore.save(weather: result, for: city) }
            let weather = WidgetStore.weather(for: city, at: now) ?? result.flatMap { $0.usable(for: city, at: now) ? $0 : nil }
            completion(self.timeline(city: city, weather: weather, offline: result == nil, now: now))
        }
    }
    private func sample() -> MikuWeatherEntry { MikuWeatherEntry(date: Date(), city: .preview, weather: .preview(), offline: false, preview: true) }
    private func timeline(city: WidgetCity?, weather: WidgetWeather?, offline: Bool, now: Date) -> Timeline<MikuWeatherEntry> {
        let start = floor(now.timeIntervalSince1970 / 60) * 60
        let dates = [now] + (1...60).map { Date(timeIntervalSince1970: start + Double($0) * 60) }
        let entries = dates.map { date in MikuWeatherEntry(date: date, city: city, weather: city.flatMap { weather?.usable(for: $0, at: date) == true ? weather : nil }, offline: offline, preview: false) }
        return Timeline(entries: entries, policy: .after(now.addingTimeInterval(1800)))
    }
}

@main
struct MikuWeatherWidget: Widget {
    let kind = WidgetStore.kind
    var body: some WidgetConfiguration {
        IntentConfiguration(kind: kind, intent: WeatherLocationIntent.self, provider: MikuWeatherProvider()) { entry in MikuWeatherWidgetView(entry: entry) }
            .configurationDisplayName("初音天气 · Miku Weather")
            .description("初音、时钟和天气，长按小组件即可设置城市。")
            .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}
