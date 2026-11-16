package io.mikuweather.reborn;
import org.junit.Test;
import static org.junit.Assert.*;
public class WidgetPaletteTest {
    @Test public void solarCardsRetainOriginalColorsAndOpacity(){
        WidgetPalette day=WidgetPalette.of(false,65),night=WidgetPalette.of(true,65);
        assertEquals(0xEFFAF7,day.start&0xFFFFFF);assertEquals(0xD6EEEB,day.end&0xFFFFFF);
        assertEquals(0x193742,night.start&0xFFFFFF);assertEquals(0x122A35,night.end&0xFFFFFF);
        assertEquals(166,day.start>>>24);assertEquals(day.start>>>24,night.start>>>24);
        assertEquals(0xFF244D47,day.text);assertEquals(0xFFFFFFFF,night.text);
    }
    @Test public void fullyTransparentPanelKeepsTextAndMikuVisible(){
        for(boolean night:new boolean[]{false,true}){
            WidgetPalette clear=WidgetPalette.of(night,0),opaque=WidgetPalette.of(night,100);
            assertEquals(0,clear.start>>>24);assertEquals(0,clear.end>>>24);assertEquals(0,clear.border>>>24);
            assertEquals(255,clear.text>>>24);assertEquals(255,opaque.start>>>24);
            assertEquals(0,WidgetPalette.of(night,-10).start>>>24);assertEquals(255,WidgetPalette.of(night,150).end>>>24);
        }
    }
}
