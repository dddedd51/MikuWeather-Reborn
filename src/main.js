import './style.css';
import { createIcons, AudioLines, Search, MapPin, LocateFixed, Building2, Plus, Music2, Settings2, Heart, SunMoon, PictureInPicture2, RefreshCw, WifiOff, Cloud, ArrowUp, ArrowDown, Sparkles, Droplets, Wind, Umbrella, Eye, Clock3, CalendarDays, Droplet, ChevronRight, Sunrise, Sunset, X, ArrowUpRight, CloudLightning, CloudSnow, CloudRain, Snowflake, CloudFog, Moon, Sun, CloudSun } from 'lucide';
const icons = { AudioLines, Search, MapPin, LocateFixed, Building2, Plus, Music2, Settings2, Heart, SunMoon, PictureInPicture2, RefreshCw, WifiOff, Cloud, ArrowUp, ArrowDown, Sparkles, Droplets, Wind, Umbrella, Eye, Clock3, CalendarDays, Droplet, ChevronRight, Sunrise, Sunset, X, ArrowUpRight, CloudLightning, CloudSnow, CloudRain, Snowflake, CloudFog, Moon, Sun, CloudSun };
import { CITIES, solarArt as art, normalizeCurrent, normalizeDaily, normalizeHourly, demoWeather, localDate } from './weather.js';
import { request, desktop, android, selectWidgetCity, pinWidget, getPosition, cancelLocation } from './platform.js';
import { nearbyCities,positionDescription } from './location.js';
import { solarPixelIcon as pixelIcon } from './weather-icons.js';
import { solarNight } from './solar.js';
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icon = (name, cls = '') => `<i data-lucide="${name}" class="${cls}"></i>`;
const weatherSymbol=(code,night=false)=>{const src=pixelIcon(code,night);return src?`<img class="weather-icon" src="${src}" alt="" aria-hidden="true" draggable="false">`:icon('cloud');};
const read = (k, fallback) => { try { return JSON.parse(localStorage.getItem(k)) ?? fallback; } catch { return fallback; } };
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* Storage may be full; live weather still works. */ } };
let saved = read('miku:cities', [CITIES[0], CITIES[1], CITIES[2]]);
if (!Array.isArray(saved) || !saved.length || saved.some(c => !c?.name || !c?.tz || !Number.isFinite(Number(c.lat)) || !Number.isFinite(Number(c.lon)))) saved = [CITIES[0]];
let city = saved.find(c => c.id === read('miku:selected', '')) || saved[0];
let prefs = { theme: 'solar', unit: 'C', ...read('miku:prefs', {}) };
if(!read('miku:solar-theme-v1',false)){prefs.theme='solar';save('miku:prefs',prefs);save('miku:solar-theme-v1',true);}
let demo = new URLSearchParams(location.search).get('demo') === '1';
let data = null, loading = false, error = '', epoch = 0, searchEpoch = 0, dialogName = '', refreshingAt = 0;
let mini = false;
let locating=false,locationEpoch=0;
const windNames = {n:'北风',nne:'东北偏北风',ne:'东北风',ene:'东北偏东风',e:'东风',ese:'东南偏东风',se:'东南风',sse:'东南偏南风',s:'南风',ssw:'西南偏南风',sw:'西南风',wsw:'西南偏西风',w:'西风',wnw:'西北偏西风',nw:'西北风',nnw:'西北偏北风',none:'静风',vrb:'风向不定'};
function fmt(n, digits = 0) { return n == null || !Number.isFinite(n) ? '—' : Number(n.toFixed(digits)).toString(); }
function temp(n) { return n == null ? '—' : fmt(prefs.unit === 'F' ? n * 1.8 + 32 : n); }
function time(t, opts = {}) { if (!t || !Number.isFinite(typeof t === 'number' ? t : Date.parse(t))) return '—'; return new Intl.DateTimeFormat('zh-CN', { timeZone: city.tz, ...opts }).format(new Date(t)); }
function dayName(t) { const d = localDate(t, city.tz), today = localDate(Date.now(), city.tz), tomorrow = localDate(Date.now() + 864e5, city.tz); return d === today ? '今天' : d === tomorrow ? '明天' : time(t, {weekday:'long'}); }
function artImg(code, cls='', night=false) { return `<img class="${cls}" src="./assets/${art(code, night)}.png" alt="初音${esc(art(code, night).replace('_',''))}天气插画" draggable="false">`; }
function applyTheme() { document.documentElement.dataset.theme = prefs.theme === 'solar' ? (solarNight(Date.now(),city.tz,data?.daily||[])?'dark':'light') : prefs.theme === 'system' ? (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark') : prefs.theme; }
function cacheKey() { return 'miku:weather:v1:' + city.id; }
function render() {
  applyTheme();
  const now = data?.current, daily = data?.daily || [], hourly = data?.hourly || [];
  const night = solarNight(Date.now(),city.tz,daily);
  const stale = data && !data.demo && (error || Date.now() - data.fetchedAt > 20 * 60_000);
  const status = demo ? '演示数据 · 非实时天气' : loading ? '正在更新天气' : stale ? '离线缓存 · 请留意更新时间' : now ? `观测于 ${time(now.time,{hour:'2-digit',minute:'2-digit'})}` : '等待天气数据';
  $('#app').innerHTML = `
  <aside class="sidebar">
    <a class="brand" href="#" aria-label="初音天气首页"><span class="brand-mark">${icon('audio-lines')}</span><span>初音天气<small>MIKU WEATHER <b>Reborn</b></small></span></a>
    <div class="sidebar-label">每一座城，都有好天气</div>
    <button class="search-open" data-action="search">${icon('search')}<span>搜索城市</span><kbd>⌕</kbd></button>
    <div class="section-caption">我的城市 <span>${saved.length.toString().padStart(2,'0')}</span></div>
    <nav aria-label="已收藏的城市">${saved.map(c => `<button class="city-nav ${c.id===city.id?'active':''}" data-city="${esc(c.id)}">${icon(c.id===city.id?'map-pin':'building-2')}<span>${esc(c.name)}<small>${esc(c.adm1)} · ${esc(c.country||'')}</small></span>${c.id===city.id?'<span class="active-dot"></span>':''}</button>`).join('')}</nav>
    <button class="add-city" data-action="search">${icon('plus')} 添加城市</button>
    <div class="sidebar-bottom"><div class="little-note">${icon('music-2')}<span>让每一天，都有一点初音绿。</span></div><button data-action="settings">${icon('settings-2')} 偏好设置</button><button data-action="about">${icon('heart')} 关于重制版</button><div class="edition">FAN-MADE, WITH LOVE <span>01</span></div></div>
  </aside>
  <main>
    <header class="topbar"><div class="breadcrumb">天气总览 <span>/</span> <strong>${esc(city.name)}</strong></div><div class="toolbar">${demo?'<button class="demo-tag" data-action="demo">退出演示</button>':''}<button class="icon-btn mobile-search" data-action="search" aria-label="搜索城市">${icon('search')}</button><button class="unit-btn" data-action="unit" aria-label="切换温度单位">°${prefs.unit}</button><button class="icon-btn" data-action="theme" aria-label="切换明暗主题">${icon('sun-moon')}</button>${desktop?`<button class="icon-btn" data-action="mini" aria-label="迷你窗口">${icon('picture-in-picture-2')}</button>`:''}<button class="icon-btn mobile-settings" data-action="settings" aria-label="设置">${icon('settings-2')}</button></div></header>
    <div class="page-heading"><div><div class="eyebrow">YOUR DAILY WEATHER COMPANION</div><h1>${esc(city.name)}<span>${icon('map-pin')}</span></h1><p>${esc(city.adm1)}，${esc(city.country||'')} <span class="divider">/</span> ${time(Date.now(),{month:'long',day:'numeric',weekday:'long'})}</p></div><button class="refresh-btn ${loading?'spinning':''}" data-action="refresh" ${loading?'disabled':''}>${icon('refresh-cw')}<span>更新天气</span></button></div>
    ${error?`<div class="notice" role="status">${icon('wifi-off')}<span>${esc(error)}${data?'，当前显示上次保存的数据。':''}</span><button data-action="refresh">重试</button></div>`:''}
    ${demo?'<div class="notice demo-notice" role="status">以下为界面演示数据，不代表当地实际天气。<button data-action="demo">切换实时天气</button></div>':''}
    <section class="hero ${night?'night':''}" aria-label="当前天气">
      <div class="hero-main"><div class="live-status"><span class="status-dot ${stale||demo||!now?'muted':''}"></span>${esc(status)}</div><div class="temperature">${temp(now?.temp)}<span>°</span><small>${prefs.unit}</small></div><div class="condition">${now?weatherSymbol(now.code,night):icon('cloud')}<strong>${esc(now?.text||'等风，也等你')}</strong><span>体感 ${temp(now?.feels)}°</span></div><div class="high-low">${icon('arrow-up')} ${temp(daily[0]?.tempMax)}° <span></span>${icon('arrow-down')} ${temp(daily[0]?.tempMin)}°</div></div>
      <div class="hero-art"><div class="orbit orbit-one"></div><div class="orbit orbit-two"></div><span class="spark spark-one">✧</span><span class="spark spark-two">+</span>${artImg(now?.code||'101','miku-hero',night)}<div class="art-caption">MIKU'S WEATHER DIARY <span>♪</span></div></div>
      <div class="hero-message">${icon('sparkles')}<span>${!now?'天气连接中，初音正在等你。': /雨/.test(now.text)?'出门记得带伞，让初音陪你听雨。':night?'夜色温柔，今天也辛苦了。':'把天气装进口袋，把好心情留给今天。'}</span><span class="hero-number">39</span></div>
    </section>
    ${!now&&!loading?'<div class="empty-actions"><span>暂未获取到实时数据。</span><button data-action="search">选择城市</button><button data-action="demo">预览界面</button></div>':''}
    <section class="metrics" aria-label="天气详情">${[
      ['droplets','相对湿度',fmt(now?.humidity),'%', '空气中的水分'],
      ['wind',windNames[now?.windDir]||'风速',fmt(now?.wind,1),now?.windUnit||'m/s','当前风况'],
      ['umbrella','小时降水量',fmt(now?.precip,1),'mm','过去一小时'],
      ['eye','能见度',fmt(now?.visibility,1),'km','看见更远的风景']
    ].map(([i,label,n,unit,hint])=>`<article class="metric"><div class="metric-label">${icon(i)}${label}</div><div class="metric-value">${n}<span>${unit}</span></div><p>${hint}</p></article>`).join('')}</section>
    <section class="hourly panel"><div class="panel-title"><h2>${icon('clock-3')} 逐小时预报</h2><span>未来 ${hourly.length||24} 小时</span></div>${hourly.length?hourlyChart(hourly):'<div class="no-data">'+(loading?'正在获取逐小时天气…':'暂时没有逐小时预报')+'</div>'}</section>
    <div class="bottom-grid"><section class="daily panel"><div class="panel-title"><h2>${icon('calendar-days')} 七日天气</h2><span>好好安排每一天</span></div>${daily.length?`<div class="daily-list">${daily.map((d,i)=>`<button class="daily-row" data-day="${i}"><span class="day-label">${dayName(d.time)}<small>${time(d.time,{month:'2-digit',day:'2-digit'})}</small></span><span class="day-condition">${weatherSymbol(d.code)}<span>${esc(d.text)}</span></span><span class="rain-chance">${icon('droplet')}${fmt(d.pop)}%</span><span class="day-temp">${temp(d.tempMin)}°<span class="temp-track"><span style="left:${rangePos(d.tempMin,daily)}%;width:${rangeWidth(d,daily)}%"></span></span><strong>${temp(d.tempMax)}°</strong></span>${icon('chevron-right','row-arrow')}</button>`).join('')}</div>`:'<div class="no-data">暂无逐日预报</div>'}</section>
    <aside class="day-aside"><section class="tomorrow panel"><div class="panel-title"><h2>明日小笺</h2>${icon('sparkles')}</div>${daily[1]?`${artImg(daily[1].code,'miku-tomorrow')}<h3>${esc(daily[1].text)} <span>${temp(daily[1].tempMin)}° — ${temp(daily[1].tempMax)}°</span></h3><p>${daily[1].pop>=50?'带上一把伞，从容迎接明天。':'新的一天，也要和初音一起出发。'}</p>`:'<div class="no-data">明天的天气，稍后见。</div>'}</section><section class="sun-card panel"><div>${icon('sunrise')}<span>日出<strong>${time(daily[0]?.sunrise,{hour:'2-digit',minute:'2-digit'})}</strong></span></div><div>${icon('sunset')}<span>日落<strong>${time(daily[0]?.sunset,{hour:'2-digit',minute:'2-digit'})}</strong></span></div></section></aside></div>
    ${data?.partial?.length?`<p class="partial-note">部分预报暂不可用：${esc(data.partial.join('；'))}</p>`:''}
    <footer><a href="https://www.qweather.com/" target="_blank" rel="noreferrer">${icon('cloud')} 数据来自和风天气</a><span>初音天气 · Reborn <b> / </b><button data-action="about">致敬每一份热爱</button></span></footer>
    ${data?.attributions?.length?`<details class="attributions"><summary>数据来源声明</summary>${data.attributions.map(a=>/^https:\/\//.test(a)?`<a href="${esc(a)}" target="_blank" rel="noreferrer">${esc(a)}</a>`:`<p>${esc(a)}</p>`).join('')}</details>`:''}
  </main><dialog id="modal"><div id="modal-content"></div></dialog><div id="toast" role="status"></div>`;
  createIcons({ icons });
  if (dialogName) showDialog(dialogName);
}
function rangePos(n, daily) { const low = Math.min(...daily.map(d=>d.tempMin??0)), high = Math.max(...daily.map(d=>d.tempMax??0)); return n == null ? 0 : Math.max(0,(n-low)/Math.max(high-low,1)*100); }
function rangeWidth(d, daily) { return Math.max(2,rangePos(d.tempMax,daily)-rangePos(d.tempMin,daily)); }
function hourlyChart(hours) {
  const low=Math.min(...hours.map(h=>h.temp))-2, high=Math.max(...hours.map(h=>h.temp))+2;
  const points=hours.map((h,i)=>[i*70+35,85-(h.temp-low)/Math.max(high-low,1)*50]);
  const line=points.map(p=>p.join(',')).join(' '), width=hours.length*70;
  return `<div class="hourly-scroll" tabindex="0" aria-label="左右滚动查看24小时预报"><div class="chart-inner" style="width:${width}px"><svg class="temp-chart" viewBox="0 0 ${width} 105" aria-hidden="true"><defs><linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#67dacb" stop-opacity=".2"/><stop offset="100%" stop-color="#67dacb" stop-opacity="0"/></linearGradient></defs><polygon points="${points[0][0]},105 ${line} ${points.at(-1)[0]},105" fill="url(#chart-fill)"/><polyline points="${line}" fill="none" stroke="#67dacb" stroke-width="2"/>${points.map((p,i)=>`<circle cx="${p[0]}" cy="${p[1]}" r="3" fill="#67dacb"/><text x="${p[0]}" y="${p[1]-13}" text-anchor="middle">${temp(hours[i].temp)}°</text>`).join('')}</svg><div class="hour-cells">${hours.map(h=>`<div class="hour" aria-label="${time(h.time,{hour:'2-digit',minute:'2-digit'})}，${esc(h.text)}，${temp(h.temp)}度，降水概率${fmt(h.pop)}%"><span>${time(h.time,{hour:'2-digit',minute:'2-digit'})}</span>${weatherSymbol(h.code,solarNight(Date.parse(h.time),city.tz,data?.daily||[]))}<span class="chart-gap"></span><small>${icon('droplet')}${fmt(h.pop)}%</small></div>`).join('')}</div></div></div>`;
}
function toast(message) { const el=$('#toast'); el.textContent=message; el.classList.add('visible'); setTimeout(()=>el.classList.remove('visible'),2800); }
async function loadWeather() {
  const run=++epoch, selected=city;
  loading=true; error='';
  if (demo) { data=demoWeather(city); loading=false; render(); return; }
  const cached=read(cacheKey(),null);
  data=cached?.cityId===city.id && cached?.current && Array.isArray(cached.daily) && Array.isArray(cached.hourly) ? cached : null;
  render();
  const results=await Promise.allSettled(['current','daily','hourly'].map(kind=>request(kind,{lat:selected.lat,lon:selected.lon})));
  if(run!==epoch) return;
  loading=false;
  if(results[0].status==='rejected') { error=results[0].reason.message; render(); return; }
  try {
    const next={cityId:city.id,current:normalizeCurrent(results[0].value),daily:[],hourly:[],fetchedAt:Date.now(),attributions:[],partial:[]};
    for(const [index,key,normalizer,label] of [[1,'daily',normalizeDaily,'七日预报'],[2,'hourly',normalizeHourly,'逐小时预报']]) {
      try { if(results[index].status==='rejected') throw results[index].reason; next[key]=normalizer(results[index].value); }
      catch(e) { next.partial.push(label+'：'+e.message); }
    }
    next.attributions=[...new Set(results.filter(r=>r.status==='fulfilled').flatMap(r=>r.value.metadata?.attributions||[]).filter(s=>typeof s==='string'))];
    data=next; save(cacheKey(),next); window.miku?.setWeather({city:city.name,temp:temp(next.current.temp),text:next.current.text});
  } catch(e) { error=e.message; }
  render();
}
function syncCompanion() {
  window.miku?.setCity(city);
  window.miku?.setPreferences(prefs);
  selectWidgetCity(city, prefs.unit, prefs.theme).catch(()=>toast('桌面小组件暂未同步，请稍后重试'));
}
function pickCity(c) { if(!saved.some(s=>s.id===c.id)) { saved.push(c); save('miku:cities',saved); } city=c; save('miku:selected',c.id); syncCompanion(); closeDialog(); loadWeather(); }
function closeDialog() { searchEpoch++;locationEpoch++;locating=false;cancelLocation();dialogName=''; $('#modal')?.close(); }
function showDialog(name) {
  dialogName=name;
  const title=name==='search'?'去看看另一座城':name==='settings'?'让天气，更合心意':name==='about'?'初音天气 · Reborn':'天气详情';
  const box=$('#modal-content');
  box.innerHTML=`<div class="modal-title"><div><div class="eyebrow">MIKU WEATHER</div><h2>${title}</h2></div><button class="icon-btn" data-action="close" aria-label="关闭">${icon('x')}</button></div>`;
  if(name==='search') {
    box.innerHTML+=`<div class="location-card"><button class="secondary locate-button" data-action="locate" ${locating||demo?'disabled':''}>${icon('locate-fixed')} ${locating?'正在定位…':desktop?'IP 定位当前城市 · 腾讯位置服务':android?'定位当前城市 · GPS / 系统定位':'定位当前城市'}</button>${desktop?`<button class="secondary" data-action="locate-system" ${locating||demo?'disabled':''}>使用 Windows 系统定位</button>`:''}<p>${desktop?'IP 定位会连接腾讯位置服务，腾讯可看到请求端公网 IP；应用不保存 IP。IP 推算可能偏到另一座城市，请先确认候选。':android?'仅点击后申请定位权限，精确位置允许时优先 GPS；也支持系统网络定位。完成、取消或超时后停止。':'系统定位坐标仅在本机处理。'}设备定位坐标仅在本机匹配、不上传、不留存；选择后只请求该城市的天气。</p><div id="location-error" role="status"></div></div>`;
    box.innerHTML+=`<form id="search-form"><label for="city-query">城市名 / 拼音</label><div class="search-field">${icon('search')}<input id="city-query" name="query" placeholder="例如：杭州、珠海、Tokyo" autocomplete="off" maxlength="80"><button class="primary" type="submit">搜索</button></div></form><div id="search-results" aria-live="polite"><p class="modal-hint">常用城市</p>${cityResults(CITIES)}</div>`;
  } else if(name==='settings') {
    box.innerHTML+=`<div class="setting-row"><span>外观<small>为你的每一天换个颜色</small></span><select id="theme-select" aria-label="外观主题"><option value="dark">深海绿</option><option value="light">薄荷白</option><option value="system">跟随系统</option></select></div><div class="setting-row"><span>温度单位</span><select id="unit-select" aria-label="温度单位"><option value="C">摄氏度 °C</option><option value="F">华氏度 °F</option></select></div>${desktop?'<div class="setting-row"><span>桌面置顶<small>让初音一直陪在屏幕上</small></span><button class="secondary" data-action="pin">切换置顶</button></div>':''}<h3 class="settings-subtitle">管理城市</h3>${saved.map(c=>`<div class="manage-city"><span>${esc(c.name)}</span><button data-remove="${esc(c.id)}" ${saved.length===1?'disabled':''}>移除</button></div>`).join('')}<div class="settings-note">每 15 分钟自动更新。网络中断时保留最近一次天气，并标明缓存状态。无需填写 API 密钥。</div><button class="secondary" data-action="demo">${demo?'返回实时天气':'查看界面演示'}</button>`;
    if(android) box.innerHTML+=`<h3 class="settings-subtitle">桌面小组件</h3><p class="modal-hint">初音、时钟与天气常驻手机桌面。小组件跟随当前城市和温度单位，点击打开天气详情。</p><div class="widget-actions"><button class="secondary" data-action="widget-wide">添加宽版 · 4×2</button><button class="secondary" data-action="widget-compact">添加紧凑版 · 2×2</button></div><p class="modal-hint">也可长按手机桌面，选择“小组件”→“初音天气”。后台更新时间受系统省电策略影响。</p>`;
    $('#theme-select').insertAdjacentHTML('afterbegin','<option value="solar">自动 · 日出浅色 / 日落深色</option>');
    $('#theme-select').value=prefs.theme; $('#unit-select').value=prefs.unit;
  } else if(name==='about') {
    box.innerHTML+=`${artImg('100','about-miku')}<p>把熟悉的初音天气，带回每一天。</p><p>这是 <a href="https://github.com/lzcapp/MikuWeather_Windows" target="_blank" rel="noreferrer">lzcapp / MikuWeather_Windows</a> 的非官方重制版，延续原作的天气插画与陪伴感。</p><p>原作者：RainySummer / lzcapp<br>天气数据：<a href="https://www.qweather.com/" target="_blank" rel="noreferrer">和风天气 QWeather</a><br>版本：0.2.2 · Windows / Android</p><p>角色插画沿用原仓库资源，角色及素材权利属于各自权利人。本项目与角色权利人无官方关联。</p><details><summary>原作许可证 · Anti-996</summary><pre id="license-text">正在读取…</pre></details><p class="modal-hint">城市列表与天气缓存保存在本机。主动定位在本机匹配附近城市，定位坐标不上传、不留存；天气请求使用所选城市的公开中心坐标。本地城市库来自和风官方城市列表，主要覆盖中国城市及区县。不后台定位，不记录轨迹。系统定位服务自身的数据处理由系统控制。无账号、无广告。</p>`;
    fetch('./LICENSE.txt').then(r=>r.text()).then(t=>{if($('#license-text'))$('#license-text').textContent=t;}).catch(()=>{if($('#license-text'))$('#license-text').textContent='请查看安装目录随附的 LICENSE 文件。';});
  }
  createIcons({icons});
  if(!$('#modal').open) $('#modal').showModal();
  $('#modal').oncancel=closeDialog;
  if(name==='search') $('#city-query').focus();
}
function cityResults(cities) { return cities.map(c=>`<button class="search-result" data-result="${encodeURIComponent(JSON.stringify(c))}">${icon('map-pin')}<span>${esc(c.name)}<small>${esc([c.adm2,c.adm1,c.country].filter((v,i,a)=>v&&a.indexOf(v)===i).join(' · '))}</small></span>${icon('arrow-up-right')}</button>`).join(''); }
async function locateCity(mode=desktop?'ip':'precise') {
  if(locating||demo)return;
  const run=++locationEpoch;locating=true;showDialog('search');
  try {
    const position=await getPosition(mode);
    if(run!==locationEpoch||dialogName!=='search')return;
    const description=positionDescription(position,Date.now(),{allowApproximate:desktop&&mode==='ip'});
    const candidates=await nearbyCities(position);
    if(run!==locationEpoch||dialogName!=='search')return;
    if(!candidates.length)throw new Error('本地城市库暂未覆盖这个位置，请手动搜索城市');
    locating=false;showDialog('search');
    $('#search-results').innerHTML='<p class="modal-hint">'+esc(description)+'</p>'+cityResults(candidates);createIcons({icons});
  } catch(error) {
    if(run!==locationEpoch||dialogName!=='search')return;
    locating=false;showDialog('search');$('#location-error').textContent=error.message||'定位失败，仍可手动选择城市';
  }
}
document.addEventListener('click', async e=>{
  const b=e.target.closest('button, a.brand'); if(!b) return;
  if(b.matches('a.brand')) { e.preventDefault(); window.scrollTo({top:0,behavior:'smooth'}); return; }
  if(b.dataset.city) { pickCity(saved.find(c=>c.id===b.dataset.city)); return; }
  if(b.dataset.result) { pickCity(JSON.parse(decodeURIComponent(b.dataset.result))); return; }
  if(b.dataset.remove) { const id=b.dataset.remove; if(saved.length<=1)return; saved=saved.filter(c=>c.id!==id);save('miku:cities',saved);if(city.id===id){city=saved[0];save('miku:selected',city.id);syncCompanion();closeDialog();loadWeather();}else render();return; }
  if(b.dataset.day!=null) {
    const d=data.daily[Number(b.dataset.day)];showDialog('day');
    $('#modal-content').innerHTML+=`<div class="day-detail">${artImg(d.code,'about-miku')}<h3>${dayName(d.time)} · ${time(d.time,{month:'long',day:'numeric'})}</h3><div class="detail-temp">${temp(d.tempMin)}° — ${temp(d.tempMax)}°</div><p>白天 ${esc(d.text)} · 夜间 ${esc(d.nightText)}</p><p>白天降水概率 ${fmt(d.pop)}% · 最大紫外线指数 ${fmt(d.uv)}</p><p>日出 ${time(d.sunrise,{hour:'2-digit',minute:'2-digit'})} · 日落 ${time(d.sunset,{hour:'2-digit',minute:'2-digit'})}</p><a href="https://www.qweather.com/" target="_blank" rel="noreferrer">数据来自和风天气</a></div>`; return;
  }
  switch(b.dataset.action) {
    case 'search':case 'settings':case 'about': showDialog(b.dataset.action); break;
    case 'locate':locateCity();break;
    case 'locate-system':if(desktop)locateCity('precise');break;
    case 'close':closeDialog();break;
    case 'refresh':if(Date.now()-refreshingAt<10_000){toast('刚刚更新过，请稍后再试');break;}refreshingAt=Date.now();loadWeather();break;
    case 'theme':prefs.theme=document.documentElement.dataset.theme==='dark'?'light':'dark';save('miku:prefs',prefs);syncCompanion();render();break;
    case 'unit':prefs.unit=prefs.unit==='C'?'F':'C';save('miku:prefs',prefs);syncCompanion();render();break;
    case 'widget-wide':case 'widget-compact':{
      try {
        await selectWidgetCity(city,prefs.unit,prefs.theme);
        const result=await pinWidget(b.dataset.action==='widget-wide'?'wide':'compact');
        toast(result.accepted?'请在桌面的确认提示中添加小组件':'请长按手机桌面，在“小组件”中添加初音天气');
      } catch { toast('请长按手机桌面，在“小组件”中添加初音天气'); }
      break;
    }
    case 'demo':demo=!demo;closeDialog();loadWeather();break;
    case 'mini':mini=!mini;document.body.classList.toggle('mini',mini);window.miku?.setMini(mini);break;
    case 'pin':{const enabled=await window.miku?.togglePin();toast(enabled?'已开启窗口置顶':'已取消窗口置顶');break;}
  }
});
document.addEventListener('change',e=>{if(e.target.id==='theme-select'||e.target.id==='unit-select'){prefs[e.target.id==='theme-select'?'theme':'unit']=e.target.value;save('miku:prefs',prefs);syncCompanion();render();}});
document.addEventListener('submit',async e=>{
  if(e.target.id!=='search-form')return;e.preventDefault();
  const query=$('#city-query').value.trim();if(!query)return;
  const run=++searchEpoch;$('#search-results').innerHTML='<p class="modal-hint">正在寻找这座城市…</p>';
  try {
    const results=demo?CITIES.filter(c=>c.name.includes(query)||c.adm1.includes(query)):(await request('lookup',{query})).location||[];
    if(run!==searchEpoch||dialogName!=='search')return;
    $('#search-results').innerHTML=results.length?cityResults(results):'<p class="modal-hint">没有找到，试试城市全名或拼音。</p>';createIcons({icons});
  }catch(err){if(run===searchEpoch&&dialogName==='search')$('#search-results').innerHTML=`<p class="search-error">${esc(err.message)}</p><p class="modal-hint">也可以选择常用城市</p>${cityResults(CITIES)}`;createIcons({icons});}
});
window.addEventListener('online',()=>{if(!loading)loadWeather();});
setInterval(()=>{if(!document.hidden&&!loading&&!dialogName)loadWeather();},15*60_000);
function updateSolarAppearance() {
  applyTheme();
  const night=solarNight(Date.now(),city.tz,data?.daily||[]),current=data?.current;
  $('.hero')?.classList.toggle('night',night);
  if(current) {
    const image=$('.miku-hero'),symbol=$('.condition .weather-icon');
    if(image)image.src='./assets/'+art(current.code,night)+'.png';
    const source=pixelIcon(current.code,night);if(symbol&&source)symbol.src=source;
    const message=$('.hero-message>span');
    if(message)message.textContent=/雨/.test(current.text)?'出门记得带伞，让初音陪你听雨。':night?'夜色温柔，今天也辛苦了。':'把天气装进口袋，把好心情留给今天。';
  }
}
setInterval(updateSolarAppearance,60_000);
matchMedia('(prefers-color-scheme: light)').addEventListener('change',()=>{if(prefs.theme==='system')applyTheme();});
document.addEventListener('visibilitychange',()=>{if(!document.hidden){updateSolarAppearance();if(!loading&&data&&Date.now()-data.fetchedAt>15*60_000)loadWeather();}});
window.miku?.onRefresh(()=>loadWeather());
window.miku?.onDialog(name=>showDialog(name));
(async()=>{try{const c=await window.miku?.getCity();if(c){city=c;if(!saved.some(s=>s.id===c.id)){saved.push(c);save('miku:cities',saved);}save('miku:selected',c.id);}}catch{}loadWeather();syncCompanion();})();

