export const cityLanguage=lang=>({'zh-CN':'zh','zh-TW':'zh-hant',en:'en',ja:'ja'})[lang]||'zh';
const fields=['name','adm1','adm2','country'];
export function readCityLabel(city,result){
 const match=result?.location?.find(c=>String(c.id)===String(city.id));
 if(!match||typeof match.name!=='string'||!match.name.trim())return null;
 return Object.fromEntries(fields.map(k=>[k,String(match[k]||'').slice(0,100)]));
}
export function cityView(city,language,labels){
 const label=labels?.[String(city.id)]?.[language];
 return label?.name?{...city,...label}:city;
}
export function createCityLabels({request,read,write,onChange=()=>{}}){
 let labels=read()||{};const pending=new Map();
 return {
  view:(city,lang)=>cityView(city,lang,labels),
  async ensure(cities,lang){
   // Two requests at a time; refresh labels at most once every 30 days.
   const queue=[...new Map(cities.filter(c=>c?.id).map(c=>[String(c.id),c])).values()];
   await Promise.all([0,1].map(async()=>{
    while(queue.length){const city=queue.shift(),id=String(city.id),key=id+':'+lang;
     if(labels[id]?.[lang]?.savedAt>Date.now()-30*864e5)continue;
     if(pending.has(key)){await pending.get(key);continue;}
     const job=(async()=>{try{
      const label=readCityLabel(city,await request('lookup',{query:id,lang:cityLanguage(lang)}));
      if(label){labels={...labels,[id]:{...labels[id],[lang]:{...label,savedAt:Date.now()}}};write(labels);onChange();}
     }catch{/* Retain the known name when offline or unsupported. */}})();
     pending.set(key,job);try{await job;}finally{pending.delete(key);}
    }
   }));
  }
 };
}
