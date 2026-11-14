// Public Pages endpoint. The shared relay secret is a Cloudflare Secret, not source code.
export async function handleRelay(request,env,fetchImpl=fetch){
    if(!['GET','OPTIONS'].includes(request.method))return new Response('Method not allowed',{status:405});
    if(!env.RELAY_SECRET)return new Response('Service configuring',{status:503});
    const url=new URL(request.url);
    const headers=new Headers({Accept:'application/json',Authorization:'Bearer '+env.RELAY_SECRET});
    const ip=request.headers.get('CF-Connecting-IP');if(ip)headers.set('X-Miku-Client-IP',ip);
    try{return await fetchImpl('https://miku-weather-reborn.miku-weather-reborn.workers.dev'+url.pathname+url.search,{method:request.method,headers,redirect:'manual',signal:AbortSignal.timeout(20000)});}
    catch{return Response.json({error:'天气服务暂时不可用',code:'502'},{status:502});}
}
export default {fetch(request,env){return handleRelay(request,env);}};
