package io.mikuweather.reborn;

/** Quality gate before any fix reaches the local city matcher. */
final class LocationQuality {
    static boolean usable(double accuracy, long ageNanos) {
        return Double.isFinite(accuracy) && accuracy > 0 && accuracy <= 5000
            && ageNanos >= 0 && ageNanos <= 120_000_000_000L;
    }
    static boolean preferGps(boolean precisePermission, boolean gpsEnabled, long elapsedMillis) {
        return precisePermission && gpsEnabled && elapsedMillis < 8000;
    }
}
