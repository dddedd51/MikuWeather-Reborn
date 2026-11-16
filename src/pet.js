import {setLanguage,getLanguage,t,localize,observeTranslations} from './i18n.js';
import './pet.css';
import {request} from './platform.js';
import {CITIES,solarArt as art,normalizeCurrent,normalizeDaily} from './weather.js';
import {solarPixelIcon as pixelIcon} from './weather-icons.js';
import {solarNight} from './solar.js';
let city=CITIES[0],running=0,dragging=null;
let solarDays=[],lastWeather=null,lastCached=false;
let preferences={theme:'solar',unit:'C',language:'zh-CN'};
observeTranslations();
const title=document.getElementById('weather-title'),note=document.getElementById('weather-note'),image=document.getElementById('miku-art'),bubble=document.getElementById('bubble'),mascot=document.getElementById('mascot');
function paint(current,cached=false){
  lastWeather=current;lastCached=cached;
  const night=solarNight(Date.now(),city.tz,solarDays);
  document.documentElement.dataset.theme=preferences.theme==='solar'?(night?'dark':'light'):preferences.theme==='system'?(matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'):preferences.theme;
  const temperature=Math.round(preferences.unit==='F'?current.temp*1.8+32:current.temp);
  title.textContent=city.name+' '+temperature+'°'+preferences.unit;note.textContent=t(current.text)+(cached?' · '+t('离线缓存'):'');
  const symbol=document.getElementById('weather-icon'),src=pixelIcon(current.code,night);symbol.hidden=!src;if(src)symbol.src=src;
  image.src='./assets/'+art(current.code,night)+'.png';
  bubble.title=city.name+' '+current.text+'，观测于 '+new Intl.DateTimeFormat(getLanguage(),{timeZone:city.tz,hour:'2-digit',minute:'2-digit'}).format(new Date(current.time))+'。点击查看天气，拖动初音可移动。';
  window.miku?.setWeather({city:city.name,temp:String(temperature),text:t(current.text)});
}
async function update(){
  const run=++running,c=city;title.textContent=city.name;note.textContent='初音正在看天气…';
  try {
    const savedDays=JSON.parse(localStorage.getItem('miku:solar:'+c.id)||'[]');solarDays=Array.isArray(savedDays)?savedDays.filter(d=>Number.isFinite(Date.parse(d?.time))):[];
  } catch {solarDays=[];}
  try{const current=normalizeCurrent(await request('current',{lat:c.lat,lon:c.lon}));if(run!==running)return;paint(current);try{localStorage.setItem('miku:pet:'+c.id,JSON.stringify(current));}catch{}
    const today=new Intl.DateTimeFormat('sv-SE',{timeZone:c.tz}).format(new Date());
    if(!solarDays.some(d=>new Intl.DateTimeFormat('sv-SE',{timeZone:c.tz}).format(new Date(d.time))===today)) {
      try{const days=normalizeDaily(await request('daily',{lat:c.lat,lon:c.lon})).map(d=>({time:d.time,sunrise:d.sunrise,sunset:d.sunset}));if(run===running){solarDays=days;localStorage.setItem('miku:solar:'+c.id,JSON.stringify(days));paint(current);}}catch{}
    }
  }
  catch(e){if(run!==running)return;let cached;try{cached=JSON.parse(localStorage.getItem('miku:pet:'+c.id));}catch{}if(cached)paint(cached,true);else{note.textContent='天气暂时连不上 · 点击重试';bubble.title=e.message;}}
}
bubble.onclick=()=>window.miku?.openDetails();
document.addEventListener('contextmenu',e=>{e.preventDefault();window.miku?.petMenu();});
mascot.addEventListener('pointerdown',e=>{if(e.button!==0)return;dragging={x:e.screenX,y:e.screenY,moved:false};mascot.setPointerCapture(e.pointerId);window.miku?.dragStart({x:e.screenX,y:e.screenY});});
mascot.addEventListener('pointermove',e=>{if(!dragging)return;if(Math.hypot(e.screenX-dragging.x,e.screenY-dragging.y)>5)dragging.moved=true;if(dragging.moved)window.miku?.dragMove({x:e.screenX,y:e.screenY});});
mascot.addEventListener('pointerup',()=>{const click=dragging&&!dragging.moved;dragging=null;window.miku?.dragEnd();if(click)window.miku?.openDetails();});
mascot.addEventListener('pointercancel',()=>{dragging=null;window.miku?.dragEnd();});
mascot.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' ')window.miku?.openDetails();});
window.miku?.onRefresh(update);window.miku?.onCity(c=>{city=c;update();});window.addEventListener('online',update);setInterval(update,15*60_000);
window.miku?.onPreferences(p=>{preferences=p;setLanguage(p.language);localize();document.title=t('初音天气 · 桌宠');if(lastWeather)paint(lastWeather,lastCached);});
matchMedia('(prefers-color-scheme: light)').addEventListener('change',()=>{if(preferences.theme==='system'&&lastWeather)paint(lastWeather,lastCached);});
setInterval(()=>{if(lastWeather)paint(lastWeather,lastCached);},60_000);
(async()=>{try{city=(await window.miku?.getCity())||city;preferences=(await window.miku?.getPreferences())||preferences;}catch{}setLanguage(preferences.language);localize();document.title=t('初音天气 · 桌宠');update();})();
