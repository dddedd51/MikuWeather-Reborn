import Foundation

struct LiveCheckError: Error, CustomStringConvertible {
    let description: String
    init(_ description: String) { self.description = description }
}

func check(_ name: String, in catalog: [[String: Any]]) async throws {
    guard let city = WidgetCity.configured(name, catalog: catalog) else {
        throw LiveCheckError("City missing or ambiguous: " + name)
    }
    let weather = await withCheckedContinuation { continuation in
        WidgetWeatherClient().fetch(city: city) { continuation.resume(returning: $0) }
    }
    guard let weather = weather, weather.usable(for: city, at: Date()), !weather.condition.isEmpty else {
        throw LiveCheckError("The released widget has no usable observation for " + name)
    }
    guard weather.days.count == 7, weather.hours.count == 24,
          weather.high != nil, weather.low != nil, weather.sunrise != nil, weather.sunset != nil else {
        throw LiveCheckError("Incomplete daily, hourly or solar forecast for " + name)
    }
    _ = try WidgetStore.save(weather: weather, for: city)
    guard let cached = WidgetStore.weather(for: city), cached.observedAt == weather.observedAt,
          cached.temperature == weather.temperature, cached.hours.count == weather.hours.count,
          cached.days.count == weather.days.count else {
        throw LiveCheckError("The extension could not read back the forecast for " + name)
    }
    let observed = ISO8601DateFormatter()
    observed.timeZone = city.zone
    print("\(name) \(observed.string(from: weather.observedAt)) \(weather.temperature)°C \(weather.condition) | \(weather.days.count) days, \(weather.hours.count) hours | cache OK")
}

guard CommandLine.arguments.count == 3 else { throw LiveCheckError("Expected a city catalog and comma-separated city names") }
let data = try Data(contentsOf: URL(fileURLWithPath: CommandLine.arguments[1]))
guard let catalog = try JSONSerialization.jsonObject(with: data) as? [[String: Any]] else {
    throw LiveCheckError("Unreadable released city catalog")
}
let cities = CommandLine.arguments[2].split(separator: ",").map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
guard !cities.isEmpty else { throw LiveCheckError("At least one city is required") }
for name in cities { try await check(name, in: catalog) }
