package io.mikuweather.reborn;

import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.Manifest;
import android.content.pm.PackageManager;
import androidx.core.content.ContextCompat;
import androidx.lifecycle.Lifecycle;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import com.getcapacitor.PermissionState;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@CapacitorPlugin(name = "MikuWeather", permissions = {
    @Permission(alias = "location", strings = { Manifest.permission.ACCESS_COARSE_LOCATION, Manifest.permission.ACCESS_FINE_LOCATION })
})
public class MikuWeatherPlugin extends Plugin {
    private final ExecutorService executor = Executors.newFixedThreadPool(3);
    private PluginCall locationCall;
    private ForegroundLocation location;

    @PluginMethod public void locate(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            if (locationCall != null) { call.reject("正在定位，请稍候或先取消", "LOCATION_BUSY"); return; }
            if (!getActivity().getLifecycle().getCurrentState().isAtLeast(Lifecycle.State.STARTED)) {
                call.reject("请在天气界面中点击定位", "LOCATION_CANCELLED"); return;
            }
            locationCall = call;
            boolean precise=ContextCompat.checkSelfPermission(getContext(),Manifest.permission.ACCESS_FINE_LOCATION)==PackageManager.PERMISSION_GRANTED;
            android.content.SharedPreferences permissions=getContext().getSharedPreferences("miku_location_permissions",android.content.Context.MODE_PRIVATE);
            if(hasLocationPermission()&&(precise||permissions.getBoolean("precisionRequested",false)))startLocation(call);
            else {permissions.edit().putBoolean("precisionRequested",true).apply();requestPermissionForAlias("location",call,"locationPermissionResult");}
        });
    }
    private boolean hasLocationPermission() {
        return ContextCompat.checkSelfPermission(getContext(), Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED
            || ContextCompat.checkSelfPermission(getContext(), Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED;
    }
    @PermissionCallback private void locationPermissionResult(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            if (locationCall != call) return;
            if (!hasLocationPermission()) {
                locationCall = null;
                call.reject("未允许位置权限，可手动选择城市；精确位置允许时可使用 GPS", "LOCATION_DENIED");
            } else startLocation(call);
        });
    }
    private void startLocation(PluginCall call) {
        if (!getActivity().getLifecycle().getCurrentState().isAtLeast(Lifecycle.State.STARTED)) { cancelLocation(); return; }
        location = new ForegroundLocation(getContext(), new LocationAttempt.Callback() {
            @Override public void found(double lat, double lon) {
                if (locationCall != call) return;
                ForegroundLocation completed=location;
                locationCall = null; location = null;
                JSObject result = new JSObject(); result.put("lat", lat); result.put("lon", lon);
                result.put("source", completed.source);result.put("accuracy", Math.max(800, completed.accuracy));
                result.put("timestamp", completed.timestamp);call.resolve(result);
            }
            @Override public void failed(String code, String message) {
                if (locationCall != call) return;
                locationCall = null; location = null; call.reject(message, code);
            }
        });
        location.start();
    }
    @PluginMethod public void cancelLocate(PluginCall call) {
        getActivity().runOnUiThread(() -> { cancelLocation(); call.resolve(); });
    }
    private void cancelLocation() {
        if (location != null) location.cancel();
        else if (locationCall != null) {
            PluginCall pending = locationCall; locationCall = null; pending.reject("已取消定位", "LOCATION_CANCELLED");
        }
        location = null;
    }

    @PluginMethod public void request(PluginCall call) {
        executor.execute(() -> {
            JSObject result = new JSObject();
            try {
                String kind = call.getString("kind", "");
                Double lat = call.getData().has("lat") ? call.getData().getDouble("lat") : null;
                Double lon = call.getData().has("lon") ? call.getData().getDouble("lon") : null;
                result.put("data", new JSObject(("lookup".equals(kind)?QWeatherClient.get(getContext()).lookup(call.getString("query", ""),call.getString("lang","zh")):QWeatherClient.get(getContext()).request(kind, call.getString("query", ""), lat, lon)).toString()));
                result.put("ok", true);
                if ("current".equals(kind)) {
                    org.json.JSONObject selected = WidgetPreferences.city(getContext());
                    if (QWeatherClient.buildPath("current", "", selected.optDouble("lat"), selected.optDouble("lon"))
                            .equals(QWeatherClient.buildPath("current", "", lat, lon)))
                        WidgetPreferences.error(getContext(), selected, "");
                    MikuWeatherWidget.updateAll(getContext());
                }
                if ("daily".equals(kind)) MikuWeatherWidget.updateAll(getContext());
            } catch (QWeatherClient.WeatherException e) {
                result.put("ok", false); result.put("code", e.code); result.put("message", e.getMessage());
            } catch (Exception e) {
                result.put("ok", false); result.put("code", "NETWORK"); result.put("message", "连接天气服务失败，请检查网络后重试");
            }
            call.resolve(result);
        });
    }
    @PluginMethod public void selectCity(PluginCall call) {
        try {
            WidgetPreferences.select(getContext(), call.getObject("city"), call.getString("unit", "C"), call.getString("theme", "solar"));
            WidgetPreferences.language(getContext(), call.getString("language", "zh-CN"));
            WidgetPreferences.appearance(getContext(),call.getInt("opacity",0),call.getInt("textScale",110));
            MikuWeatherWidget.updateAll(getContext());
            WidgetUpdateService.schedule(getContext(), true);
            JSObject result = new JSObject(); result.put("ok", true); call.resolve(result);
        } catch (Exception e) { call.reject("城市坐标无效"); }
    }
    @PluginMethod public void checkUpdate(PluginCall call) {
        executor.execute(()->{try{call.resolve(AppUpdater.check(getContext()));}catch(Exception e){call.reject("检查更新失败，请稍后重试");}});
    }
    @PluginMethod public void installUpdate(PluginCall call) {
        executor.execute(()->AppUpdater.install(this,call,percent->{JSObject value=new JSObject();value.put("percent",percent);notifyListeners("updateProgress",value);}));
    }
    @PluginMethod public void getWidgetStatus(PluginCall call) {
        JSObject result = new JSObject();
        result.put("pinSupported", AppWidgetManager.getInstance(getContext()).isRequestPinAppWidgetSupported());
        result.put("count", MikuWeatherWidget.widgetCount(getContext()));
        call.resolve(result);
    }
    @PluginMethod public void pinWidget(PluginCall call) {
        AppWidgetManager manager = AppWidgetManager.getInstance(getContext());
        boolean supported = manager.isRequestPinAppWidgetSupported();
        boolean accepted = false;
        if (supported) {
            Class<?> provider = "compact".equals(call.getString("style")) ? MikuCompactWidget.class : MikuWeatherWidget.class;
            accepted = manager.requestPinAppWidget(new ComponentName(getContext(), provider), null, null);
        }
        JSObject result = new JSObject(); result.put("supported", supported); result.put("accepted", accepted);
        call.resolve(result);
    }
    @Override protected void handleOnStop() {
        getActivity().runOnUiThread(this::cancelLocation); super.handleOnStop();
    }
    @Override protected void handleOnDestroy() {
        getActivity().runOnUiThread(this::cancelLocation);
        executor.shutdownNow(); super.handleOnDestroy();
    }
}
