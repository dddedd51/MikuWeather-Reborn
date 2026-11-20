package io.mikuweather.reborn;

import android.content.Context;
import org.json.JSONObject;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;
import javax.net.ssl.HttpsURLConnection;

/** An explicit, foreground-only lookup through the public proxy; no location permission or disk cache. */
public final class TencentIpLocation {
    interface Connections { HttpsURLConnection open(URL url) throws Exception; }
    public static final class IpException extends Exception {
        public final String code;
        IpException(String code, String message) { super(message); this.code = code; }
    }
    private final Context context;
    private final String configuredOrigin;
    private final Connections connections;
    private HttpsURLConnection active;
    private boolean started, cancelled, timedOut;
    private static final int MAX_BYTES = 32768;

    public TencentIpLocation(Context context) {
        this.context = context.getApplicationContext();
        this.configuredOrigin = null;
        this.connections = url -> (HttpsURLConnection) url.openConnection();
    }
    TencentIpLocation(String origin, Connections connections) {
        this.context = null; this.configuredOrigin = origin; this.connections = connections;
    }
    static String endpoint(String origin) throws IpException {
        try { return ServiceEndpoint.proxyBase(origin) + "/ip"; }
        catch (Exception ignored) { throw new IpException("IP_CONFIG", "腾讯 IP 定位尚未配置"); }
    }
    private String origin() throws IpException {
        if (configuredOrigin != null) return configuredOrigin;
        try (InputStream input = context.getAssets().open("service.json")) {
            return new JSONObject(read(input)).getString("proxyUrl");
        } catch (Exception ignored) { throw new IpException("IP_CONFIG", "腾讯 IP 定位尚未配置"); }
    }
    public synchronized void cancel() { cancelled = true; if (active != null) active.disconnect(); }
    synchronized void expire() { timedOut = true; cancelled = true; if (active != null) active.disconnect(); }
    private synchronized void checkCancelled() throws IpException {
        if (cancelled) throw new IpException(timedOut ? "IP_TIMEOUT" : "IP_CANCELLED",
            timedOut ? "IP 定位超时，请稍后重试或手动选择城市" : "IP 定位已取消或超时");
    }
    private String read(InputStream input) throws Exception {
        try (InputStream in = input; ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            byte[] buffer = new byte[4096]; int count;
            while ((count = in.read(buffer)) != -1) {
                checkCancelled(); out.write(buffer, 0, count);
                if (out.size() > MAX_BYTES) throw new IpException("IP_RESPONSE", "腾讯没有返回可用的城市信息，请手动选择城市");
            }
            checkCancelled(); return new String(out.toByteArray(), StandardCharsets.UTF_8);
        }
    }
    static JSONObject normalize(JSONObject data) throws Exception {
        if (data.optInt("status", -1) != 0)
            throw new IpException("IP_SERVICE", "腾讯 IP 定位未成功，请稍后重试或手动选择城市");
        JSONObject result = data.optJSONObject("result");
        JSONObject point = result == null ? null : result.optJSONObject("location");
        JSONObject info = result == null ? null : result.optJSONObject("ad_info");
        Object latitude = point == null ? null : point.opt("lat"), longitude = point == null ? null : point.opt("lng");
        if (!(latitude instanceof Number) || !(longitude instanceof Number) || info == null)
            throw invalidResponse();
        double lat = ((Number) latitude).doubleValue(), lon = ((Number) longitude).doubleValue();
        if (!Double.isFinite(lat) || !Double.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180 || text(info, "nation").isEmpty())
            throw invalidResponse();
        // Only rounded administrative coordinates and region names cross the bridge. Never return raw IP or response.
        JSONObject names = new JSONObject();
        for (String field : new String[]{"nation", "province", "city", "district"}) names.put(field, text(info, field));
        return new JSONObject().put("lat", Double.parseDouble(String.format(Locale.US, "%.2f", lat)))
            .put("lon", Double.parseDouble(String.format(Locale.US, "%.2f", lon)))
            .put("source", "TencentIP").put("approximate", true).put("adInfo", names);
    }
    private static IpException invalidResponse() { return new IpException("IP_RESPONSE", "腾讯没有返回可用的城市信息，请手动选择城市"); }
    private static String text(JSONObject object, String field) {
        Object value = object.opt(field);
        if (!(value instanceof String)) return "";
        String text = ((String) value).trim(); return text.substring(0, Math.min(text.length(), 80));
    }
    public JSONObject locate() throws IpException {
        synchronized (this) {
            checkCancelled();
            if (started) throw new IpException("IP_BUSY", "正在获取 IP 大致位置，请稍候");
            started = true;
        }
        ScheduledExecutorService timer = Executors.newSingleThreadScheduledExecutor();
        ScheduledFuture<?> deadline = timer.schedule(this::expire, 12, TimeUnit.SECONDS);
        HttpsURLConnection connection = null;
        try {
            URL url = new URL(endpoint(origin())); checkCancelled();
            synchronized (this) { checkCancelled(); connection = connections.open(url); active = connection; }
            connection.setConnectTimeout(10000); connection.setReadTimeout(10000);
            connection.setInstanceFollowRedirects(false); connection.setUseCaches(false);
            connection.setRequestProperty("Accept", "application/json");
            connection.setRequestProperty("Cache-Control", "no-store");
            int status = connection.getResponseCode(); checkCancelled();
            if (status != 200) throw new IpException("IP_SERVICE", "腾讯 IP 定位暂不可用，请稍后重试或手动选择城市");
            if (connection.getContentLengthLong() > MAX_BYTES) throw invalidResponse();
            JSONObject data = new JSONObject(read(connection.getInputStream())); checkCancelled();
            JSONObject normalized = normalize(data); checkCancelled(); return normalized;
        } catch (IpException error) { throw error; }
        catch (org.json.JSONException ignored) { checkCancelled(); throw invalidResponse(); }
        catch (Exception ignored) {
            checkCancelled();
            throw new IpException("IP_NETWORK", "连接腾讯 IP 定位失败，请检查网络或手动选择城市");
        } finally {
            deadline.cancel(false); timer.shutdownNow();
            if (connection != null) connection.disconnect();
            synchronized (this) { active = null; }
        }
    }
}
