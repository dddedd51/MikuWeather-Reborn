import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import qweather from '../shared/qweather.cjs';
import tencent from '../shared/tencent-ip.cjs';
const root = fileURLToPath(new URL('../', import.meta.url));
const source = process.argv[2] || root + 'secrets/qweather.local.json';
const config = JSON.parse(readFileSync(source, 'utf8'));
config.privateKey = readFileSync(config.privateKeyPath || root + 'secrets/ed25519-private.pem', 'utf8');
delete config.privateKeyPath;
qweather.validateConfig(config);
const tencentSource=root+'secrets/tencent.local.json';
if(existsSync(tencentSource)){config.tencent=JSON.parse(readFileSync(tencentSource,'utf8'));tencent.validateConfig(config.tencent);}
for (const target of ['desktop/private.json', 'android/app/src/main/assets/private.json']) {
  if (target.startsWith('android/') && !existsSync(root + 'android/app')) continue;
  const path = root + target;
  mkdirSync(path.substring(0, path.lastIndexOf('/')), { recursive: true });
  const nativeConfig={...config};if(target.startsWith('android/'))delete nativeConfig.tencent;
  writeFileSync(path, JSON.stringify(nativeConfig), { mode: 0o600 });
}
console.log('已配置 JWT 原生客户端；私钥未写入网页资源。仅用于持有者的本地构建。');
