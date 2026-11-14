package io.mikuweather.reborn;

import android.content.Context;
import android.content.res.Configuration;
import org.json.JSONArray;
import org.json.JSONObject;
import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

final class WidgetCardData {
    final JSONObject city;
    final ZoneId zone;
    final SolarTheme.State solar, appearance;
    final boolean hasWeather, hasFeels, hasRange, cached;
    final int code;
    final String name, unit, temperature, condition, feels, range, hint, observed;
    private WidgetCardData(JSONObject city, ZoneId zone, SolarTheme.State solar, SolarTheme.State appearance, boolean hasWeather, boolean hasFeels,
            boolean hasRange, boolean cached, int code, String name, String unit, String temperature, String condition,
            String feels, String range, String hint, String observed) {
        this.city = city; this.zone = zone; this.solar = solar; this.appearance = appearance; this.hasWeather = hasWeather; this.hasFeels = hasFeels;
        this.hasRange = hasRange; this.cached = cached; this.code = code; this.name = name; this.unit = unit;
        this.temperature = temperature; this.condition = condition; this.feels = feels; this.range = range; this.hint = hint; this.observed = observed;
    }
    static List<SolarTheme.Day> days(QWeatherClient.CachedWeather forecast, ZoneId zone) {
        List<SolarTheme.Day> result = new ArrayList<>();
        JSONArray days = forecast == null ? null : forecast.data.optJSONArray("days");
        if (days == null) return result;
        for (int i = 0; i < days.length(); i++) {
            JSONObject day = days.optJSONObject(i);
            if (day == null) continue;
            JSONObject astro = day.optJSONObject("astro");
            LocalDate date = SolarTheme.date(day.optString("forecastStartTime"), zone);
            if (date != null) result.add(new SolarTheme.Day(date, astro == null ? "" : astro.optString("sunrise"), astro == null ? "" : astro.optString("sunset")));
        }
        return result;
    }
    private static double value(JSONObject parent, String key) {
        JSONObject object = parent == null ? null : parent.optJSONObject(key);
        return object == null ? Double.NaN : object.optDouble("value", Double.NaN);
    }
    static WidgetCardData load(Context context) {
        JSONObject city = WidgetPreferences.city(context);
        ZoneId zone = SolarTheme.zone(city.optString("tz", "Asia/Shanghai"));
        Instant now = Instant.now();
        String name = city.optString("name", "深圳"), unit = WidgetPreferences.unit(context);
        QWeatherClient client = QWeatherClient.get(context);
        QWeatherClient.CachedWeather current = client.cached("current", "", city.optDouble("lat"), city.optDouble("lon"));
        QWeatherClient.CachedWeather daily = client.cached("daily", "", city.optDouble("lat"), city.optDouble("lon"));
        SolarTheme.State solar = SolarTheme.evaluate(now, zone, days(daily, zone));
        SolarTheme.State appearance = SolarTheme.appearance(solar, WidgetPreferences.theme(context),
            (context.getResources().getConfiguration().uiMode & Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES);
        JSONObject raw = current == null ? null : current.data, condition = raw == null ? null : raw.optJSONObject("condition");
        double temp = value(raw, "temperature"), feels = value(raw, "feelsLike"), high = Double.NaN, low = Double.NaN;
        JSONArray list = daily == null ? null : daily.data.optJSONArray("days");
        LocalDate today = now.atZone(zone).toLocalDate();
        if (list != null) for (int i = 0; i < list.length(); i++) {
            JSONObject day = list.optJSONObject(i);
            if (day != null && today.equals(SolarTheme.date(day.optString("forecastStartTime"), zone))) {
                high = value(day, "temperatureMax"); low = value(day, "temperatureMin"); break;
            }
        }
        boolean hasWeather = condition != null && Double.isFinite(temp), hasFeels = Double.isFinite(feels), hasRange = Double.isFinite(high) && Double.isFinite(low);
        int code = condition == null ? 104 : condition.optInt("code", 104);
        String error = WidgetPreferences.error(context, city), observed = "";
        boolean cached = current != null && (current.expires < now.toEpochMilli() || !error.isEmpty());
        if (current != null) {
            Instant observation;
            try { observation = OffsetDateTime.parse(raw.optString("validTime")).toInstant(); }
            catch (Exception ignored) { observation = Instant.ofEpochMilli(current.fetchedAt); }
            observed = DateTimeFormatter.ofPattern("HH:mm").withZone(zone).format(observation);
        }
        String hint = !hasWeather ? error.isEmpty() ? "点一下刷新，初音陪你等天气" : error
            : cached ? (error.isEmpty() ? "缓存天气 · " : "更新失败，保留缓存 · ") + observed
            : code >= 300 && code < 400 ? "出门记得带伞呀" : code >= 400 && code < 500 ? "注意保暖，路上慢一点"
            : code >= 500 && code < 600 ? "出门记得做好防护" : "今天也要元气满满呀";
        return new WidgetCardData(city, zone, solar, appearance, hasWeather, hasFeels, hasRange, cached, code, name, unit,
            WeatherValues.degrees(temp, unit), condition == null ? "等待天气更新" : condition.optString("text", "未知"),
            "体感 " + WeatherValues.temperature(feels, unit), "↑ " + WeatherValues.degrees(high, unit) + "   ↓ " + WeatherValues.degrees(low, unit), hint, observed);
    }
}
