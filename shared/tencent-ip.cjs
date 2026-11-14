const {createHash}=require('node:crypto');
const ENDPOINT='https://apis.map.qq.com';
const ROUTE='/ws/location/v1/ip';
class IpError extends Error {constructor(code,message){super(message);this.code=code;}}
function validateConfig(config) {
  if(config?.proxyUrl){require('./qweather.cjs').proxyBase(config.proxyUrl);return config;}
  if(!config||typeof config.key!=='string'||!/^([A-Z0-9]{5}-){5}[A-Z0-9]{5}$/i.test(config.key))throw new IpError('IP_CONFIG','腾讯 IP 定位尚未配置');
  if(config.sk!=null&&(typeof config.sk!=='string'||!/^[a-f0-9]{32}$/i.test(config.sk)))throw new IpError('IP_CONFIG','腾讯 IP 定位签名配置不正确');
  return config;
}
function buildUrl(config) {
  validateConfig(config);
  if(config.proxyUrl)return require('./qweather.cjs').proxyBase(config.proxyUrl)+'/ip';
  const query=new URLSearchParams({key:config.key,output:'json'}).toString();
  const sig=config.sk?'&sig='+createHash('md5').update(ROUTE+'?'+query+config.sk).digest('hex'):'';
  return ENDPOINT+ROUTE+'?'+query+sig;
}
function normalizeResponse(data) {
  if(data?.status!==0)throw new IpError('IP_SERVICE','腾讯 IP 定位未成功，请检查服务额度、Key 权限与网络，或手动选择城市');
  const result=data.result,lat=result?.location?.lat,lon=result?.location?.lng,info=result?.ad_info;
  if(typeof lat!=='number'||typeof lon!=='number'||!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180||!info||typeof info.nation!=='string'||!info.nation.trim())throw new IpError('IP_RESPONSE','腾讯没有返回可用的城市信息，请手动选择城市');
  const text=value=>typeof value==='string'?value.trim().slice(0,80):'';
  // No IP, request URL, key, raw response or device coordinates cross into renderer storage.
  return {lat:Number(lat.toFixed(2)),lon:Number(lon.toFixed(2)),source:'TencentIP',approximate:true,adInfo:{nation:text(info.nation),province:text(info.province),city:text(info.city),district:text(info.district)}};
}
function createClient(config,{fetchImpl=globalThis.fetch}={}) {
  let active=null;
  return {
    cancel(){active?.abort();},
    async locate(){
      const url=buildUrl(config);
      if(active)throw new IpError('IP_BUSY','正在获取 IP 大致位置，请稍候');
      const controller=new AbortController();active=controller;
      const timer=setTimeout(()=>controller.abort(),12000);
      try {
        const response=await fetchImpl(url,{signal:controller.signal,redirect:'error',cache:'no-store',headers:{Accept:'application/json'}});
        if(!response.ok)throw new IpError('IP_SERVICE','腾讯 IP 定位暂不可用，请稍后重试或手动选择城市');
        const body=await response.text();
        if(controller.signal.aborted)throw new Error('Cancelled');
        if(body.length>32768)throw new IpError('IP_RESPONSE','腾讯 IP 定位返回异常，请手动选择城市');
        return normalizeResponse(JSON.parse(body));
      } catch(error) {
        if(error instanceof IpError)throw error;
        throw new IpError(controller.signal.aborted?'IP_CANCELLED':'IP_NETWORK',controller.signal.aborted?'IP 定位已取消或超时':'连接腾讯 IP 定位失败，请检查网络或手动选择城市');
      } finally {clearTimeout(timer);if(active===controller)active=null;}
    }
  };
}
module.exports={createClient,validateConfig,buildUrl,normalizeResponse};
