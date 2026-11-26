import Foundation
var count = 0
func check(_ name: String, _ body: () throws -> Void) {
    do { try body(); count += 1; print("PASS " + name) }
    catch { fatalError("FAIL " + name + ": " + String(describing: error)) }
}
func require(_ condition: Bool) throws { if !condition { throw WidgetFailure.invalidResponse } }
func rejects(_ body: () throws -> Void) throws { do { try body() } catch { return }; throw WidgetFailure.invalidResponse }
let city = WidgetCity.preview, now = Date()
let dateText = ISO8601DateFormatter().string(from: now)
let current: [String: Any] = ["validTime": dateText, "temperature": ["value": 26.0], "condition": ["text": "多云", "code": "101"], "humidity": 0.64, "wind": ["speed": ["value": 2.4]]]
let weather = try WidgetWeather.fromAPI(current: current, daily: nil, hourly: nil, city: city, now: now)
check("current API data and missing optional forecasts") { try require(weather.temperature == 26 && weather.humidity == 64 && weather.hours.isEmpty && weather.high == nil) }
check("cache belongs to the selected city") { let other = WidgetCity(id: "other", name: "北京", latitude: 39.9, longitude: 116.41, timeZone: city.timeZone, unit: "C", theme: "light", language: "zh-CN"); try require(!weather.usable(for: other, at: now)) }
check("unit and language changes preserve canonical weather") { let other = WidgetCity(id: city.id, name: "Shenzhen", latitude: city.latitude, longitude: city.longitude, timeZone: city.timeZone, unit: "F", theme: "dark", language: "en"); try require(weather.usable(for: other, at: now)) }
check("cache expires after 24 hours") { try require(!weather.usable(for: city, at: now.addingTimeInterval(86401))) }
check("20 minute stale label") { try require(!weather.stale(at: now) && weather.stale(at: now.addingTimeInterval(1201))) }
check("future cache timestamps rejected") { try require(!weather.usable(for: city, at: now.addingTimeInterval(-601))) }
check("boolean temperature is rejected") { var bad = current; bad["temperature"] = ["value": true]; try rejects { _ = try WidgetWeather.fromAPI(current: bad, daily: nil, hourly: nil, city: city) } }
check("malformed observation time is rejected") { var bad = current; bad["validTime"] = "yesterday"; try rejects { _ = try WidgetWeather.fromAPI(current: bad, daily: nil, hourly: nil, city: city) } }
check("invalid coordinates are rejected") { try rejects { _ = try WidgetCity.make(city: ["id": "1", "name": "城市", "lat": "NaN", "lon": 100, "tz": "Asia/Shanghai"], unit: "C", theme: "light", language: "zh-CN") } }
check("city center strings and translated name are accepted") { let c = try WidgetCity.make(city: ["id": city.id, "name": "深圳", "displayName": "Shenzhen", "lat": "22.55", "lon": "114.06", "tz": "Asia/Shanghai"], unit: "F", theme: "dark", language: "en"); try require(c.identity == city.identity && c.name == "Shenzhen" && c.unit == "F") }
let app: [String: Any] = ["cityId": city.id, "fetchedAt": now.timeIntervalSince1970 * 1000, "current": ["temp": 26, "time": dateText, "code": "101", "text": "多云", "humidity": 64], "daily": [], "hourly": []]
check("application cache is accepted without re-converting humidity") { let value = try WidgetWeather.fromApp(app, city: city); try require(value.humidity == 64 && value.usable(for: city, at: now)) }
check("old city and demo data cannot replace widget weather") { var value = app; value["cityId"] = "old"; try rejects { _ = try WidgetWeather.fromApp(value, city: city) }; value = app; value["demo"] = true; try rejects { _ = try WidgetWeather.fromApp(value, city: city) } }
check("codable preserves cache identity and optional fields") { let data = try JSONEncoder().encode(weather); let restored = try JSONDecoder().decode(WidgetWeather.self, from: data); try require(restored.usable(for: city, at: now) && restored.high == nil) }
check("observation older than two hours is stale even after refetch") { var old = current; old["validTime"] = ISO8601DateFormatter().string(from: now.addingTimeInterval(-7201)); let value = try WidgetWeather.fromAPI(current: old, daily: nil, hourly: nil, city: city, now: now); try require(value.stale(at: now)) }
check("cached daily forecasts move to the new city-local day after midnight") {
    let start = WidgetWeather.date("2026-11-20T09:00:00+08:00")!
    let sample = WidgetWeather.preview(at: start)
    let days = sample.forecastDays(for: city, at: start.addingTimeInterval(86400))
    try require(days.count == 3 && days.first?.high == 27 && days.first?.low == 20)
}
check("opening the app cannot downgrade a newer widget observation") {
    let previous = WidgetWeather.preview(at: now)
    let older = WidgetWeather.preview(at: now.addingTimeInterval(-3600))
    let newer = WidgetWeather.preview(at: now.addingTimeInterval(60))
    try require(!older.shouldReplace(previous) && !previous.shouldReplace(previous) && newer.shouldReplace(previous))
}
check("independent widget decodes the app's configuration without an App Group") {
    let saved = WidgetCity.configured("MW1|JP1|%E6%9D%B1%E4%BA%AC%7C%E6%B8%AF|35.68|139.69|Asia%2FTokyo|F|dark|ja", catalog: [])
    try require(saved?.name == "東京|港" && saved?.unit == "F" && saved?.timeZone == "Asia/Tokyo" && saved?.theme == "dark")
    try require(WidgetCity.configured("MW1|JP1|Tokyo|100|139|Asia%2FTokyo|C|dark|ja", catalog: []) == nil)
}
check("city names resolve offline while ambiguous names require a specific code") {
    let row: [String: Any] = ["id":"101280601","name":"深圳","lat":22.55,"lon":114.06,"tz":"Asia/Shanghai"]
    try require(WidgetCity.configured("深圳市", catalog: [row])?.id == "101280601")
    try require(WidgetCity.configured("101280601", catalog: [row])?.name == "深圳")
    try require(WidgetCity.configured("深圳", catalog: [row, row]) == nil)
    try require(WidgetCity.configured(nil, catalog: [row]) == nil)
}
print("\(count) widget data tests passed")
