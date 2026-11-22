#if DEBUG
import SwiftUI
import WidgetKit

struct WidgetPreview: View {
    let family: WidgetFamily
    let language: String
    let theme: String
    var body: some View {
        let base = WidgetCity.preview
        let city = WidgetCity(id: base.id, name: language == "en" ? "Shenzhen" : language == "ja" ? "深圳市" : "深圳", latitude: base.latitude, longitude: base.longitude, timeZone: base.timeZone, unit: "C", theme: theme, language: language)
        let entry = MikuWeatherEntry(date: Date(), city: city, weather: .preview(), offline: false, preview: true)
        let size: CGSize = family == .systemSmall ? CGSize(width: 170, height: 170) : family == .systemMedium ? CGSize(width: 350, height: 170) : CGSize(width: 350, height: 365)
        return ZStack {
            Color(red: 0.94, green: 0.95, blue: 0.96).ignoresSafeArea()
            MikuWeatherWidgetView(entry: entry, previewFamily: family).padding(16)
                .frame(width: size.width, height: size.height).background(theme == "dark" ? Color(red: 0.08, green: 0.20, blue: 0.23) : Color(red: 0.80, green: 0.95, blue: 0.90))
                .clipShape(RoundedRectangle(cornerRadius: 22)).shadow(color: .black.opacity(0.12), radius: 18, y: 8)
        }
    }
}
#endif
