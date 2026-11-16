package io.mikuweather.reborn;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.graphics.Color;
import android.graphics.LinearGradient;
import android.graphics.Shader;
final class WidgetBackdrop {
    static Bitmap bitmap(WidgetPalette palette,float width,float height){
        // Match the panel aspect ratio so wide widgets do not stretch the corners.
        float scale=Math.min(1,384/Math.max(1,Math.max(width,height)));
        int w=Math.max(1,Math.round(width*scale)),h=Math.max(1,Math.round(height*scale));
        float radius=Math.min(22,Math.min(width,height)/4)*scale;
        Bitmap bitmap=Bitmap.createBitmap(w,h,Bitmap.Config.ARGB_8888);Canvas canvas=new Canvas(bitmap);Paint paint=new Paint(Paint.ANTI_ALIAS_FLAG);
        paint.setShader(new LinearGradient(0,0,w,0,palette.start,palette.end,Shader.TileMode.CLAMP));
        canvas.drawRoundRect(0,0,w,h,radius,radius,paint);
        paint.setShader(null);paint.setStyle(Paint.Style.STROKE);paint.setStrokeWidth(scale);paint.setColor(palette.border);
        canvas.drawRoundRect(scale/2,scale/2,w-scale/2,h-scale/2,radius,radius,paint);return bitmap;
    }
}
