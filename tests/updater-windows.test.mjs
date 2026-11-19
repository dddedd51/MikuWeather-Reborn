import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {spawn,spawnSync} from 'node:child_process';
import {once} from 'node:events';
import {fileURLToPath} from 'node:url';
import {waitForReady,takeResult} from '../desktop/updater.cjs';
const windows=process.platform==='win32';
const helper=fileURLToPath(new URL('../desktop/apply-update.ps1',import.meta.url));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(read,timeout=15000){const end=Date.now()+timeout;while(Date.now()<end){try{const value=await read();if(value)return value;}catch{}await sleep(50);}throw Error('Timed out waiting for updater test');}
async function fixture(){
 const base=await fs.mkdtemp(path.join(os.tmpdir(),'miku-updater-test-'));
 const target=path.join(base,"安装 目录'版"),stage=path.join(base,'stage'),source=path.join(base,'Stub.cs'),exe='Miku Weather Reborn.exe';
 await fs.mkdir(path.join(target,'resources'),{recursive:true});await fs.mkdir(path.join(stage,'resources'),{recursive:true});
 await fs.writeFile(source,'using System;using System.IO;class Stub {static void Main(){string d=AppDomain.CurrentDomain.BaseDirectory;File.WriteAllText(Path.Combine(d,"started.txt"),File.ReadAllText(Path.Combine(d,"resources","app.asar")));}}');
 const compiler=path.join(process.env.WINDIR,'Microsoft.NET','Framework64','v4.0.30319','csc.exe');
 const build=spawnSync(compiler,['/nologo','/target:exe','/out:'+path.join(target,exe),source],{encoding:'utf8',windowsHide:true});
 assert.equal(build.status,0,build.stdout+build.stderr);
 await fs.copyFile(path.join(target,exe),path.join(stage,exe));
 await fs.writeFile(path.join(target,'resources','app.asar'),'0.3.4');await fs.writeFile(path.join(stage,'resources','app.asar'),'0.3.5');
 await fs.writeFile(path.join(target,'preferences.json'),'keep settings');
 await fs.writeFile(path.join(stage,'resources','new-file.txt'),'new file');
 const app=spawn(process.execPath,['-e','setInterval(()=>{},1000)'],{windowsHide:true,stdio:'ignore'});await once(app,'spawn');
 const config={pid:app.pid,target:target+path.sep,stage,executable:exe,version:'0.3.5',ready:path.join(base,'ready.json'),log:path.join(base,'update.log'),result:path.join(base,'update-result.json')};
 const settings=path.join(base,'update.json');await fs.writeFile(settings,JSON.stringify(config));
 return {base,target,stage,app,config,settings};
}
function launch(f){
 const child=spawn('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',helper,f.settings],{windowsHide:true,stdio:['ignore','pipe','pipe']});
 let output='';child.stdout.on('data',x=>output+=x);child.stderr.on('data',x=>output+=x);
 const exited=once(child,'exit').then(([code])=>({code,output}));return {child,exited};
}
async function ready(f,h){
 try{await waitForReady(h.child,f.config.ready,15000);}
 catch(error){const exit=await h.exited;let log='';try{log=await fs.readFile(f.config.log,'utf8');}catch{}throw Error(error.message+'\n'+exit.output+'\n'+log);}
}
async function cleanup(f,child){
 if(child&&child.exitCode===null)child.kill();if(f.app.exitCode===null)f.app.kill();
 await sleep(200);
 const resolved=path.resolve(f.base),temp=path.resolve(os.tmpdir())+path.sep;
 assert.ok(resolved.startsWith(temp)&&path.basename(resolved).startsWith('miku-updater-test-'));
 await fs.rm(resolved,{recursive:true,force:true,maxRetries:5,retryDelay:200});
}
test('Windows updater waits for the app, replaces nested files in Unicode paths and launches the new version',{skip:!windows},async()=>{
 const f=await fixture();const h=launch(f);
 try{
  await ready(f,h);
  assert.equal(await fs.readFile(path.join(f.target,'resources','app.asar'),'utf8'),'0.3.4');
  assert.equal(h.child.exitCode,null);f.app.kill();
  const exit=await h.exited;assert.equal(exit.code,0,exit.output);
  assert.equal(await until(()=>fs.readFile(path.join(f.target,'started.txt'),'utf8')),'0.3.5');
  assert.equal(await fs.readFile(path.join(f.target,'resources','new-file.txt'),'utf8'),'new file');
  assert.equal(await fs.readFile(path.join(f.target,'preferences.json'),'utf8'),'keep settings');
  const result=await takeResult({getPath:()=>f.base});assert.equal(result.status,'applied');assert.equal(result.version,'0.3.5');
 }finally{await cleanup(f,h.child);}
});
test('Windows updater rejects a read-only destination before acknowledging readiness',{skip:!windows},async()=>{
 const f=await fixture();await fs.chmod(path.join(f.target,'resources','app.asar'),0o444);const h=launch(f);
 try{
  await assert.rejects(waitForReady(h.child,f.config.ready,15000),/before readiness/);
  const exit=await h.exited;assert.equal(exit.code,1,exit.output);assert.equal(f.app.exitCode,null);
  const result=await takeResult({getPath:()=>f.base});assert.equal(result.status,'failed');assert.match(result.message,/read-only/);
  assert.equal(await fs.readFile(path.join(f.target,'resources','app.asar'),'utf8'),'0.3.4');
 }finally{await fs.chmod(path.join(f.target,'resources','app.asar'),0o666);await cleanup(f,h.child);}
});
test('Windows updater rolls back changed files, removes new files and restarts the old version on copy failure',{skip:!windows},async()=>{
 const f=await fixture();await fs.writeFile(path.join(f.stage,'resources','z-fail.txt'),'missing after preflight');const h=launch(f);
 try{
  await ready(f,h);
  await fs.unlink(path.join(f.stage,'resources','z-fail.txt'));f.app.kill();
  const exit=await h.exited;assert.equal(exit.code,0,exit.output);
  assert.equal(await until(()=>fs.readFile(path.join(f.target,'started.txt'),'utf8')),'0.3.4');
  const result=await takeResult({getPath:()=>f.base});assert.equal(result.status,'failed');
  assert.equal(await fs.access(path.join(f.target,'resources','new-file.txt')).then(()=>true,()=>false),false,result.message);
  assert.equal(await fs.readFile(path.join(f.target,'preferences.json'),'utf8'),'keep settings');
  assert.match(await fs.readFile(result.log,'utf8'),/does not exist|找不到|不存在/);
 }finally{await cleanup(f,h.child);}
});
test('helper launch failure and missing readiness reject the handoff without claiming an update',async()=>{
 const base=await fs.mkdtemp(path.join(os.tmpdir(),'miku-ready-test-'));
 try{
  const missing=spawn(path.join(base,'missing-executable'),[],{windowsHide:true,stdio:'ignore'});
  await assert.rejects(waitForReady(missing,path.join(base,'ready.json'),1000),/could not start/);
  const stalled=spawn(process.execPath,['-e','setInterval(()=>{},1000)'],{windowsHide:true,stdio:'ignore'});
  await assert.rejects(waitForReady(stalled,path.join(base,'ready.json'),200),/timed out/);
 }finally{assert.ok(path.resolve(base).startsWith(path.resolve(os.tmpdir())+path.sep));await fs.rm(base,{recursive:true,force:true});}
});
test('Electron reads the staged package version inside an external ASAR before quitting',{skip:!windows||!process.env.CI},async()=>{
 const base=await fs.mkdtemp(path.join(os.tmpdir(),'miku-asar-test-'));
 try{
  const source=path.join(base,'source'),archive=path.join(base,'stage','resources','app.asar'),result=path.join(base,'read-result.json'),profile=path.join(base,'profile');
  await fs.mkdir(source,{recursive:true});await fs.mkdir(path.dirname(archive),{recursive:true});await fs.mkdir(profile);
  await fs.writeFile(path.join(source,'package.json'),JSON.stringify({name:'miku-weather-reborn',version:'0.3.5'}));
  const {createPackage}=await import('@electron/asar');await createPackage(source,archive);
  const script=path.join(base,'read-asar.cjs');
  await fs.writeFile(script,`const {app}=require('electron');const fs=require('node:fs');app.disableHardwareAcceleration();app.setPath('userData',${JSON.stringify(profile)});app.whenReady().then(()=>{const pkg=JSON.parse(fs.readFileSync(${JSON.stringify(path.join(archive,'package.json'))},'utf8'));fs.writeFileSync(${JSON.stringify(result)},JSON.stringify(pkg));app.exit(0);});`);
  const {default:electron}=await import('electron');const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
  const processResult=spawnSync(electron,[script],{env,windowsHide:true,encoding:'utf8',timeout:30000});
  assert.equal(processResult.status,0,processResult.stderr);assert.equal(JSON.parse(await fs.readFile(result,'utf8')).version,'0.3.5');
 }finally{assert.ok(path.resolve(base).startsWith(path.resolve(os.tmpdir())+path.sep));await fs.rm(base,{recursive:true,force:true,maxRetries:5,retryDelay:200});}
});
