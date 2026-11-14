import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { pixelCondition,pixelIcon } from '../src/weather-icons.js';
test('Pixel weather mapping distinguishes mixed precipitation, haze and explicit night codes',()=>{
  assert.equal(pixelCondition(100,false),'clear_day');assert.equal(pixelCondition(100,true),'clear_night');
  assert.equal(pixelCondition(150,false),'clear_night');assert.equal(pixelCondition(151,false),'partly_cloudy_night');
  assert.equal(pixelCondition(304),'hail');assert.equal(pixelCondition(302),'thunderstorm');
  assert.equal(pixelCondition(406),'sleet');assert.equal(pixelCondition(401),'snow');
  assert.equal(pixelCondition(502),'haze');assert.equal(pixelCondition(509),'fog');
  assert.equal(pixelIcon(503),null);assert.equal(pixelIcon(999),null);
});
test('every selected Pixel icon is present in the delivered assets',()=>{
  for(const code of [100,150,101,151,104,305,401,406,304,302,501,502,200]) {
    const asset=pixelIcon(code);assert.ok(asset);assert.ok(existsSync(new URL('../public/'+asset.slice(2),import.meta.url)));
  }
});
