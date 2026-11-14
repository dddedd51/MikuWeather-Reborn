export function pixelCondition(code,night=false) {
  const c=Number(code);
  if(c===100||c===150)return night||c===150?'clear_night':'clear_day';
  if([101,102,103,151,152,153].includes(c))return night||c>=150?'partly_cloudy_night':'partly_cloudy_day';
  if(c===104)return 'cloudy';
  if(c===304)return 'hail';
  if([302,303].includes(c))return 'thunderstorm';
  if([404,405,406,456].includes(c))return 'sleet';
  if([400,401,402,403,407,408,409,410,450,451,499].includes(c))return 'snow';
  if([300,301,305,306,307,308,309,310,311,312,313,314,315,316,317,318,350,351,399].includes(c))return 'rain';
  if([500,501,509,510,514,515].includes(c))return 'fog';
  if([502,511,512,513].includes(c))return 'haze';
  if(c>=200&&c<=213)return 'wind';
  return null;
}
export function pixelIcon(code,night=false) {
  const condition=pixelCondition(code,night);
  return condition?'./assets/pixel-weather/weather_'+condition+'_pixel.png':null;
}
export function solarPixelIcon(code,night=false) {
  const daytime={150:100,151:101,152:102,153:103};
  return pixelIcon(daytime[Number(code)]??code,night);
}
