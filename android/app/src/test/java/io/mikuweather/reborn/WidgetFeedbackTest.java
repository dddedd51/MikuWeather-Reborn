package io.mikuweather.reborn;
import android.content.Context;
import org.json.JSONObject;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.RobolectricTestRunner;
import org.robolectric.RuntimeEnvironment;
import org.robolectric.annotation.Config;
import static org.junit.Assert.*;
@RunWith(RobolectricTestRunner.class)
@Config(sdk=35)
public class WidgetFeedbackTest {
    private JSONObject city(double lat) throws Exception{return new JSONObject().put("id","city").put("name","綦江").put("lat",lat).put("lon",106.7).put("tz","Asia/Shanghai");}
    @Test public void refreshReportsProgressAndCompletionWithoutOverwritingANewerAttempt() throws Exception {
        Context c=RuntimeEnvironment.getApplication();JSONObject city=city(29);
        assertTrue(WidgetRefreshFeedback.queue(c,city));assertEquals("等待刷新",WidgetRefreshFeedback.label(c,city));
        assertFalse(WidgetRefreshFeedback.queue(c,city));long first=WidgetRefreshFeedback.begin(c,city);assertEquals("正在更新",WidgetRefreshFeedback.label(c,city));
        WidgetRefreshFeedback.finish(c,city,first,"success");assertEquals("更新成功",WidgetRefreshFeedback.label(c,city));
        assertTrue(WidgetRefreshFeedback.queue(c,city));long next=WidgetRefreshFeedback.begin(c,city);
        WidgetRefreshFeedback.finish(c,city,first,"failed");assertEquals("正在更新",WidgetRefreshFeedback.label(c,city));
        WidgetRefreshFeedback.finish(c,city,next,"failed");assertEquals("更新失败",WidgetRefreshFeedback.label(c,city));
        WidgetRefreshFeedback.offline(c,city);assertEquals("没有网络",WidgetRefreshFeedback.label(c,city));
        assertEquals("",WidgetRefreshFeedback.label(c,city(30)));
        WidgetPreferences.language(c,"en");assertEquals("No network",WidgetRefreshFeedback.label(c,city));
    }
    @Test public void manualAppearanceOverridesSolarAndSystemModeFollowsSystem() throws Exception {
        Context c=RuntimeEnvironment.getApplication();SolarTheme.State day=new SolarTheme.State(false,true,null);
        for(String mode:new String[]{"dark","light","solar","system"}){
            WidgetPreferences.select(c,city(29),"C",mode);
            boolean night=SolarTheme.appearance(day,WidgetPreferences.theme(c),true).night;
            assertEquals(mode.equals("dark")||mode.equals("system"),night);
            assertEquals(night?0x193742:0xEFFAF7,WidgetPalette.of(night,65).start&0xFFFFFF);
        }
    }
}
