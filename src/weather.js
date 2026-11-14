export const CITIES = [
  { id: '101280601', name: '深圳', adm1: '广东', country: '中国', lat: 22.55, lon: 114.06, tz: 'Asia/Shanghai' },
  { id: '101010100', name: '北京', adm1: '北京', country: '中国', lat: 39.90, lon: 116.41, tz: 'Asia/Shanghai' },
  { id: '101020100', name: '上海', adm1: '上海', country: '中国', lat: 31.23, lon: 121.47, tz: 'Asia/Shanghai' },
  { id: '101210101', name: '杭州', adm1: '浙江', country: '中国', lat: 30.29, lon: 120.15, tz: 'Asia/Shanghai' },
  { id: '101270101', name: '成都', adm1: '四川', country: '中国', lat: 30.66, lon: 104.07, tz: 'Asia/Shanghai' },
  { id: '101280101', name: '广州', adm1: '广东', country: '中国', lat: 23.13, lon: 113.26, tz: 'Asia/Shanghai' },
  { id: '101280701', name: '珠海', adm1: '广东', country: '中国', lat: 22.27, lon: 113.58, tz: 'Asia/Shanghai' }
];
export const finite = n => typeof n === 'number' && Number.isFinite(n) ? n : null;
const value = obj => finite(obj?.value);
export function normalizeCurrent(data) {
  if (!data || !data.condition || value(data.temperature) === null || !Number.isFinite(Date.parse(data.validTime))) throw new Error('天气数据不完整');
  return { time: data.validTime, temp: value(data.temperature), feels: value(data.feelsLike), text: data.condition.text || '未知', code: String(data.condition.code || ''), humidity: finite(data.humidity) === null ? null : data.humidity * 100, wind: value(data.wind?.speed), windUnit: data.wind?.speed?.unit || 'm/s', windDir: data.wind?.direction?.compass, precip: value(data.precipitation?.amount), pressure: value(data.pressure), visibility: value(data.visibility) === null ? null : data.visibility.unit === 'm' ? data.visibility.value / 1000 : data.visibility.value, uv: finite(data.uvIndex) };
}
export function normalizeDaily(data) {
  if (!Array.isArray(data?.days) || data.days.length === 0) throw new Error('暂无逐日预报');
  return data.days.filter(d => Number.isFinite(Date.parse(d.forecastStartTime))).map(d => ({
    time: d.forecastStartTime, endTime: d.forecastEndTime, tempMax: value(d.temperatureMax), tempMin: value(d.temperatureMin),
    text: d.daytime?.condition?.text || '未知', code: String(d.daytime?.condition?.code || ''),
    nightText: d.nighttime?.condition?.text || '未知', nightCode: String(d.nighttime?.condition?.code || ''),
    pop: finite(d.daytime?.precipitation?.probability) === null ? null : d.daytime.precipitation.probability * 100,
    sunrise: d.astro?.sunrise, sunset: d.astro?.sunset, uv: finite(d.uvIndexMax)
  }));
}
export function normalizeHourly(data) {
  if (!Array.isArray(data?.hours) || data.hours.length === 0) throw new Error('暂无逐小时预报');
  return data.hours.filter(h => value(h.temperature) !== null && Number.isFinite(Date.parse(h.forecastTime))).map(h => ({ time: h.forecastTime, temp: value(h.temperature), text: h.condition?.text || '未知', code: String(h.condition?.code || ''), pop: finite(h.precipitation?.probability) === null ? null : h.precipitation.probability * 100 }));
}
export function solarArt(code, night = false) {
  const daytime = {150:100,151:101,152:102,153:103,350:300,351:301,450:400,451:407};
  return art(daytime[Number(code)] ?? code, night);
}
export function art(code, night = false) {
  const c = Number(code);
  if ([100, 150].includes(c)) return night || c === 150 ? '晴_夜' : '晴_日';
  if ([101, 102, 103, 151, 152, 153].includes(c)) return night || c >= 150 ? '多云_夜' : '多云_日';
  if ([302, 303, 304].includes(c)) return night ? '雷雨_夜' : '雷雨';
  if ([404, 405, 406, 456].includes(c)) return '雨雪';
  if (c >= 400 && c < 500) return [401, 402, 403, 410].includes(c) ? '大雪' : night ? '雪_夜' : '雪_日';
  if (c >= 300 && c < 400) return [307, 308, 310, 311, 312, 315, 316, 317, 318].includes(c) ? '大雨' : night || c >= 350 ? '雨_夜' : '雨_日';
  if (c >= 500 && c < 600) return '雾';
  return '阴';
}
export function weatherIcon(code) {
  const a = art(code);
  if (a.includes('雷')) return 'cloud-lightning';
  if (a.includes('雨雪')) return 'cloud-snow';
  if (a.includes('雨')) return 'cloud-rain';
  if (a.includes('雪')) return 'snowflake';
  if (a.includes('雾')) return 'cloud-fog';
  if (a.includes('晴')) return String(code) === '150' ? 'moon' : 'sun';
  if (a.includes('多云')) return 'cloud-sun';
  return 'cloud';
}
export function localDate(time, tz) { return new Intl.DateTimeFormat('sv-SE', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(time)); }
export function isNight(time, tz) { const hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', hourCycle: 'h23' }).format(new Date(time))); return hour < 6 || hour >= 18; }
export function demoWeather(city, now = Date.now()) {
  const base = city.id === '101010100' ? 12 : city.id === '101020100' ? 19 : 26;
  const midnight = new Date(new Date(now).toISOString().slice(0, 10) + 'T00:00:00+08:00').getTime();
  const daily = [0, 1, 2, 3, 4, 5, 6].map((_, i) => ({ time: new Date(midnight + i * 864e5).toISOString(), endTime: new Date(midnight + (i + 1) * 864e5).toISOString(), tempMax: base + [2, 1, 0, -2, -1, 2, 3][i], tempMin: base - [5, 4, 5, 6, 6, 5, 4][i], code: ['101','100','103','305','104','101','100'][i], text: ['多云','晴','多云','小雨','阴','多云','晴'][i], nightText: '多云', nightCode: '151', pop: [10, 0, 20, 80, 30, 10, 0][i], sunrise: new Date(midnight + i * 864e5 + 6.5 * 36e5).toISOString(), sunset: new Date(midnight + i * 864e5 + 17.8 * 36e5).toISOString(), uv: 3 }));
  return { demo: true, fetchedAt: now, current: { time: new Date(now).toISOString(), temp: base, feels: base - 1, text: '多云', code: '101', humidity: 64, wind: 2.4, windUnit: 'm/s', windDir: 'ne', precip: 0, pressure: 1016, visibility: 18, uv: 3 }, daily, hourly: Array.from({ length: 24 }, (_, i) => ({ time: new Date(now + i * 36e5).toISOString(), temp: base + Math.round(Math.sin(i / 4) * 3), text: '多云', code: i > 6 && i < 18 ? '151' : '101', pop: [10, 5, 10, 20][i % 4] })), attributions: [], partial: [] };
}
