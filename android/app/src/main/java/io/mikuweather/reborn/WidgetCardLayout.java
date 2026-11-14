package io.mikuweather.reborn;

/** Fits a single card before displaying optional details; all sizes are effective dp. */
final class WidgetCardLayout {
    final float padding, temperature, normal, meta, city, icon, bodyHeight, leftWidth;
    final boolean clock, hint, feels, range;
    private WidgetCardLayout(float padding, float temperature, float normal, float meta, float city, float icon,
            float bodyHeight, float leftWidth, boolean clock, boolean hint, boolean feels, boolean range) {
        this.padding = padding; this.temperature = temperature; this.normal = normal; this.meta = meta;
        this.city = city; this.icon = icon; this.bodyHeight = bodyHeight; this.leftWidth = leftWidth;
        this.clock = clock; this.hint = hint; this.feels = feels; this.range = range;
    }
    static float glyphWidth(String temperature) {
        float width = 0;
        for (char c : temperature.toCharArray()) width += c == '°' ? .36f : c == '-' ? .38f : c == '—' ? .8f : .64f;
        return Math.max(width, .8f);
    }
    static WidgetCardLayout fit(boolean compact, int width, int height, float fontScale, String value, boolean hasFeels, boolean hasRange) {
        float w = Math.max(120, width), h = Math.max(100, height), scale = Math.max(1, Math.min(fontScale, 1.3f));
        float pad = h < 140 ? 6 : compact ? 8 : 10;
        float normal = Math.min(14, 12 * scale), meta = Math.min(12.5f, 11 * scale), city = Math.min(15, 13 * scale);
        float icon = compact ? 20 : 24;
        boolean clock = w >= 215, hint = h >= 140, feels = hasFeels && h >= 150, range = hasRange && h >= 150;
        float header = city * 1.22f, footer = 26, weather = Math.max(icon, normal * 1.24f);
        float left = (w - pad * 2) * .55f - 4;
        float desired = (compact ? 42 : 54) * Math.min(scale, 1.15f), size, body;
        while (true) {
            body = h - pad * 2 - header - footer - (hint ? meta * 1.24f + 2 : 0);
            float extra = (feels ? normal * 1.24f : 0) + (range ? meta * 1.24f : 0);
            size = Math.min(desired, Math.min((body - weather - extra) / 1.18f, left / glyphWidth(value)));
            if (size >= 27 || !range && !feels && !hint) break;
            if (range) range = false;
            else if (feels) feels = false;
            else hint = false;
        }
        size = Math.max(10, size);
        return new WidgetCardLayout(pad, size, normal, meta, city, icon, body, left, clock, hint, feels, range);
    }
}
