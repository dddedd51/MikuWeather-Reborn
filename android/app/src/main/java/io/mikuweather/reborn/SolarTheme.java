package io.mikuweather.reborn;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.List;

/** Selected-city solar boundaries, never the phone's timezone or a cached observation hour. */
final class SolarTheme {
    static final class Day {
        final LocalDate date;
        final String sunrise, sunset;
        Day(LocalDate date, String sunrise, String sunset) { this.date = date; this.sunrise = sunrise; this.sunset = sunset; }
    }
    static final class State {
        final boolean night, fromAstro;
        final Instant nextChange;
        State(boolean night, boolean fromAstro, Instant nextChange) {
            this.night = night; this.fromAstro = fromAstro; this.nextChange = nextChange;
        }
    }
    private static final class Pair {
        final Instant rise, set;
        Pair(Instant rise, Instant set) { this.rise = rise; this.set = set; }
    }
    static ZoneId zone(String value) {
        try { return ZoneId.of(value); }
        catch (Exception invalid) { return ZoneId.of("Asia/Shanghai"); }
    }
    static State appearance(State solar, String preference, boolean systemNight) {
        if ("light".equals(preference)) return new State(false, false, null);
        if ("dark".equals(preference)) return new State(true, false, null);
        if ("system".equals(preference)) return new State(systemNight, false, null);
        return solar;
    }
    static LocalDate date(String start, ZoneId zone) {
        try { return OffsetDateTime.parse(start).atZoneSameInstant(zone).toLocalDate(); }
        catch (Exception ignored) {
            try { return LocalDate.parse(start); } catch (Exception invalid) { return null; }
        }
    }
    private static Instant boundary(String value, LocalDate date, ZoneId zone) {
        if (value == null || value.isEmpty()) return null;
        try { return OffsetDateTime.parse(value).toInstant(); }
        catch (Exception ignored) {
            try { return date.atTime(LocalTime.parse(value)).atZone(zone).toInstant(); }
            catch (Exception invalid) { return null; }
        }
    }
    private static Pair pair(LocalDate target, ZoneId zone, List<Day> days) {
        if (days == null) return null;
        for (Day day : days) {
            if (day == null || !target.equals(day.date)) continue;
            Instant rise = boundary(day.sunrise, target, zone), set = boundary(day.sunset, target, zone);
            if (rise != null && set != null && rise.isBefore(set)
                    && rise.atZone(zone).toLocalDate().equals(target) && set.atZone(zone).toLocalDate().equals(target))
                return new Pair(rise, set);
        }
        return null;
    }
    static State evaluate(Instant now, ZoneId zone, List<Day> days) {
        LocalDate today = now.atZone(zone).toLocalDate();
        Pair todayPair = pair(today, zone, days);
        boolean fromAstro = todayPair != null;
        if (todayPair == null) todayPair = new Pair(today.atTime(6, 0).atZone(zone).toInstant(), today.atTime(18, 0).atZone(zone).toInstant());
        if (now.isBefore(todayPair.rise)) return new State(true, fromAstro, todayPair.rise);
        if (now.isBefore(todayPair.set)) return new State(false, fromAstro, todayPair.set);
        LocalDate tomorrow = today.plusDays(1);
        Pair tomorrowPair = pair(tomorrow, zone, days);
        return new State(true, fromAstro, tomorrowPair == null ? tomorrow.atTime(6, 0).atZone(zone).toInstant() : tomorrowPair.rise);
    }
    static boolean dailyNeeded(Instant now, ZoneId zone, long fetchedAt, List<Day> days) {
        LocalDate today = now.atZone(zone).toLocalDate();
        if (fetchedAt <= 0 || !Instant.ofEpochMilli(fetchedAt).atZone(zone).toLocalDate().equals(today)) return true;
        // A real daily forecast can omit astro (for example polar day/night).
        // Reuse that successful forecast and use the local 06/18 fallback.
        if (days != null) for (Day day : days) if (day != null && today.equals(day.date)) return false;
        return true;
    }
}
