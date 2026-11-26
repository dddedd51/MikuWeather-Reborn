import test from 'node:test';
import assert from 'node:assert/strict';
import {widgetCode} from '../src/widget-code.js';

test('widget settings preserve international names, coordinates, units and time zone', () => {
  const city = {id:'US1', displayName:'München | 東京', lat:48.14, lon:11.58, tz:'Europe/Berlin'};
  const code = widgetCode(city, {unit:'F', theme:'dark', language:'ja'});
  assert.deepEqual(code.split('|').map(decodeURIComponent),
    ['MW1','US1','München | 東京','48.14','11.58','Europe/Berlin','F','dark','ja']);
});
