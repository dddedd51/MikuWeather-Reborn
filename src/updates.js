import {Capacitor,CapacitorHttp} from '@capacitor/core';
import pkg from '../package.json' with {type:'json'};
import {t} from './i18n.js';
import * as updateProtocol from '../shared/updates.mjs';
import {NativeWeather as Native} from './platform.js';
let result=null,busy=false,status='',progress=0,listener=false;
let failureLog='',showRelease=false;
const problems={
 check:'连接发布服务失败，请检查网络或系统代理',
 directory:'应用目录不可写，请将便携版解压到可写文件夹',
 download:'下载或校验失败，可重试或打开发布页',
 stage:'安装包解压或版本校验失败',
 backup:'更新助手未能备份文件，请查看更新日志'
};
const platform=()=>window.miku?'windows':Capacitor.getPlatform()==='android'?'android':'ios';
export function updatePanel(){return `<h3 class="settings-subtitle">应用更新</h3><p class="modal-hint">当前版本 <span data-no-i18n>${pkg.version}</span> · 启动时自动检查更新</p><div id="update-status" role="status">${t(status)}</div><progress id="update-progress" max="100" value="${progress}" ${busy?'':'hidden'}></progress><div class="widget-actions"><button class="secondary" id="check-update" ${busy?'disabled':''}>检查更新</button><button class="primary" id="install-update" ${!result?.available?'hidden':''} ${busy?'disabled':''}>${platform()==='ios'?'下载 IPA':'下载并安装更新'}</button></div>${platform()==='ios'?'<p class="modal-hint">iPhone 更新需要重新签名侧载，不能直接覆盖安装</p>':''}`;}
function paint(){
 const statusEl=document.querySelector('#update-status');if(statusEl)statusEl.textContent=t(status)+(result?.available?' · '+result.version:'');
 const bar=document.querySelector('#update-progress');if(bar){bar.hidden=!busy;bar.value=progress;}
 const check=document.querySelector('#check-update');if(check)check.disabled=busy;
 const install=document.querySelector('#install-update');if(install){install.disabled=busy;install.hidden=!result?.available;}
 const fallback=document.querySelector('#update-help');if(fallback){fallback.hidden=!showRelease;fallback.querySelector('small').textContent=failureLog;}
}
async function check(manual){
 if(busy)return;busy=true;failureLog='';showRelease=false;status='正在检查更新…';paint();
 try{
  if(window.miku)result=await window.miku.checkUpdate();
  else if(Capacitor.getPlatform()==='android')result=await Native.checkUpdate();
  else {const response=await CapacitorHttp.get({url:updateProtocol.RELEASE_API,headers:{Accept:'application/vnd.github+json'},connectTimeout:20000,readTimeout:20000});if(response.status!==200)throw Error();result=updateProtocol.releaseUpdate(typeof response.data==='string'?JSON.parse(response.data):response.data,pkg.version,'ios');}
  status=result.available?'发现新版本':'已是最新版本';
  localStorage.setItem('miku:update-check',JSON.stringify({at:Date.now(),current:pkg.version,result}));
  if(result.available&&!manual)banner();
 }catch{result=null;showRelease=true;status='检查更新失败，请稍后重试';}finally{busy=false;paint();}
}
function banner(){
 document.getElementById('update-banner')?.remove();const b=document.createElement('button');b.id='update-banner';b.className='update-banner';b.textContent=t('发现新版本')+' '+result.version+' · '+t('查看更新');
 b.onclick=()=>{b.remove();document.querySelector('[data-action="settings"]')?.click();};document.body.append(b);
}
async function install(){
 if(busy||!result?.available)return;
 if(platform()==='ios'){window.open(result.page,'_blank','noopener');return;}
 busy=true;failureLog='';showRelease=false;status='正在下载并校验更新…';progress=0;paint();
 try{
  if(window.miku){
    const r=await window.miku.installUpdate();
    if(r.status==='failed'){status=problems[r.step]||'更新未完成，请重试或从发布页下载';failureLog=r.log;showRelease=true;}
    else if(r.status==='current'){result=null;status='已是最新版本';}
    else status='正在重启应用…';
  }
  else {const r=await Native.installUpdate();status=r.status==='permission'?'请允许安装此来源的应用，返回后再次点击安装':r.status==='installer'?'请在系统安装界面确认更新':'更新已准备好';}
 }catch{showRelease=true;status='更新未完成，请重试或从发布页下载';}finally{busy=false;paint();}
}
export function bindUpdates(root){
 const statusEl=root.querySelector('#update-status');
 if(statusEl&&!root.querySelector('#update-help')){
   const help=document.createElement('div');help.id='update-help';help.hidden=true;
   const link=document.createElement('a');link.href=updateProtocol.RELEASE_PAGE;link.target='_blank';link.rel='noopener';link.textContent=t('打开发布页');
   help.append(link,document.createElement('br'),document.createElement('small'));statusEl.after(help);
 }
 root.querySelector('#check-update')?.addEventListener('click',()=>check(true));root.querySelector('#install-update')?.addEventListener('click',install);paint();
 if(!listener){listener=true;const callback=p=>{
   progress=Math.max(0,Math.min(100,p.percent||0));
   if(p.stage==='stage')status='正在解压并验证安装包…';
   if(p.stage==='backup')status='正在备份旧版文件…';
   if(p.stage==='restart')status='正在重启应用…';
   paint();
 };window.miku?.onUpdateProgress(callback);if(Capacitor.getPlatform()==='android')Native.addListener('updateProgress',callback);}
}
export function startUpdateChecks(){
 if(!window.miku&&!Capacitor.isNativePlatform())return;
 try{const saved=JSON.parse(localStorage.getItem('miku:update-check'));if(saved?.current===pkg.version&&Date.now()-saved.at<6*36e5){result=saved.result;status=result?.available?'发现新版本':'已是最新版本';if(result?.available)banner();return;}}catch{}
 setTimeout(()=>check(false),6000);
}
