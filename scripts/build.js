import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),dist=path.join(root,'dist');
// No deletion: the build only copies the known application paths into dist.
fs.mkdirSync(dist,{recursive:true});
for(const name of ['index.html','src','data/questions.json','data/exam-plan.json','assets','sw.js']){
  const dest=path.join(dist,name);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.cpSync(path.join(root,name),dest,{recursive:true});
}
console.log('Application statique prête dans dist/. Aucun secret ni dépendance serveur.');
