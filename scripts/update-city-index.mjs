import { mkdirSync,writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const source='https://raw.githubusercontent.com/qwd/LocationList/master/China-City-List-latest.csv';
const response=await fetch(source);
if(!response.ok)throw new Error('城市库下载失败：'+response.status);
const bytes=Buffer.from(await response.arrayBuffer()),csv=bytes.toString('utf8').replace(/^\uFEFF/,'');
function parseLine(line) {
  const cells=[];let cell='',quoted=false;
  for(let i=0;i<line.length;i++) { const c=line[i];if(c==='"'){if(quoted&&line[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}else if(c===','&&!quoted){cells.push(cell);cell='';}else cell+=c; }
  cells.push(cell);return cells;
}
const lines=csv.trim().split(/\r?\n/),version=parseLine(lines.shift())[0],headers=parseLine(lines.shift());
const cities=lines.map(line=>{
  const record=Object.fromEntries(parseLine(line).map((value,index)=>[headers[index],value]));
  const city={id:record.Location_ID,name:record.Location_Name_ZH,adm1:record.Adm1_Name_ZH,adm2:record.Adm2_Name_ZH,country:record.Country_Region_ZH,tz:record.Timezone,lat:Number(record.Latitude),lon:Number(record.Longitude)};
  if(!city.id||!city.name||!city.tz||!Number.isFinite(city.lat)||!Number.isFinite(city.lon)||Math.abs(city.lat)>90||Math.abs(city.lon)>180)throw new Error('城市库条目无效');
  return city;
});
if(cities.length<2000||new Set(cities.map(c=>c.id)).size!==cities.length)throw new Error('城市库覆盖或ID校验失败');
mkdirSync('public/assets/locations',{recursive:true});
writeFileSync('public/assets/locations/china.json',JSON.stringify(cities));
writeFileSync('public/assets/locations/source.json',JSON.stringify({source,version,sha256:createHash('sha256').update(bytes).digest('hex'),count:cities.length,updatedAt:new Date().toISOString(),note:'QWeather 官方城市列表，本地匹配城市中心；非行政边界数据。'},null,2));
console.log('本地城市库已生成：'+cities.length+' 个城市及区县');
