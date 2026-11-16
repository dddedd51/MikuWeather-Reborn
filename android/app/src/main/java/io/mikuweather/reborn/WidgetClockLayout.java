package io.mikuweather.reborn;
/** Temperature has its own line and takes priority over optional city text. */
final class WidgetClockLayout {
    final float padding,clock,temperature,date,weather,meta,rightWidth,contentHeight;
    final boolean city;
    private WidgetClockLayout(float pad,float clock,float temperature,float date,float weather,float meta,float right,boolean city){
        this.padding=pad;this.clock=clock;this.temperature=temperature;this.date=date;this.weather=weather;this.meta=meta;this.rightWidth=right;this.city=city;
        contentHeight=clock*1.2f+temperature*1.2f+date*1.3f+weather*1.3f+(city?meta*1.3f:0)+6;
    }
    static WidgetClockLayout fit(boolean compact,int width,int height,float fontScale){return fit(compact,width,height,fontScale,110,"-112°");}
    static WidgetClockLayout fit(boolean compact,int width,int height,float fontScale,int textScale,String temp){
        float pad=4,h=Math.max(90,height)-pad*2,right=(Math.max(120,width)-pad*2)*.58f-4;
        float scale=Math.max(1,Math.min(1.3f,fontScale))*Math.max(1,Math.min(1.4f,textScale/100f));
        boolean city=height>=170&&width>=180;
        float date=Math.min(14*scale,right/10),weather=Math.min(16*scale,right/8),meta=Math.min(12*scale,right/10);
        float clock=Math.min(38*scale,right/2.8f),temperature=Math.min(48*scale,right/WidgetCardLayout.glyphWidth(temp));
        float extra=date*1.3f+weather*1.3f+(city?meta*1.3f:0)+6;
        float fit=Math.min(1,(h-extra)/((clock+temperature)*1.2f));
        return new WidgetClockLayout(pad,clock*fit,temperature*fit,date,weather,meta,right,city);
    }
}
