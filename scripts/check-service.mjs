import { readFileSync } from 'node:fs';
import { createClient } from '../shared/qweather.cjs';
const config = JSON.parse(readFileSync(new URL('../desktop/private.json', import.meta.url)));
const client = createClient(config);
for (const [kind, params] of [['lookup', {query: '深圳'}], ['current', {lat: 22.55, lon: 114.06}], ['daily', {lat: 22.55, lon: 114.06}], ['hourly', {lat: 22.55, lon: 114.06}]]) {
  try {
    const data = await client.request(kind, params);
    console.log(JSON.stringify({ kind, ok: true, keys: Object.keys(data), time: data.validTime, condition: data.condition, locations: data.location?.map(c => ({name: c.name, id: c.id})), days: data.days?.length, hours: data.hours?.length }));
  } catch (e) { console.log(JSON.stringify({kind, ok: false, code: e.code, message: e.message})); process.exitCode = 1; }
}
