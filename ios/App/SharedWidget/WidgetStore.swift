import Foundation

enum WidgetStore {
    static let appGroup = "group.io.mikuweather.reborn"
    static let kind = "MikuWeatherWidget"
    private static var folder: URL? { FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: appGroup) }

    static func city() -> WidgetCity? {
        guard let url = folder?.appendingPathComponent("widget-city.json"), let data = try? Data(contentsOf: url),
              let city = try? JSONDecoder().decode(WidgetCity.self, from: data), city.latitude.isFinite, city.longitude.isFinite,
              abs(city.latitude) <= 90, abs(city.longitude) <= 180, TimeZone(identifier: city.timeZone) != nil else { return nil }
        return city
    }
    static func weather(for city: WidgetCity, at now: Date = Date()) -> WidgetWeather? {
        guard let url = folder?.appendingPathComponent("widget-weather.json"), let data = try? Data(contentsOf: url),
              let weather = try? JSONDecoder().decode(WidgetWeather.self, from: data), weather.usable(for: city, at: now) else { return nil }
        return weather
    }
    static func save(city: WidgetCity) throws {
        guard let folder = folder else { throw WidgetFailure.unavailableGroup }
        try JSONEncoder().encode(city).write(to: folder.appendingPathComponent("widget-city.json"), options: .atomic)
    }
    @discardableResult static func save(weather: WidgetWeather, for city: WidgetCity) throws -> Bool {
        // A completed background request must not restore a city the app has already changed.
        guard self.city()?.identity == city.identity else { return false }
        if let previous = self.weather(for: city), !weather.shouldReplace(previous) { return false }
        guard let folder = folder else { throw WidgetFailure.unavailableGroup }
        try JSONEncoder().encode(weather).write(to: folder.appendingPathComponent("widget-weather.json"), options: .atomic)
        return true
    }
}

final class WidgetWeatherClient {
    static let origin = "https://miku-weather-reborn-api.pages.dev"
    private let session: URLSession
    init() {
        let config = URLSessionConfiguration.ephemeral
        config.timeoutIntervalForRequest = 15; config.timeoutIntervalForResource = 20
        session = URLSession(configuration: config)
    }
    func fetch(city: WidgetCity, completion: @escaping (WidgetWeather?) -> Void) {
        let group = DispatchGroup(), lock = NSLock()
        var results: [String: [String: Any]] = [:]
        for kind in ["current", "daily", "hourly"] {
            var components = URLComponents(string: Self.origin)!
            components.path = "/weather/v1/\(kind)/\(String(format: "%.2f", city.latitude))/\(String(format: "%.2f", city.longitude))"
            components.queryItems = [URLQueryItem(name: "lang", value: "zh"), URLQueryItem(name: "localTime", value: "true")]
            if kind == "daily" { components.queryItems?.append(URLQueryItem(name: "days", value: "7")) }
            if kind == "hourly" { components.queryItems?.append(URLQueryItem(name: "hours", value: "24")) }
            guard let url = components.url else { continue }
            var request = URLRequest(url: url); request.setValue("application/json", forHTTPHeaderField: "Accept")
            group.enter()
            session.dataTask(with: request) { data, response, error in
                defer { group.leave() }
                guard error == nil, (response as? HTTPURLResponse)?.statusCode == 200, let data = data, data.count <= 1_048_576,
                      let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any], object["error"] == nil else { return }
                lock.lock(); results[kind] = object; lock.unlock()
            }.resume()
        }
        group.notify(queue: .global(qos: .utility)) { [self] in
            defer { self.session.finishTasksAndInvalidate() }
            lock.lock(); let values = results; lock.unlock()
            guard let current = values["current"] else { completion(nil); return }
            completion(try? WidgetWeather.fromAPI(current: current, daily: values["daily"], hourly: values["hourly"], city: city))
        }
    }
}
