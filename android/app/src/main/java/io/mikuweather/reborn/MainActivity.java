package io.mikuweather.reborn;

import com.getcapacitor.BridgeActivity;
import android.os.Bundle;

public class MainActivity extends BridgeActivity {
    @Override public void onCreate(Bundle savedInstanceState) {
        registerPlugin(MikuWeatherPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
