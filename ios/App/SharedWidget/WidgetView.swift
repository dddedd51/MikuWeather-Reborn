import SwiftUI
import WidgetKit

struct MikuWeatherEntry: TimelineEntry {
    let date: Date
    let city: WidgetCity?
    let weather: WidgetWeather?
    let offline: Bool
    let preview: Bool
}

struct MikuWeatherWidgetView: View {
    @Environment(\.widgetFamily) private var systemFamily
    @Environment(\.colorScheme) var scheme
    let entry: MikuWeatherEntry
    let previewFamily: WidgetFamily?
    init(entry: MikuWeatherEntry, previewFamily: WidgetFamily? = nil) { self.entry = entry; self.previewFamily = previewFamily }
    private var family: WidgetFamily { previewFamily ?? systemFamily }
    private var city: WidgetCity { entry.city ?? .preview }
    private var dark: Bool {
        switch city.theme {
        case "dark": return true
        case "light": return false
        case "system": return scheme == .dark
        default: return entry.weather?.night(at: entry.date, city: city) ?? (scheme == .dark)
        }
    }
    private var ink: Color { dark ? Color(red: 0.89, green: 0.98, blue: 0.96) : Color(red: 0.10, green: 0.28, blue: 0.29) }
    private var muted: Color { ink.opacity(0.65) }
    private var background: LinearGradient {
        LinearGradient(gradient: Gradient(colors: dark ? [Color(red: 0.07, green: 0.17, blue: 0.20), Color(red: 0.12, green: 0.28, blue: 0.30)] : [Color(red: 0.88, green: 0.98, blue: 0.94), Color(red: 0.74, green: 0.93, blue: 0.88)]), startPoint: .topLeading, endPoint: .bottomTrailing)
    }
    private func text(_ key: String) -> String { WidgetStrings.text(key, language: city.language) }
    private func degrees(_ value: Double?) -> String {
        guard let value = value, value.isFinite else { return "—" }
        return String(Int((city.unit == "F" ? value * 1.8 + 32 : value).rounded())) + "°"
    }
    private func clock(_ date: Date, format: String = "HH:mm") -> String {
        let formatter = DateFormatter(); formatter.timeZone = city.zone; formatter.locale = city.locale; formatter.dateFormat = format
        return formatter.string(from: date)
    }
    private func symbol(_ code: String, night: Bool = false) -> String {
        let c = Int(code) ?? 104
        if [100, 150].contains(c) { return night || c == 150 ? "moon.stars.fill" : "sun.max.fill" }
        if [101, 102, 103, 151, 152, 153].contains(c) { return night || c >= 150 ? "cloud.moon.fill" : "cloud.sun.fill" }
        if [302, 303, 304].contains(c) { return "cloud.bolt.rain.fill" }
        if c >= 400 && c < 500 { return "cloud.snow.fill" }
        if c >= 300 && c < 400 { return "cloud.rain.fill" }
        if c >= 500 && c < 600 { return "cloud.fog.fill" }
        return "cloud.fill"
    }
    private var artwork: String {
        let c = Int(entry.weather?.code ?? "101") ?? 104, night = entry.weather?.night(at: entry.date, city: city) ?? dark
        if [100, 150].contains(c) { return night ? "miku-clear-night" : "miku-clear-day" }
        if [101, 102, 103, 151, 152, 153].contains(c) { return night ? "miku-cloudy-night" : "miku-cloudy-day" }
        if [302, 303, 304].contains(c) { return night ? "miku-thunder-night" : "miku-thunder-day" }
        if [404, 405, 406, 456].contains(c) { return "miku-sleet" }
        if c >= 400 && c < 500 { return [401, 402, 403, 410].contains(c) ? "miku-heavy-snow" : night ? "miku-snow-night" : "miku-snow-day" }
        if c >= 300 && c < 400 { return [307, 308, 310, 311, 312, 315, 316, 317, 318].contains(c) ? "miku-heavy-rain" : night ? "miku-rain-night" : "miku-rain-day" }
        return c >= 500 && c < 600 ? "miku-fog" : "miku-overcast"
    }

    var body: some View {
        Group {
            if #available(iOS 17.0, *) { content.containerBackground(for: .widget) { background } }
            else { content.background(background) }
        }
        .foregroundColor(ink)
        .environment(\.locale, city.locale)
        .environment(\.timeZone, city.zone)
        .widgetURL(URL(string: "mikuweather://weather"))
        .accessibilityElement(children: .combine)
    }

    private var content: some View {
        GeometryReader { geometry in
            if entry.city == nil {
                VStack(spacing: 9) {
                    Image("miku-cloudy-day").resizable().scaledToFit().frame(maxHeight: geometry.size.height * 0.52).accessibilityHidden(true)
                    Text(text("初音天气")).font(.system(size: 16, weight: .semibold))
                    Text(text("打开初音天气设置城市")).font(.system(size: 11)).multilineTextAlignment(.center).foregroundColor(muted)
                }.padding(8).frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if family == .systemSmall { small(size: geometry.size) }
            else { expanded(size: geometry.size) }
        }
    }
    private func small(size: CGSize) -> some View {
        VStack(alignment: .leading, spacing: 3) {
            HStack(spacing: 4) { Image(systemName: "location.fill").font(.system(size: 8)); Text(city.name).font(.system(size: 12, weight: .semibold)).lineLimit(1).minimumScaleFactor(0.65); Spacer(minLength: 0) }
            ZStack(alignment: .leading) {
                HStack { Spacer(); Image(artwork).resizable().scaledToFit().frame(width: size.width * 0.52, height: size.height * 0.53).accessibilityHidden(true) }
                VStack(alignment: .leading, spacing: 1) {
                    Text(degrees(entry.weather?.temperature)).font(.system(size: min(42, size.width * 0.30), weight: .semibold, design: .rounded)).minimumScaleFactor(0.7).lineLimit(1)
                    Text("°" + city.unit).font(.system(size: 9)).foregroundColor(muted)
                    Text(text(entry.weather?.condition ?? "等待天气数据")).font(.system(size: 10, weight: .medium)).lineLimit(1).frame(maxWidth: size.width * 0.51, alignment: .leading)
                }
            }.frame(maxHeight: .infinity)
            Text("↑ \(degrees(entry.weather?.high))  ↓ \(degrees(entry.weather?.low))").font(.system(size: 9)).foregroundColor(muted).lineLimit(1)
            status.font(.system(size: 8)).lineLimit(1).minimumScaleFactor(0.6)
        }.padding(8)
    }
    private func expanded(size: CGSize) -> some View {
        VStack(alignment: .leading, spacing: family == .systemLarge ? 6 : 4) {
            HStack(alignment: .firstTextBaseline) {
                HStack(spacing: 5) { Image(systemName: "location.fill").font(.system(size: 10)); Text(city.name).font(.system(size: 15, weight: .semibold)).lineLimit(1).minimumScaleFactor(0.7) }
                Spacer(minLength: 4)
                // Minute entries advance the clock without fetching weather every minute.
                Text(entry.date, style: .time).font(.system(size: 21, weight: .medium, design: .monospaced)).lineLimit(1)
            }
            HStack(spacing: 2) {
                VStack(alignment: .leading, spacing: 4) {
                    HStack(alignment: .firstTextBaseline, spacing: 2) {
                        Text(degrees(entry.weather?.temperature)).font(.system(size: family == .systemLarge ? 48 : 36, weight: .semibold, design: .rounded)).lineLimit(1).minimumScaleFactor(0.65)
                        Text(city.unit).font(.system(size: 12)).foregroundColor(muted)
                    }
                    HStack(spacing: 5) { Image(systemName: symbol(entry.weather?.code ?? "", night: entry.weather?.night(at: entry.date, city: city) ?? dark)); Text(text(entry.weather?.condition ?? "等待天气数据")).lineLimit(1).minimumScaleFactor(0.7) }.font(.system(size: 12, weight: .medium))
                    Text("↑ \(degrees(entry.weather?.high))   ↓ \(degrees(entry.weather?.low))").font(.system(size: 11)).foregroundColor(muted).lineLimit(1)
                }.frame(maxWidth: .infinity, alignment: .leading)
                Image(artwork).resizable().scaledToFit().frame(width: size.width * 0.43, height: family == .systemLarge ? 96 : max(55, size.height - 70)).accessibilityHidden(true)
            }.frame(maxHeight: family == .systemLarge ? 100 : .infinity)
            if family == .systemLarge {
                HStack { Text(text("相对湿度") + " " + (entry.weather?.humidity.map { String(Int($0.rounded())) + "%" } ?? "—")); Spacer(); Text(text("风速") + " " + (entry.weather?.wind.map { String(format: "%.1f m/s", $0) } ?? "—")) }.font(.system(size: 10)).foregroundColor(muted)
                Divider().background(ink.opacity(0.10))
                HStack {
                    ForEach(Array((entry.weather?.hours ?? []).filter { $0.date >= entry.date.addingTimeInterval(-1800) }.prefix(4).enumerated()), id: \.offset) { _, hour in
                        VStack(spacing: 5) { Text(clock(hour.date)).foregroundColor(muted); Image(systemName: symbol(hour.code)); Text(degrees(hour.temperature)).fontWeight(.semibold) }.font(.system(size: 11)).frame(maxWidth: .infinity)
                    }
                    if entry.weather?.hours.isEmpty != false { Text(text("预报暂不可用")).font(.system(size: 11)).foregroundColor(muted).frame(maxWidth: .infinity) }
                }.frame(height: 44)
                ForEach(Array((entry.weather?.days ?? []).prefix(3).enumerated()), id: \.offset) { index, day in
                    HStack { Text(index == 0 ? text("今天") : clock(day.date, format: "EEE")); Spacer(); Image(systemName: symbol(day.code)); Spacer(); Text(degrees(day.low) + " / " + degrees(day.high)) }.font(.system(size: 11)).frame(height: 16)
                }
                Spacer(minLength: 0)
            }
            status.font(.system(size: 9)).lineLimit(1).minimumScaleFactor(0.65)
        }.padding(8)
    }
    private var status: some View {
        let cached = entry.offline || entry.weather?.stale(at: entry.date) == true
        return HStack(spacing: 4) {
            if cached { Image(systemName: "wifi.slash") }
            Text(entry.preview ? text("预览") : entry.weather.map { (cached ? text("缓存") : text("更新于")) + " " + clock($0.observedAt) } ?? text("等待天气数据"))
            Spacer(minLength: 0)
            Image(systemName: "arrow.up.right").font(.system(size: 8))
        }.foregroundColor(muted)
    }
}
