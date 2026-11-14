package io.mikuweather.reborn;
import org.junit.Test;
import static org.junit.Assert.*;
public class ServiceEndpointTest {
    @Test public void acceptsHttpsOrigin() throws Exception { assertEquals("https://weather.example", ServiceEndpoint.proxyBase("https://weather.example/")); }
    @Test public void rejectsCredentialsAndNonOriginUrls() throws Exception {
        for (String value : new String[]{"http://weather.example", "https://u:p@weather.example", "https://weather.example/api", "https://weather.example?key=x", "https://weather.example#x"}) {
            try { ServiceEndpoint.proxyBase(value); fail(value); } catch (IllegalArgumentException expected) {}
        }
    }
}
