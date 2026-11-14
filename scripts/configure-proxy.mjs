import fs from 'node:fs';
import {proxyBase} from '../shared/qweather.cjs';
const proxyUrl=proxyBase(process.argv[2]);
fs.writeFileSync(new URL('../desktop/service.json',import.meta.url),JSON.stringify({proxyUrl,tencent:{proxyUrl}},null,2));
fs.mkdirSync(new URL('../android/app/src/main/assets/',import.meta.url),{recursive:true});
fs.writeFileSync(new URL('../android/app/src/main/assets/service.json',import.meta.url),JSON.stringify({proxyUrl},null,2));
console.log('Public endpoint configured; no private keys were copied.');
