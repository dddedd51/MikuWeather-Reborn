package io.mikuweather.reborn;

import android.app.job.JobInfo;
import android.app.job.JobParameters;
import android.app.job.JobScheduler;
import android.app.job.JobService;
import android.content.ComponentName;
import android.content.Context;
import org.json.JSONObject;
import java.time.Instant;
import java.time.ZoneId;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

/** The launcher stays responsive: widget receivers only render cache and schedule work. */
public class WidgetUpdateService extends JobService {
    private static final int PERIODIC = 39001, IMMEDIATE = 39002;
    private final ExecutorService executor = Executors.newFixedThreadPool(2);
    private static final class RunningJob { volatile boolean stopped; Future<?> future; JSONObject city;long ticket; }
    private final ConcurrentHashMap<Integer, RunningJob> running = new ConcurrentHashMap<>();

    static boolean schedule(Context context, boolean immediate) {
        JobScheduler scheduler = (JobScheduler) context.getSystemService(Context.JOB_SCHEDULER_SERVICE);
        if (scheduler == null) return false;
        if (MikuWeatherWidget.widgetCount(context) == 0) {
            scheduler.cancel(PERIODIC); scheduler.cancel(IMMEDIATE); return false;
        }
        ComponentName service = new ComponentName(context, WidgetUpdateService.class);
        if (scheduler.getPendingJob(PERIODIC) == null)
            scheduler.schedule(new JobInfo.Builder(PERIODIC, service)
                .setRequiredNetworkType(JobInfo.NETWORK_TYPE_ANY).setPeriodic(30 * 60 * 1000L, 10 * 60 * 1000L)
                .setPersisted(true).build());
        if (immediate) return scheduler.schedule(new JobInfo.Builder(IMMEDIATE, service)
            .setRequiredNetworkType(JobInfo.NETWORK_TYPE_ANY).setMinimumLatency(0).setOverrideDeadline(5000).build())==JobScheduler.RESULT_SUCCESS;
        return true;
    }
    @Override public boolean onStartJob(JobParameters params) {
        if (MikuWeatherWidget.widgetCount(this) == 0) { schedule(this, false); return false; }
        RunningJob work = new RunningJob();
        work.city=WidgetPreferences.city(this);work.ticket=WidgetRefreshFeedback.begin(this,work.city);
        if(work.ticket!=0)MikuWeatherWidget.updateAll(this);
        running.put(params.getJobId(), work);
        work.future = executor.submit(() -> {
            JSONObject city = work.city;
            String feedback="success";
            try {
                QWeatherClient client = QWeatherClient.get(this);
                client.request("current", "", city.optDouble("lat"), city.optDouble("lon"),work.ticket!=0);
                WidgetPreferences.error(this, city, "");
                ZoneId zone = SolarTheme.zone(city.optString("tz", "Asia/Shanghai"));
                QWeatherClient.CachedWeather daily = client.cached("daily", "", city.optDouble("lat"), city.optDouble("lon"));
                // Daily high/low and solar data refresh at most once per city-local day.
                if (SolarTheme.dailyNeeded(Instant.now(), zone, daily == null ? 0 : daily.fetchedAt, WidgetCardData.days(daily, zone))) {
                    try { client.request("daily", "", city.optDouble("lat"), city.optDouble("lon")); }
                    catch (Exception ignored) { /* Current weather remains valid; solar falls back to local 06/18. */ }
                }
            } catch (QWeatherClient.WeatherException e) { WidgetPreferences.error(this, city, e.getMessage());feedback=WidgetRefreshFeedback.online(this)?"failed":"offline"; }
            catch (Exception e) { WidgetPreferences.error(this, city, "网络连接失败");feedback=WidgetRefreshFeedback.online(this)?"failed":"offline"; }
            if (!work.stopped && !Thread.currentThread().isInterrupted()) {
                WidgetRefreshFeedback.finish(this,city,work.ticket,feedback);
                MikuWeatherWidget.updateAll(this);
                jobFinished(params, false);
            }
            running.remove(params.getJobId(), work);
        });
        return true;
    }
    @Override public boolean onStopJob(JobParameters params) {
        RunningJob work = running.remove(params.getJobId());
        if (work != null) {
            work.stopped = true; if (work.future != null) work.future.cancel(true);
            WidgetRefreshFeedback.finish(this,work.city,work.ticket,WidgetRefreshFeedback.online(this)?"retry":"offline");MikuWeatherWidget.updateAll(this);
        }
        return MikuWeatherWidget.widgetCount(this) > 0;
    }
    @Override public void onDestroy() {
        for (RunningJob work : running.values()) work.stopped = true;
        executor.shutdownNow(); super.onDestroy();
    }
}
