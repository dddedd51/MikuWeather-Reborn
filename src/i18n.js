import catalog from './locales.json' with {type:'json'};
export const languages = {'zh-CN':'简体中文','zh-TW':'繁體中文',en:'English',ja:'日本語'};
export const normalizeLanguage = value => Object.hasOwn(languages,value) ? value : 'zh-CN';
let language='zh-CN';
export const getLanguage=()=>language;
export const setLanguage=value=>{language=normalizeLanguage(value);if(typeof document!=='undefined')document.documentElement.lang=language;};
export const apiLanguage=()=>({'zh-CN':'zh','zh-TW':'zh-hant',en:'en',ja:'ja'})[language];
const keys=Object.keys(catalog).sort((a,b)=>b.length-a.length);
const pattern=new RegExp(keys.map(s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|'),'g');
// One pass, longest phrase first: translated strings never become input to another translation.
export function t(source,lang=language){
 const index={'zh-TW':0,en:1,ja:2}[normalizeLanguage(lang)];
 return index===undefined?String(source??''):String(source??'').replace(pattern,key=>catalog[key][index]);
}
const originals=new WeakMap();
export function localize(root=document.body){
 const translate=(node,attr)=>{
  const value=attr?node.getAttribute(attr):node.nodeValue;
  let map=originals.get(node);if(!map){map={};originals.set(node,map);}
  const key=attr||'text',previous=map[key];
  const source=previous&&value===previous.output?previous.source:value;
  const output=t(source);map[key]={source,output};
  if(value!==output){if(attr)node.setAttribute(attr,output);else node.nodeValue=output;}
 };
 if(root.nodeType===3){translate(root);return;}
 if(root.closest?.('[data-no-i18n],script,style,pre'))return;
 for(const el of [root,...root.querySelectorAll('*')]){
  if(el.closest('[data-no-i18n],script,style,pre'))continue;
  for(const attr of ['aria-label','title','placeholder','alt'])if(el.hasAttribute(attr))translate(el,attr);
  for(const node of el.childNodes)if(node.nodeType===3)translate(node);
 }
}
export function observeTranslations(root=document.body){
 const observer=new MutationObserver(records=>{
  observer.disconnect();
  for(const record of records){
   if(record.type==='characterData')localize(record.target.parentElement);
   else if(record.type==='attributes')localize(record.target);
   else for(const node of record.addedNodes)if(node.nodeType===1||node.nodeType===3)localize(node.nodeType===3?node.parentElement:node);
  }
  observer.observe(root,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['aria-label','title','placeholder','alt']});
 });
 localize(root);observer.observe(root,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['aria-label','title','placeholder','alt']});
 return observer;
}
