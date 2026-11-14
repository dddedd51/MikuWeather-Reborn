package io.mikuweather.reborn;

import org.junit.Test;
import static org.junit.Assert.*;

public class WidgetCardLayoutTest {
    private void assertFits(WidgetCardLayout layout, String value) {
        float used = layout.temperature * 1.18f + Math.max(layout.icon, layout.normal * 1.24f)
            + (layout.feels ? layout.normal * 1.24f : 0) + (layout.range ? layout.meta * 1.24f : 0);
        assertTrue("Main card content exceeds its body", used <= layout.bodyHeight + .01f);
        assertTrue("Temperature exceeds its column", layout.temperature * WidgetCardLayout.glyphWidth(value) <= layout.leftWidth + .01f);
    }
    @Test public void smallLauncherAndLargeFontsHideDetailsBeforeClipping() {
        WidgetCardLayout small = WidgetCardLayout.fit(false, 260, 110, 2, "26°", true, true);
        assertFalse(small.feels); assertFalse(small.range); assertFalse(small.hint);
        assertFits(small, "26°");
    }
    @Test public void narrowCompactAndLongNegativeFahrenheitStillFit() {
        WidgetCardLayout compact = WidgetCardLayout.fit(true, 130, 120, 1.8f, "-112°", true, true);
        assertFalse(compact.clock); assertFits(compact, "-112°");
    }
    @Test public void largerCardUsesAvailableSpaceForAllWeatherDetails() {
        WidgetCardLayout full = WidgetCardLayout.fit(false, 340, 210, 1, "26°", true, true);
        assertTrue(full.clock); assertTrue(full.feels); assertTrue(full.range); assertTrue(full.hint);
        assertTrue(full.temperature >= 40); assertFits(full, "26°");
    }
}
