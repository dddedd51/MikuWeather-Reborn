package io.mikuweather.reborn;

import android.content.Context;
import android.content.SharedPreferences;
import org.json.JSONObject;
import java.util.TimeZone;

final class WidgetPreferences {
    private static SharedPreferences prefs(Context context) {
        return context.getSharedPreferences("miku_widget", Context.MODE_PRIVATE);
    }
    static JSONObject city(Context context) {
        try { return new JSONObject(prefs(context).getString("city", "")); }
        catch (Exception ignored) {
            try {
                return new JSONObject().put("id", "101280601").put("name", "深圳").put("adm1", "广东")
                    .put("lat", 22.55).put("lon", 114.06).put("tz", "Asia/Shanghai");
            } catch (Exception impossible) { throw new IllegalStateException(impossible); }
        }
    }
    static void select(Context context, JSONObject city, String unit, String theme) throws Exception {
        if (city == null) throw new IllegalArgumentException("Missing city");
        double lat = city.getDouble("lat"), lon = city.getDouble("lon");
        QWeatherClient.buildPath("current", "", lat, lon);
        String name = city.getString("name").trim();
        if (name.isEmpty() || name.length() > 80) throw new IllegalArgumentException("Invalid city name");
        String tz = city.optString("tz", "Asia/Shanghai");
        boolean validZone = false;
        for (String known : TimeZone.getAvailableIDs()) if (known.equals(tz)) { validZone = true; break; }
        if (!validZone) tz = "Asia/Shanghai";
        JSONObject safe = new JSONObject().put("id", city.optString("id")).put("name", name).put("displayName", city.optString("displayName",name))
            .put("adm1", city.optString("adm1")).put("lat", lat).put("lon", lon).put("tz", tz);
        prefs(context).edit().putString("city", safe.toString())
            .putString("unit", "F".equalsIgnoreCase(unit) || "i".equalsIgnoreCase(unit) ? "F" : "C")
            .putString("theme", "light".equals(theme) || "dark".equals(theme) || "system".equals(theme) ? theme : "solar").apply();
    }
    static String language(Context context) { return prefs(context).getString("language", "zh-CN"); }
    static void language(Context context, String language) {
        String safe = "zh-TW".equals(language) || "en".equals(language) || "ja".equals(language) ? language : "zh-CN";
        prefs(context).edit().putString("language", safe).apply();
    }
    static void appearance(Context context, int opacity, int scale) {
        prefs(context).edit().putInt("opacity",Math.max(0,Math.min(100,opacity))).putInt("textScale",Math.max(100,Math.min(140,scale))).apply();
    }
    static int opacity(Context context) { return prefs(context).getInt("opacity",0); }
    static int textScale(Context context) { return prefs(context).getInt("textScale",110); }
    static String unit(Context context) { return prefs(context).getString("unit", "C"); }
    static String theme(Context context) { return prefs(context).getString("theme", "solar"); }
    static String key(JSONObject city) { return city.optDouble("lat") + "," + city.optDouble("lon"); }
    static void error(Context context, JSONObject city, String message) {
        prefs(context).edit().putString("error:" + key(city), message).apply();
    }
    static String error(Context context, JSONObject city) { return prefs(context).getString("error:" + key(city), ""); }
}
