package io.mikuweather.reborn;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.graphics.Color;
final class WidgetBackdrop {
    static Bitmap bitmap(int opacity){
        Bitmap bitmap=Bitmap.createBitmap(160,100,Bitmap.Config.ARGB_8888);Canvas canvas=new Canvas(bitmap);Paint paint=new Paint(Paint.ANTI_ALIAS_FLAG);
        paint.setColor(Color.argb(Math.round(Math.max(0,Math.min(100,opacity))*2.55f),20,43,50));canvas.drawRoundRect(0,0,160,100,16,16,paint);return bitmap;
    }
}
