const { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage, shell, screen, protocol, dialog } = require('electron');
const path = require('node:path');
const catalog=require('../src/locales.json');
function t(text){return require('./i18n.cjs')(text,state.preferences?.language);}
const fs = require('node:fs');
const { createClient } = require('../shared/qweather.cjs');
const windowsLocation=require('./windows-location.cjs');
app.disableHardwareAcceleration();
app.commandLine.appendSwitch('enable-logging','file');
app.commandLine.appendSwitch('log-file',path.join(path.dirname(process.execPath),'miku-chromium.log'));
protocol.registerSchemesAsPrivileged([{scheme:'miku',privileges:{standard:true,secure:true,supportFetchAPI:true,corsEnabled:true}}]);
let config={};
for(const file of ['service.json','private.json']){try{config=JSON.parse(fs.readFileSync(path.join(__dirname,file),'utf8'));break;}catch{}}
const client=createClient(config);
const ipClient=require('../shared/tencent-ip.cjs').createClient(config.tencent);
const assets=path.join(__dirname,'../dist');
const iconPath=path.join(assets,'assets/icon.ico');
let pet,details,tray,quitting=false,drag=null,state={},statePath;
const defaultCity={id:'101280601',name:'深圳',adm1:'广东',country:'中国',lat:22.55,lon:114.06,tz:'Asia/Shanghai'};
function log(message){const line=new Date().toISOString()+' '+message+'\n';try{fs.appendFileSync(path.join(path.dirname(process.execPath),'miku-startup.log'),line);}catch{}try{const dir=app.getPath('userData');fs.mkdirSync(dir,{recursive:true});fs.appendFileSync(path.join(dir,'startup.log'),line);}catch{}}
app.on('child-process-gone',(_event,detail)=>log('child process '+JSON.stringify(detail)));
function save(){try{fs.writeFileSync(statePath,JSON.stringify(state));}catch{}}
function trusted(event){return [pet,details].some(w=>w&&!w.isDestroyed()&&event.sender===w.webContents&&event.senderFrame===w.webContents.mainFrame);}
function allowed(url){try{const u=new URL(url);return u.protocol==='https:'&&['qweather.com','www.qweather.com','dev.qweather.com','developer.qweather.com','github.com'].includes(u.hostname);}catch{return false;}}
function configureWindow(w){
  w.removeMenu();
  w.webContents.setWindowOpenHandler(({url})=>{if(allowed(url))shell.openExternal(url);return {action:'deny'};});
  w.webContents.on('will-navigate',(e,url)=>{if(!url.startsWith('miku://app/')){e.preventDefault();if(allowed(url))shell.openExternal(url);}});
  w.webContents.on('did-fail-load',(_e,code,description,url)=>log('load failed '+code+' '+description+' '+url));
  w.webContents.on('preload-error',(_e,_path,error)=>log('preload error '+error.message));
  w.webContents.on('console-message',(_e,level,message)=>{if(level>=2)log('renderer '+message);});
  w.webContents.on('render-process-gone',(_e,detail)=>log('renderer stopped '+JSON.stringify(detail)));
}
function constrain(bounds){
  const area=screen.getDisplayNearestPoint({x:Math.round(bounds.x),y:Math.round(bounds.y)}).workArea;
  return {...bounds,x:Math.round(Math.max(area.x,Math.min(bounds.x,area.x+area.width-bounds.width))),y:Math.round(Math.max(area.y,Math.min(bounds.y,area.y+area.height-bounds.height)))};
}
function showPet(){if(pet&&!pet.isDestroyed()){pet.showInactive();pet.moveTop();}}
function openDetails(openDialog){
  if(!details||details.isDestroyed()){
    const p=pet.getBounds(),area=screen.getDisplayMatching(p).workArea,width=450,height=Math.min(790,area.height-50);
    const pos=constrain({x:p.x-width-14,y:p.y+p.height-height,width,height});
    details=new BrowserWindow({...pos,minWidth:380,minHeight:500,title:t('初音天气 · 天气详情'),show:false,backgroundColor:'#10191e',icon:iconPath,webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,sandbox:true,nodeIntegration:false}});
    configureWindow(details);
    details.on('close',e=>{windowsLocation.cancel();ipClient.cancel();if(!quitting){e.preventDefault();details.hide();}});
    details.once('ready-to-show',()=>{details.show();if(openDialog)details.webContents.send('ui:dialog',openDialog);});
    details.loadURL('miku://app/index.html').catch(e=>log('details load '+e.message));
  }else{details.show();details.focus();if(openDialog)details.webContents.send('ui:dialog',openDialog);}
}
function refresh(){for(const w of [pet,details])if(w&&!w.isDestroyed())w.webContents.send('weather:refresh');}
function makeMenu(){return Menu.buildFromTemplate([
  {label:t('初音天气 · 桌宠'),enabled:false},{label:state.summary||t('点击初音查看天气'),enabled:false},{type:'separator'},
  {label:t('查看天气'),click:()=>openDetails()},{label:t('切换城市 / IP 定位'),click:()=>openDetails('search')},{label:t('刷新天气'),click:refresh},{label:t('偏好设置'),click:()=>openDetails('settings')},
  {label:t('桌宠置顶'),type:'checkbox',checked:!!state.pinned,click:item=>{state.pinned=item.checked;pet.setAlwaysOnTop(item.checked);save();}},
  {label:t(pet?.isVisible()?'隐藏桌宠':'显示桌宠'),click:()=>pet.isVisible()?pet.hide():showPet()},
  {type:'separator'},{label:t('退出'),click:()=>{quitting=true;app.quit();}}
]);}
function updateTray(){if(tray){tray.setToolTip((t('初音天气')+' · '+(state.summary||t('点击初音查看天气'))).slice(0,120));tray.setContextMenu(makeMenu());}}
if(!app.requestSingleInstanceLock())app.quit();
else{
  app.on('second-instance',showPet);app.on('before-quit',()=>{windowsLocation.cancel();ipClient.cancel();quitting=true;});app.on('activate',showPet);
  app.whenReady().then(()=>{
    statePath=path.join(app.getPath('userData'),'desktop-pet.json');
    try{state=JSON.parse(fs.readFileSync(statePath,'utf8'));}catch{}
    if(!state.city)state.city=defaultCity;if(state.pinned==null)state.pinned=true;
    if(!state.preferences)state.preferences={theme:'solar',unit:'C'};
    protocol.handle('miku',request=>{
      const u=new URL(request.url);let pathname;
      try{pathname=decodeURIComponent(u.pathname);}catch{return new Response('Bad path',{status:400});}
      if(u.hostname!=='app'||pathname.includes('..')||pathname.includes('\\'))return new Response('Forbidden',{status:403});
      const file=path.join(assets,pathname.replace(/^\//,''));
      const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.ico':'image/x-icon','.txt':'text/plain; charset=utf-8'};
      try{return new Response(fs.readFileSync(file),{status:200,headers:{'Content-Type':mime[path.extname(file)]||'application/octet-stream'}});}
      catch(e){log('resource read failed '+pathname+' '+e.message);return new Response('Resource unavailable',{status:404});}
    });
    const area=screen.getPrimaryDisplay().workArea;
    const bounds=constrain({x:state.x??area.x+area.width-254,y:state.y??area.y+area.height-290,width:232,height:264});
    pet=new BrowserWindow({...bounds,frame:false,transparent:true,backgroundColor:'#00000000',hasShadow:false,resizable:false,show:false,skipTaskbar:true,alwaysOnTop:state.pinned,title:t('初音天气 · 桌宠'),icon:iconPath,webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,sandbox:true,nodeIntegration:false}});
    configureWindow(pet);pet.once('ready-to-show',showPet);pet.on('close',e=>{if(!quitting){e.preventDefault();pet.hide();}});
    pet.webContents.session.setPermissionRequestHandler((_w,_p,callback)=>callback(false));
    tray=new Tray(nativeImage.createFromPath(iconPath));tray.on('click',showPet);tray.on('double-click',()=>openDetails());updateTray();
    ipcMain.handle('weather:request',async(event,input)=>{
      if(!trusted(event))return {ok:false,code:'DENIED',message:'请求被拒绝'};
      try{return {ok:true,data:await client.request(input?.kind,input?.params)};}catch(e){return {ok:false,code:e.code||'UNKNOWN',message:e.code?e.message:'天气服务暂时不可用'};}
    });
    ipcMain.handle('location:once',async(event,input)=>{
      if(!trusted(event)||event.sender!==details?.webContents)return {ok:false,message:'请求被拒绝'};
      try{return {ok:true,...await windowsLocation.locate(app)};}catch(error){return {ok:false,code:error.code,message:error.message};}
    });
    ipcMain.handle('location:ip',async(event)=>{
      if(!trusted(event)||event.sender!==details?.webContents)return {ok:false,code:'DENIED',message:'请求被拒绝'};
      try{return {ok:true,...await ipClient.locate()};}catch(error){return {ok:false,code:error.code||'IP_NETWORK',message:error.code?error.message:'腾讯 IP 定位暂不可用'};}
    });
    ipcMain.on('location:cancel',event=>{if(trusted(event)){windowsLocation.cancel();ipClient.cancel();}});
    ipcMain.handle('weather:city',event=>trusted(event)?state.city:null);
    ipcMain.handle('weather:preferences',event=>trusted(event)?state.preferences:null);
    ipcMain.on('weather:preferences:set',(event,p)=>{
      if(!trusted(event)||event.sender!==details?.webContents||!p)return;
      const next={theme:['solar','light','dark','system'].includes(p.theme)?p.theme:'solar',unit:p.unit==='F'?'F':'C',language:['zh-CN','zh-TW','en','ja'].includes(p.language)?p.language:'zh-CN'};
      if(JSON.stringify(next)===JSON.stringify(state.preferences))return;
      state.preferences=next;save();updateTray();pet.setTitle(t('初音天气 · 桌宠'));details?.setTitle(t('初音天气 · 天气详情'));pet.webContents.send('weather:preferencesChanged',next);
    });
    ipcMain.on('weather:city:set',(event,c)=>{
      if(!trusted(event)||!c||!Number.isFinite(Number(c.lat))||!Number.isFinite(Number(c.lon))||Math.abs(Number(c.lat))>90||Math.abs(Number(c.lon))>180)return;
      const next={id:String(c.id).slice(0,30),name:String(c.name).slice(0,30),adm1:String(c.adm1||'').slice(0,30),country:String(c.country||'').slice(0,30),lat:Number(c.lat),lon:Number(c.lon),tz:String(c.tz||'Asia/Shanghai').slice(0,60)};
      try{new Intl.DateTimeFormat('en',{timeZone:next.tz});}catch{return;}
      if(JSON.stringify(next)===JSON.stringify(state.city))return;
      state.city=next;save();pet.webContents.send('weather:cityChanged',next);
    });
    ipcMain.on('weather:summary',(event,s)=>{if(!trusted(event)||!s)return;state.summary=String(s.city).slice(0,30)+' '+String(s.temp).slice(0,10)+'° '+String(s.text).slice(0,30);updateTray();});
    ipcMain.on('pet:details',(event,name)=>{if(trusted(event))openDetails(['search','settings','about'].includes(name)?name:undefined);});
    ipcMain.on('pet:menu',event=>{if(trusted(event))makeMenu().popup({window:pet});});
    ipcMain.on('pet:dragStart',(event,p)=>{if(event.sender!==pet.webContents||!Number.isFinite(p?.x)||!Number.isFinite(p?.y))return;drag={x:p.x,y:p.y,bounds:pet.getBounds()};});
    ipcMain.on('pet:dragMove',(event,p)=>{if(event.sender!==pet.webContents||!drag||!Number.isFinite(p?.x)||!Number.isFinite(p?.y))return;pet.setBounds(constrain({...drag.bounds,x:drag.bounds.x+p.x-drag.x,y:drag.bounds.y+p.y-drag.y}));});
    ipcMain.on('pet:dragEnd',event=>{if(event.sender!==pet.webContents)return;drag=null;const b=pet.getBounds();state.x=b.x;state.y=b.y;save();});
    ipcMain.on('window:mini',event=>{if(trusted(event)&&details)details.setSize(400,600);});
    ipcMain.handle('window:pin',event=>{if(!trusted(event))return false;state.pinned=!state.pinned;pet.setAlwaysOnTop(state.pinned);updateTray();save();return state.pinned;});
    pet.loadURL('miku://app/pet.html').catch(e=>{log('pet load '+e.message);dialog.showErrorBox('初音天气加载失败','桌宠资源未能加载，程序目录中的 miku-startup.log 已记录具体错误。');});
    log('desktop pet startup '+JSON.stringify({electron:process.versions.electron,windows:process.getSystemVersion(),packaged:app.isPackaged}));
  }).catch(e=>{log('startup error '+e.message);dialog.showErrorBox('初音天气启动失败',e.message);app.quit();});
}
