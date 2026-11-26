import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
const root=path.resolve(import.meta.dirname,'..');
const {version}=JSON.parse(fs.readFileSync(path.join(root,'package.json')));
const zip=path.join(root,'release',`MikuWeather-Reborn-${version}-Windows-x64.zip`);
const stage=fs.mkdtempSync(path.join(root,'release','recovery-'));
const output=path.join(root,'release',`MikuWeather-Reborn-${version}-Windows-Repair.zip`);
try {
  for (const source of ['desktop/stage-update.ps1','desktop/apply-update.ps1','desktop/read-package.ps1',
    'scripts/windows-recovery/Repair.ps1','scripts/windows-recovery/Repair.cmd']) {
    const data=fs.readFileSync(path.join(root,source),'utf8').replace(/^\uFEFF/,'').replace(/\r?\n/g,'\r\n');
    fs.writeFileSync(path.join(stage,path.basename(source)), (source.endsWith('.ps1')?'\uFEFF':'')+data);
  }
  const hash=createHash('sha256');
  for await (const chunk of fs.createReadStream(zip)) hash.update(chunk);
  fs.writeFileSync(path.join(stage,'release.json'),JSON.stringify({version,size:fs.statSync(zip).size,sha256:hash.digest('hex')},null,2));
  const r=spawnSync('tar.exe',['-a','-cf',output,'-C',stage,'.'],{stdio:'inherit',windowsHide:true});
  if (r.error||r.status!==0) throw r.error||Error('Could not package the Windows recovery tool');
} finally {
  if (path.dirname(stage)===path.join(root,'release')&&path.basename(stage).startsWith('recovery-'))
    fs.rmSync(stage,{recursive:true,force:true});
}
console.log(output);
