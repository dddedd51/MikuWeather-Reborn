import { spawnSync } from 'node:child_process';
import { readFileSync, existsSync, copyFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
const pkg=JSON.parse(readFileSync(path.join(root,'package.json'),'utf8'));
function run(command,args) {
  const result=spawnSync(command,args,{cwd:root,stdio:'inherit',windowsHide:true,env:{...process.env,ELECTRON_BUILDER_CACHE:path.join(root,'.toolchain/electron-builder-cache')}});
  if(result.error)throw result.error;
  if(result.status!==0)process.exit(result.status||1);
}
if(process.platform!=='win32')throw new Error('Windows 打包脚本需要 Windows 的 tar.exe');
if(!existsSync(path.join(root,'desktop/private.json')))throw new Error('请先运行 npm run configure 配置天气服务');
run('pwsh',['-NoProfile','-File','scripts/build-location.ps1']);
run(process.execPath,['node_modules/electron-builder/cli.js','--win','--dir','--x64','--config.electronDist=node_modules/electron/dist']);
copyFileSync(path.join(root,'scripts/README-Windows.txt'),path.join(root,'release/win-unpacked/README-Windows.txt'));
const output=`release/MikuWeather-Reborn-${pkg.version}-Windows-x64.zip`;
run('tar.exe',['-a','-cf',output,'-C','release/win-unpacked','.']);
console.log('Windows 便携包已生成：'+output);
