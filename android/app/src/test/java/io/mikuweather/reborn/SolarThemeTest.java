package io.mikuweather.reborn;

import org.junit.Test;
import static org.junit.Assert.*;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

public class SolarThemeTest {
    private final ZoneId zone = ZoneId.of("Asia/Shanghai");
    private List<SolarTheme.Day> forecast() {
        return Arrays.asList(new SolarTheme.Day(LocalDate.of(2026, 11, 14), "2026-11-14T06:31+08:00", "2026-11-14T17:24+08:00"),
            new SolarTheme.Day(LocalDate.of(2026, 11, 15), "2026-11-15T06:32+08:00", "2026-11-15T17:23+08:00"));
    }
    @Test public void sunriseIsLightAndSunsetIsDarkIncludingExactBoundaries() {
        assertTrue(SolarTheme.evaluate(Instant.parse("2026-11-13T22:30:59Z"), zone, forecast()).night);
        assertFalse(SolarTheme.evaluate(Instant.parse("2026-11-13T22:31:00Z"), zone, forecast()).night);
        assertFalse(SolarTheme.evaluate(Instant.parse("2026-11-14T09:23:59Z"), zone, forecast()).night);
        SolarTheme.State sunset = SolarTheme.evaluate(Instant.parse("2026-11-14T09:24:00Z"), zone, forecast());
        assertTrue(sunset.night); assertTrue(sunset.fromAstro);
        assertEquals(Instant.parse("2026-11-14T22:32:00Z"), sunset.nextChange);
    }
    @Test public void matchesSelectedCityDateAcrossUtcMidnight() {
        assertEquals(LocalDate.of(2026, 11, 14), SolarTheme.date("2026-11-13T16:00:00Z", zone));
        SolarTheme.State morning = SolarTheme.evaluate(Instant.parse("2026-11-13T23:00:00Z"), zone, forecast());
        assertFalse(morning.night); assertTrue(morning.fromAstro);
        assertEquals(Instant.parse("2026-11-14T09:24:00Z"), morning.nextChange);
    }
    @Test public void missingOrWrongDateAstroFallsBackToLocalSixAndEighteen() {
        List<SolarTheme.Day> wrong = Collections.singletonList(new SolarTheme.Day(LocalDate.of(2026, 11, 14),
            "2026-11-13T06:31+08:00", "2026-11-13T17:24+08:00"));
        SolarTheme.State state = SolarTheme.evaluate(Instant.parse("2026-11-13T22:00:00Z"), zone, wrong);
        assertFalse(state.night); assertFalse(state.fromAstro);
        assertEquals(Instant.parse("2026-11-14T10:00:00Z"), state.nextChange);
        assertTrue(SolarTheme.evaluate(Instant.parse("2026-11-14T10:00:00Z"), zone, null).night);
    }
    @Test public void localClockBoundariesAndReversedSolarTimesAreHandled() {
        List<SolarTheme.Day> local = Collections.singletonList(new SolarTheme.Day(LocalDate.of(2026, 11, 14), "07:12", "16:48"));
        assertTrue(SolarTheme.evaluate(Instant.parse("2026-11-13T23:00:00Z"), zone, local).night);
        assertFalse(SolarTheme.evaluate(Instant.parse("2026-11-13T23:12:00Z"), zone, local).night);
        List<SolarTheme.Day> reversed = Collections.singletonList(new SolarTheme.Day(LocalDate.of(2026, 11, 14), "18:00", "06:00"));
        assertFalse(SolarTheme.evaluate(Instant.parse("2026-11-13T23:12:00Z"), zone, reversed).fromAstro);
    }
    @Test public void sameDayDailyCacheIsReusedAndNextCityDayRefreshes() {
        long fetched = Instant.parse("2026-11-13T23:00:00Z").toEpochMilli();
        assertFalse(SolarTheme.dailyNeeded(Instant.parse("2026-11-14T09:00:00Z"), zone, fetched, forecast()));
        assertTrue(SolarTheme.dailyNeeded(Instant.parse("2026-11-14T17:00:00Z"), zone, fetched, forecast()));
        assertTrue(SolarTheme.dailyNeeded(Instant.parse("2026-11-14T09:00:00Z"), zone, fetched, null));
        List<SolarTheme.Day> noAstro = Collections.singletonList(new SolarTheme.Day(LocalDate.of(2026, 11, 14), "", ""));
        assertFalse(SolarTheme.dailyNeeded(Instant.parse("2026-11-14T09:00:00Z"), zone, fetched, noAstro));
        assertFalse(SolarTheme.evaluate(Instant.parse("2026-11-14T09:00:00Z"), zone, noAstro).fromAstro);
    }
    @Test public void explicitAndSystemPreferencesOverrideSolarAndInvalidZoneIsSafe() {
        SolarTheme.State solar = SolarTheme.evaluate(Instant.parse("2026-11-14T09:00:00Z"), zone, forecast());
        assertSame(solar, SolarTheme.appearance(solar, "solar", true));
        assertFalse(SolarTheme.appearance(solar, "light", true).night);
        assertTrue(SolarTheme.appearance(solar, "dark", false).night);
        assertFalse("Manual dark appearance must not turn daytime artwork into night", solar.night);
        assertTrue(SolarTheme.appearance(solar, "system", true).night);
        assertFalse(SolarTheme.appearance(solar, "system", false).night);
        assertNull(SolarTheme.appearance(solar, "dark", false).nextChange);
        assertEquals(zone, SolarTheme.zone("corrupt/timezone"));
    }
}
