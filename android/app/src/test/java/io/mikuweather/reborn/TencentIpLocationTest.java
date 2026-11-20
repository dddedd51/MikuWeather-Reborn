package io.mikuweather.reborn;

import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.RobolectricTestRunner;
import org.robolectric.annotation.Config;
import org.json.JSONObject;
import static org.junit.Assert.*;
import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.security.cert.Certificate;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import javax.net.ssl.HttpsURLConnection;

@RunWith(RobolectricTestRunner.class)
@Config(sdk = 35, manifest = Config.NONE)
public class TencentIpLocationTest {
    private static final String FIXTURE = "{\"status\":0,\"result\":{\"ip\":\"203.0.113.1\",\"location\":{\"lat\":31.23456,\"lng\":121.47654},\"ad_info\":{\"nation\":\"中国\",\"province\":\"上海市\",\"city\":\"上海市\",\"district\":\"黄浦区\"}}}";
    private static class Connection extends HttpsURLConnection {
        byte[] body = FIXTURE.getBytes(StandardCharsets.UTF_8); int status = 200; boolean closed;
        Connection(URL url) { super(url); }
        @Override public int getResponseCode() throws java.io.IOException { return status; }
        @Override public InputStream getInputStream() { return new ByteArrayInputStream(body); }
        @Override public long getContentLengthLong() { return body.length; }
        @Override public void disconnect() { closed = true; }
        @Override public boolean usingProxy() { return false; }
        @Override public void connect() {}
        @Override public String getCipherSuite() { return "test"; }
        @Override public Certificate[] getLocalCertificates() { return null; }
        @Override public Certificate[] getServerCertificates() { return null; }
    }
    @Test public void onlyRoundedRegionInformationCrossesTheBridge() throws Exception {
        JSONObject value = TencentIpLocation.normalize(new JSONObject(FIXTURE));
        assertEquals(31.23, value.getDouble("lat"), 0); assertEquals(121.48, value.getDouble("lon"), 0);
        assertEquals("TencentIP", value.getString("source")); assertTrue(value.getBoolean("approximate"));
        assertEquals("上海市", value.getJSONObject("adInfo").getString("city"));
        assertFalse(value.toString().contains("203.0.113.1")); assertFalse(value.has("result"));
    }
    @Test public void invalidRegionAndCoordinatesAreRejected() throws Exception {
        for (String body : new String[]{FIXTURE.replace("31.23456", "91"), FIXTURE.replace("121.47654", "181"),
            FIXTURE.replace("31.23456", "\"31\""), FIXTURE.replace("\"中国\"", "\"\""), "{\"status\":0}"}) {
            assertEquals("IP_RESPONSE", assertThrows(TencentIpLocation.IpException.class,
                () -> TencentIpLocation.normalize(new JSONObject(body))).code);
        }
    }
    @Test public void endpointCannotInjectIpCoordinatesCredentialsOrRedirects() throws Exception {
        assertEquals("https://weather.example/ip", TencentIpLocation.endpoint("https://weather.example/"));
        for (String origin : new String[]{"http://weather.example", "https://u:p@weather.example", "https://weather.example/?ip=203.0.113.1", "https://weather.example/api", "https://weather.example#x"})
            assertEquals("IP_CONFIG", assertThrows(TencentIpLocation.IpException.class, () -> TencentIpLocation.endpoint(origin)).code);
    }
    @Test public void ipRequestIsUncachedAndContainsNoGpsOrExplicitIp() throws Exception {
        Connection[] opened = new Connection[1];
        TencentIpLocation client = new TencentIpLocation("https://weather.example", url -> opened[0] = new Connection(url));
        client.locate(); Connection connection = opened[0];
        assertEquals("/ip", connection.getURL().getPath()); assertNull(connection.getURL().getQuery());
        assertFalse(connection.getUseCaches()); assertFalse(connection.getInstanceFollowRedirects());
        assertEquals("no-store", connection.getRequestProperty("Cache-Control")); assertTrue(connection.closed);
        assertEquals(10000, connection.getConnectTimeout()); assertEquals(10000, connection.getReadTimeout());
    }
    @Test public void cancellingBeforeExecutorStartsNeverOpensANetworkConnection() {
        AtomicInteger opened = new AtomicInteger();
        TencentIpLocation client = new TencentIpLocation("https://weather.example", url -> { opened.incrementAndGet(); return new Connection(url); });
        client.cancel(); assertEquals("IP_CANCELLED", assertThrows(TencentIpLocation.IpException.class, client::locate).code);
        assertEquals(0, opened.get());
    }
    @Test public void cancelledLateResponsesAndExpiredRequestsCannotReturnACity() {
        for (boolean timeout : new boolean[]{false, true}) {
            TencentIpLocation[] client = new TencentIpLocation[1]; Connection[] opened = new Connection[1];
            client[0] = new TencentIpLocation("https://weather.example", url -> opened[0] = new Connection(url) {
                @Override public InputStream getInputStream() {
                    if (timeout) client[0].expire(); else client[0].cancel();
                    return super.getInputStream();
                }
            });
            assertEquals(timeout ? "IP_TIMEOUT" : "IP_CANCELLED", assertThrows(TencentIpLocation.IpException.class, client[0]::locate).code);
            assertTrue(opened[0].closed);
        }
    }
    @Test public void overlappingLookupIsRejectedAndCancellationReleasesTheFirst() throws Exception {
        CountDownLatch entered = new CountDownLatch(1), release = new CountDownLatch(1);
        TencentIpLocation client = new TencentIpLocation("https://weather.example", url -> new Connection(url) {
            @Override public int getResponseCode() throws java.io.IOException {
                entered.countDown();
                try { if (!release.await(5, TimeUnit.SECONDS)) throw new java.io.IOException(); }
                catch (InterruptedException error) { throw new java.io.IOException(); }
                return status;
            }
            @Override public void disconnect() { super.disconnect(); release.countDown(); }
        });
        String[] firstCode = new String[1];
        Thread first = new Thread(() -> { try { client.locate(); } catch (TencentIpLocation.IpException error) { firstCode[0] = error.code; } });
        first.start(); assertTrue(entered.await(5, TimeUnit.SECONDS));
        assertEquals("IP_BUSY", assertThrows(TencentIpLocation.IpException.class, client::locate).code);
        client.cancel(); first.join(5000); assertFalse(first.isAlive()); assertEquals("IP_CANCELLED", firstCode[0]);
    }
    @Test public void malformedAndOversizedResponsesFailWithoutRawData() throws Exception {
        for (String body : new String[]{"not json", "x".repeat(32769)}) {
            TencentIpLocation client = new TencentIpLocation("https://weather.example", url -> {
                Connection connection = new Connection(url); connection.body = body.getBytes(StandardCharsets.UTF_8); return connection;
            });
            assertEquals("IP_RESPONSE", assertThrows(TencentIpLocation.IpException.class, client::locate).code);
        }
    }
    @Test public void serviceAndNetworkFailuresDoNotExposeUrlsOrUpstreamMessages() throws Exception {
        TencentIpLocation service = new TencentIpLocation("https://weather.example", url -> { Connection connection = new Connection(url); connection.status = 502; return connection; });
        assertEquals("IP_SERVICE", assertThrows(TencentIpLocation.IpException.class, service::locate).code);
        TencentIpLocation network = new TencentIpLocation("https://weather.example", url -> { throw new Exception("https://private.example/?key=secret"); });
        TencentIpLocation.IpException error = assertThrows(TencentIpLocation.IpException.class, network::locate);
        assertEquals("IP_NETWORK", error.code); assertFalse(error.getMessage().contains("secret"));
        assertFalse(error.getMessage().contains("https://"));
        assertEquals("IP_SERVICE", assertThrows(TencentIpLocation.IpException.class,
            () -> TencentIpLocation.normalize(new JSONObject("{\"status\":110,\"message\":\"secret\"}"))).code);
    }
}
