function dateAt(timestamp,timeZone) {return new Intl.DateTimeFormat('sv-SE',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(timestamp));}
export function solarNight(now,timeZone,days=[]) {
  const today=dateAt(now,timeZone);
  const day=days.find(d=>Number.isFinite(Date.parse(d.time||d.forecastStartTime))&&dateAt(Date.parse(d.time||d.forecastStartTime),timeZone)===today);
  const sunrise=Date.parse(day?.sunrise||day?.astro?.sunrise),sunset=Date.parse(day?.sunset||day?.astro?.sunset);
  if(Number.isFinite(sunrise)&&Number.isFinite(sunset)&&sunrise<sunset)return now<sunrise||now>=sunset;
  const hour=Number(new Intl.DateTimeFormat('en-GB',{timeZone,hour:'2-digit',hourCycle:'h23'}).format(new Date(now)));
  return hour<6||hour>=18;
}
