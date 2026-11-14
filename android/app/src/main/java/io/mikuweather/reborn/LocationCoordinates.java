package io.mikuweather.reborn;

/** Transient coordinates only: no persistence, tracing or logging. */
final class LocationCoordinates {
    private LocationCoordinates() { }
    static double latitude(double value) { return rounded(value, 90); }
    static double longitude(double value) { return rounded(value, 180); }
    private static double rounded(double value, double bound) {
        if (!Double.isFinite(value) || Math.abs(value) > bound) throw new IllegalArgumentException("Invalid location");
        double result = Math.round(value * 100) / 100.0;
        return result == 0 ? 0 : result;
    }
}
