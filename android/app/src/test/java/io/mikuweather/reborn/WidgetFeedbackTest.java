package io.mikuweather.reborn;
import android.content.Context;
import org.json.JSONObject;
import org.junit.Test;
import org.junit.Before;
import org.junit.After;
import org.junit.runner.RunWith;
import org.robolectric.RobolectricTestRunner;
import org.robolectric.RuntimeEnvironment;
import org.robolectric.annotation.Config;
import org.robolectric.Shadows;
import android.os.Looper;
import android.content.Intent;
import java.time.Duration;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import static org.junit.Assert.*;
@RunWith(RobolectricTestRunner.class)
@Config(sdk=35)
public class WidgetFeedbackTest {
    @Before public void fixedClock(){WidgetRefreshFeedback.clock=Clock.fixed(Instant.parse("2026-11-16T00:00:00Z"),ZoneOffset.UTC);}
    @After public void restoreClock(){WidgetRefreshFeedback.clock=Clock.systemUTC();}
    private void advance(long millis){
        WidgetRefreshFeedback.clock=Clock.offset(WidgetRefreshFeedback.clock,Duration.ofMillis(millis));
        Shadows.shadowOf(Looper.getMainLooper()).idleFor(Duration.ofMillis(millis));
    }
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
    @Test public void successDisappearsAfterThreeSecondsWithoutAnotherRefresh() throws Exception {
        Context c=RuntimeEnvironment.getApplication();JSONObject city=city(29);
        WidgetRefreshFeedback.queue(c,city);long ticket=WidgetRefreshFeedback.begin(c,city);
        WidgetRefreshFeedback.finish(c,city,ticket,"success");
        assertEquals("更新成功",WidgetRefreshFeedback.label(c,city));
        Intent timer=Shadows.shadowOf(RuntimeEnvironment.getApplication()).getBroadcastIntents().stream()
            .filter(i->WidgetRefreshFeedback.DISMISS_SUCCESS.equals(i.getAction())).reduce((a,b)->b).orElseThrow();
        // Deliver finish()'s queued broadcast before advancing its deadline.
        Shadows.shadowOf(Looper.getMainLooper()).idle();
        advance(2999);
        assertEquals("更新成功",WidgetRefreshFeedback.label(c,city));
        advance(1);
        assertEquals("",WidgetRefreshFeedback.label(c,city));
        assertFalse(WidgetRefreshFeedback.clearSuccess(c,WidgetPreferences.key(city),ticket,timer.getLongExtra("shownAt",0)));
    }
    @Test public void olderDismissTimerCannotClearNewRefreshOrFailure() throws Exception {
        Context c=RuntimeEnvironment.getApplication();JSONObject city=city(29);
        WidgetRefreshFeedback.queue(c,city);long first=WidgetRefreshFeedback.begin(c,city);WidgetRefreshFeedback.finish(c,city,first,"success");
        Intent timer=Shadows.shadowOf(RuntimeEnvironment.getApplication()).getBroadcastIntents().stream()
            .filter(i->WidgetRefreshFeedback.DISMISS_SUCCESS.equals(i.getAction())).reduce((a,b)->b).orElseThrow();
        Shadows.shadowOf(Looper.getMainLooper()).idle();
        WidgetRefreshFeedback.queue(c,city);long next=WidgetRefreshFeedback.begin(c,city);
        WidgetRefreshFeedback.finish(c,city,next,"failed");
        advance(3000);
        assertEquals("更新失败",WidgetRefreshFeedback.label(c,city));
    }
}
