package io.mikuweather.reborn;
import org.junit.Test;
import static org.junit.Assert.*;
public class LocationQualityTest {
    @Test public void gpsGetsPriorityOnlyWithPrecisePermissionAndAnEnabledProvider(){
        assertTrue(LocationQuality.preferGps(true,true,7999));
        assertFalse(LocationQuality.preferGps(true,true,8000));
        assertFalse(LocationQuality.preferGps(false,true,0));
        assertFalse(LocationQuality.preferGps(true,false,0));
    }
    @Test public void staleAndInaccurateFixesCannotReachCitySuggestions(){
        assertTrue(LocationQuality.usable(25,0));
        assertTrue(LocationQuality.usable(5000,120_000_000_000L));
        assertFalse(LocationQuality.usable(5001,0));
        assertFalse(LocationQuality.usable(25,120_000_000_001L));
        assertFalse(LocationQuality.usable(25,-1));
        assertFalse(LocationQuality.usable(Double.NaN,0));
        assertFalse(LocationQuality.usable(0,0));
    }
}
