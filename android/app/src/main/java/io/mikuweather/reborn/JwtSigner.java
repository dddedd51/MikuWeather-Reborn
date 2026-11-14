package io.mikuweather.reborn;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.Signature;
import java.security.spec.PKCS8EncodedKeySpec;
import java.util.Base64;
import net.i2p.crypto.eddsa.EdDSAEngine;
import net.i2p.crypto.eddsa.EdDSAPrivateKey;

public final class JwtSigner {
    private JwtSigner() {}
    private static String encoded(byte[] data) { return Base64.getUrlEncoder().withoutPadding().encodeToString(data); }
    public static String createToken(String pem, String kid, String issuer, String project, long nowSeconds) throws Exception {
        for (String id : new String[]{kid, issuer, project}) if (id == null || !id.matches("[A-Za-z0-9]{10}")) throw new IllegalArgumentException("Invalid JWT identity");
        if (!issuer.startsWith("Q")) throw new IllegalArgumentException("Invalid developer ID");
        String key = pem.replace("-----BEGIN PRIVATE KEY-----", "").replace("-----END PRIVATE KEY-----", "").replaceAll("\\s", "");
        EdDSAPrivateKey privateKey = new EdDSAPrivateKey(new PKCS8EncodedKeySpec(Base64.getDecoder().decode(key)));
        long issued = nowSeconds - 30;
        String header = "{\"alg\":\"EdDSA\",\"kid\":\"" + kid + "\"}";
        String payload = "{\"iss\":\"" + issuer + "\",\"sub\":\"" + project + "\",\"iat\":" + issued + ",\"exp\":" + (issued + 900) + "}";
        String input = encoded(header.getBytes(StandardCharsets.UTF_8)) + "." + encoded(payload.getBytes(StandardCharsets.UTF_8));
        Signature signer = new EdDSAEngine(MessageDigest.getInstance("SHA-512"));
        signer.initSign(privateKey);
        signer.update(input.getBytes(StandardCharsets.UTF_8));
        return input + "." + encoded(signer.sign());
    }
}
