package io.mikuweather.reborn;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.os.Bundle;
import android.util.TypedValue;
import android.view.View;
import android.widget.RemoteViews;

public class MikuWeatherWidget extends AppWidgetProvider {
    static final String REFRESH = "io.mikuweather.reborn.WIDGET_REFRESH";
    private static final Class<?>[] PROVIDERS = { MikuWeatherWidget.class, MikuCompactWidget.class };

    static int widgetCount(Context context) {
        int count = 0;
        for (Class<?> provider : PROVIDERS)
            count += AppWidgetManager.getInstance(context).getAppWidgetIds(new ComponentName(context, provider)).length;
        return count;
    }
    static void updateAll(Context context) {
        if(android.os.Looper.myLooper()!=android.os.Looper.getMainLooper()){
            new android.os.Handler(android.os.Looper.getMainLooper()).post(()->updateAll(context.getApplicationContext()));return;
        }
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        WidgetCardData data = WidgetCardData.load(context);
        for (Class<?> provider : PROVIDERS) {
            for (int id : manager.getAppWidgetIds(new ComponentName(context, provider)))
                render(context, manager, id, provider == MikuCompactWidget.class, data);
        }
        WidgetSolarScheduler.schedule(context, data.solar.nextChange);
    }
    private static void render(Context context, AppWidgetManager manager, int id, boolean compactProvider, WidgetCardData data) {
        Bundle options = manager.getAppWidgetOptions(id);
        // Provider identity determines the style; a 4×2 widget never silently turns into 2×2.
        int layoutId=compactProvider ? R.layout.widget_compact : R.layout.widget_weather;
        RemoteViews views = new RemoteViews(context.getPackageName(),layoutId);
        int width = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, compactProvider ? 170 : 320);
        int height = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, compactProvider ? 170 : 180);
        if (width <= 0) width = compactProvider ? 170 : 320;
        if (height <= 0) height = compactProvider ? 170 : 180;
        WidgetClockLayout layout = WidgetClockLayout.fit(compactProvider, width, height, context.getResources().getConfiguration().fontScale,WidgetPreferences.textScale(context),data.temperature);
        WidgetPalette palette=WidgetPalette.of(data.appearance.night,WidgetPreferences.opacity(context));
        views.setImageViewBitmap(R.id.widget_backdrop,WidgetBackdrop.bitmap(palette,width-2*layout.padding,height-2*layout.padding));
        // A native TextClock continues ticking without an app process or periodic network requests.
        views.setString(R.id.widget_clock, "setTimeZone", java.util.TimeZone.getDefault().getID());
        java.util.Locale locale = java.util.Locale.forLanguageTag(WidgetPreferences.language(context));
        String datePattern = "en".equals(locale.getLanguage()) ? "MMM d EEE" : "M月d日 EEE";
        String date = java.time.format.DateTimeFormatter.ofPattern(datePattern, locale).format(java.time.ZonedDateTime.now());
        String condition = data.hasWeather ? UiText.t(context, data.condition) : UiText.word(context,"waiting");
        WidgetTextLayout.apply(context,views,layoutId,width,height,layout,palette,data.temperature,date,condition,
            data.name + (data.cached ? " · " + UiText.word(context,"cached") : ""));
        String feedback=WidgetRefreshFeedback.label(context,data.city);
        views.setTextViewText(R.id.widget_refresh_status,feedback);
        views.setTextColor(R.id.widget_refresh_status,palette.text);
        views.setViewVisibility(R.id.widget_refresh_status,feedback.isEmpty()?View.GONE:View.VISIBLE);
        views.setImageViewResource(R.id.widget_miku, drawable(WeatherValues.solarArt(data.code, data.solar.night)));
        views.setContentDescription(R.id.widget_root, data.name + ", " + condition + ", " + date + ". " + UiText.word(context,"open"));
        views.setContentDescription(R.id.widget_miku, UiText.word(context,"refresh"));
        Intent open = new Intent(context, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent launch = PendingIntent.getActivity(context, 0, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.widget_root, launch);
        Intent refresh = new Intent(context, compactProviderClass(compactProvider)).setAction(REFRESH);
        PendingIntent refreshIntent = PendingIntent.getBroadcast(context, id, refresh, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.widget_miku, refreshIntent);
        views.setOnClickPendingIntent(R.id.widget_refresh, refreshIntent);
        views.setContentDescription(R.id.widget_refresh, UiText.word(context,"refresh"));
        manager.updateAppWidget(id, views);
    }
    private static Class<?> compactProviderClass(boolean compact) { return compact ? MikuCompactWidget.class : MikuWeatherWidget.class; }
    private static int pixelDrawable(String condition) {
        switch (condition) {
            case "clear_day": return R.drawable.weather_clear_day_pixel;
            case "clear_night": return R.drawable.weather_clear_night_pixel;
            case "partly_cloudy_day": return R.drawable.weather_partly_cloudy_day_pixel;
            case "partly_cloudy_night": return R.drawable.weather_partly_cloudy_night_pixel;
            case "cloudy": return R.drawable.weather_cloudy_pixel;
            case "hail": return R.drawable.weather_hail_pixel;
            case "thunderstorm": return R.drawable.weather_thunderstorm_pixel;
            case "sleet": return R.drawable.weather_sleet_pixel;
            case "snow": return R.drawable.weather_snow_pixel;
            case "rain": return R.drawable.weather_rain_pixel;
            case "fog": return R.drawable.weather_fog_pixel;
            case "haze": return R.drawable.weather_haze_pixel;
            case "wind": return R.drawable.weather_wind_pixel;
            default: return 0;
        }
    }
    private static int drawable(String art) {
        switch (art) {
            case "clear_day": return R.drawable.miku_clear_day;
            case "clear_night": return R.drawable.miku_clear_night;
            case "cloudy_day": return R.drawable.miku_cloudy_day;
            case "cloudy_night": return R.drawable.miku_cloudy_night;
            case "thunder": return R.drawable.miku_thunder;
            case "thunder_night": return R.drawable.miku_thunder_night;
            case "sleet": return R.drawable.miku_sleet;
            case "snow_day": return R.drawable.miku_snow_day;
            case "snow_night": return R.drawable.miku_snow_night;
            case "heavy_snow": return R.drawable.miku_heavy_snow;
            case "rain_day": return R.drawable.miku_rain_day;
            case "rain_night": return R.drawable.miku_rain_night;
            case "heavy_rain": return R.drawable.miku_heavy_rain;
            case "fog": return R.drawable.miku_fog;
            default: return R.drawable.miku_overcast;
        }
    }
    @Override public void onUpdate(Context context, AppWidgetManager manager, int[] ids) {
        updateAll(context); WidgetUpdateService.schedule(context, true);
    }
    @Override public void onAppWidgetOptionsChanged(Context context, AppWidgetManager manager, int id, Bundle options) {
        render(context, manager, id, this instanceof MikuCompactWidget, WidgetCardData.load(context));
    }
    @Override public void onEnabled(Context context) { WidgetUpdateService.schedule(context, true); }
    @Override public void onDisabled(Context context) { WidgetUpdateService.schedule(context, false); updateAll(context); }
    @Override public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        if (REFRESH.equals(intent.getAction())) {
            org.json.JSONObject city=WidgetPreferences.city(context);
            if(!WidgetRefreshFeedback.online(context))WidgetRefreshFeedback.offline(context,city);
            else if(WidgetRefreshFeedback.queue(context,city)&&!WidgetUpdateService.schedule(context,true)){
                long ticket=WidgetRefreshFeedback.begin(context,city);WidgetRefreshFeedback.finish(context,city,ticket,"retry");
            }
            updateAll(context);
        }
        if (WidgetSolarScheduler.REDRAW.equals(intent.getAction()) || Intent.ACTION_TIME_CHANGED.equals(intent.getAction())
                || Intent.ACTION_DATE_CHANGED.equals(intent.getAction()) || Intent.ACTION_TIMEZONE_CHANGED.equals(intent.getAction()) || Intent.ACTION_BOOT_COMPLETED.equals(intent.getAction())
                || Intent.ACTION_CONFIGURATION_CHANGED.equals(intent.getAction())) {
            updateAll(context);
            if (Intent.ACTION_BOOT_COMPLETED.equals(intent.getAction())) WidgetUpdateService.schedule(context, true);
        }
    }
}
