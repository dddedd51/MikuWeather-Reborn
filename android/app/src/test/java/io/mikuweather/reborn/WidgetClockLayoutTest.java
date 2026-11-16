package io.mikuweather.reborn;
import org.junit.Test;
import static org.junit.Assert.*;
public class WidgetClockLayoutTest {
    @Test public void timeAndWeatherFitLauncherSizesAndLargeFonts(){
        for(int[] size:new int[][]{{120,100},{130,120},{170,170},{260,110},{320,180},{400,210}})
            for(float font:new float[]{1,1.3f,2}) {
                WidgetClockLayout plan=WidgetClockLayout.fit(size[0]<200,size[0],size[1],font);
                assertTrue("clock width",plan.clock*2.8f<=plan.rightWidth+.01f);
                assertTrue("vertical content",plan.contentHeight<=size[1]-plan.padding*2+.01f);
            }
    }
    @Test public void shortWidgetOmitsCityBeforeClippingTime(){
        assertFalse(WidgetClockLayout.fit(false,260,110,2).city);
        assertTrue(WidgetClockLayout.fit(false,320,180,1).city);
    }
}
