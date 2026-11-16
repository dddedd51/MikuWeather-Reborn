package io.mikuweather.reborn;

/** Original daytime mint / nighttime blue-green card, with adjustable opacity. */
final class WidgetPalette {
    final int start,end,border,text,muted;
    private WidgetPalette(int start,int end,int border,int text,int muted){
        this.start=start;this.end=end;this.border=border;this.text=text;this.muted=muted;
    }
    static WidgetPalette of(boolean night,int opacity){
        int alpha=Math.round(Math.max(0,Math.min(100,opacity))*255f/100);
        boolean darkText=!night&&opacity>=25;
        return new WidgetPalette(
            (alpha<<24)|(night?0x193742:0xEFFAF7),
            (alpha<<24)|(night?0x122A35:0xD6EEEB),
            (Math.round(alpha*(night?.2f:.4f))<<24)|(night?0x73BFB7:0xFFFFFF),
            darkText?0xFF244D47:0xFFFFFFFF,
            darkText?0xFF52746D:0xE6FFFFFF);
    }
}
