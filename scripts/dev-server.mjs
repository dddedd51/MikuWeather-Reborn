import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createClient } from '../shared/qweather.cjs';
const root = fileURLToPath(new URL('../', import.meta.url));
let config = {};
try { config=JSON.parse(readFileSync(root+'desktop/private.json','utf8')); } catch {}
const client=createClient(config);
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.ico':'image/x-icon','.txt':'text/plain'};
createServer(async(req,res)=>{
  const url=new URL(req.url,'http://127.0.0.1:5180');
  if(url.pathname.startsWith('/api/')) {
    res.setHeader('Content-Type','application/json; charset=utf-8');
    res.setHeader('Cache-Control','no-store');
    if(req.method!=='GET'){res.writeHead(405);res.end();return;}
    if(req.headers.origin&&req.headers.origin!=='http://127.0.0.1:5180'){res.writeHead(403);res.end();return;}
    try { res.end(JSON.stringify({ok:true,data:await client.request(url.pathname.slice(5),Object.fromEntries(url.searchParams))})); }
    catch(e) {res.end(JSON.stringify({ok:false,code:e.code||'UNKNOWN',message:e.code?e.message:'服务暂时不可用'}));}
    return;
  }
  let p;
  try {p=decodeURIComponent(url.pathname);}catch{res.writeHead(400);res.end();return;}
  if(p.includes('..')||p.includes('\\')){res.writeHead(403);res.end();return;}
  const path=root+'dist'+(p==='/'?'/index.html':p);
  if(!existsSync(path)){res.writeHead(404);res.end();return;}
  const ext=path.slice(path.lastIndexOf('.'));
  res.setHeader('Content-Type',(mime[ext]||'application/octet-stream')+'; charset=utf-8');
  res.end(readFileSync(path));
}).listen(5180,'127.0.0.1',()=>console.log('本地预览：http://127.0.0.1:5180'));
