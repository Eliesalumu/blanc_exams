import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),dist=path.join(root,'dist');
// No deletion: the build only copies the known application paths into dist.
fs.mkdirSync(dist,{recursive:true});
for(const name of ['index.html','src','data/questions.json','data/exam-plan.json','data/technical-exams.json','data/company-exams.json','assets','sw.js']){
  const dest=path.join(dist,name);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.cpSync(path.join(root,name),dest,{recursive:true});
}
const api=process.env.PUBLIC_API_URL||'';
if(api){const url=new URL(api);if(url.protocol!=='https:'||url.pathname!=='/'||url.username||url.password||url.search||url.hash)throw new Error('PUBLIC_API_URL doit être une origine HTTPS publique.');}
fs.writeFileSync(path.join(dist,'src/api-config.js'),`// Public configuration. Never include credentials.\nexport const API_URL = ${api?JSON.stringify(api.replace(/\/$/,'')):'null'};\n`);
console.log('Application statique prête dans dist/. Aucun secret ni dépendance serveur.');
