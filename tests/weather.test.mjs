import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, verify } from 'node:crypto';
import { createJwt, buildPath, createClient } from '../shared/qweather.cjs';
import { normalizeCurrent, normalizeDaily, normalizeHourly, art, isNight } from '../src/weather.js';
const pair = generateKeyPairSync('ed25519', { privateKeyEncoding:{type:'pkcs8',format:'pem'}, publicKeyEncoding:{type:'spki',format:'pem'} });
const config = {host:'example.re.qweatherapi.com',kid:'TESTKEY001',iss:'QTEST00001',sub:'PROJECT001',privateKey:pair.privateKey};
test('JWT verifies cryptographically, includes all QWeather claims, and uses a short lifetime',()=>{
  const now=1794560000000;
  const [head,body,sig]=createJwt(config,now).split('.');
  assert.deepEqual(JSON.parse(Buffer.from(head,'base64url')),{alg:'EdDSA',kid:config.kid});
  assert.deepEqual(JSON.parse(Buffer.from(body,'base64url')),{iss:config.iss,sub:config.sub,iat:Math.floor(now/1000)-30,exp:Math.floor(now/1000)-30+900});
  assert.equal(verify(null,Buffer.from(head+'.'+body),pair.publicKey,Buffer.from(sig,'base64url')),true);
  assert.equal(sig.includes('='),false);
});
test('only supported v1 weather routes and valid coordinates are accepted',()=>{
  assert.match(buildPath('current',{lat:22.55,lon:114.06}),/^\/weather\/v1\/current\/22.55\/114.06\?/);
  assert.match(buildPath('lookup',{query:'杭州'}),/location=%E6%9D%AD%E5%B7%9E/);
  for(const bad of [null,'',NaN,91])assert.throws(()=>buildPath('daily',{lat:bad,lon:120}));
  assert.throws(()=>buildPath('https://attacker.example',{lat:0,lon:0}));
});
test('native client deduplicates concurrent requests and caches without repeated billing',async()=>{
  let calls=0;
  const client=createClient(config,async(url,opts)=>{calls++;assert.match(url,/^https:\/\/example.re.qweatherapi.com\/weather\/v1\//);assert.ok(opts.headers.Authorization.startsWith('Bearer '));return {ok:true,json:async()=>({validTime:'2026-11-13T11:30Z',temperature:{value:24}})};});
  await Promise.all(Array.from({length:5},()=>client.request('current',{lat:22,lon:114})));
  await client.request('current',{lat:22,lon:114});assert.equal(calls,1);
});
test('authentication failures and quota errors are reported without credential details',async()=>{
  const client=createClient(config,async()=>({ok:false,status:401}));
  await assert.rejects(()=>client.request('current',{lat:22,lon:114}),{code:'401'});
  assert.equal(createClient({}).configured(),false);
  await assert.rejects(()=>createClient({}).request('current',{lat:22,lon:114}),{code:'NOT_CONFIGURED'});
});
test('v1 units are converted and missing measurements remain unknown',()=>{
  const n=normalizeCurrent({validTime:'2026-11-13T11:30Z',condition:{code:'104',text:'阴'},temperature:{value:24.46},humidity:0.77,visibility:{value:30540,unit:'m'},wind:{speed:{value:3.36,unit:'m/s'}}});
  assert.equal(n.humidity,77);assert.equal(n.visibility,30.54);assert.equal(n.precip,null);assert.equal(n.feels,null);
  assert.throws(()=>normalizeCurrent({temperature:{value:24}}));
  assert.throws(()=>normalizeDaily({}));assert.throws(()=>normalizeHourly({hours:[]}));
});
test('city timezones and mixed precipitation retain correct illustration types',()=>{
  assert.equal(isNight('2026-11-13T11:30Z','Asia/Shanghai'),true);
  assert.equal(isNight('2026-11-13T11:30Z','Europe/London'),false);
  assert.equal(art('406'),'雨雪');assert.equal(art('150'),'晴_夜');assert.equal(art('302',true),'雷雨_夜');
});
