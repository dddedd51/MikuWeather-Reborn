import {createHash} from 'node:crypto';

const json=(value,status=200,extra={})=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json; charset=utf-8','Access-Control-Allow-Origin':'*','X-Content-Type-Options':'nosniff',...extra}});
const failure=status=>json({error:'天气服务暂时不可用',code:String(status)},status,{'Cache-Control':'no-store'});
const encoder=new TextEncoder();
let signingKey,signingPem,token='',tokenExpiry=0,tokenIdentity='';
export function route(url){
  if(url.pathname==='/geo/v2/city/lookup'){
    const query=(url.searchParams.get('location')||'').trim();
    if(!query||query.length>80||/[\x00-\x1f]/.test(query))throw Error('input');
    for(const k of url.searchParams.keys())if(!['location','lang','number'].includes(k))throw Error('input');
    return {kind:'lookup',path:'/geo/v2/city/lookup?'+new URLSearchParams({location:query,lang:'zh',number:'12'}),ttl:3600};
  }
  const m=url.pathname.match(/^\/weather\/v1\/(current|daily|hourly)\/(-?\d+(?:\.\d{1,2})?)\/(-?\d+(?:\.\d{1,2})?)$/);
  if(!m||Math.abs(Number(m[2]))>90||Math.abs(Number(m[3]))>180)throw Error('input');
  for(const k of url.searchParams.keys())if(!['lang','localTime',...(m[1]==='daily'?['days']:m[1]==='hourly'?['hours']:[])].includes(k))throw Error('input');
  const q=new URLSearchParams({lang:'zh',localTime:'true'});
  if(m[1]==='daily')q.set('days','7');if(m[1]==='hourly')q.set('hours','24');
  return {kind:m[1],path:`/weather/v1/${m[1]}/${Number(m[2]).toFixed(2)}/${Number(m[3]).toFixed(2)}?${q}`,ttl:m[1]==='current'?300:1800};
}
function base64(bytes){return btoa(String.fromCharCode(...new Uint8Array(bytes))).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');}
export async function jwt(env,now=Date.now()){
  const identity=[env.QWEATHER_KID,env.QWEATHER_ISS,env.QWEATHER_SUB,env.QWEATHER_PRIVATE_KEY].join('|');
  if(token&&now<tokenExpiry&&tokenIdentity===identity)return token;
  if(signingPem!==env.QWEATHER_PRIVATE_KEY){
    const pem=env.QWEATHER_PRIVATE_KEY.replace(/-----[^-]+-----/g,'').replace(/\s/g,'');
    signingKey=await crypto.subtle.importKey('pkcs8',Uint8Array.from(atob(pem),c=>c.charCodeAt(0)),{name:'Ed25519'},false,['sign']);signingPem=env.QWEATHER_PRIVATE_KEY;
  }
  const iat=Math.floor(now/1000)-30;
  const input=base64(encoder.encode(JSON.stringify({alg:'EdDSA',kid:env.QWEATHER_KID})))+'.'+base64(encoder.encode(JSON.stringify({iss:env.QWEATHER_ISS,sub:env.QWEATHER_SUB,iat,exp:iat+900})));
  token=input+'.'+base64(await crypto.subtle.sign('Ed25519',signingKey,encoder.encode(input)));tokenExpiry=now+720000;tokenIdentity=identity;return token;
}
function configured(env){return ['QWEATHER_HOST','QWEATHER_KID','QWEATHER_ISS','QWEATHER_SUB','QWEATHER_PRIVATE_KEY'].every(k=>!!env[k])&&/^(?:[a-z0-9-]+\.)+qweatherapi\.com$/i.test(env.QWEATHER_HOST);}
export function ipResult(data){
  const p=data?.result,loc=p?.location,ad=p?.ad_info;
  if(data?.status!==0||!loc||!Number.isFinite(loc.lat)||!Number.isFinite(loc.lng)||!ad)throw Error('IP');
  const text=x=>typeof x==='string'?x.slice(0,80):'';
  return {status:0,result:{location:{lat:Number(loc.lat.toFixed(2)),lng:Number(loc.lng.toFixed(2))},ad_info:{nation:text(ad.nation),province:text(ad.province),city:text(ad.city),district:text(ad.district)}}};
}
export async function handle(request,env,ctx,fetchImpl=fetch,cache=globalThis.caches?.default){
  const url=new URL(request.url);
  const relay=env.RELAY_SECRET&&request.headers.get('Authorization')==='Bearer '+env.RELAY_SECRET;
  const clientIp=relay?request.headers.get('X-Miku-Client-IP'):request.headers.get('CF-Connecting-IP');
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET, OPTIONS'}});
  if(request.method!=='GET')return failure(405);
  if(url.pathname==='/health')return json({service:'MikuWeather-Reborn',protocol:1,configured:configured(env)});
  let spec;
  try{if(url.pathname!=='/ip')spec=route(url);else if(url.search)throw Error('input');}catch{return failure(400);}
  if(!configured(env))return failure(503);
  // Per-location Cloudflare rate limit, not a claim of a global billing cap.
  if(env.REQUEST_LIMITER){const {success}=await env.REQUEST_LIMITER.limit({key:clientIp||'unknown'});if(!success)return failure(429);}
  try{
    if(url.pathname==='/ip'){
      const ip=clientIp;
      if(!ip||!/^[0-9a-f:.]{3,64}$/i.test(ip)||!env.TENCENT_KEY)return failure(503);
      const query=new URLSearchParams({key:env.TENCENT_KEY,output:'json',ip}).toString();
      const sig=env.TENCENT_SK?'&sig='+createHash('md5').update('/ws/location/v1/ip?'+query+env.TENCENT_SK).digest('hex'):'';
      const response=await fetchImpl('https://apis.map.qq.com/ws/location/v1/ip?'+query+sig,{headers:{Accept:'application/json'},redirect:'manual',signal:AbortSignal.timeout(10000)});
      if(!response.ok)return failure(502);
      const data=await response.json();
      if(data.status!==0)return failure(502);
      return json(ipResult(data),200,{'Cache-Control':'no-store'});
    }
    const key=new Request(url.origin+spec.path);
    const hit=await cache?.match(key);if(hit)return hit;
    const auth=await jwt(env);
    const response=await fetchImpl('https://'+env.QWEATHER_HOST+spec.path,{headers:{Authorization:'Bearer '+auth,Accept:'application/json'},redirect:'manual',signal:AbortSignal.timeout(12000)});
    if(!response.ok)return failure([400,401,402,403,404,429].includes(response.status)?response.status:502);
    const data=await response.json();
    if(data.error||(data.code&&String(data.code)!=='200'))return failure(502);
    const result=json(data,200,{'Cache-Control':'public, max-age='+spec.ttl});
    if(cache)ctx.waitUntil(cache.put(key,result.clone()));
    return result;
  }catch{return failure(502);}
}
export default {fetch:handle};
