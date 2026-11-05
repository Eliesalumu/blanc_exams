import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApi } from '../server/app.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const port=Number(process.env.PORT||4173),host='127.0.0.1';
const api=createApi({env:{...process.env,ALLOWED_ORIGINS:process.env.ALLOWED_ORIGINS||`http://127.0.0.1:${port},http://localhost:${port},http://127.0.0.1:5500,http://localhost:5500,http://127.0.0.1:5501,http://localhost:5501`}});
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png'};
export const server=http.createServer((req,res)=>{
  let decoded;try{decoded=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400).end();return;}
  if(decoded.startsWith('/api/')){api.emit('request',req,res);return;}
  const target=path.resolve(root,'.'+(decoded==='/'?'/index.html':decoded));
  const relative=path.relative(root,target);
  if(['server','node_modules','scripts','tests'].includes(relative.split(path.sep)[0])||relative.startsWith('..')||path.isAbsolute(relative)||relative.split(path.sep).some(p=>p.startsWith('.'))){res.writeHead(403).end();return;}
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405).end();return;}
  fs.stat(target,(error,stat)=>{
    if(error||!stat.isFile()){res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'}).end('Fichier introuvable');return;}
    res.writeHead(200,{'Content-Type':mime[path.extname(target)]||'application/octet-stream','Content-Length':stat.size,'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self' http://127.0.0.1:3001 http://localhost:3001 https://cap70-pedagogie-api.onrender.com; media-src 'self' blob:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'"});
    if(req.method==='HEAD')res.end();else fs.createReadStream(target).pipe(res);
  });
});
server.listen(port,host,()=>console.log(`CAP 70 et son API sont prêts : http://${host}:${port}\nIA : ${process.env.OPENAI_API_KEY?'clé configurée':'clé absente dans ce terminal'}\nCtrl+C pour arrêter le serveur.`));
server.on('error',e=>{console.error(e.code==='EADDRINUSE'?`Le port ${port} est occupé. Définissez PORT pour en choisir un autre.`:e);process.exitCode=1;});
