import {solarArt} from './weather.js';
export const widgetOpacity=v=>Math.max(0,Math.min(100,Math.round(Number(v)||0)));
export const widgetTextScale=v=>Math.max(100,Math.min(140,Math.round(Number(v)||110)));
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function widgetSettings(prefs,city,data){
 const opacity=widgetOpacity(prefs.widgetOpacity),scale=widgetTextScale(prefs.widgetTextScale),n=data?.current?.temp;
 const temp=Number.isFinite(n)?Math.round(prefs.unit==='F'?n*1.8+32:n):'—';
 return `<h3 class="settings-subtitle">小组件外观</h3><div class="widget-preview-scene"><div class="widget-preview" style="--widget-opacity:${opacity/100};--widget-scale:${scale/100}"><div class="widget-preview-background"></div><img src="./assets/${solarArt(data?.current?.code||100,false)}.png" alt=""><span class="widget-preview-refresh" aria-hidden="true">↻</span><div class="widget-preview-content"><span class="widget-preview-clock">13:46</span><strong class="widget-preview-temp">${temp}°<small>${prefs.unit}</small></strong><span>${esc(data?.current?.text||'天气')}</span><span data-no-i18n>${esc(city.name)}</span></div></div></div><p class="modal-hint">效果预览，实际布局随桌面尺寸适配</p><label class="widget-range-label" for="widget-opacity">底板不透明度 <output id="widget-opacity-value">${opacity}%</output></label><input class="widget-slider" id="widget-opacity" type="range" min="0" max="100" step="5" value="${opacity}"><p class="modal-hint">0% 全透明 · 100% 不透明，文字和初音保持清晰</p><label class="widget-range-label" for="widget-text-scale">小组件字号 <output id="widget-scale-value">${scale}%</output></label><input class="widget-slider" id="widget-text-scale" type="range" min="100" max="140" step="10" value="${scale}"><p class="modal-hint">温度独立大字显示；空间不足时优先保留温度</p>`;
}
export function bindWidgetSettings(root,prefs,save){
 for(const [id,key,normalize,output,css] of [['widget-opacity','widgetOpacity',widgetOpacity,'widget-opacity-value','--widget-opacity'],['widget-text-scale','widgetTextScale',widgetTextScale,'widget-scale-value','--widget-scale']]){
  const el=root.querySelector('#'+id);if(!el)continue;
  el.addEventListener('input',()=>{prefs[key]=normalize(el.value);root.querySelector('#'+output).textContent=prefs[key]+'%';root.querySelector('.widget-preview').style.setProperty(css,prefs[key]/100);});
  el.addEventListener('change',save);
 }
}
