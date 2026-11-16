// Public proxy routes for the iOS native HTTP transport. No credentials are bundled.
export function servicePath(kind,params={}) {
 if(kind==='lookup'){
  const query=String(params.query||'').trim();
  if(!query||query.length>80)throw Error('请输入城市名称');
  return '/geo/v2/city/lookup?'+new URLSearchParams({location:query,lang:'zh',number:'12'});
 }
 if(!['current','daily','hourly'].includes(kind))throw Error('未知天气请求');
 const {lat,lon}=params;
 if(lat==null||lon==null||String(lat).trim()===''||String(lon).trim()===''||!Number.isFinite(Number(lat))||!Number.isFinite(Number(lon))||Math.abs(Number(lat))>90||Math.abs(Number(lon))>180)throw Error('城市坐标无效');
 const query=new URLSearchParams({lang:'zh',localTime:'true'});
 if(kind==='daily')query.set('days','7');if(kind==='hourly')query.set('hours','24');
 return `/weather/v1/${kind}/${Number(lat).toFixed(2)}/${Number(lon).toFixed(2)}?${query}`;
}
