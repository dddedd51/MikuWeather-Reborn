import Foundation
import CoreFoundation

enum WidgetFailure: Error { case invalidCity, invalidWeather, unavailableGroup, invalidResponse }

struct WidgetCity: Codable, Equatable {
    let id: String
    let name: String
    let latitude: Double
    let longitude: Double
    let timeZone: String
    let unit: String
    let theme: String
    let language: String

    var identity: String { "\(id)|\(String(format: "%.2f", latitude))|\(String(format: "%.2f", longitude))|\(timeZone)" }
    var zone: TimeZone { TimeZone(identifier: timeZone) ?? .current }
    var locale: Locale { Locale(identifier: language) }

    static func make(city: [String: Any], unit: String, theme: String, language: String) throws -> WidgetCity {
        func coordinate(_ key: String) -> Double? {
            if let n = WidgetWeather.number(city[key]) { return n }
            if let s = city[key] as? String, let n = Double(s), n.isFinite { return n }
            return nil
        }
        guard let id = city["id"] as? String, !id.isEmpty, id.count <= 80,
              let name = (city["displayName"] ?? city["name"]) as? String, !name.isEmpty, name.count <= 80,
              let lat = coordinate("lat"), abs(lat) <= 90, let lon = coordinate("lon"), abs(lon) <= 180,
              let tz = city["tz"] as? String, TimeZone(identifier: tz) != nil else { throw WidgetFailure.invalidCity }
        return WidgetCity(id: id, name: name, latitude: (lat * 100).rounded() / 100, longitude: (lon * 100).rounded() / 100,
                          timeZone: tz, unit: unit == "F" ? "F" : "C", theme: ["light", "dark", "solar", "system"].contains(theme) ? theme : "solar",
                          language: ["zh-CN", "zh-TW", "en", "ja"].contains(language) ? language : "zh-CN")
    }

    static let preview = WidgetCity(id: "101280601", name: "深圳", latitude: 22.55, longitude: 114.06, timeZone: "Asia/Shanghai", unit: "C", theme: "light", language: "zh-CN")
}

struct WidgetHour: Codable { let date: Date; let temperature: Double; let code: String }
struct WidgetDay: Codable { let date: Date; let high: Double?; let low: Double?; let code: String }

struct WidgetWeather: Codable {
    let cityIdentity: String
    let fetchedAt: Date
    let observedAt: Date
    let temperature: Double
    let condition: String
    let code: String
    let humidity: Double?
    let wind: Double?
    let high: Double?
    let low: Double?
    let sunrise: Date?
    let sunset: Date?
    let hours: [WidgetHour]
    let days: [WidgetDay]

    static func number(_ value: Any?) -> Double? {
        guard let n = value as? NSNumber, CFGetTypeID(n) != CFBooleanGetTypeID(), n.doubleValue.isFinite else { return nil }
        return n.doubleValue
    }
    static func quantity(_ value: Any?) -> Double? { number((value as? [String: Any])?["value"]) }
    static func date(_ value: Any?) -> Date? {
        guard let text = value as? String, text.count <= 50 else { return nil }
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = formatter.date(from: text) { return date }
        formatter.formatOptions = [.withInternetDateTime]
        return formatter.date(from: text)
    }
    static func weatherCode(_ value: Any?) -> String {
        let text = value as? String ?? (value as? NSNumber)?.stringValue ?? ""
        return !text.isEmpty && text.count <= 4 && text.allSatisfy({ $0.isNumber }) ? text : ""
    }

    static func fromApp(_ data: [String: Any], city: WidgetCity) throws -> WidgetWeather {
        guard data["demo"] as? Bool != true, data["cityId"] as? String == city.id,
              let current = data["current"] as? [String: Any], let temperature = number(current["temp"]),
              let observed = date(current["time"]), let milliseconds = number(data["fetchedAt"]), milliseconds > 0 else { throw WidgetFailure.invalidWeather }
        let daily = data["daily"] as? [[String: Any]] ?? []
        let today = daily.first ?? [:]
        let hours = (data["hourly"] as? [[String: Any]] ?? []).compactMap { hour -> WidgetHour? in
            guard let date = Self.date(hour["time"]), let temp = number(hour["temp"]) else { return nil }
            return WidgetHour(date: date, temperature: temp, code: weatherCode(hour["code"]))
        }
        let days = daily.compactMap { day -> WidgetDay? in
            guard let date = Self.date(day["time"]) else { return nil }
            return WidgetDay(date: date, high: number(day["tempMax"]), low: number(day["tempMin"]), code: weatherCode(day["code"]))
        }
        return WidgetWeather(cityIdentity: city.identity, fetchedAt: Date(timeIntervalSince1970: milliseconds / 1000), observedAt: observed,
                             temperature: temperature, condition: current["text"] as? String ?? "未知", code: weatherCode(current["code"]),
                             humidity: number(current["humidity"]), wind: number(current["wind"]), high: number(today["tempMax"]), low: number(today["tempMin"]),
                             sunrise: date(today["sunrise"]), sunset: date(today["sunset"]), hours: hours, days: days)
    }

    static func fromAPI(current: [String: Any], daily: [String: Any]?, hourly: [String: Any]?, city: WidgetCity, now: Date = Date()) throws -> WidgetWeather {
        guard current["error"] == nil, let condition = current["condition"] as? [String: Any],
              let temperature = quantity(current["temperature"]), let observed = date(current["validTime"]) else { throw WidgetFailure.invalidWeather }
        let sourceDays = daily?["days"] as? [[String: Any]] ?? []
        let today = sourceDays.first ?? [:], astro = today["astro"] as? [String: Any] ?? [:]
        let days = sourceDays.compactMap { day -> WidgetDay? in
            guard let date = Self.date(day["forecastStartTime"]) else { return nil }
            let daytime = day["daytime"] as? [String: Any] ?? [:], condition = daytime["condition"] as? [String: Any] ?? [:]
            return WidgetDay(date: date, high: quantity(day["temperatureMax"]), low: quantity(day["temperatureMin"]), code: weatherCode(condition["code"]))
        }
        let hours = (hourly?["hours"] as? [[String: Any]] ?? []).compactMap { hour -> WidgetHour? in
            guard let date = Self.date(hour["forecastTime"]), let temp = quantity(hour["temperature"]) else { return nil }
            let condition = hour["condition"] as? [String: Any] ?? [:]
            return WidgetHour(date: date, temperature: temp, code: weatherCode(condition["code"]))
        }
        let wind = current["wind"] as? [String: Any] ?? [:]
        return WidgetWeather(cityIdentity: city.identity, fetchedAt: now, observedAt: observed, temperature: temperature,
                             condition: condition["text"] as? String ?? "未知", code: weatherCode(condition["code"]),
                             humidity: number(current["humidity"]).map { $0 * 100 }, wind: quantity(wind["speed"]),
                             high: quantity(today["temperatureMax"]), low: quantity(today["temperatureMin"]),
                             sunrise: date(astro["sunrise"]), sunset: date(astro["sunset"]), hours: hours, days: days)
    }

    func usable(for city: WidgetCity, at now: Date) -> Bool {
        cityIdentity == city.identity && temperature.isFinite && now.timeIntervalSince(fetchedAt) >= -600 && now.timeIntervalSince(fetchedAt) <= 86400
    }
    func stale(at now: Date) -> Bool { now.timeIntervalSince(fetchedAt) > 1200 || now.timeIntervalSince(observedAt) > 7200 }
    func shouldReplace(_ previous: WidgetWeather) -> Bool {
        cityIdentity != previous.cityIdentity || observedAt > previous.observedAt || (observedAt == previous.observedAt && fetchedAt > previous.fetchedAt)
    }
    func forecastDays(for city: WidgetCity, at now: Date) -> [WidgetDay] {
        var calendar = Calendar(identifier: .gregorian); calendar.timeZone = city.zone
        let today = calendar.startOfDay(for: now)
        return days.filter { calendar.startOfDay(for: $0.date) >= today }
    }
    func night(at now: Date, city: WidgetCity) -> Bool {
        if let sunrise = sunrise, let sunset = sunset {
            var calendar = Calendar(identifier: .gregorian); calendar.timeZone = city.zone
            if calendar.isDate(now, inSameDayAs: sunrise) { return now < sunrise || now >= sunset }
        }
        var calendar = Calendar(identifier: .gregorian); calendar.timeZone = city.zone
        let hour = calendar.component(.hour, from: now)
        return hour < 6 || hour >= 18
    }
    static func preview(at now: Date = Date(), temperatureC: Double = 26) -> WidgetWeather {
        let hours: [WidgetHour] = (1...4).map { index in
            let date = now.addingTimeInterval(Double(index) * 3600)
            return WidgetHour(date: date, temperature: temperatureC - Double(index), code: "101")
        }
        let days: [WidgetDay] = (0...3).map { index in
            let date = now.addingTimeInterval(Double(index) * 86400)
            return WidgetDay(date: date, high: temperatureC + 2 - Double(index), low: temperatureC - 5 - Double(index), code: index == 2 ? "305" : "101")
        }
        return WidgetWeather(cityIdentity: WidgetCity.preview.identity, fetchedAt: now, observedAt: now, temperature: temperatureC, condition: "多云", code: "101", humidity: 64.0, wind: 2.4,
                             high: temperatureC + 2, low: temperatureC - 5, sunrise: nil, sunset: nil, hours: hours, days: days)
    }
}

enum WidgetStrings {
    static let catalog: [String: [String]] = {
        guard let url = Bundle.main.url(forResource: "WidgetLocalizations", withExtension: "json"), let data = try? Data(contentsOf: url),
              let value = try? JSONDecoder().decode([String: [String]].self, from: data) else { return [:] }
        return value
    }()
    static func text(_ key: String, language: String) -> String {
        let index = ["zh-TW": 0, "en": 1, "ja": 2][language]
        if let index = index, let values = catalog[key], index < values.count { return values[index] }
        return key
    }
}
