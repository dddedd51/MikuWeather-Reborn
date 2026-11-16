import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {download} from '../desktop/updater.cjs';
test('update download rejects tampering, size mismatch, and redirected non-release hosts',async()=>{
 const original=globalThis.fetch,dir=await fs.mkdtemp(path.join(os.tmpdir(),'miku-download-test-'));
 const data=Buffer.from('verified update fixture'),hash=createHash('sha256').update(data).digest('hex');
 try{
  globalThis.fetch=async()=>new Response(data);
  await download('https://github.com/a',path.join(dir,'good.zip'),data.length,hash,()=>{});
  assert.deepEqual(await fs.readFile(path.join(dir,'good.zip')),data);
  await assert.rejects(download('https://github.com/a',path.join(dir,'tampered.zip'),data.length,'a'.repeat(64),()=>{}),/checksum/);
  await assert.rejects(download('https://github.com/a',path.join(dir,'large.zip'),data.length-1,hash,()=>{}),/Oversized/);
  await assert.rejects(download('https://github.com/a',path.join(dir,'short.zip'),data.length+1,hash,()=>{}),/checksum/);
  globalThis.fetch=async()=>new Response(null,{status:302,headers:{Location:'https://unexpected.example/a'}});
  await assert.rejects(download('https://github.com/a',path.join(dir,'redirect.zip'),data.length,hash,()=>{}),/host/);
 }finally{globalThis.fetch=original;await fs.rm(dir,{recursive:true,force:true});}
});
