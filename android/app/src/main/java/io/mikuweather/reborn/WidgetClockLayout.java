package io.mikuweather.reborn;
/** Temperature has its own line and takes priority over optional city text. */
final class WidgetClockLayout {
    final float padding,insetX,insetY,clock,temperature,date,weather,meta,rightWidth,contentHeight;
    final boolean city;
    private WidgetClockLayout(float pad,float insetX,float insetY,float clock,float temperature,float date,float weather,float meta,float right,boolean city){
        this.padding=pad;this.insetX=insetX;this.insetY=insetY;this.clock=clock;this.temperature=temperature;this.date=date;this.weather=weather;this.meta=meta;this.rightWidth=right;this.city=city;
        contentHeight=clock*1.2f+temperature*1.2f+date*1.3f+weather*1.3f+(city?meta*1.3f:0)+6;
    }
    static WidgetClockLayout fit(boolean compact,int width,int height,float fontScale){return fit(compact,width,height,fontScale,110,"-112°");}
    static WidgetClockLayout fit(boolean compact,int width,int height,float fontScale,int textScale,String temp){
        // The backdrop and content are siblings. Outer padding moves both, so only
        // padding on the content creates breathing room inside the rounded panel.
        float pad=4,insetX=width<200?12:18,insetY=height<140?10:14;
        float h=Math.max(90,height)-2*(pad+insetY)-2;
        float right=(Math.max(120,width)-2*(pad+insetX))*.58f-4-2;
        float scale=Math.max(1,Math.min(1.3f,fontScale))*Math.max(1,Math.min(1.4f,textScale/100f));
        boolean city=height>=170&&width>=180;
        float date=Math.min(14,right/10),weather=Math.min(16,right/8),meta=Math.min(12,right/10);
        float temperature=Math.min(54,right/WidgetCardLayout.glyphWidth(temp));
        float clock=Math.min(Math.min(22,right/2.8f),temperature*.55f);
        // Scale the entire fitted group together: larger preferences must never shrink temperature.
        float lines=(clock+temperature)*1.2f+(date+weather+(city?meta:0))*1.3f;
        float fit=Math.min(scale,Math.min((h-6)/lines,Math.min(right/(temperature*WidgetCardLayout.glyphWidth(temp)),right/(clock*2.8f))));
        return new WidgetClockLayout(pad,insetX,insetY,clock*fit,temperature*fit,date*fit,weather*fit,meta*fit,right,city);
    }
}
