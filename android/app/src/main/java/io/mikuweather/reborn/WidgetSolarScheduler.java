package io.mikuweather.reborn;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import java.time.Instant;

/** Local solar repaint only. Inexact, non-wakeup alarm needs no exact-alarm permission. */
final class WidgetSolarScheduler {
    static final String REDRAW = "io.mikuweather.reborn.WIDGET_SOLAR_REDRAW";
    static void schedule(Context context, Instant boundary) {
        AlarmManager manager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (manager == null) return;
        PendingIntent action = PendingIntent.getBroadcast(context, 39003,
            new Intent(context, MikuWeatherWidget.class).setAction(REDRAW), PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        manager.cancel(action);
        Instant midnight = java.time.LocalDate.now().plusDays(1).atStartOfDay(java.time.ZoneId.systemDefault()).toInstant();
        if (boundary == null || midnight.isBefore(boundary)) boundary = midnight;
        if (boundary != null && MikuWeatherWidget.widgetCount(context) > 0)
            manager.set(AlarmManager.RTC, Math.max(System.currentTimeMillis() + 1000, boundary.toEpochMilli()), action);
    }
}
