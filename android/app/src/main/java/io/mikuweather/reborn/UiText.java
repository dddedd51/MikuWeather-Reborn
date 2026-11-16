package io.mikuweather.reborn;

import android.content.Context;
import org.json.JSONObject;
import java.util.ArrayList;
import java.util.List;

final class UiText {
    private static JSONObject catalog;
    private static List<String> keys;
    static String t(Context context, String source) {
        String language=WidgetPreferences.language(context);
        int index="zh-TW".equals(language)?0:"en".equals(language)?1:"ja".equals(language)?2:-1;
        if(index<0)return source;
        try {
            synchronized(UiText.class) {
                if(catalog==null){
                    try(java.io.InputStream in=context.getAssets().open("locales.json")) {
                        java.io.ByteArrayOutputStream out=new java.io.ByteArrayOutputStream();
                        byte[] buffer=new byte[8192];int n;while((n=in.read(buffer))!=-1)out.write(buffer,0,n);
                        catalog=new JSONObject(out.toString("UTF-8"));
                    }
                    keys=new ArrayList<>();catalog.keys().forEachRemaining(keys::add);
                    keys.sort((a,b)->Integer.compare(b.length(),a.length()));
                }
            }
            StringBuilder result=new StringBuilder();
            for(int offset=0;offset<source.length();) {
                String match=null;
                for(String key:keys)if(source.startsWith(key,offset)){match=key;break;}
                if(match==null)result.append(source.charAt(offset++));
                else {result.append(catalog.getJSONArray(match).getString(index));offset+=match.length();}
            }
            return result.toString();
        }catch(Exception ignored){return source;}
    }
    static String word(Context context,String key) {
        String language=WidgetPreferences.language(context);
        int i="zh-TW".equals(language)?1:"en".equals(language)?2:"ja".equals(language)?3:0;
        switch(key){
            case "waiting":return new String[]{"天气","天氣","Weather","天気"}[i];
            case "cached":return new String[]{"缓存","快取","Cached","キャッシュ"}[i];
            case "refresh":return new String[]{"点击初音刷新天气","點選初音更新天氣","Tap Miku to refresh weather","ミクをタップして天気を更新"}[i];
            default:return new String[]{"点击查看天气","點選查看天氣","Tap for weather","タップして天気を見る"}[i];
        }
    }
}
