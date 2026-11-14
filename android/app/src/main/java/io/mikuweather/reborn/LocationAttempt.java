package io.mikuweather.reborn;

/** Settles once and releases updates before delivering any outcome, including late fixes. */
final class LocationAttempt {
    interface Callback {
        void found(double latitude, double longitude);
        void failed(String code, String message);
    }
    private final Runnable cleanup;
    private final Callback callback;
    private boolean finished;
    LocationAttempt(Runnable cleanup, Callback callback) { this.cleanup = cleanup; this.callback = callback; }
    synchronized boolean isFinished() { return finished; }
    private synchronized boolean finish() {
        if (finished) return false;
        finished = true;
        cleanup.run();
        return true;
    }
    void accept(double latitude, double longitude) {
        final double lat, lon;
        try { lat = LocationCoordinates.latitude(latitude); lon = LocationCoordinates.longitude(longitude); }
        catch (IllegalArgumentException ignored) { fail("LOCATION_INVALID", "系统未返回有效位置，请重试或手动选择城市"); return; }
        if (finish()) callback.found(lat, lon);
    }
    void fail(String code, String message) { if (finish()) callback.failed(code, message); }
    void timeout() { fail("LOCATION_TIMEOUT", "定位超时，请检查系统定位和网络，或手动选择城市"); }
    void cancel() { fail("LOCATION_CANCELLED", "已取消定位"); }
}
