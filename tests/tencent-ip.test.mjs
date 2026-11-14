import test from 'node:test';
import assert from 'node:assert/strict';
import tencent from '../shared/tencent-ip.cjs';
import {ipCities,positionDescription} from '../src/location.js';
import {readFileSync} from 'node:fs';
const config={key:'AAAAA-BBBBB-CCCCC-DDDDD-EEEEE-FFFFF'};
const fixture={status:0,result:{ip:'203.0.113.1',location:{lat:31.23456,lng:121.47654},ad_info:{nation:'中国',province:'上海市',city:'上海市',district:'黄浦区',adcode:310101}}};
test('Tencent IP lookup sends neither explicit IP nor device coordinates and strips the returned IP',async()=>{
  let calls=0;
  const client=tencent.createClient(config,{fetchImpl:async(url,options)=>{
    calls++;const target=new URL(url);assert.equal(target.origin,'https://apis.map.qq.com');assert.equal(target.pathname,'/ws/location/v1/ip');
    assert.deepEqual([...target.searchParams.keys()],['key','output']);assert.equal(options.redirect,'error');assert.equal(options.cache,'no-store');
    return {ok:true,text:async()=>JSON.stringify(fixture)};
  }});
  const result=await client.locate();assert.equal(calls,1);assert.equal(result.source,'TencentIP');assert.equal(result.approximate,true);
  assert.equal(result.lat,31.23);assert.ok(!('ip' in result));assert.ok(!('key' in result));
  assert.throws(()=>positionDescription(result));assert.match(positionDescription(result,Date.now(),{allowApproximate:true}),/网络出口.*另一座城市.*确认/);
});
test('IP candidates match the reported administrative city rather than a nearby district or unrelated city',()=>{
  const cities=JSON.parse(readFileSync(new URL('../public/assets/locations/china.json',import.meta.url)));
  const position=tencent.normalizeResponse(fixture),candidates=ipCities(position,cities);
  assert.equal(candidates[0].name,'上海');assert.ok(candidates.every(c=>c.adm1==='上海市'));
  assert.deepEqual(ipCities({...position,adInfo:{nation:'美国',province:'California',city:'San Francisco'}},cities),[]);
  assert.deepEqual(ipCities({...position,adInfo:{nation:'中国',province:'广东省',city:''}},cities),[]);
  const sameNames=[{name:'朝阳',adm1:'辽宁省',adm2:'朝阳市'},{name:'朝阳',adm1:'北京市',adm2:'北京市'}];
  assert.equal(ipCities({...position,adInfo:{nation:'中国',province:'辽宁省',city:'朝阳市'}},sameNames)[0],sameNames[0]);
});
test('Tencent failures and malformed results never expose keys, URLs or raw IP responses',async()=>{
  assert.throws(()=>tencent.normalizeResponse({status:110,message:config.key}),{code:'IP_SERVICE'});
  assert.throws(()=>tencent.normalizeResponse({...fixture,result:{...fixture.result,location:{lat:NaN,lng:121}}}),{code:'IP_RESPONSE'});
  const client=tencent.createClient(config,{fetchImpl:async()=>{throw new Error(tencent.buildUrl(config));}});
  await assert.rejects(client.locate(),error=>error.code==='IP_NETWORK'&&!error.message.includes(config.key)&&!error.message.includes('https://'));
});
test('cancellation rejects late responses and active requests cannot overlap',async()=>{
  let release,entered;
  const ready=new Promise(resolve=>{entered=resolve;});
  const client=tencent.createClient(config,{fetchImpl:async()=>{entered();return new Promise(resolve=>{release=()=>resolve({ok:true,text:async()=>JSON.stringify(fixture)});});}});
  const pending=client.locate();await ready;
  await assert.rejects(client.locate(),{code:'IP_BUSY'});client.cancel();release();await assert.rejects(pending,{code:'IP_CANCELLED'});
});
