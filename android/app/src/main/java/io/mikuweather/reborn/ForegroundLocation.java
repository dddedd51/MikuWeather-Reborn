package io.mikuweather.reborn;

import android.Manifest;
import android.content.Context;
import android.content.pm.PackageManager;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import java.util.ArrayList;
import java.util.List;

/** One foreground system request: prefer GPS, then a fresh system network fix. */
final class ForegroundLocation {
    private final Context context;
    private final Handler handler=new Handler(Looper.getMainLooper());
    private final LocationAttempt attempt;
    private final Runnable timeout, gpsGrace;
    private final LocationListener listener;
    private LocationManager manager;
    private boolean precisePermission, gpsEnabled;
    private long started;
    private Location fallback;
    String source="Unknown";
    double accuracy;
    long timestamp;
    ForegroundLocation(Context context, LocationAttempt.Callback callback) {
        this.context=context;
        attempt=new LocationAttempt(this::cleanup,callback);
        timeout=attempt::timeout;
        gpsGrace=()->{if(fallback!=null)deliver(fallback);};
        listener=new LocationListener() {
            @Override public void onLocationChanged(Location location) { consider(location); }
            @Override public void onProviderDisabled(String provider) {
                if(LocationManager.GPS_PROVIDER.equals(provider)){gpsEnabled=false;if(fallback!=null)deliver(fallback);}
                try{if(manager!=null&&!manager.isProviderEnabled(LocationManager.GPS_PROVIDER)&&!manager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)&&!manager.isProviderEnabled("fused"))attempt.fail("LOCATION_DISABLED","系统定位已关闭，请开启后重试或手动选择城市");}catch(Exception ignored){}
            }
            @Override public void onProviderEnabled(String provider) {}
            @Override public void onStatusChanged(String provider,int status,Bundle extras) {}
        };
    }
    private void consider(Location fix) {
        if(attempt.isFinished()||fix==null||!fix.hasAccuracy())return;
        long age=SystemClock.elapsedRealtimeNanos()-fix.getElapsedRealtimeNanos();
        if(!LocationQuality.usable(fix.getAccuracy(),age))return;
        if(LocationManager.GPS_PROVIDER.equals(fix.getProvider())||!LocationQuality.preferGps(precisePermission,gpsEnabled,SystemClock.elapsedRealtime()-started))deliver(fix);
        else if(fallback==null||fix.getAccuracy()<fallback.getAccuracy())fallback=fix;
    }
    private void deliver(Location fix) {
        if(attempt.isFinished())return;
        if(!LocationQuality.usable(fix.getAccuracy(),SystemClock.elapsedRealtimeNanos()-fix.getElapsedRealtimeNanos()))return;
        source=LocationManager.GPS_PROVIDER.equals(fix.getProvider())?"Satellite":"fused".equals(fix.getProvider())?"AndroidFused":"AndroidNetwork";
        accuracy=fix.getAccuracy();timestamp=fix.getTime();
        attempt.accept(fix.getLatitude(),fix.getLongitude());
    }
    void start() {
        if(attempt.isFinished())return;
        precisePermission=context.checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION)==PackageManager.PERMISSION_GRANTED;
        boolean coarse=context.checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION)==PackageManager.PERMISSION_GRANTED;
        if(!precisePermission&&!coarse){attempt.fail("LOCATION_DENIED","未允许位置权限，可手动选择城市");return;}
        manager=(LocationManager)context.getSystemService(Context.LOCATION_SERVICE);
        if(manager==null){attempt.fail("LOCATION_UNAVAILABLE","系统定位暂时不可用，可手动选择城市");return;}
        try{
            boolean enabled=Build.VERSION.SDK_INT>=28?manager.isLocationEnabled():manager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)||manager.isProviderEnabled(LocationManager.GPS_PROVIDER);
            if(!enabled){attempt.fail("LOCATION_DISABLED","系统定位已关闭，请开启后重试或手动选择城市");return;}
            List<String> available=manager.getProviders(true),providers=new ArrayList<>();
            gpsEnabled=precisePermission&&available.contains(LocationManager.GPS_PROVIDER);
            if(gpsEnabled)providers.add(LocationManager.GPS_PROVIDER);
            if(available.contains("fused"))providers.add("fused");
            if(available.contains(LocationManager.NETWORK_PROVIDER))providers.add(LocationManager.NETWORK_PROVIDER);
            if(providers.isEmpty()){attempt.fail("LOCATION_UNAVAILABLE","系统未提供可用定位。GPS 需要精确位置权限；也可手动选择城市");return;}
            started=SystemClock.elapsedRealtime();handler.postDelayed(timeout,30_000);
            if(gpsEnabled)handler.postDelayed(gpsGrace,8_000);
            int subscribed=0;
            for(String provider:providers){try{manager.requestLocationUpdates(provider,0L,0f,listener,Looper.getMainLooper());subscribed++;}catch(SecurityException ignored){}}
            if(subscribed==0){attempt.fail("LOCATION_DENIED","系统未允许当前定位方式，请检查位置权限或手动选择城市");return;}
            for(String provider:providers){if(attempt.isFinished())break;try{consider(manager.getLastKnownLocation(provider));}catch(SecurityException ignored){}}
        }catch(SecurityException ignored){attempt.fail("LOCATION_DENIED","系统未允许位置权限，可手动选择城市");}
        catch(Exception ignored){attempt.fail("LOCATION_UNAVAILABLE","暂时无法取得位置，请重试或手动选择城市");}
    }
    void cancel(){attempt.cancel();}
    private void cleanup(){
        handler.removeCallbacks(timeout);handler.removeCallbacks(gpsGrace);fallback=null;
        if(manager!=null)try{manager.removeUpdates(listener);}catch(Exception ignored){}
    }
}
