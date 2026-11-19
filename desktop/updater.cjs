const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto'),{spawn}=require('node:child_process');
const {checkUpdate}=require('../shared/updates.cjs');
let running=false;
const allowedHost=h=>['github.com','release-assets.githubusercontent.com','objects.githubusercontent.com'].includes(h);
async function download(url,file,size,sha,onProgress){
 let current=url,response;
 for(let i=0;i<6;i++){
  const u=new URL(current);if(u.protocol!=='https:'||!allowedHost(u.hostname)||u.username||u.password)throw Error('Invalid download host');
  response=await fetch(current,{redirect:'manual',signal:AbortSignal.timeout(300000)});
  if([301,302,303,307,308].includes(response.status)){current=new URL(response.headers.get('location'),current).href;continue;}break;
 }
 if(!response?.ok||!response.body)throw Error('Download failed');
 const handle=await fs.open(file,'w'),hash=crypto.createHash('sha256');let bytes=0;
 try{for await(const chunk of response.body){bytes+=chunk.length;if(bytes>size)throw Error('Oversized update');hash.update(chunk);await handle.writeFile(chunk);onProgress({percent:Math.floor(bytes/size*90)});}}finally{await handle.close();}
 if(bytes!==size||hash.digest('hex')!==sha)throw Error('Update checksum mismatch');
}
function run(script,args){return new Promise((resolve,reject)=>{const child=spawn('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',script,...args],{windowsHide:true,stdio:'ignore'});child.on('error',reject);child.on('exit',code=>code===0?resolve():reject(Error('Update staging failed')));});}
function waitForReady(child,file,timeout=60000){
 return new Promise((resolve,reject)=>{
  let finished=false;
  const done=error=>{if(finished)return;finished=true;clearInterval(poll);clearTimeout(deadline);child.off('error',onError);child.off('exit',onExit);error?reject(error):resolve();};
  const onError=()=>done(Error('Update helper could not start'));
  const onExit=()=>done(Error('Update helper exited before readiness'));
  const poll=setInterval(async()=>{try{const ready=JSON.parse((await fs.readFile(file,'utf8')).replace(/^\uFEFF/,''));if(ready.status==='ready')done();}catch{}},100);
  const deadline=setTimeout(()=>{done(Error('Update helper readiness timed out'));child.kill();},timeout);
  child.once('error',onError);child.once('exit',onExit);
 });
}
exports.takeResult=async app=>{
 const file=path.join(app.getPath('userData'),'update-result.json');
 try{const result=JSON.parse((await fs.readFile(file,'utf8')).replace(/^\uFEFF/,''));await fs.unlink(file);return result;}catch{return null;}
};
exports.check=app=>checkUpdate(app.getVersion(),'windows');
exports.install=async(app,onProgress,beforeQuit)=>{
 if(running)throw Error('Update already running');running=true;
 try{
  if(!app.isPackaged)throw Error('Packaged app required');
  const release=await exports.check(app);if(!release.available)return {status:'current'};
  const target=path.dirname(process.execPath),base=await fs.mkdtemp(path.join(app.getPath('temp'),'miku-update-'));
  const probe=path.join(target,'.miku-update-write-test');await fs.writeFile(probe,'');await fs.unlink(probe);
  const zip=path.join(base,'update.zip'),stage=path.join(base,'stage');await download(release.url,zip,release.size,release.sha256,onProgress);
  // PowerShell cannot read virtual paths inside Electron's app.asar.
  const stageHelper=path.join(base,'stage-update.ps1');
  await fs.copyFile(path.join(__dirname,'stage-update.ps1'),stageHelper);
  await run(stageHelper,[zip,stage]);
  const staged=JSON.parse(require('node:fs').readFileSync(path.join(stage,'resources','app.asar','package.json'),'utf8'));
  if(staged.version!==release.version||staged.name!=='miku-weather-reborn')throw Error('Staged app version mismatch');
  const settings=path.join(base,'update.json'),helper=path.join(base,'apply-update.ps1');
  await fs.copyFile(path.join(__dirname,'apply-update.ps1'),helper);
  const ready=path.join(base,'ready.json');
  await fs.writeFile(settings,JSON.stringify({pid:process.pid,target,stage,version:release.version,executable:path.basename(process.execPath),ready,log:path.join(app.getPath('userData'),'update.log'),result:path.join(app.getPath('userData'),'update-result.json')}));
  const child=spawn('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',helper,settings],{detached:true,windowsHide:true,stdio:'ignore'});
  await waitForReady(child,ready);onProgress({percent:100});child.unref();beforeQuit();app.quit();return {status:'restarting'};
 }finally{running=false;}
};
exports.download=download;
exports.waitForReady=waitForReady;
