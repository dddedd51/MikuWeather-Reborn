let cityIndex;
export function positionDescription(position,now=Date.now(),{allowApproximate=false}={}) {
  if(position.source==='Default')throw new Error('系统返回的是默认位置，无法判断所在地，请手动搜索城市');
  const approximate=['IPAddress','TencentIP'].includes(position.source)||Number(position.accuracy)>5000;
  if(approximate&&!allowApproximate)throw new Error('系统位置精度不足，无法可靠判断所在城市，请手动搜索城市');
  if(Number.isFinite(position.timestamp)&&now-position.timestamp>120000)throw new Error('系统给到的位置已过期，请重新定位或手动搜索城市');
  if(position.source==='TencentIP')return '腾讯位置服务 · IP 大致位置：'+[position.adInfo?.province,position.adInfo?.city].filter((s,i,a)=>s&&a.indexOf(s)===i).join(' / ')+'。这是网络出口所属地区，可能偏到另一座城市。请确认候选后再选择，VPN、代理或运营商出口会影响结果。';
  if(approximate)return (position.source==='IPAddress'?'IP 大致位置':'系统大致位置（精度较低）')+'：可能偏到另一座城市，VPN、代理或运营商出口都会影响 IP 结果。这里只提供候选，请确认城市后再选择；也可直接手动搜索。';
  const sources={WiFi:'Wi-Fi',Satellite:'GPS / 卫星',Cellular:'移动网络',AndroidNetwork:'Android 系统网络定位',AndroidFused:'Android 系统融合定位',Obfuscated:'系统大致位置',Unknown:'系统位置'};
  const source=sources[position.source]||'系统大致位置';
  const meters=Number(position.accuracy);
  const precision=Number.isFinite(meters)&&meters>0?' · 精度约 '+(meters<1000?Math.ceil(meters)+' 米':(meters/1000).toFixed(1)+' 公里'):'';
  return source+precision+'。请确认你所在的城市，城市中心匹配不等于行政区边界。';
}
function distance(position,city) {
  const radians=Math.PI/180,lat1=position.lat*radians,lat2=city.lat*radians;
  const a=Math.sin((lat2-lat1)/2)**2+Math.cos(lat1)*Math.cos(lat2)*Math.sin((city.lon-position.lon)*radians/2)**2;
  return 12742*Math.atan2(Math.sqrt(Math.max(0,a)),Math.sqrt(Math.max(0,1-a)));
}
export function nearestCities(position,cities,limit=5) {
  if(typeof position?.lat!=='number'||typeof position?.lon!=='number'||!Number.isFinite(position.lat)||!Number.isFinite(position.lon)||Math.abs(position.lat)>90||Math.abs(position.lon)>180)throw new Error('系统返回了无效位置，请手动选择城市');
  return cities.map(city=>({city,km:distance(position,city)})).filter(c=>Number.isFinite(c.km)&&c.km<=180).sort((a,b)=>a.km-b.km).slice(0,limit).map(c=>c.city);
}
export async function nearbyCities(position) {
  if(!cityIndex)cityIndex=fetch('./assets/locations/china.json').then(response=>{if(!response.ok)throw new Error('本地城市库暂不可用');return response.json();}).catch(error=>{cityIndex=null;throw error;});
  const cities=await cityIndex;
  if(position.source==='TencentIP')return ipCities(position,cities);
  return nearestCities(position,cities);
}
export function ipCities(position,cities) {
  const info=position.adInfo;
  if(!info||!['中国','China','中华人民共和国'].includes(info.nation))return [];
  const normalize=value=>String(value||'').replace(/(壮族自治区|回族自治区|维吾尔自治区|自治区|特别行政区|省|市|区|县)$/,'');
  const province=normalize(info.province),city=normalize(info.city),district=normalize(info.district);
  if(!province||!city)return [];
  const candidates=cities.filter(c=>normalize(c.adm1)===province&&(normalize(c.name)===city||normalize(c.adm2)===city));
  const score=c=>normalize(c.name)===city?0:district&&normalize(c.name)===district?1:2;
  return candidates.sort((a,b)=>score(a)-score(b)).slice(0,5);
}
