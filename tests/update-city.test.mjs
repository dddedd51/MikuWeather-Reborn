import test from 'node:test';import assert from 'node:assert/strict';
import {createCityLabels,cityView,readCityLabel} from '../src/city-labels.js';
import {compareVersion,releaseUpdate} from '../shared/updates.mjs';
import {widgetOpacity,widgetTextScale} from '../src/widget-settings.js';
import {route} from '../worker/src/index.js';
import {buildPath} from '../shared/qweather.cjs';
import {servicePath} from '../src/service-path.js';
const city={id:'101280601',name:'深圳',lat:22.55,lon:114.06,tz:'Asia/Shanghai'};
test('city label is selected by exact ID, preserves geography, and caches separately by language',async()=>{
 let calls=0,saved;const names={en:'Shenzhen',ja:'深セン市','zh-hant':'深圳'};
 const labels=createCityLabels({request:async(k,p)=>{calls++;return {location:[{id:'wrong',name:'Other'}, {...city,name:names[p.lang],lat:0}]};},read:()=>null,write:v=>saved=v});
 await Promise.all([labels.ensure([city],'en'),labels.ensure([city],'en')]);assert.equal(calls,1);
 await labels.ensure([city],'ja');assert.equal(calls,2);
 assert.equal(labels.view(city,'en').name,'Shenzhen');assert.equal(labels.view(city,'ja').lat,22.55);assert.equal(labels.view(city,'zh-CN').name,'深圳');
 assert.equal(cityView(city,'ja',saved).name,'深セン市');assert.equal(readCityLabel(city,{location:[{id:'wrong',name:'Tokyo'}]}),null);
});
test('language parameters and cache routes stay distinct across native, iOS and proxy',()=>{
 for(const lang of ['zh','zh-hant','en','ja']){
  const p={query:city.id,lang};assert.equal(buildPath('lookup',p),servicePath('lookup',p));
  assert.equal(new URL('https://x'+route(new URL('https://x'+buildPath('lookup',p))).path).searchParams.get('lang'),lang);
 }
 assert.match(buildPath('lookup',{query:'Tokyo',lang:'bad&token=x'}),/lang=zh&/);
});
test('updater uses numeric versions, exact release asset, digest, size and stable releases',()=>{
 assert.equal(compareVersion('0.3.10','0.3.9'),1);assert.equal(compareVersion('v0.3.1','0.3.1'),0);assert.throws(()=>compareVersion('0.3.1-beta','0.3.0'));
 const name='MikuWeather-Reborn-0.4.0-Android.apk';
 const release={tag_name:'v0.4.0',assets:[{name,state:'uploaded',size:200,digest:'sha256:'+'a'.repeat(64),browser_download_url:'https://github.com/dddedd51/MikuWeather-Reborn/releases/download/v0.4.0/'+name}]};
 assert.equal(releaseUpdate(release,'0.3.1','android').available,true);
 assert.equal(releaseUpdate(release,'0.5.0','android').available,false);
 assert.throws(()=>releaseUpdate({...release,prerelease:true},'0.3.1','android'));
 for(const edit of [{digest:''},{size:0},{browser_download_url:'https://evil.example/a.apk'},{name:'Wrong.apk'}])assert.throws(()=>releaseUpdate({...release,assets:[{...release.assets[0],...edit}]},'0.3.1','android'));
});
test('widget appearance clamps invalid preferences and preserves transparent default',()=>{
 assert.equal(widgetOpacity(undefined),0);assert.equal(widgetOpacity(-2),0);assert.equal(widgetOpacity(101),100);assert.equal(widgetTextScale(999),140);assert.equal(widgetTextScale(undefined),110);
});
