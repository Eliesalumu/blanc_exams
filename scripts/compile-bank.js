import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CATEGORIES, BANK_VERSION } from '../src/config.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const sources=JSON.parse(fs.readFileSync(path.join(root,'data/pca-sources.json'),'utf8'));
const prefixes={gouvernance:'GV',onatra:'TR',finance:'FI',strategie:'ST',quantitatif:'NU',communication:'CP'};
const sizes={gouvernance:130,onatra:105,finance:90,strategie:100,quantitatif:45,communication:30};
// Editorial difficulty estimates; no empirical psychometric calibration is claimed.
const allocations={gouvernance:[3,9,4],onatra:[3,8,3],finance:[2,7,3],strategie:[3,7,3],quantitatif:[1,3,2],communication:[1,2,1]};
let seed=0x70ca2026;
function random(){seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return (seed>>>0)/4294967296;}
function shuffled(items){const copy=[...items];for(let i=copy.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[copy[i],copy[j]]=[copy[j],copy[i]];}return copy;}
const bank=[];
for(const category of Object.keys(CATEGORIES)){
  const lines=fs.readFileSync(path.join(root,`data/source/${category}.txt`),'utf8').split(/\r?\n/).filter(l=>l.trim()&&!l.startsWith('#'));
  if(lines.length!==sizes[category])throw Error(`Taille inattendue : ${category} ${lines.length}`);
  lines.forEach((line,i)=>{
    const fields=line.split('|');if(fields.length!==8)throw Error(`${category}:${i+1} : ${fields.length} champs au lieu de 8`);
    const [topic,question,correct,d1,d2,d3,explanation,key]=fields,source=key?sources[key]:null;
    if(key&&!source)throw Error(`Source inconnue ${key}`);
    bank.push({id:`${prefixes[category]}-${String(i+1).padStart(3,'0')}`,category,subcategory:topic.replace('!',''),difficulty:'medium',
      kind:topic.endsWith('!')?'case':'concept',fictionalData:topic.endsWith('!'),question,choices:[correct,d1,d2,d3],correctAnswer:0,explanation,image:null,source,
      requiresSource:Boolean(key),sourceTitle:source?.name??null,sourceUrl:source?.url??null,lastVerified:source?.lastVerified??null,
      editorialStatus:'draft-reviewed',difficultyBasis:'estimation éditoriale non calibrée'});
  });
}
const levels=JSON.parse(fs.readFileSync(path.join(root,'data/pca-difficulty.json'),'utf8'));
for(const c of Object.keys(CATEGORIES))bank.filter(q=>q.category===c).forEach((q,i)=>{
  if(levels[c].easy.includes(i+1)&&levels[c].hard.includes(i+1))throw Error(`Difficulté contradictoire : ${q.id}`);
  q.difficulty=levels[c].hard.includes(i+1)?'hard':levels[c].easy.includes(i+1)?'easy':'medium';
});
function interleave(items){const groups=new Map();for(const q of shuffled(items)){if(!groups.has(q.subcategory))groups.set(q.subcategory,[]);groups.get(q.subcategory).push(q);}const out=[];while([...groups.values()].some(a=>a.length))for(const a of groups.values())if(a.length)out.push(a.shift());return out;}
const pools=new Map();for(const c of Object.keys(CATEGORIES))for(const d of ['easy','medium','hard'])pools.set(`${c}:${d}`,interleave(bank.filter(q=>q.category===c&&q.difficulty===d)));
const exams=[],used=new Set();
for(let day=1;day<=5;day++){
  const selected=[];
  for(const [c,counts] of Object.entries(allocations))['easy','medium','hard'].forEach((d,i)=>{const take=pools.get(`${c}:${d}`).splice(0,counts[i]);if(take.length!==counts[i])throw Error(`Pool insuffisant ${c}:${d}`);selected.push(...take);});
  const ordered=shuffled(selected);ordered.forEach(q=>used.add(q.id));exams.push({day,ids:ordered.map(q=>q.id)});
}
// Position balance is exact per exam, and global (125 A/B/C/D). Distractors and
// positions use a seeded Fisher–Yates shuffle rather than a cyclic position rule.
const totals=[0,0,0,0];
function assignPositions(items,positions){shuffled(positions).forEach((p,i)=>{const q=items[i],correct=q.choices[q.correctAnswer],others=shuffled(q.choices.filter((_,j)=>j!==q.correctAnswer));others.splice(p,0,correct);q.choices=others;q.correctAnswer=p;totals[p]++;});}
for(const e of exams){const positions=[];for(let p=0;p<4;p++)positions.push(...Array(16+(p===(e.day-1)%4?1:0)).fill(p));assignPositions(e.ids.map(id=>bank.find(q=>q.id===id)),positions);}
const reserve=bank.filter(q=>!used.has(q.id));assignPositions(reserve,totals.flatMap((n,p)=>Array(125-n).fill(p)));
// Reuse the existing figure renderer for authored technical data, replacing the
// active psychotechnical puzzles. Complete data also remains in the question text.
const figures=bank.filter(q=>q.category==='quantitatif').slice(0,10);
fs.mkdirSync(path.join(root,'assets/psychotechnique'),{recursive:true});
const xml=s=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
for(const q of figures){
  q.image=`assets/psychotechnique/PCA-${q.id}.svg`;q.imageAlt=`Données fictives — ${q.question}`;
  const words=q.question.replace('Cas fictif : ','').split(' '),lines=[];let line='';for(const word of words){if((line+' '+word).length>64){lines.push(line);line=word;}else line+=(line?' ':'')+word;}if(line)lines.push(line);
  fs.writeFileSync(path.join(root,q.image),`<svg xmlns="http://www.w3.org/2000/svg" width="660" height="260" viewBox="0 0 660 260" role="img"><title>${xml(q.imageAlt)}</title><rect width="660" height="260" rx="12" fill="#f1f5f9"/><text x="28" y="43" font-family="Arial,sans-serif" font-size="15" fill="#5278ad">DOSSIER DE GESTION · DONNÉES FICTIVES</text>${lines.map((s,i)=>`<text x="28" y="${87+i*30}" font-family="Arial,sans-serif" font-size="17" fill="#183653">${xml(s)}</text>`).join('')}<text x="28" y="237" font-family="Arial,sans-serif" font-size="13" fill="#607487">${q.id} · Aucun chiffre réel de l'ONATRA</text></svg>`);
}
const plan={version:BANK_VERSION,durationMinutes:60,thresholdPercent:70,programStatus:'Préparation technique estimative — aucun syllabus officiel disponible',exams,reserve:reserve.map(q=>q.id)};
fs.writeFileSync(path.join(root,'data/questions.json'),JSON.stringify(bank,null,2)+'\n');fs.writeFileSync(path.join(root,'data/exam-plan.json'),JSON.stringify(plan,null,2)+'\n');
console.log(`${bank.length} questions techniques, ${bank.filter(q=>q.kind==='case').length} cas ; 325 questions d'examen et ${reserve.length} de réserve.`);
