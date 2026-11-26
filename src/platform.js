import {Geolocation} from '@capacitor/geolocation';
import service from '../desktop/service.json';
import {servicePath} from './service-path.js';
import { Capacitor, CapacitorHttp, registerPlugin } from '@capacitor/core';
export const NativeWeather = registerPlugin('MikuWeather');
export const desktop = !!window.miku;
export const android = Capacitor.getPlatform() === 'android';
export const ios = Capacitor.getPlatform() === 'ios';
export async function getPosition(mode='precise') {
  if (window.miku) {
    const result=mode==='ip'?await window.miku.locateIp():await window.miku.locate();
    if(!result.ok)throw new Error(result.message||'定位暂不可用，请手动选择城市');
    return {lat:result.lat,lon:result.lon,accuracy:result.accuracy,source:result.source,timestamp:result.timestamp,approximate:result.approximate,adInfo:result.adInfo};
  }
  if(android)return mode==='ip'?NativeWeather.locateIp():NativeWeather.locate();
  if(Capacitor.getPlatform()==='ios'){const p=await Geolocation.getCurrentPosition({enableHighAccuracy:true,timeout:30000,maximumAge:0});return {lat:Number(p.coords.latitude.toFixed(2)),lon:Number(p.coords.longitude.toFixed(2)),accuracy:Math.max(800,p.coords.accuracy),timestamp:p.timestamp,source:'Obfuscated'};}
  return new Promise((resolve,reject)=>{
    if(!navigator.geolocation){reject(new Error('此设备不支持定位，请手动选择城市'));return;}
    navigator.geolocation.getCurrentPosition(p=>resolve({lat:Number(p.coords.latitude.toFixed(2)),lon:Number(p.coords.longitude.toFixed(2))}),e=>reject(new Error(e.code===1?'未允许访问位置，仍可手动选择城市':e.code===3?'定位超时，请稍后重试或手动选择城市':'暂时无法定位，请手动选择城市')),{enableHighAccuracy:false,timeout:20000,maximumAge:60000});
  });
}
export function cancelLocation() {
  window.miku?.cancelLocate();
  if(android)NativeWeather.cancelLocate().catch(()=>{});
}
export async function selectWidgetCity(city, unit, theme = 'solar', language = 'zh-CN', opacity=0, textScale=110, weather=null) {
  if (android) return NativeWeather.selectCity({ city, unit, theme, language, opacity, textScale });
}
export async function pinWidget(style) {
  if (android) return NativeWeather.pinWidget({ style });
  return { supported: false, accepted: false };
}
export async function request(kind, params = {}) {
  let result;
  if (window.miku) result = await window.miku.request(kind, params);
  else if (Capacitor.getPlatform()==='ios') {
    const response=await CapacitorHttp.get({url:service.proxyUrl.replace(/\/$/,'')+servicePath(kind,params),headers:{Accept:'application/json'},connectTimeout:15000,readTimeout:15000});
    const data=typeof response.data==='string'?JSON.parse(response.data):response.data;
    result=response.status===200&&!data.error?{ok:true,data}:{ok:false,code:String(response.status),message:'天气服务暂时不可用'};
  }
  else if (Capacitor.isNativePlatform()) result = await NativeWeather.request({ kind, ...params });
  else {
    const response = await fetch('/api/' + kind + '?' + new URLSearchParams(params));
    if (!response.headers.get('content-type')?.includes('application/json')) throw new Error('实时天气请使用桌面或 Android 客户端');
    result = await response.json();
  }
  if (!result.ok) { const e = new Error(result.message || '天气服务暂时不可用'); e.code = result.code; throw e; }
  return result.data;
}
