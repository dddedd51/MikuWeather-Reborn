function approximatePosition(position) {
  const lat=position?.lat,lon=position?.lon;
  if(typeof lat!=='number'||typeof lon!=='number'||!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180)throw new Error('定位坐标无效');
  return {lat:Number(lat.toFixed(2)),lon:Number(lon.toFixed(2))};
}
function systemPosition(position,{allowApproximate=false,now=Date.now()}={}) {
  const coordinates=approximatePosition(position);
  const accuracy=position?.accuracy,timestamp=position?.timestamp,source=position?.source;
  const fail=(code,message)=>{const error=new Error(message);error.code=code;throw error;};
  if(typeof accuracy!=='number'||!Number.isFinite(accuracy)||accuracy<=0)fail('UNAVAILABLE','系统位置没有有效精度信息，请手动选择城市');
  if(typeof timestamp!=='number'||!Number.isFinite(timestamp)||now-timestamp>120000||timestamp-now>60000)fail('STALE_POSITION','系统给到的位置已过期，请重新定位或手动搜索城市');
  if(source==='Default')fail('DEFAULT_POSITION','系统返回的是默认位置，无法判断所在地，请手动选择城市');
  const approximate=source==='IPAddress'||accuracy>5000;
  if(approximate&&!allowApproximate)fail('LOW_ACCURACY','系统只提供了大致位置，可查看系统大致位置并确认城市，或手动搜索城市');
  return {...coordinates,accuracy:Math.max(800,accuracy),source:String(source||'Unknown').slice(0,30),timestamp,approximate};
}
module.exports={approximatePosition,systemPosition};
