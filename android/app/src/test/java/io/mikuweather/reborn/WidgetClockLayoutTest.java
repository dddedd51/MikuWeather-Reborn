package io.mikuweather.reborn;
import org.junit.Test;
import static org.junit.Assert.*;
public class WidgetClockLayoutTest {
    @Test public void timeAndWeatherFitLauncherSizesAndLargeFonts(){
        for(int[] size:new int[][]{{120,100},{130,120},{170,170},{260,110},{320,180},{400,210}})
            for(float font:new float[]{1,1.3f,2}) {
                WidgetClockLayout plan=WidgetClockLayout.fit(size[0]<200,size[0],size[1],font);
                assertTrue("clock width",plan.clock*2.8f<=plan.rightWidth+.01f);
                assertTrue("vertical content stays inside panel insets",plan.contentHeight<=size[1]-2*(plan.padding+plan.insetY)+.01f);
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
                assertTrue(p.contentHeight<=size[1]-2*(p.padding+p.insetY)+.01f);
            }
        WidgetClockLayout p=WidgetClockLayout.fit(false,320,180,1,110,"14°");
        assertTrue("temperature dominates weather text",p.temperature>p.weather*2);
        for(int[] size:new int[][]{{120,100},{170,170},{260,110},{320,180},{400,210}}){
            float previous=0;
            for(int scale=100;scale<=140;scale+=10){
                float temperature=WidgetClockLayout.fit(false,size[0],size[1],1,scale,"14°").temperature;
                assertTrue("increasing the slider must not shrink temperature",temperature>=previous);
                previous=temperature;
            }
        }
    }
    @Test public void textHasRoomInsideRoundedPanelAtAllTextSizes(){
        for(int[] size:new int[][]{{120,100},{170,170},{320,180},{360,190},{400,210},{600,180}})
            for(int scale:new int[]{100,110,140}){
                WidgetClockLayout p=WidgetClockLayout.fit(size[0]<200,size[0],size[1],2,scale,"14°");
                assertTrue("right panel inset",p.insetX>=12);
                assertTrue("top and bottom panel inset",p.insetY>=10);
                float column=(size[0]-2*(p.padding+p.insetX))*.58f-4;
                assertTrue("temperature fits padded column",p.temperature*WidgetCardLayout.glyphWidth("14°")<=column);
                assertTrue("clock fits padded column",p.clock*2.8f<=column);
                assertTrue("group fits padded height",p.contentHeight<=size[1]-2*(p.padding+p.insetY));
            }
    }
}
