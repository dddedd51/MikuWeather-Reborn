package io.mikuweather.reborn;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.graphics.Color;
final class WidgetBackdrop {
    static Bitmap bitmap(int opacity,float width,float height){
        // Match the panel aspect ratio so wide widgets do not stretch the corners.
        float scale=Math.min(1,384/Math.max(1,Math.max(width,height)));
        int w=Math.max(1,Math.round(width*scale)),h=Math.max(1,Math.round(height*scale));
        float radius=Math.min(22,Math.min(width,height)/4)*scale;
        Bitmap bitmap=Bitmap.createBitmap(w,h,Bitmap.Config.ARGB_8888);Canvas canvas=new Canvas(bitmap);Paint paint=new Paint(Paint.ANTI_ALIAS_FLAG);
        paint.setColor(Color.argb(Math.round(Math.max(0,Math.min(100,opacity))*2.55f),20,43,50));canvas.drawRoundRect(0,0,w,h,radius,radius,paint);return bitmap;
    }
}
