package io.mikuweather.reborn;

import org.junit.Test;
import static org.junit.Assert.*;

public class PixelWeatherIconsTest {
    @Test public void solarTimeOverridesOldCachedNightCodesAfterSunrise() {
        assertEquals("clear_day", PixelWeatherIcons.solarCondition(150, false));
        assertEquals("partly_cloudy_day", PixelWeatherIcons.solarCondition(151, false));
        assertEquals("clear_night", PixelWeatherIcons.solarCondition(100, true));
        assertEquals("sleet", PixelWeatherIcons.solarCondition(456, false));
    }
    @Test public void daylightFlagsAndExplicitNightCodesChooseMatchingIcons() {
        assertEquals("clear_day", PixelWeatherIcons.condition(100, false));
        assertEquals("clear_night", PixelWeatherIcons.condition(100, true));
        assertEquals("clear_night", PixelWeatherIcons.condition(150, false));
        assertEquals("partly_cloudy_night", PixelWeatherIcons.condition(151, false));
        assertEquals("partly_cloudy_day", PixelWeatherIcons.condition(103, false));
    }
    @Test public void hailAndMixedOrFreezingPrecipitationRetainTheirSupportedFamilies() {
        assertEquals("hail", PixelWeatherIcons.condition(304, false));
        assertEquals("thunderstorm", PixelWeatherIcons.condition(303, false));
        assertEquals("sleet", PixelWeatherIcons.condition(456, true));
        assertEquals("sleet", PixelWeatherIcons.condition(405, false));
        assertEquals("snow", PixelWeatherIcons.condition(407, false));
        assertEquals("rain", PixelWeatherIcons.condition(313, false));
        assertEquals("rain", PixelWeatherIcons.condition(351, true));
    }
    @Test public void fogAndHazeAreDistinctWhileUnsupportedDustUsesTextOnly() {
        assertEquals("fog", PixelWeatherIcons.condition(514, false));
        assertEquals("haze", PixelWeatherIcons.condition(511, false));
        assertEquals("wind", PixelWeatherIcons.condition(213, false));
        assertNull(PixelWeatherIcons.condition(503, false));
        assertNull(PixelWeatherIcons.condition(504, false));
        assertNull(PixelWeatherIcons.condition(507, false));
        assertNull(PixelWeatherIcons.condition(508, false));
        assertNull(PixelWeatherIcons.condition(999, false));
    }
}
