package io.mikuweather.reborn;

import org.junit.Test;
import static org.junit.Assert.*;
import java.util.concurrent.atomic.AtomicInteger;

public class ForegroundLocationTest {
    @Test public void preciseFixIsRoundedBeforeDeliveryAndReleasesUpdates() {
        AtomicInteger cleanup = new AtomicInteger(), success = new AtomicInteger();
        double[] delivered = new double[2];
        LocationAttempt attempt = new LocationAttempt(cleanup::incrementAndGet, new LocationAttempt.Callback() {
            @Override public void found(double lat, double lon) {
                assertEquals(1, cleanup.get()); delivered[0] = lat; delivered[1] = lon; success.incrementAndGet();
            }
            @Override public void failed(String code, String message) { fail(message); }
        });
        attempt.accept(22.554321, 114.068765);
        attempt.accept(23.678910, 115.012345);
        attempt.cancel();
        assertEquals(22.55, delivered[0], 0); assertEquals(114.07, delivered[1], 0);
        assertEquals(1, success.get()); assertEquals(1, cleanup.get());
    }
    @Test public void timeoutReleasesUpdatesAndRejectsLateFix() { verifyLateFix(false); }
    @Test public void lifecycleCancellationReleasesUpdatesAndRejectsLateFix() { verifyLateFix(true); }
    private void verifyLateFix(boolean cancel) {
        AtomicInteger cleanup = new AtomicInteger(), errors = new AtomicInteger();
        LocationAttempt attempt = new LocationAttempt(cleanup::incrementAndGet, new LocationAttempt.Callback() {
            @Override public void found(double lat, double lon) { fail("Late location should not escape cancellation"); }
            @Override public void failed(String code, String message) {
                assertEquals(1, cleanup.get());
                assertEquals(cancel ? "LOCATION_CANCELLED" : "LOCATION_TIMEOUT", code); errors.incrementAndGet();
            }
        });
        if (cancel) attempt.cancel(); else attempt.timeout();
        attempt.accept(22.553421, 114.068754);
        attempt.timeout(); attempt.cancel();
        assertEquals(1, errors.get()); assertEquals(1, cleanup.get());
    }
    @Test public void invalidSystemFixIsRejectedWithoutCoordinates() {
        AtomicInteger cleanup = new AtomicInteger(), errors = new AtomicInteger();
        LocationAttempt attempt = new LocationAttempt(cleanup::incrementAndGet, new LocationAttempt.Callback() {
            @Override public void found(double lat, double lon) { fail("Invalid coordinates returned"); }
            @Override public void failed(String code, String message) { assertEquals("LOCATION_INVALID", code); errors.incrementAndGet(); }
        });
        attempt.accept(Double.NaN, 114.05);
        assertEquals(1, cleanup.get()); assertEquals(1, errors.get());
        assertThrows(IllegalArgumentException.class, () -> LocationCoordinates.latitude(90.01));
        assertThrows(IllegalArgumentException.class, () -> LocationCoordinates.longitude(-180.01));
        assertThrows(IllegalArgumentException.class, () -> LocationCoordinates.longitude(Double.POSITIVE_INFINITY));
        assertEquals(90, LocationCoordinates.latitude(90), 0); assertEquals(-180, LocationCoordinates.longitude(-180), 0);
        assertEquals(Double.doubleToLongBits(0.0), Double.doubleToLongBits(LocationCoordinates.latitude(-0.0001)));
    }
}
