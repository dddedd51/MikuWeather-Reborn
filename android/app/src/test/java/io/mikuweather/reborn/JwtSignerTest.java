package io.mikuweather.reborn;
import org.junit.Test;
import static org.junit.Assert.*;
import java.nio.charset.StandardCharsets;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.Signature;
import java.util.Base64;

public class JwtSignerTest {
    @Test public void verifiesAgainstJdkEd25519Implementation() throws Exception {
        KeyPair pair=KeyPairGenerator.getInstance("Ed25519").generateKeyPair();
        String pem="-----BEGIN PRIVATE KEY-----\n"+Base64.getEncoder().encodeToString(pair.getPrivate().getEncoded())+"\n-----END PRIVATE KEY-----\n";
        String token=JwtSigner.createToken(pem,"TESTKEY001","QTEST00001","PROJECT001",1794560000L);
        String[] parts=token.split("\\.");
        assertEquals(3,parts.length);
        Signature verifier=Signature.getInstance("Ed25519");verifier.initVerify(pair.getPublic());verifier.update((parts[0]+"."+parts[1]).getBytes(StandardCharsets.UTF_8));
        assertTrue(verifier.verify(Base64.getUrlDecoder().decode(parts[2])));
        String payload=new String(Base64.getUrlDecoder().decode(parts[1]),StandardCharsets.UTF_8);
        assertTrue(payload.contains("\"iss\":\"QTEST00001\""));
        assertTrue(payload.contains("\"sub\":\"PROJECT001\""));
        assertTrue(payload.contains("\"iat\":1794559970"));
        assertTrue(payload.contains("\"exp\":1794560870"));
        assertFalse(token.contains("="));
    }
}
