package io.mikuweather.reborn;

import java.net.URI;

/** Public proxy configuration never contains a signing key or access token. */
public final class ServiceEndpoint {
    private ServiceEndpoint() {}
    public static String proxyBase(String value) throws Exception {
        URI uri = new URI(value);
        String path = uri.getPath();
        if (!"https".equalsIgnoreCase(uri.getScheme()) || uri.getHost() == null || uri.getHost().isEmpty()
            || uri.getUserInfo() != null || uri.getQuery() != null || uri.getFragment() != null
            || (path != null && !path.isEmpty() && !"/".equals(path)))
            throw new IllegalArgumentException("Invalid weather proxy");
        return "https://" + uri.getRawAuthority();
    }
}
