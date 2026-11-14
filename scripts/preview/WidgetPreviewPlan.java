package io.mikuweather.reborn;

import java.util.Locale;

/** Exports the actual native card sizing plan for the non-device design preview. */
public final class WidgetPreviewPlan {
    public static void main(String[] args) {
        boolean compact = Boolean.parseBoolean(args[0]);
        int width = Integer.parseInt(args[1]), height = Integer.parseInt(args[2]);
        float fontScale = Float.parseFloat(args[3]);
        WidgetCardLayout p = WidgetCardLayout.fit(compact, width, height, fontScale, args[4], true, true);
        System.out.printf(Locale.ROOT,
            "{\"padding\":%.3f,\"temperature\":%.3f,\"normal\":%.3f,\"meta\":%.3f,\"city\":%.3f,\"icon\":%.3f,\"bodyHeight\":%.3f,\"leftWidth\":%.3f,\"clock\":%s,\"hint\":%s,\"feels\":%s,\"range\":%s}%n",
            p.padding, p.temperature, p.normal, p.meta, p.city, p.icon, p.bodyHeight, p.leftWidth, p.clock, p.hint, p.feels, p.range);
    }
}
