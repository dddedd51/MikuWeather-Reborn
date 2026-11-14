import { generateKeyPairSync, createHash } from 'node:crypto';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../secrets/', import.meta.url));
mkdirSync(root, { recursive: true });
const privatePath = root + 'ed25519-private.pem';
const publicPath = root + 'ed25519-public.pem';
if (!existsSync(privatePath) && !existsSync(publicPath)) {
  const pair = generateKeyPairSync('ed25519', {
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    publicKeyEncoding: { type: 'spki', format: 'pem' }
  });
  writeFileSync(privatePath, pair.privateKey, { flag: 'wx', mode: 0o600 });
  writeFileSync(publicPath, pair.publicKey, { flag: 'wx' });
} else if (!existsSync(privatePath) || !existsSync(publicPath)) {
  throw new Error('密钥对文件不完整，请先恢复已有文件；不会自动覆盖或重新生成。');
}
console.log('公钥文件：' + publicPath);
console.log(readFileSync(publicPath, 'utf8'));
console.log('公钥 SHA256：' + createHash('sha256').update(readFileSync(publicPath, 'utf8').trim()).digest('hex'));
console.log('私钥已保存在 secrets 目录，未输出内容。');
