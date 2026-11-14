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
        RemoteViews views = new RemoteViews(context.getPackageName(), compactProvider ? R.layout.widget_compact : R.layout.widget_weather);
        int width = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, compactProvider ? 170 : 320);
        int height = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, compactProvider ? 170 : 180);
        if (width <= 0) width = compactProvider ? 170 : 320;
        if (height <= 0) height = compactProvider ? 170 : 180;
        WidgetCardLayout layout = WidgetCardLayout.fit(compactProvider, width, height, context.getResources().getConfiguration().fontScale,
            data.temperature, data.hasFeels, data.hasRange);
        int primary = Color.parseColor(data.appearance.night ? "#F2F8F9" : "#163A40");
        int secondary = Color.parseColor(data.appearance.night ? "#B4CDD2" : "#4A747A");
        int accent = Color.parseColor(data.appearance.night ? "#88E3D5" : "#087F7E");
        views.setInt(R.id.widget_card, "setBackgroundResource", data.appearance.night ? R.drawable.widget_card_dark : R.drawable.widget_card_light);
        int padding = Math.round(layout.padding * context.getResources().getDisplayMetrics().density);
        views.setViewPadding(R.id.widget_card, padding, padding, padding, padding);
        views.setTextViewText(R.id.widget_city, data.name + " · °" + data.unit);
        views.setString(R.id.widget_clock, "setTimeZone", data.zone.getId());
        views.setTextViewText(R.id.widget_temp, data.temperature);
        views.setTextViewText(R.id.widget_weather, data.condition);
        views.setTextViewText(R.id.widget_feels, data.feels);
        views.setTextViewText(R.id.widget_range, data.range);
        views.setTextViewText(R.id.widget_hint, data.hint);
        String source = width < 210 ? "和风天气" : "数据来自和风天气";
        if (!layout.hint && data.cached) source += " · 缓存";
        views.setTextViewText(R.id.widget_source, source);
        views.setViewVisibility(R.id.widget_clock, layout.clock ? View.VISIBLE : View.GONE);
        views.setViewVisibility(R.id.widget_feels, layout.feels ? View.VISIBLE : View.GONE);
        views.setViewVisibility(R.id.widget_range, layout.range ? View.VISIBLE : View.GONE);
        views.setViewVisibility(R.id.widget_hint, layout.hint ? View.VISIBLE : View.GONE);
        text(views, R.id.widget_city, layout.city, primary);
        text(views, R.id.widget_clock, layout.meta, secondary);
        text(views, R.id.widget_temp, layout.temperature, primary);
        text(views, R.id.widget_weather, layout.normal, primary);
        text(views, R.id.widget_feels, layout.normal, secondary);
        text(views, R.id.widget_range, layout.meta, secondary);
        text(views, R.id.widget_hint, layout.meta, secondary);
        text(views, R.id.widget_source, layout.meta, secondary);
        text(views, R.id.widget_refresh, 20, accent);
        int drawable = drawable(WeatherValues.solarArt(data.code, data.solar.night));
        String pixel = data.hasWeather ? PixelWeatherIcons.solarCondition(data.code, data.solar.night) : null;
        int pixelResource = pixel == null ? 0 : pixelDrawable(pixel);
        views.setViewVisibility(R.id.widget_icon, pixelResource == 0 ? View.GONE : View.VISIBLE);
        if (pixelResource != 0) views.setImageViewResource(R.id.widget_icon, pixelResource);
        views.setImageViewResource(R.id.widget_miku, drawable);
        views.setContentDescription(R.id.widget_root, data.name + "，" + data.temperature + data.unit + "，" + data.condition + "，"
            + (data.cached ? "缓存观测 " : "观测 ") + data.observed + "。数据来自和风天气。点击查看天气");
        Intent open = new Intent(context, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent launch = PendingIntent.getActivity(context, 0, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.widget_root, launch);
        Intent refresh = new Intent(context, compactProviderClass(compactProvider)).setAction(REFRESH);
        PendingIntent refreshIntent = PendingIntent.getBroadcast(context, id, refresh, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.widget_refresh, refreshIntent);
        manager.updateAppWidget(id, views);
    }
    private static void text(RemoteViews views, int id, float size, int color) {
        views.setTextViewTextSize(id, TypedValue.COMPLEX_UNIT_DIP, size);
        views.setTextColor(id, color);
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
        if (REFRESH.equals(intent.getAction())) { updateAll(context); WidgetUpdateService.schedule(context, true); }
        if (WidgetSolarScheduler.REDRAW.equals(intent.getAction()) || Intent.ACTION_TIME_CHANGED.equals(intent.getAction())
                || Intent.ACTION_TIMEZONE_CHANGED.equals(intent.getAction()) || Intent.ACTION_BOOT_COMPLETED.equals(intent.getAction())
                || Intent.ACTION_CONFIGURATION_CHANGED.equals(intent.getAction())) {
            updateAll(context);
            if (Intent.ACTION_BOOT_COMPLETED.equals(intent.getAction())) WidgetUpdateService.schedule(context, true);
        }
    }
}
