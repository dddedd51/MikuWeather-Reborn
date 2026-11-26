import Foundation
import CryptoKit

enum WidgetStore {
    static let kind = "MikuWeatherWidget"
    private static let lock = NSLock()

    private static func file(for city: WidgetCity) throws -> URL {
        let cache = try FileManager.default.url(for: .cachesDirectory, in: .userDomainMask, appropriateFor: nil, create: true)
        let key = SHA256.hash(data: Data(city.identity.utf8)).map { String(format: "%02x", $0) }.joined()
        return cache.appendingPathComponent("miku-weather-" + key + ".json")
    }

    static func weather(for city: WidgetCity, at now: Date = Date()) -> WidgetWeather? {
        guard let data = try? Data(contentsOf: file(for: city)), let value = try? JSONDecoder().decode(WidgetWeather.self, from: data),
              value.usable(for: city, at: now) else { return nil }
        return value
    }

    @discardableResult static func save(weather: WidgetWeather, for city: WidgetCity) throws -> Bool {
        lock.lock(); defer { lock.unlock() }
        guard weather.usable(for: city, at: Date()) else { return false }
        if let previous = self.weather(for: city), !weather.shouldReplace(previous) { return false }
        try JSONEncoder().encode(weather).write(to: file(for: city), options: .atomic)
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
