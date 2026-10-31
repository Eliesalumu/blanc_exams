import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildVisualQuestions } from './visual-questions.js';
import { CATEGORIES, BANK_VERSION } from '../src/config.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const sources=JSON.parse(fs.readFileSync(path.join(root,'data/sources.json'),'utf8'));
// Difficulty estimates are editorial, not empirically calibrated psychometric norms.
// One-based line indexes in each authored source; all unlisted items are medium.
const levels={
  francais:{easy:[1,3,4,5,8,9,12,14,20,24,25,28,37,39,55,58,61,62,64,68,71,74,75,76,80,81,82,84,85,89,95],hard:[7,16,17,23,30,35,37,40,41,42,43,44,45,46,48,49,50,51,52,53,54,56,57,60,63,65,67,69,70,72,73,115]},
  mathematiques:{easy:[1,2,3,4,5,6,8,9,10,11,12,19,20,21,29,34,39,41,45,49,53,56,85,86,87,88],hard:[13,16,18,24,27,32,33,38,46,47,48,55,57,59,61,63,65,66,68,69,71,73,76,78,89,99]},
  logique:{easy:[1,2,3,4,5,6,7,8,9,10,11,12,13,15,17,19,21,33,34,35,36,37,38,42],hard:[14,18,20,22,23,24,26,28,30,31,32,43,46,48,54,57,59,71,77,79,80,81,84,88]},
  culture:{easy:[1,2,3,4,5,7,9,10,11,12,13,16,19,20,26,30,35,36,41,43,44,45,46,47,48,49,50,51,52,53],hard:[14,18,21,24,25,28,31,32,33,34,37,39,40,55,57,59,60,66,68,72,76,78,80,82,84,86,88,91,93,95]}
};
const prefixes={francais:'FR',mathematiques:'MA',logique:'LO',culture:'CG'};
const bank=[];
for(const category of Object.keys(CATEGORIES)) {
  const lines=fs.readFileSync(path.join(root,`data/source/${category}.txt`),'utf8').split(/\r?\n/).filter(l=>l.trim()&&!l.startsWith('#'));
  lines.forEach((line,i)=>{
    const fields=line.split('|');
    if(fields.length!==(category==='culture'?8:7))throw new Error(`Nombre de champs : ${category} ligne ${i+1}`);
    const [subcategory,question,correct,...rest]=fields, choices=[correct,...rest.slice(0,3)], explanation=rest[3],sourceKey=rest[4];
    const difficulty=levels[category].hard.includes(i+1)?'hard':levels[category].easy.includes(i+1)?'easy':'medium';
    const offset=(i*7+Object.keys(CATEGORIES).indexOf(category))%4;
    const rotated=choices.map((_,j)=>choices[(j+offset)%4]);
    const q={id:`${prefixes[category]}-${String(i+1).padStart(3,'0')}`,category,subcategory,difficulty,question,choices:rotated,correctAnswer:rotated.indexOf(correct),explanation,image:null,source:null};
    if(sourceKey){if(!sources[sourceKey])throw new Error(`Source inconnue : ${sourceKey}`);q.source=sources[sourceKey];q.lastVerified='2026-10-31';q.region=subcategory.startsWith('rdc_')?'rdc':'autres_afrique';}
    bank.push(q);
  });
}
const visuals=buildVisualQuestions();
fs.mkdirSync(path.join(root,'assets/psychotechnique'),{recursive:true});
const easyVisuals=new Set([3,6,11,12,15,17,21,22,25,29,33,34,38,39,41,42]);
const hardVisuals=new Set([9,10,14,18,20,24,28,30,32,35,45,49,50,55,59,60]);
for(const [i,{svg,...q}] of visuals.entries()){
  // Figures that combine multiple transformations receive a higher estimate.
  q.difficulty=hardVisuals.has(i+1)?'hard':easyVisuals.has(i+1)?'easy':'medium';
  const correct=q.choices[q.correctAnswer],offset=(i+1)%4;
  q.choices=q.choices.map((_,j)=>q.choices[(j+offset)%4]);q.correctAnswer=q.choices.indexOf(correct);
  fs.writeFileSync(path.join(root,q.image),svg);bank.push(q);
}
// Subcategory round-robin keeps each simulation varied, instead of contiguous source slices.
function interleave(items){const groups=new Map();for(const q of items){if(!groups.has(q.subcategory))groups.set(q.subcategory,[]);groups.get(q.subcategory).push(q);}const result=[];while([...groups.values()].some(g=>g.length))for(const g of groups.values())if(g.length)result.push(g.shift());return result;}
const allocations={francais:{easy:4,medium:8,hard:4},mathematiques:{easy:3,medium:7,hard:4},culture:{easy:4,medium:8,hard:3}};
const pools=new Map();
function take(category,difficulty,count,visual=null){const key=`${category}-${difficulty}-${visual}`;if(!pools.has(key))pools.set(key,interleave(bank.filter(q=>q.category===category&&q.difficulty===difficulty&&(visual===null||Boolean(q.image)===visual))));const selected=pools.get(key).splice(0,count);if(selected.length!==count)throw new Error(`Pool insuffisant : ${key} (${selected.length}/${count})`);return selected;}
const used=new Set(),exams=[];
for(let day=1;day<=5;day++){
  const selected=[];
  for(const [c,counts] of Object.entries(allocations))for(const [difficulty,count] of Object.entries(counts))selected.push(...take(c,difficulty,count));
  for(const [difficulty,v,w] of [['easy',2,3],['medium',4,6],['hard',2,3]])selected.push(...take('logique',difficulty,v,true),...take('logique',difficulty,w,false));
  const ordered=interleave(selected);
  for(const q of ordered){if(used.has(q.id))throw new Error(`Chevauchement : ${q.id}`);used.add(q.id);}
  exams.push({day,ids:ordered.map(q=>q.id)});
}
const plan={version:BANK_VERSION,durationMinutes:60,thresholdPercent:70,exams,reserve:bank.filter(q=>!used.has(q.id)).map(q=>q.id)};
fs.writeFileSync(path.join(root,'data/questions.json'),JSON.stringify(bank,null,2)+'\n');
fs.writeFileSync(path.join(root,'data/exam-plan.json'),JSON.stringify(plan,null,2)+'\n');
console.log(`${bank.length} questions ; ${visuals.length} SVG ; ${used.size} questions d’examen ; ${plan.reserve.length} en réserve.`);
