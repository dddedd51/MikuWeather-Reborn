// Exercise the Settings button in an isolated Electron installation and wait for the
// unmodified release executable to reopen. The release metadata points at the CI build.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import {once} from 'node:events';
import {createHash} from 'node:crypto';
import {spawn,spawnSync} from 'node:child_process';
import {createPackageWithOptions, extractAll, extractFile} from '@electron/asar';
import electron from 'electron';

const root=path.resolve(import.meta.dirname,'..'), out=path.join(root,'release');
const version=JSON.parse(fs.readFileSync(path.join(root,'package.json'))).version;
const archive=path.join(out,'MikuWeather-Reborn-'+version+'-Windows-x64.zip');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'miku-ui-update-'));
const target=path.join(temp,'安装 测试'), profile=path.join(temp,'profile'), source=path.join(temp,'fixture-source');
const exe=path.join(target,'Miku Weather Reborn.exe'), previous='0.0.1';
const evidence=path.join(temp,'evidence.log');
const server=http.createServer((req,res)=>{
  if(req.url==='http://miku-update.invalid/start') res.writeHead(302,{Location:'http://miku-update.invalid/end'}).end();
  else if(req.url==='http://miku-update.invalid/end') res.writeHead(200).end('proxy verified');
  else res.writeHead(404).end();
});
server.listen(0,'127.0.0.1');await once(server,'listening');
try {
  const unpack=spawnSync('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass',
    '-File',path.join(root,'desktop/stage-update.ps1'),archive,target,version],{windowsHide:true,encoding:'utf8'});
  assert.equal(unpack.status,0,unpack.stderr);
  fs.copyFileSync(electron,exe);
  const appAsar=path.join(out,'win-unpacked/resources/app.asar');
  extractAll(appAsar,source);
  const pkg=JSON.parse(fs.readFileSync(path.join(source,'package.json')));
  pkg.version=previous;pkg.main='verify-entry.cjs';
  fs.writeFileSync(path.join(source,'package.json'),JSON.stringify(pkg));
  fs.writeFileSync(path.join(source,'verify-entry.cjs'),'('+fixtureMain.toString()+')();');
  await createPackageWithOptions(source,path.join(target,'resources/app.asar'),{unpack:'**/MikuLocation.exe'});
  fs.mkdirSync(profile);
  fs.writeFileSync(path.join(profile,'desktop-pet.json'),JSON.stringify({smokeMarker:'keep',preferences:{theme:'dark',unit:'F'}}));
  const hash=createHash('sha256');for await(const part of fs.createReadStream(archive))hash.update(part);
  const name=path.basename(archive),url='https://github.com/dddedd51/MikuWeather-Reborn/releases/download/v'+version+'/'+name;
  const data={tag_name:'v'+version,assets:[{name,state:'uploaded',browser_download_url:url,size:fs.statSync(archive).size,digest:'sha256:'+hash.digest('hex')}]};
  const env={...process.env,MIKU_UI_ARCHIVE:archive,MIKU_UI_METADATA:JSON.stringify(data),MIKU_UI_EVIDENCE:evidence,MIKU_UI_PORT:String(server.address().port)};
  delete env.ELECTRON_RUN_AS_NODE;
  const child=spawn(exe,['--user-data-dir='+profile],{env,cwd:target,windowsHide:true,stdio:'ignore'});
  child.on('error',e=>fs.appendFileSync(evidence,'ERROR '+e.message+'\n'));
  const deadline=Date.now()+240000, startup=path.join(profile,'startup.log');
  let success=false;
  while(Date.now()<deadline) {
    const evidenceText=fs.existsSync(evidence)?fs.readFileSync(evidence,'utf8'):'';
    if(evidenceText.includes('ERROR'))throw Error(evidenceText);
    const updateLog=path.join(profile,'update.log');
    if(fs.existsSync(updateLog)&&/\bfailed:/i.test(fs.readFileSync(updateLog,'utf8')))break;
    const logs=fs.existsSync(startup)?fs.readFileSync(startup,'utf8'):'';
    if(logs.includes('"version":"'+version+'"')&&logs.includes('update result applied')){success=true;break;}
    await new Promise(resolve=>setTimeout(resolve,500));
  }
  if(!success) {
    for(const file of [evidence,startup,path.join(profile,'update.log'),path.join(profile,'update-helper.log')])if(fs.existsSync(file))console.error(fs.readFileSync(file,'utf8').slice(-4000));
    throw Error('The release did not restart and confirm the applied update');
  }
  assert.match(fs.readFileSync(evidence,'utf8'),/proxy redirect and body passed/);
  assert.match(fs.readFileSync(evidence,'utf8'),/clicked install/);
  assert.equal(JSON.parse(extractFile(path.join(target,'resources/app.asar'),'package.json')).version,version);
  assert.equal(JSON.parse(fs.readFileSync(path.join(profile,'desktop-pet.json'))).smokeMarker,'keep');
  console.log('Packaged Windows Settings update passed, including system proxy transport, restart, installed version and retained profile.');
} finally {
  server.close();
  const stop="Get-Process -Name 'Miku Weather Reborn' -ErrorAction SilentlyContinue | Where-Object { $_.Path -eq $env:MIKU_UI_EXE } | Stop-Process -Force -ErrorAction SilentlyContinue";
  spawnSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',stop],{windowsHide:true,env:{...process.env,MIKU_UI_EXE:exe}});
  if(path.dirname(temp)===path.resolve(os.tmpdir())&&path.basename(temp).startsWith('miku-ui-update-')){
    try { fs.rmSync(temp,{recursive:true,force:true,maxRetries:10,retryDelay:350}); }
    catch(error){ if(!['EBUSY','EPERM','EACCES'].includes(error.code))throw error;console.warn('Temporary test folder still in use:',temp); }
  }
}

// This function exists only in the test installation's temporary entry point.
function fixtureMain() {
  const {app,session}=require('electron');
  const fs=require('node:fs');
  const {Readable}=require('node:stream');
  const note=text=>fs.appendFileSync(process.env.MIKU_UI_EVIDENCE,text+'\n');
  const realFetch=require('./desktop/update-fetch.cjs');
  const metadata=JSON.parse(process.env.MIKU_UI_METADATA);
  require.cache[require.resolve('./desktop/update-fetch.cjs')].exports=async(url)=>{
    if(url===require('./shared/updates.cjs').RELEASE_API)return Response.json(metadata);
    if(url!==metadata.assets[0].browser_download_url)throw Error('Unexpected test download '+url);
    return new Response(Readable.toWeb(fs.createReadStream(process.env.MIKU_UI_ARCHIVE)));
  };
  app.on('web-contents-created',(_event,view)=>view.once('did-finish-load',async()=>{
    try {
      if(view.getURL().endsWith('/pet.html')){
        await session.defaultSession.setProxy({mode:'fixed_servers',proxyRules:'http=127.0.0.1:'+process.env.MIKU_UI_PORT});
        const first=await realFetch('http://miku-update.invalid/start',{redirect:'manual'});
        if(first.status!==302)throw Error('Proxy redirect failed ('+first.status+')');
        const last=await realFetch(first.headers.get('location'),{redirect:'manual'});
        if(await last.text()!=='proxy verified')throw Error('Proxy response failed');
        await session.defaultSession.setProxy({mode:'system'});
        note('proxy redirect and body passed');
        await view.executeJavaScript("window.miku.openDetails('settings')");
      } else if(view.getURL().endsWith('/index.html')){
        const wait=async(expression)=>{
          const end=Date.now()+25000;
          while(Date.now()<end){if(await view.executeJavaScript(expression))return;await new Promise(resolve=>setTimeout(resolve,100));}
          throw Error('Settings timeout: '+expression+' / '+await view.executeJavaScript("document.querySelector('#update-status')?.textContent"));
        };
        await wait("Boolean(document.querySelector('#check-update, [data-action=settings]'))");
        await view.executeJavaScript("if(!document.querySelector('#check-update'))document.querySelector('[data-action=settings]').click()");
        await wait("Boolean(document.querySelector('#check-update') && !document.querySelector('#check-update').disabled)");
        await view.executeJavaScript("document.querySelector('#check-update').click()");
        await wait("Boolean(document.querySelector('#install-update')?.offsetWidth && !document.querySelector('#install-update').disabled)");
        note('clicked install');
        await view.executeJavaScript("document.querySelector('#install-update').click()");
      }
    } catch(e) { note('ERROR '+e.stack);app.exit(1); }
  }));
  require('./desktop/main.cjs');
}
