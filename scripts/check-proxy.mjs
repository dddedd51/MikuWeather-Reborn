import fs from 'node:fs';
import qweather from '../shared/qweather.cjs';
import tencent from '../shared/tencent-ip.cjs';
const config=JSON.parse(fs.readFileSync(new URL('../desktop/service.json',import.meta.url)));
const response=await fetch(config.proxyUrl+'/health',{signal:AbortSignal.timeout(20000)});
const health=await response.json();if(!response.ok||!health.configured)throw Error('Proxy is not configured');
const client=qweather.createClient(config);
for(const [kind,params] of [['lookup',{query:'深圳'}],['current',{lat:22.55,lon:114.06}],['daily',{lat:22.55,lon:114.06}],['hourly',{lat:22.55,lon:114.06}]]){
  const data=await client.request(kind,params);
  console.log(JSON.stringify({operation:kind,ok:true,cityCount:data.location?.length,weather:data.condition?.text,temperature:data.temperature?.value,days:data.days?.length,hours:data.hours?.length}));
}
try{const ip=await tencent.createClient(config.tencent).locate();console.log(JSON.stringify({operation:'IP',ok:true,city:ip.adInfo.city,ipPresent:Object.hasOwn(ip,'ip')}));}catch(e){console.log(JSON.stringify({operation:'IP',ok:false,code:e.code}));process.exitCode=1;}
