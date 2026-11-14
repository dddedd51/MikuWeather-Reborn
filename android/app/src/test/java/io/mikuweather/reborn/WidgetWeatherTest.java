package io.mikuweather.reborn;

import org.junit.Test;
import static org.junit.Assert.*;

public class WidgetWeatherTest {
    @Test public void solarTimeChangesCharacterEvenWhenObservationStillHasNightCode() {
        assertEquals("clear_day", WeatherValues.solarArt(150, false));
        assertEquals("cloudy_day", WeatherValues.solarArt(151, false));
        assertEquals("rain_day", WeatherValues.solarArt(351, false));
        assertEquals("clear_night", WeatherValues.solarArt(100, true));
    }
    @Test public void coordinatesDetermineWeatherCacheIdentity() throws Exception {
        String shenzhen = QWeatherClient.buildPath("current", "", 22.55, 114.06);
        String beijing = QWeatherClient.buildPath("current", "", 39.9, 116.41);
        assertEquals("/weather/v1/current/22.55/114.06?lang=zh&localTime=true", shenzhen);
        assertNotEquals(shenzhen, beijing);
        assertTrue(QWeatherClient.buildPath("daily", "", 22.55, 114.06).endsWith("&days=7"));
    }
    @Test public void rejectsInvalidCoordinatesAndUnrestrictedPaths() {
        for (Double lat : new Double[] { null, Double.NaN, Double.POSITIVE_INFINITY, -91.0, 91.0 }) {
            assertThrows(QWeatherClient.WeatherException.class, () -> QWeatherClient.buildPath("current", "", lat, 0.0));
        }
        assertThrows(QWeatherClient.WeatherException.class, () -> QWeatherClient.buildPath("current", "", 0.0, 181.0));
        assertThrows(QWeatherClient.WeatherException.class, () -> QWeatherClient.buildPath("https://example.com", "", 0.0, 0.0));
        assertThrows(QWeatherClient.WeatherException.class, () -> QWeatherClient.buildPath("lookup", "  ", null, null));
    }
    @Test public void missingTemperaturesNeverBecomeZero() {
        assertEquals("—", WeatherValues.temperature(Double.NaN, "C"));
        assertEquals("—", WeatherValues.temperature(Double.POSITIVE_INFINITY, "F"));
        assertEquals("32°F", WeatherValues.temperature(0, "F"));
        assertEquals("-40°F", WeatherValues.temperature(-40, "F"));
        assertEquals("26°C", WeatherValues.temperature(25.7, "C"));
    }
    @Test public void nighttimeAndMixedPrecipitationUseMatchingCharacterArt() {
        assertEquals("clear_night", WeatherValues.art(150, false));
        assertEquals("clear_night", WeatherValues.art(100, true));
        assertEquals("cloudy_night", WeatherValues.art(151, false));
        assertEquals("sleet", WeatherValues.art(456, true));
        assertEquals("heavy_snow", WeatherValues.art(403, false));
        assertEquals("thunder_night", WeatherValues.art(302, true));
        assertEquals("overcast", WeatherValues.art(999, false));
    }
}
