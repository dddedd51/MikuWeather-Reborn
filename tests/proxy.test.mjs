import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,verify} from 'node:crypto';
import qweather from '../shared/qweather.cjs';
import tencent from '../shared/tencent-ip.cjs';
import {route,jwt,handle,ipResult} from '../worker/src/index.js';
import {handleRelay} from '../worker/pages-relay/_worker.js';
const pair=generateKeyPairSync('ed25519',{privateKeyEncoding:{type:'pkcs8',format:'pem'},publicKeyEncoding:{type:'spki',format:'pem'}});
const env={QWEATHER_HOST:'example.re.qweatherapi.com',QWEATHER_KID:'TESTKEY001',QWEATHER_ISS:'QTEST00001',QWEATHER_SUB:'PROJECT001',QWEATHER_PRIVATE_KEY:pair.privateKey,TENCENT_KEY:'dummy-secret-key'};
test('public clients use a proxy with no private key, authorization header or query credential',async()=>{
  const client=qweather.createClient({proxyUrl:'https://weather.example/'},async(url,opts)=>{
    assert.equal(new URL(url).origin,'https://weather.example');assert.deepEqual(opts.headers,{Accept:'application/json'});
    return {ok:true,json:async()=>({temperature:{value:24}})};
  });
  assert.equal(client.configured(),true);await client.request('current',{lat:22.55,lon:114.06});
  assert.equal(tencent.buildUrl({proxyUrl:'https://weather.example/'}),'https://weather.example/ip');
  for(const url of ['http://weather.example','https://user:pass@weather.example','https://weather.example/api','https://weather.example/?key=abc','https://weather.example/#secret'])assert.throws(()=>qweather.proxyBase(url));
});
test('worker limits upstream routes and canonicalizes forecast windows',()=>{
  assert.match(route(new URL('https://proxy.test/weather/v1/daily/22.55/114.06?days=100')).path,/days=7$/);
  assert.throws(()=>route(new URL('https://proxy.test/weather/v1/current/91/114')));
  assert.throws(()=>route(new URL('https://proxy.test/https://attacker.test')));
  assert.throws(()=>route(new URL('https://proxy.test/geo/v2/city/lookup?location=a&url=https://attacker.test')));
});
test('worker signs a valid Ed25519 token without returning the signing material',async()=>{
  const token=await jwt(env,1794560000000),[h,b,s]=token.split('.');
  assert.equal(verify(null,Buffer.from(h+'.'+b),pair.publicKey,Buffer.from(s,'base64url')),true);
  assert.equal(JSON.parse(Buffer.from(b,'base64url')).exp-JSON.parse(Buffer.from(b,'base64url')).iat,900);
  const health=await handle(new Request('https://proxy.test/health'),env,{});
  assert.deepEqual(await health.json(),{service:'MikuWeather-Reborn',protocol:1,configured:true});
});
test('worker rate limit stops upstream use and errors redact provider responses',async()=>{
  let calls=0;const fetcher=async()=>{calls++;return new Response(JSON.stringify({error:env.QWEATHER_PRIVATE_KEY}),{status:401});};
  const request=new Request('https://proxy.test/weather/v1/current/22.55/114.06');
  const blocked=await handle(request,{...env,REQUEST_LIMITER:{limit:async()=>({success:false})}}, {},fetcher);assert.equal(blocked.status,429);assert.equal(calls,0);
  const error=await handle(request,env,{},fetcher);assert.equal(error.status,401);assert.equal((await error.text()).includes('PRIVATE KEY'),false);
});
test('IP proxy uses only the edge-provided caller IP, redacts it, and never caches location',async()=>{
  const fixture={status:0,result:{ip:'203.0.113.5',location:{lat:22.55,lng:114.06},ad_info:{nation:'中国',province:'广东省',city:'深圳市',district:'南山区'}}};
  assert.equal('ip' in ipResult(fixture).result,false);
  const response=await handle(new Request('https://proxy.test/ip',{headers:{'CF-Connecting-IP':'203.0.113.5'}}),env,{},async(url)=>{const target=new URL(url);assert.equal(target.hostname,'apis.map.qq.com');assert.equal(target.searchParams.get('ip'),'203.0.113.5');return Response.json(fixture);});
  assert.equal(response.headers.get('Cache-Control'),'no-store');assert.equal((await response.text()).includes('203.0.113.5'),false);
  assert.equal((await handle(new Request('https://proxy.test/ip?ip=1.1.1.1'),env,{})).status,400);
});

test('worker accepts a relayed IP only with the server relay secret',async()=>{
  const fixture={status:0,result:{location:{lat:22.55,lng:114.06},ad_info:{nation:'中国',city:'深圳市'}}};
  for(const trusted of [false,true]){
    let limitedIp;
    const request=new Request('https://proxy.test/ip',{headers:{'CF-Connecting-IP':'203.0.113.1','X-Miku-Client-IP':'198.51.100.2',Authorization:trusted?'Bearer test-relay-secret':'Bearer wrong'}});
    const response=await handle(request,{...env,RELAY_SECRET:'test-relay-secret',REQUEST_LIMITER:{limit:async({key})=>{limitedIp=key;return {success:true};}}},{},async(url)=>{
      assert.equal(new URL(url).searchParams.get('ip'),trusted?'198.51.100.2':'203.0.113.1');return Response.json(fixture);
    });
    assert.equal(response.status,200);assert.equal(limitedIp,trusted?'198.51.100.2':'203.0.113.1');
  }
});

test('Pages relay replaces spoofed headers and sends only to the fixed worker',async()=>{
  const request=new Request('https://relay.test/ip',{headers:{'CF-Connecting-IP':'203.0.113.7','X-Miku-Client-IP':'198.51.100.1',Authorization:'Bearer user-input',Cookie:'private-cookie'}});
  const response=await handleRelay(request,{RELAY_SECRET:'test-relay-secret'},async(url,opts)=>{
    assert.equal(url,'https://miku-weather-reborn.miku-weather-reborn.workers.dev/ip');
    assert.equal(opts.headers.get('X-Miku-Client-IP'),'203.0.113.7');assert.equal(opts.headers.get('Authorization'),'Bearer test-relay-secret');assert.equal(opts.headers.has('Cookie'),false);
    return Response.json({status:0});
  });
  assert.equal(response.status,200);
  assert.equal((await handleRelay(new Request('https://relay.test/ip',{method:'POST'}),{})).status,405);
  assert.equal((await handleRelay(request,{})).status,503);
});
