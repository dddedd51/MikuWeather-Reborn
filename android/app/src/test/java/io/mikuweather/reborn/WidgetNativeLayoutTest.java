package io.mikuweather.reborn;

import android.content.Context;
import android.app.Activity;
import android.content.res.Configuration;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Rect;
import android.view.View;
import android.view.ViewGroup;
import android.widget.FrameLayout;
import android.widget.RemoteViews;
import android.widget.TextView;
import android.widget.TextClock;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.RobolectricTestRunner;
import org.robolectric.RuntimeEnvironment;
import org.robolectric.Robolectric;
import org.robolectric.android.controller.ActivityController;
import org.robolectric.annotation.Config;
import org.robolectric.annotation.GraphicsMode;
import java.io.File;
import java.io.FileOutputStream;
import java.util.Locale;
import static org.junit.Assert.*;

@RunWith(RobolectricTestRunner.class)
@Config(sdk=35)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
public class WidgetNativeLayoutTest {
    private View render(int width,int height,int density,int scale,String language,String value,boolean night,int hostShrink){
        Context base=RuntimeEnvironment.getApplication();Configuration config=new Configuration(base.getResources().getConfiguration());
        config.setLocale(Locale.forLanguageTag(language));config.fontScale=2;config.densityDpi=density*160;
        Context context=base.createConfigurationContext(config);boolean compact=width<200;
        int id=compact?R.layout.widget_compact:R.layout.widget_weather;
        WidgetClockLayout plan=WidgetClockLayout.fit(compact,width,height,2,scale,value);
        WidgetPalette palette=WidgetPalette.of(night,65);
        RemoteViews remote=new RemoteViews(context.getPackageName(),id);
        String city="en".equals(language)?"Qijiang":"綦江";
        String date="en".equals(language)?"Nov 16 Mon":"11月16日 周一";
        WidgetTextLayout.apply(context,remote,id,width,height,plan,palette,value,date,"en".equals(language)?"Rain showers":"阵雨",city);
        remote.setImageViewBitmap(R.id.widget_backdrop,WidgetBackdrop.bitmap(palette,width-plan.padding*2,height-plan.padding*2));
        remote.setImageViewResource(R.id.widget_miku,night?R.drawable.miku_rain_night:R.drawable.miku_rain_day);
        remote.setTextViewText(R.id.widget_refresh_status,"更新成功");remote.setTextColor(R.id.widget_refresh_status,palette.text);
        remote.setViewVisibility(R.id.widget_refresh_status,View.VISIBLE);
        View root=remote.apply(context,new FrameLayout(context));
        root.findViewById(R.id.widget_clock).onVisibilityAggregated(true);
        ((TextView)root.findViewById(R.id.widget_clock)).setText("15:44");
        int w=Math.round(width*context.getResources().getDisplayMetrics().density),h=Math.round((height-hostShrink)*context.getResources().getDisplayMetrics().density);
        root.measure(View.MeasureSpec.makeMeasureSpec(w,View.MeasureSpec.EXACTLY),View.MeasureSpec.makeMeasureSpec(h,View.MeasureSpec.EXACTLY));root.layout(0,0,w,h);
        return root;
    }
    private void assertComplete(View root){
        for(int id:new int[]{R.id.widget_clock,R.id.widget_temperature,R.id.widget_date,R.id.widget_weather,R.id.widget_city,R.id.widget_refresh_status}){
            TextView row=root.findViewById(id);if(row.getVisibility()!=View.VISIBLE)continue;
            assertNotNull("native text layout",row.getLayout());
            int needed=row.getLayout().getHeight()+row.getCompoundPaddingTop()+row.getCompoundPaddingBottom();
            assertTrue("full line for "+row.getText()+": "+row.getHeight()+" < "+needed,row.getHeight()>=needed);
            Rect bounds=new Rect(0,0,row.getWidth(),row.getHeight());View child=row;
            while(child!=root&&child.getParent() instanceof ViewGroup){
                ViewGroup parent=(ViewGroup)child.getParent();bounds.offset(child.getLeft(),child.getTop());
                assertTrue("top visible for "+row.getText(),bounds.top>=parent.getPaddingTop());
                assertTrue("bottom visible for "+row.getText(),bounds.bottom<=parent.getHeight()-parent.getPaddingBottom());
                child=parent;
            }
        }
    }
    @Test public void nativeRowsStayCompleteWithChineseFontsAndMaximumTextSize(){
        for(int[] size:new int[][]{{120,100},{170,170},{260,110},{320,180},{360,190},{400,210}})
            for(int density:new int[]{1,3}) for(int scale:new int[]{110,140})
                for(String language:new String[]{"zh-CN","zh-TW","en","ja"}) for(String value:new String[]{"14°","-112°"})
                    assertComplete(render(size[0],size[1],density,scale,language,value,false,0));
    }
    @Test public void cityKeepsFullLineWhenLauncherProvidesSlightlyLessHeight() throws Exception {
        for(boolean night:new boolean[]{false,true}){
            View root=render(320,180,3,140,"zh-CN","14°",night,4);
            int width=root.getWidth(),height=root.getHeight();
            // TextClock intentionally does not draw until attached to a visible window.
            ActivityController<Activity> host=Robolectric.buildActivity(Activity.class).setup().visible();
            host.get().setContentView(root);
            TextClock clock=root.findViewById(R.id.widget_clock);clock.setFormat12Hour("'15:44'");clock.setFormat24Hour("'15:44'");
            root.measure(View.MeasureSpec.makeMeasureSpec(width,View.MeasureSpec.EXACTLY),View.MeasureSpec.makeMeasureSpec(height,View.MeasureSpec.EXACTLY));root.layout(0,0,width,height);
            assertComplete(root);assertEquals(View.VISIBLE,clock.getVisibility());assertEquals("15:44",clock.getText().toString());
            TextView city=root.findViewById(R.id.widget_city);assertEquals(View.VISIBLE,city.getVisibility());assertEquals("綦江",city.getText().toString());
            File folder=new File("build/reports/widget-layout");assertTrue(folder.isDirectory()||folder.mkdirs());
            Bitmap bitmap=Bitmap.createBitmap(root.getWidth(),root.getHeight(),Bitmap.Config.ARGB_8888);root.draw(new Canvas(bitmap));
            try(FileOutputStream out=new FileOutputStream(new File(folder,night?"native-night.png":"native-day.png"))){assertTrue(bitmap.compress(Bitmap.CompressFormat.PNG,100,out));}
            host.pause().stop().destroy();
        }
    }
}
