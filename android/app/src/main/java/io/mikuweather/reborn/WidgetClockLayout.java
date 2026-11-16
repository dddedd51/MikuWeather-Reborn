package io.mikuweather.reborn;

/** Keep a five-character time inside the right column at supported launcher sizes. */
final class WidgetClockLayout {
    final float padding, clock, date, weather, meta, rightWidth, contentHeight;
    final boolean city;
    private WidgetClockLayout(float padding, float clock, float date, float weather, float meta, float rightWidth, boolean city) {
        this.padding=padding; this.clock=clock; this.date=date; this.weather=weather; this.meta=meta;
        this.rightWidth=rightWidth; this.city=city;
        this.contentHeight=clock*1.25f+date*1.3f+weather*2.5f+(city?meta*1.3f+3:0)+10;
    }
    static WidgetClockLayout fit(boolean compact,int width,int height,float fontScale) {
        float padding=4, availableH=Math.max(90,height)-padding*2;
        float right=(Math.max(120,width)-padding*2)*.56f-4;
        float scale=Math.max(1,Math.min(1.3f,fontScale));
        float date=Math.min(13*scale,right/10),weather=Math.min(14*scale,right/8),meta=Math.min(10*scale,right/10);
        boolean city=height>=150&&width>=160;
        float extra=date*1.3f+weather*2.5f+(city?meta*1.3f+3:0)+10;
        float clock=Math.max(12,Math.min(compact?38:64,Math.min(right/2.8f,(availableH-extra)/1.25f)));
        return new WidgetClockLayout(padding,clock,date,weather,meta,right,city);
    }
}
