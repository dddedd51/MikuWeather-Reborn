import SwiftUI
import WidgetKit

struct MikuWeatherProvider: TimelineProvider {
    func placeholder(in context: Context) -> MikuWeatherEntry { sample() }
    func getSnapshot(in context: Context, completion: @escaping (MikuWeatherEntry) -> Void) {
        if context.isPreview { completion(sample()); return }
        let city = WidgetStore.city(), now = Date()
        completion(MikuWeatherEntry(date: now, city: city, weather: city.flatMap { WidgetStore.weather(for: $0, at: now) }, offline: false, preview: false))
    }
    func getTimeline(in context: Context, completion: @escaping (Timeline<MikuWeatherEntry>) -> Void) {
        guard let city = WidgetStore.city() else {
            completion(timeline(city: nil, weather: nil, offline: false, now: Date()))
            return
        }
        let client = WidgetWeatherClient()
        client.fetch(city: city) { result in
            let now = Date()
            if let result = result { try? WidgetStore.save(weather: result, for: city) }
            let currentCity = WidgetStore.city()
            let weather = currentCity.flatMap { WidgetStore.weather(for: $0, at: now) }
            completion(self.timeline(city: currentCity, weather: weather, offline: result == nil, now: now))
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
        StaticConfiguration(kind: kind, provider: MikuWeatherProvider()) { entry in MikuWeatherWidgetView(entry: entry) }
            .configurationDisplayName("初音天气 · Miku Weather")
            .description("初音、时钟和天气，跟随应用中的当前城市。")
            .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}
