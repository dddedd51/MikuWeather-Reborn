package io.mikuweather.reborn;

import android.content.Context;
import android.content.SharedPreferences;
import android.content.Intent;
import android.net.ConnectivityManager;
import android.net.NetworkCapabilities;
import java.time.Clock;
import org.json.JSONObject;

/** Feedback belongs to the selected city and to one explicit refresh attempt. */
final class WidgetRefreshFeedback {
    static final long SUCCESS_VISIBLE_MS=3000;
    static final String DISMISS_SUCCESS="io.mikuweather.reborn.WIDGET_DISMISS_SUCCESS";
    static Clock clock=Clock.systemUTC();
    static long now(){return clock.millis();}
    private static SharedPreferences prefs(Context c){return c.getSharedPreferences("miku_widget_feedback",Context.MODE_PRIVATE);}
    private static String key(JSONObject city){return WidgetPreferences.key(city);}
    static boolean online(Context c){
        ConnectivityManager manager=(ConnectivityManager)c.getSystemService(Context.CONNECTIVITY_SERVICE);
        if(manager==null)return false;
        NetworkCapabilities network=manager.getNetworkCapabilities(manager.getActiveNetwork());
        return network!=null&&network.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET);
    }
    static synchronized boolean queue(Context c,JSONObject city){
        SharedPreferences p=prefs(c);String key=key(city),state=p.getString(key+":state","");
        long now=now();
        if(("queued".equals(state)||"running".equals(state))&&now-p.getLong(key+":at",0)<120000)return false;
        p.edit().putString(key+":state","queued").putLong(key+":at",now).putLong(key+":ticket",p.getLong(key+":ticket",0)+1).apply();return true;
    }
    static synchronized long begin(Context c,JSONObject city){
        SharedPreferences p=prefs(c);String key=key(city);
        if(!"queued".equals(p.getString(key+":state","")))return 0;
        long ticket=p.getLong(key+":ticket",0);p.edit().putString(key+":state","running").putLong(key+":at",now()).apply();return ticket;
    }
    static synchronized void finish(Context c,JSONObject city,long ticket,String state){
        SharedPreferences p=prefs(c);String key=key(city);
        if(ticket==0||ticket!=p.getLong(key+":ticket",0))return;
        long shownAt=now();
        p.edit().putString(key+":state",state).putLong(key+":at",shownAt).apply();
        if("success".equals(state))c.sendBroadcast(new Intent(c,MikuWeatherWidget.class).setAction(DISMISS_SUCCESS)
            .putExtra("cityKey",key).putExtra("ticket",ticket).putExtra("shownAt",shownAt));
    }
    static synchronized boolean clearSuccess(Context c,String key,long ticket,long shownAt){
        SharedPreferences p=prefs(c);
        // An older timer must never hide a newer attempt or its failure message.
        if(!"success".equals(p.getString(key+":state",""))||p.getLong(key+":ticket",0)!=ticket||p.getLong(key+":at",0)!=shownAt)return false;
        p.edit().remove(key+":state").remove(key+":at").apply();return true;
    }
    static synchronized void offline(Context c,JSONObject city){
        SharedPreferences p=prefs(c);String key=key(city);
        p.edit().putString(key+":state","offline").putLong(key+":at",now()).putLong(key+":ticket",p.getLong(key+":ticket",0)+1).apply();
    }
    static String label(Context c,JSONObject city){
        SharedPreferences p=prefs(c);String key=key(city),state=p.getString(key+":state","");
        if("success".equals(state)&&now()-p.getLong(key+":at",0)>=SUCCESS_VISIBLE_MS)return "";
        if(("queued".equals(state)||"running".equals(state))&&now()-p.getLong(key+":at",0)>120000)return UiText.t(c,"刷新超时");
        String text;
        switch(state){
            case "queued":text="等待刷新";break;
            case "running":text="正在更新";break;
            case "success":text="更新成功";break;
            case "offline":text="没有网络";break;
            case "failed":text="更新失败";break;
            case "retry":text="稍后重试";break;
            default:return "";
        }
        return UiText.t(c,text);
    }
}
