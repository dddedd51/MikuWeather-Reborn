// WidgetKit saves this configuration separately for each widget instance.
export function widgetCode(city, preferences) {
  return ['MW1', city.id, city.displayName || city.name, city.lat, city.lon, city.tz,
    preferences.unit, preferences.theme, preferences.language].map(encodeURIComponent).join('|');
}
