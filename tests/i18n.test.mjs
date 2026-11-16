import test from 'node:test';import assert from 'node:assert/strict';
import catalog from '../src/locales.json' with {type:'json'};
import {languages,t,normalizeLanguage,setLanguage,getLanguage} from '../src/i18n.js';
import {servicePath} from '../src/service-path.js';
import {buildPath} from '../shared/qweather.cjs';
test('all four languages have complete strings and longest weather phrases translate once',()=>{
 assert.equal(Object.keys(languages).length,4);
 for(const [key,values] of Object.entries(catalog)){assert.equal(values.length,3,key);assert.ok(values.every(v=>typeof v==='string'&&v.length>0),key);}
 assert.equal(t('雷阵雨伴有冰雹','en'),'Thunderstorms with hail');
 assert.equal(t('未来 24 小时','en'),'Next 24 hours');
 assert.equal(t('数据来自和风天气','ja'),'気象データ：QWeather');
 setLanguage('ja');assert.equal(getLanguage(),'ja');setLanguage('invalid');assert.equal(getLanguage(),'zh-CN');
 assert.equal(normalizeLanguage('__proto__'),'zh-CN');
});
test('iOS routes match the proven native proxy routes and reject invalid inputs',()=>{
 for(const kind of ['current','daily','hourly'])assert.equal(servicePath(kind,{lat:22.55,lon:114.06}),buildPath(kind,{lat:22.55,lon:114.06}));
 assert.equal(servicePath('lookup',{query:'Tokyo 東京'}),buildPath('lookup',{query:'Tokyo 東京'}));
 for(const args of [['bad',{}],['current',{lat:null,lon:10}],['daily',{lat:91,lon:2}],['lookup',{query:''}]])assert.throws(()=>servicePath(...args));
});
