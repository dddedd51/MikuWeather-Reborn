import test from 'node:test';
import assert from 'node:assert/strict';
import {solarNight} from '../src/solar.js';
import {solarArt} from '../src/weather.js';
import {solarPixelIcon} from '../src/weather-icons.js';
const days=[{time:'2026-11-14T00:00:00+08:00',sunrise:'2026-11-14T07:10:00+08:00',sunset:'2026-11-14T16:45:00+08:00'}];
test('solar theme uses the selected city actual sunrise and sunset, including exact transitions',()=>{
  assert.equal(solarNight(Date.parse('2026-11-14T06:30:00+08:00'),'Asia/Shanghai',days),true);
  assert.equal(solarNight(Date.parse('2026-11-14T07:10:00+08:00'),'Asia/Shanghai',days),false);
  assert.equal(solarNight(Date.parse('2026-11-14T16:44:59+08:00'),'Asia/Shanghai',days),false);
  assert.equal(solarNight(Date.parse('2026-11-14T16:45:00+08:00'),'Asia/Shanghai',days),true);
});
test('solar theme selects the local date and safely falls back when astronomy is unavailable',()=>{
  assert.equal(solarNight(Date.parse('2026-11-13T23:30:00Z'),'Asia/Shanghai',days),false);
  assert.equal(solarNight(Date.parse('2026-11-14T19:00:00+08:00'),'Asia/Shanghai',[]),true);
  assert.equal(solarNight(Date.parse('2026-11-14T12:00:00+08:00'),'Asia/Shanghai',[]),false);
});
test('cached night weather codes switch to daytime art and icons after sunrise',()=>{
  assert.equal(solarArt(150,false),'晴_日');
  assert.equal(solarArt(151,false),'多云_日');
  assert.equal(solarArt(350,false),'雨_日');
  assert.equal(solarArt(450,false),'雪_日');
  assert.match(solarPixelIcon(150,false),/clear_day/);
  assert.match(solarPixelIcon(151,false),/partly_cloudy_day/);
  assert.equal(solarArt(100,true),'晴_夜');
  assert.match(solarPixelIcon(100,true),/clear_night/);
});
