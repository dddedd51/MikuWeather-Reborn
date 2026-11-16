package io.mikuweather.reborn;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.PluginCall;
import org.json.JSONObject;
import org.json.JSONArray;
import javax.net.ssl.HttpsURLConnection;
import java.net.URL;
import java.io.*;
import java.security.MessageDigest;
import java.util.concurrent.atomic.AtomicBoolean;
final class AppUpdater {
    private static final String API="https://api.github.com/repos/dddedd51/MikuWeather-Reborn/releases/latest";
    private static final AtomicBoolean busy=new AtomicBoolean(false);
    interface Progress { void send(int percent); }
    static HttpsURLConnection connection(String address) throws Exception {
        URL url=new URL(address);
        if(!"https".equals(url.getProtocol())||url.getUserInfo()!=null||!("api.github.com".equals(url.getHost())||"github.com".equals(url.getHost())||"release-assets.githubusercontent.com".equals(url.getHost())||"objects.githubusercontent.com".equals(url.getHost())))throw new IOException("Invalid update host");
        HttpsURLConnection c=(HttpsURLConnection)url.openConnection();c.setInstanceFollowRedirects(false);c.setConnectTimeout(20000);c.setReadTimeout(60000);c.setRequestProperty("User-Agent","MikuWeather-Reborn");return c;
    }
    static int compare(String a,String b) {
        if(!a.matches("[0-9]+\\.[0-9]+\\.[0-9]+")||!b.matches("[0-9]+\\.[0-9]+\\.[0-9]+"))throw new IllegalArgumentException("Invalid version");
        String[] x=a.split("\\."),y=b.split("\\.");for(int i=0;i<3;i++){int d=Integer.compare(Integer.parseInt(x[i]),Integer.parseInt(y[i]));if(d!=0)return d;}return 0;
    }
    static JSObject check(Context context) throws Exception {
        String current=context.getPackageManager().getPackageInfo(context.getPackageName(),0).versionName;
        HttpsURLConnection c=connection(API);c.setRequestProperty("Accept","application/vnd.github+json");JSONObject release;
        try {if(c.getResponseCode()!=200)throw new IOException("Update check failed");try(InputStream in=c.getInputStream();ByteArrayOutputStream out=new ByteArrayOutputStream()){byte[] b=new byte[8192];int n;while((n=in.read(b))!=-1){out.write(b,0,n);if(out.size()>2*1024*1024)throw new IOException("Response too large");}release=new JSONObject(out.toString("UTF-8"));}}finally{c.disconnect();}
        String version=release.optString("tag_name").replaceFirst("^v","");
        if(release.optBoolean("draft")||release.optBoolean("prerelease"))throw new IOException("Not stable");
        JSObject result=new JSObject();result.put("current",current);result.put("version",version);
        if(compare(version,current)<=0){result.put("available",false);return result;}
        String name="MikuWeather-Reborn-"+version+"-Android.apk",url="https://github.com/dddedd51/MikuWeather-Reborn/releases/download/v"+version+"/"+name;
        JSONArray assets=release.getJSONArray("assets");
        for(int i=0;i<assets.length();i++){
            JSONObject a=assets.getJSONObject(i);if(!name.equals(a.optString("name")))continue;String digest=a.optString("digest");long size=a.optLong("size");
            if(!url.equals(a.optString("browser_download_url"))||!digest.matches("sha256:[a-fA-F0-9]{64}")||size<1||size>512L*1024*1024||!"uploaded".equals(a.optString("state")))throw new IOException("Invalid update asset");
            result.put("available",true);result.put("url",url);result.put("name",name);result.put("size",size);result.put("sha256",digest.substring(7).toLowerCase(java.util.Locale.ROOT));return result;
        }throw new IOException("No Android update");
    }
    private static String hex(byte[] bytes){StringBuilder s=new StringBuilder();for(byte b:bytes)s.append(String.format(java.util.Locale.US,"%02x",b&255));return s.toString();}
    private static String hash(File f) throws Exception {MessageDigest digest=MessageDigest.getInstance("SHA-256");try(InputStream in=new FileInputStream(f)){byte[] b=new byte[65536];int n;while((n=in.read(b))!=-1)digest.update(b,0,n);}return hex(digest.digest());}
    @SuppressWarnings("deprecation") static void verifyPackage(Context context,File file) throws Exception {
        PackageManager pm=context.getPackageManager();int flags=Build.VERSION.SDK_INT>=28?PackageManager.GET_SIGNING_CERTIFICATES:PackageManager.GET_SIGNATURES;
        PackageInfo candidate=pm.getPackageArchiveInfo(file.getAbsolutePath(),flags),current=pm.getPackageInfo(context.getPackageName(),flags);
        if(candidate==null||!context.getPackageName().equals(candidate.packageName))throw new IOException("Wrong package");
        long nextCode=Build.VERSION.SDK_INT>=28?candidate.getLongVersionCode():candidate.versionCode,oldCode=Build.VERSION.SDK_INT>=28?current.getLongVersionCode():current.versionCode;
        if(nextCode<=oldCode)throw new IOException("Not a newer package");
        android.content.pm.Signature[] next=Build.VERSION.SDK_INT>=28?candidate.signingInfo.getApkContentsSigners():candidate.signatures,old=Build.VERSION.SDK_INT>=28?current.signingInfo.getApkContentsSigners():current.signatures;
        if(next==null||old==null||next.length!=old.length)throw new IOException("Signature mismatch");
        java.util.Set<String> a=new java.util.HashSet<>(),b=new java.util.HashSet<>();for(android.content.pm.Signature sig:next)a.add(sig.toCharsString());for(android.content.pm.Signature sig:old)b.add(sig.toCharsString());if(!a.equals(b))throw new IOException("Signature mismatch");
    }
    private static JSObject status(String text){JSObject result=new JSObject();result.put("status",text);return result;}
    static void install(MikuWeatherPlugin plugin,PluginCall call,Progress progress) {
        if(!busy.compareAndSet(false,true)){call.reject("更新正在进行中");return;}
        try {
            Context context=plugin.getContext();JSObject info=check(context);
            if(!info.getBoolean("available")){call.resolve(status("current"));busy.set(false);return;}
            File folder=new File(context.getCacheDir(),"updates");if(!folder.isDirectory()&&!folder.mkdirs())throw new IOException("Cannot create update folder");
            File file=new File(folder,info.getString("name"));long size=info.getLong("size");
            if(!file.exists()||file.length()!=size||!hash(file).equals(info.getString("sha256"))){
                String url=info.getString("url");HttpsURLConnection c=null;
                try {
                    for(int i=0;i<6;i++){c=connection(url);int status=c.getResponseCode();if(status>=300&&status<400){url=new URL(new URL(url),c.getHeaderField("Location")).toString();c.disconnect();c=null;continue;}break;}
                    if(c==null||c.getResponseCode()!=200)throw new IOException("Download failed");
                    try(InputStream in=c.getInputStream();OutputStream out=new FileOutputStream(file)){byte[] b=new byte[65536];int n,last=-1;long total=0;while((n=in.read(b))!=-1){total+=n;if(total>size)throw new IOException("Oversized update");out.write(b,0,n);int percent=(int)(total*100/size);if(percent!=last){progress.send(percent);last=percent;}}}
                }finally{if(c!=null)c.disconnect();}
            }
            if(file.length()!=size||!hash(file).equals(info.getString("sha256")))throw new IOException("Checksum mismatch");verifyPackage(context,file);
            plugin.getActivity().runOnUiThread(()->{
                try {
                    if(Build.VERSION.SDK_INT>=26&&!context.getPackageManager().canRequestPackageInstalls()){
                        Intent permission=new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,Uri.parse("package:"+context.getPackageName()));plugin.getActivity().startActivity(permission);call.resolve(status("permission"));
                    }else{
                        Uri uri=FileProvider.getUriForFile(context,context.getPackageName()+".fileprovider",file);
                        Intent intent=new Intent(Intent.ACTION_VIEW).setDataAndType(uri,"application/vnd.android.package-archive").addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);plugin.getActivity().startActivity(intent);call.resolve(status("installer"));
                    }
                }catch(Exception e){call.reject("无法打开系统安装界面");}finally{busy.set(false);}
            });
        }catch(Exception e){busy.set(false);call.reject("更新未完成，请重试或从发布页下载");}
    }
}
