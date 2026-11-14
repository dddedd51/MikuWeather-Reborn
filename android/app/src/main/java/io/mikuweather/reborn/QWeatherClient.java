package io.mikuweather.reborn;

import android.content.Context;
import android.content.SharedPreferences;
import org.json.JSONObject;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.URL;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.FutureTask;
import java.util.concurrent.ExecutionException;
import java.util.zip.GZIPInputStream;
import javax.net.ssl.HttpsURLConnection;

/** One authenticated client and disk cache shared by the app and native widgets. */
public final class QWeatherClient {
    private static QWeatherClient instance;
    private final SharedPreferences cache;
    private final JSONObject config;
    private final Map<String, FutureTask<JSONObject>> inFlight = new ConcurrentHashMap<>();
    private String token = "";
    private long tokenExpires;

    public static final class WeatherException extends Exception {
        public final String code;
        WeatherException(String code, String message) { super(message); this.code = code; }
    }
    public static final class CachedWeather {
        public final JSONObject data;
        public final long fetchedAt, expires;
        CachedWeather(JSONObject data, long fetchedAt, long expires) {
            this.data = data; this.fetchedAt = fetchedAt; this.expires = expires;
        }
    }
    private QWeatherClient(Context context) {
        cache = context.getSharedPreferences("qweather_cache", Context.MODE_PRIVATE);
        JSONObject loaded;
        try { loaded = new JSONObject(read(context.getAssets().open("service.json"))); }
        catch (Exception ignored) {
            try { loaded = new JSONObject(read(context.getAssets().open("private.json"))); }
            catch (Exception absent) { loaded = null; }
        }
        config = loaded;
    }
    public static synchronized QWeatherClient get(Context context) {
        if (instance == null) instance = new QWeatherClient(context.getApplicationContext());
        return instance;
    }
    private static String read(InputStream input) throws Exception {
        try (InputStream in = input; ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            byte[] buffer = new byte[8192]; int count;
            while ((count = in.read(buffer)) != -1) {
                out.write(buffer, 0, count);
                if (out.size() > 4 * 1024 * 1024) throw new Exception("Response too large");
            }
            return new String(out.toByteArray(), StandardCharsets.UTF_8);
        }
    }
    private synchronized String authorization() throws Exception {
        if (System.currentTimeMillis() >= tokenExpires) {
            token = JwtSigner.createToken(config.getString("privateKey"), config.getString("kid"),
                config.getString("iss"), config.getString("sub"), System.currentTimeMillis() / 1000);
            tokenExpires = System.currentTimeMillis() + 12 * 60 * 1000;
        }
        return "Bearer " + token;
    }
    public static String buildPath(String kind, String query, Double lat, Double lon) throws Exception {
        if ("lookup".equals(kind)) {
            String search = query == null ? "" : query.trim();
            if (search.isEmpty() || search.length() > 80) throw new WeatherException("INPUT", "请输入城市名称");
            return "/geo/v2/city/lookup?lang=zh&number=12&location=" + URLEncoder.encode(search, "UTF-8");
        }
        if (!"current".equals(kind) && !"daily".equals(kind) && !"hourly".equals(kind))
            throw new WeatherException("INPUT", "未知天气请求");
        if (lat == null || lon == null || !Double.isFinite(lat) || !Double.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180)
            throw new WeatherException("INPUT", "城市坐标无效");
        return String.format(Locale.US, "/weather/v1/%s/%.2f/%.2f?lang=zh&localTime=true", kind, lat, lon)
            + ("daily".equals(kind) ? "&days=7" : "hourly".equals(kind) ? "&hours=24" : "");
    }
    private String cacheKey(String path) { return "response:" + path; }
    public CachedWeather cached(String kind, String query, Double lat, Double lon) {
        try {
            String saved = cache.getString(cacheKey(buildPath(kind, query, lat, lon)), null);
            if (saved == null) return null;
            JSONObject item = new JSONObject(saved);
            return new CachedWeather(item.getJSONObject("data"), item.getLong("fetchedAt"), item.getLong("expires"));
        } catch (Exception ignored) { return null; }
    }
    public JSONObject request(String kind, String query, Double lat, Double lon) throws Exception {
        String path = buildPath(kind, query, lat, lon);
        CachedWeather saved = cached(kind, query, lat, lon);
        if (saved != null && saved.expires > System.currentTimeMillis()) return saved.data;
        FutureTask<JSONObject> newTask = new FutureTask<>(() -> fetch(kind, path));
        FutureTask<JSONObject> task = inFlight.putIfAbsent(path, newTask);
        if (task == null) { task = newTask; task.run(); }
        try { return task.get(); }
        catch (ExecutionException e) {
            if (e.getCause() instanceof Exception) throw (Exception) e.getCause();
            throw new Exception("Weather request failed");
        } finally { if (task.isDone()) inFlight.remove(path, task); }
    }
    private JSONObject fetch(String kind, String path) throws Exception {
        if (config == null) throw new WeatherException("NOT_CONFIGURED", "天气服务暂时无法获取实时数据");
        String proxy = config.optString("proxyUrl");
        String base;
        if (!proxy.isEmpty()) base = ServiceEndpoint.proxyBase(proxy);
        else {
            String host = config.optString("host");
            if (!host.matches("(?i)(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\\.)+qweatherapi\\.com"))
                throw new WeatherException("CONFIG", "天气服务配置有误");
            base = "https://" + host;
        }
        HttpsURLConnection connection = (HttpsURLConnection) new URL(base + path).openConnection();
        connection.setConnectTimeout(15000); connection.setReadTimeout(15000); connection.setInstanceFollowRedirects(false);
        if (proxy.isEmpty()) connection.setRequestProperty("Authorization", authorization());
        connection.setRequestProperty("Accept", "application/json");
        connection.setRequestProperty("Accept-Encoding", "gzip");
        try {
            int status = connection.getResponseCode();
            if (status != 200) {
                if (status == 401) { synchronized (this) { tokenExpires = 0; } }
                String message = status == 401 ? "天气服务认证失败" : status == 402 ? "天气服务额度不足"
                    : status == 403 ? "天气接口未开通或访问受限" : status == 404 ? "没有找到该地点的天气"
                    : status == 429 ? "天气服务繁忙，请稍后再试" : "天气服务暂时不可用";
                throw new WeatherException(String.valueOf(status), message);
            }
            InputStream stream = connection.getInputStream();
            if ("gzip".equalsIgnoreCase(connection.getContentEncoding())) stream = new GZIPInputStream(stream);
            JSONObject data = new JSONObject(read(stream));
            if (data.has("code") && !"200".equals(data.optString("code")))
                throw new WeatherException(data.optString("code"), "暂时没有天气数据");
            if ("current".equals(kind) && (data.optJSONObject("condition") == null
                    || data.optJSONObject("temperature") == null
                    || !Double.isFinite(data.getJSONObject("temperature").optDouble("value", Double.NaN))
                    || data.optString("validTime").isEmpty()))
                throw new WeatherException("DATA", "天气数据不完整");
            if ("current".equals(kind)) {
                try { OffsetDateTime.parse(data.getString("validTime")); }
                catch (Exception e) { throw new WeatherException("DATA", "天气观测时间无效"); }
            }
            int minutes = "current".equals(kind) ? 5 : "lookup".equals(kind) ? 60 : 30;
            long now = System.currentTimeMillis();
            JSONObject item = new JSONObject().put("data", data).put("fetchedAt", now).put("expires", now + minutes * 60 * 1000);
            synchronized (cache) {
                SharedPreferences.Editor edit = cache.edit();
                if (cache.getAll().size() >= 64) {
                    String oldest = null; long oldestTime = Long.MAX_VALUE;
                    for (Map.Entry<String, ?> entry : cache.getAll().entrySet()) {
                        try {
                            long time = new JSONObject(String.valueOf(entry.getValue())).optLong("fetchedAt");
                            if (time < oldestTime) { oldestTime = time; oldest = entry.getKey(); }
                        } catch (Exception ignored) { oldest = entry.getKey(); break; }
                    }
                    if (oldest != null) edit.remove(oldest);
                }
                edit.putString(cacheKey(path), item.toString()).apply();
            }
            return data;
        } finally { connection.disconnect(); }
    }
}
