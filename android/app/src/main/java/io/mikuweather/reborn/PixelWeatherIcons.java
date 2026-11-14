package io.mikuweather.reborn;

/** Exact supported icon families. Unknown/sandstorm codes deliberately retain text only. */
final class PixelWeatherIcons {
    private PixelWeatherIcons() { }
    static String solarCondition(int code, boolean night) {
        if (code == 100 || code == 150) return night ? "clear_night" : "clear_day";
        if (code == 101 || code == 102 || code == 103 || code == 151 || code == 152 || code == 153)
            return night ? "partly_cloudy_night" : "partly_cloudy_day";
        return condition(code, night);
    }
    static String condition(int code, boolean night) {
        if (code == 100 || code == 150) return night || code == 150 ? "clear_night" : "clear_day";
        if (code == 101 || code == 102 || code == 103 || code == 151 || code == 152 || code == 153)
            return night || code >= 150 ? "partly_cloudy_night" : "partly_cloudy_day";
        if (code == 104) return "cloudy";
        if (code == 304) return "hail";
        if (code == 302 || code == 303) return "thunderstorm";
        if (code == 404 || code == 405 || code == 406 || code == 456) return "sleet";
        if (code == 400 || code == 401 || code == 402 || code == 403 || code == 407 || code == 408 || code == 409
                || code == 410 || code == 450 || code == 451 || code == 499) return "snow";
        if (code == 300 || code == 301 || (code >= 305 && code <= 318) || code == 350 || code == 351 || code == 399) return "rain";
        if (code == 500 || code == 501 || code == 509 || code == 510 || code == 514 || code == 515) return "fog";
        if (code == 502 || code == 511 || code == 512 || code == 513) return "haze";
        if (code >= 200 && code <= 213) return "wind";
        return null;
    }
}
