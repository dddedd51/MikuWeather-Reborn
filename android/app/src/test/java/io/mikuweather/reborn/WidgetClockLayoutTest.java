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
    @Test public void temperatureAndScaledTextFitIncludingExtremeFahrenheit(){
        for(int[] size:new int[][]{{120,100},{170,170},{260,110},{320,180},{400,210}})
            for(int scale:new int[]{100,110,140}) for(String value:new String[]{"14°","-112°","131°","—°"}) {
                WidgetClockLayout p=WidgetClockLayout.fit(size[0]<200,size[0],size[1],2,scale,value);
                assertTrue(p.temperature>0);
                assertTrue("time stays smaller than temperature",p.clock<=p.temperature*.56f);
                assertTrue(p.temperature*WidgetCardLayout.glyphWidth(value)<=p.rightWidth+.01f);
                assertTrue(p.contentHeight<=size[1]-p.padding*2+.01f);
            }
        WidgetClockLayout p=WidgetClockLayout.fit(false,320,180,1,110,"14°");
        assertTrue("temperature dominates weather text",p.temperature>p.weather*2);
    }
}
