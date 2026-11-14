import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { approximatePosition,systemPosition } from '../shared/location.cjs';
import { nearestCities,nearbyCities,positionDescription } from '../src/location.js';
import { buildPath } from '../shared/qweather.cjs';
const cities=JSON.parse(readFileSync(new URL('../public/assets/locations/china.json',import.meta.url)));
test('IP, default, inaccurate and stale system positions are rejected before city suggestions',()=>{
  for(const position of [{source:'IPAddress',accuracy:1000},{source:'Default',accuracy:100},{source:'WiFi',accuracy:5001},{source:'WiFi',accuracy:1000,timestamp:0}])assert.throws(()=>positionDescription(position,180000));
  assert.match(positionDescription({source:'WiFi',accuracy:800,timestamp:180000},180000),/Wi-Fi.*800 米/);
  assert.doesNotMatch(positionDescription({lat:22.543219,lon:114.057812,source:'Satellite',accuracy:25,timestamp:180000},180000),/22\.543|114\.057/);
});

test('system positions are quantized and invalid positions never enter matching',()=>{
  assert.deepEqual(approximatePosition({lat:22.543219,lon:114.057812}),{lat:22.54,lon:114.06});
  assert.deepEqual(approximatePosition({lat:-33.876543,lon:151.234567}),{lat:-33.88,lon:151.23});
  for(const position of [{lat:null,lon:0},{lat:'22',lon:0},{lat:91,lon:0},{lat:0,lon:181},{lat:NaN,lon:0}]) {
    assert.throws(()=>approximatePosition(position));assert.throws(()=>nearestCities(position,cities));
  }
});
test('IP and low-accuracy candidates require an explicit approximate request and never bypass stale or default checks',()=>{
  const now=180000,position={lat:31.234567,lon:121.476543,source:'IPAddress',accuracy:80000,timestamp:now};
  assert.throws(()=>systemPosition(position,{now}),{code:'LOW_ACCURACY'});
  const candidate=systemPosition(position,{now,allowApproximate:true});
  assert.equal(candidate.approximate,true);
  assert.equal(candidate.source,'IPAddress');
  assert.equal(candidate.lat,31.23);
  assert.match(positionDescription(candidate,now,{allowApproximate:true}),/IP 大致位置.*另一座城市.*确认/);
  assert.throws(()=>positionDescription(candidate,now));
  for(const invalid of [{...position,source:'Default'},{...position,timestamp:0},{...position,timestamp:now+60001},{...position,accuracy:NaN},{...position,lat:91}])assert.throws(()=>systemPosition(invalid,{now,allowApproximate:true}));
  assert.throws(()=>positionDescription({...candidate,source:'Default'},now,{allowApproximate:true}));
  assert.throws(()=>positionDescription({...candidate,timestamp:0},now,{allowApproximate:true}));
  const precise=systemPosition({...position,source:'WiFi',accuracy:25},{now});
  assert.equal(precise.approximate,false);
  assert.equal(precise.accuracy,800);
});
test('offline city matching returns city centers and does not guess unsupported regions',()=>{
  assert.ok(cities.length>3500);
  const beijing=cities.find(c=>c.id==='101010100');
  assert.equal(nearestCities({lat:beijing.lat,lon:beijing.lon},cities)[0],beijing);
  assert.deepEqual(nearestCities({lat:0,lon:0},cities),[]);
  const across=nearestCities({lat:0,lon:179.99},[{id:'across',lat:0,lon:-179.99},{id:'far',lat:0,lon:170}]);
  assert.equal(across[0].id,'across');
});
test('device position is not sent in the city-index fetch or to a reverse geolocation route',async()=>{
  const originalFetch=globalThis.fetch;let calls=0;
  globalThis.fetch=async(url,options)=>{calls++;assert.equal(url,'./assets/locations/china.json');assert.equal(options,undefined);return {ok:true,json:async()=>cities};};
  try {
    const result=await nearbyCities({lat:22.543219,lon:114.057812});
    assert.equal(calls,1);assert.equal(result.length,5);
    for(const city of result){assert.ok(cities.includes(city));assert.ok(!('accuracy' in city));}
    assert.throws(()=>buildPath('locateCity',{lat:22.54,lon:114.06}));
  } finally {globalThis.fetch=originalFetch;}
});
