const catalog=require('../src/locales.json');
const pattern=new RegExp(Object.keys(catalog).sort((a,b)=>b.length-a.length).map(s=>s.replace(/[.*+?^${}()|[\]\\]/g,c=>'\\'+c)).join('|'),'g');
module.exports=(source,language)=>{const index={'zh-TW':0,en:1,ja:2}[language];return index===undefined?source:String(source).replace(pattern,key=>catalog[key][index]);};
