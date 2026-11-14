package io.mikuweather.reborn;

final class WeatherValues {
    private WeatherValues() {}
    static String temperature(double value, String unit) {
        if (!Double.isFinite(value)) return "—";
        return Math.round("F".equals(unit) ? value * 9 / 5 + 32 : value) + "°" + unit;
    }
    static String degrees(double value, String unit) {
        if (!Double.isFinite(value)) return "—";
        return Math.round("F".equals(unit) ? value * 9 / 5 + 32 : value) + "°";
    }
    static String solarArt(int code, boolean night) {
        if (code == 100 || code == 150) return night ? "clear_night" : "clear_day";
        if (code == 101 || code == 102 || code == 103 || code == 151 || code == 152 || code == 153)
            return night ? "cloudy_night" : "cloudy_day";
        if (code == 350 || code == 351) return night ? "rain_night" : "rain_day";
        if (code == 450 || code == 451) return night ? "snow_night" : "snow_day";
        return art(code, night);
    }
    static String art(int code, boolean night) {
        if (code == 100 || code == 150) return night || code == 150 ? "clear_night" : "clear_day";
        if (code == 101 || code == 102 || code == 103 || code == 151 || code == 152 || code == 153)
            return night || code >= 150 ? "cloudy_night" : "cloudy_day";
        if (code == 302 || code == 303 || code == 304) return night ? "thunder_night" : "thunder";
        if (code == 404 || code == 405 || code == 406 || code == 456) return "sleet";
        if (code >= 400 && code < 500)
            return code == 401 || code == 402 || code == 403 || code == 410 ? "heavy_snow" : night ? "snow_night" : "snow_day";
        if (code >= 300 && code < 400) {
            if (code == 307 || code == 308 || code == 310 || code == 311 || code == 312 || (code >= 315 && code <= 318)) return "heavy_rain";
            return night || code >= 350 ? "rain_night" : "rain_day";
        }
        if (code >= 500 && code < 600) return "fog";
        return "overcast";
    }
}
