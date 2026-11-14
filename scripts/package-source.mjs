import { readdirSync, writeFileSync, readFileSync, mkdirSync, lstatSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
const version=JSON.parse(readFileSync(path.join(root,'package.json'),'utf8')).version;
const files=[];
const excluded=new Set(['node_modules','build','.gradle','.git','.idea','local.properties','private.json']);
function visit(relative) {
  const absolute=path.join(root,relative), stat=lstatSync(absolute);
  if(stat.isSymbolicLink())throw new Error('源码归档不包含符号链接：'+relative);
  if(excluded.has(path.basename(relative))||/\.(pem|jks|keystore|p12|apk|exe|log|tmp)$/i.test(relative))return;
  if(relative.replaceAll('\\','/').startsWith('android/app/src/main/assets/public'))return;
  if(stat.isDirectory()) for(const entry of readdirSync(absolute).sort())visit(path.join(relative,entry));
  else files.push(relative.replaceAll('\\','/'));
}
for(const entry of ['src','public','desktop','shared','scripts','tests','android','research','qa/widget-preview/widgets-0.2.1.png','.gitignore','package.json','package-lock.json','vite.config.js','capacitor.config.json','index.html','pet.html','LICENSE','THIRD_PARTY_NOTICES.md','README.md'])visit(entry);
if(files.some(f=>/private|secrets|\.env|keystore/i.test(f)))throw new Error('归档中存在凭据相关文件名，已停止');
mkdirSync(path.join(root,'release'),{recursive:true});
const manifest=path.join(root,'release/source-manifest.json');
writeFileSync(manifest,JSON.stringify(files));
const output=`release/MikuWeather-Reborn-${version}-Source.zip`;
const result=spawnSync('pwsh',['-NoProfile','-File','scripts/package-source.ps1','-Manifest','release/source-manifest.json','-Output',output],{cwd:root,stdio:'inherit',windowsHide:true});
if(result.error)throw result.error;
if(result.status!==0)process.exit(result.status||1);
console.log(`源码归档已生成，${files.length} 个文件；凭据、密钥、缓存和构建包均未包含。`);
