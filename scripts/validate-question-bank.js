import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CATEGORIES } from '../src/config.js';
import { validateRuntime } from '../src/questionLoader.js';
export const normalize = text => text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const tokens = text => new Set(normalize(text).split(' ').filter(s=>s.length>2||/\d/.test(s)));
function similarity(a,b){const x=tokens(a),y=tokens(b),same=[...x].filter(t=>y.has(t)).length;return same/(x.size+y.size-same||1);}
export function validateBank(bank,plan,root=process.cwd()) {
  const errors=[],warnings=[],check=(condition,message)=>{if(!condition)errors.push(message);};
  try{validateRuntime(bank,plan);}catch(e){errors.push(e.message);}
  const ids=new Set(),texts=new Map();
  for(const q of bank){
    check(typeof q.id==='string'&&/^[A-Z]{2}-(VIS-)?\d{3}$/.test(q.id),`ID invalide : ${q.id}`);
    check(!ids.has(q.id),`ID dupliqué : ${q.id}`);ids.add(q.id);
    const normalized=normalize(q.question);check(!texts.has(normalized),`Énoncé identique : ${q.id} / ${texts.get(normalized)}`);texts.set(normalized,q.id);
    check(typeof q.question==='string'&&q.question.length>15,`Énoncé vide ou trop court : ${q.id}`);
    check(Object.hasOwn(CATEGORIES,q.category),`Catégorie invalide : ${q.id}`);
    check(['easy','medium','hard'].includes(q.difficulty),`Difficulté absente : ${q.id}`);
    check(typeof q.subcategory==='string'&&q.subcategory.length>2,`Sous-catégorie absente : ${q.id}`);
    check(Array.isArray(q.choices)&&q.choices.length===4&&q.choices.every(c=>typeof c==='string'&&c.trim()),`Choix invalides : ${q.id}`);
    check(new Set(q.choices.map(c=>c.normalize('NFC').toLowerCase().trim().replace(/\s+/g,' '))).size===4,`Choix identiques : ${q.id}`);
    check(Number.isInteger(q.correctAnswer)&&q.correctAnswer>=0&&q.correctAnswer<4,`Bonne réponse invalide : ${q.id}`);
    check(typeof q.explanation==='string'&&q.explanation.trim().length>=10,`Explication manquante : ${q.id}`);
    if(q.image){check(!q.image.includes('..')&&q.image.startsWith('assets/psychotechnique/'),`Chemin image interdit : ${q.id}`);check(fs.existsSync(path.join(root,q.image)),`SVG manquant : ${q.id}`);check(Boolean(q.imageAlt),`Texte alternatif manquant : ${q.id}`);}
    if(q.category==='culture'){check(q.source?.name&&/^https:\/\//.test(q.source?.url),`Source absente : ${q.id}`);check(/^\d{4}-\d{2}-\d{2}$/.test(q.lastVerified||''),`Date de vérification absente : ${q.id}`);}
  }
  const allExamIds=plan.exams.flatMap(e=>e.ids);
  check(allExamIds.length===325&&new Set(allExamIds).size===325,'Les examens doivent contenir 325 IDs distincts');
  check(plan.reserve.length>=175,'Réserve inférieure à 175');
  check(new Set([...allExamIds,...plan.reserve]).size===bank.length,'La partition ne couvre pas exactement la banque');
  check(bank.filter(q=>q.category==='logique'&&q.image).length>=60,'Moins de 60 questions visuelles');
  for(const exam of plan.exams){
    const questions=exam.ids.map(id=>bank.find(q=>q.id===id)).filter(Boolean),counts=Object.fromEntries(['easy','medium','hard'].map(d=>[d,questions.filter(q=>q.difficulty===d).length]));
    check(counts.easy>=14&&counts.easy<=19&&counts.hard>=14&&counts.hard<=19,`Équilibre des difficultés : jour ${exam.day}`);
    check(questions.filter(q=>q.image).length>=8,`Figures trop peu représentées : jour ${exam.day}`);
  }
  // A warning is an editorial review request, not proof of semantic duplication.
  for(let i=0;i<bank.length;i++)for(let j=i+1;j<bank.length;j++)if(bank[i].category===bank[j].category&&similarity(bank[i].question,bank[j].question)>=0.78)warnings.push({ids:[bank[i].id,bank[j].id],similarity:Number(similarity(bank[i].question,bank[j].question).toFixed(2))});
  const culture=bank.filter(q=>q.category==='culture'),rdc=culture.filter(q=>q.region==='rdc').length;
  check(rdc/culture.length>=0.3&&rdc/culture.length<=0.4,'Part RDC hors de la plage 30–40 %');
  return {valid:errors.length===0,total:bank.length,visuals:bank.filter(q=>q.image).length,examQuestions:allExamIds.length,reserve:plan.reserve.length,rdcQuestions:rdc,errors,similarityWarnings:warnings};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
  const result=validateBank(JSON.parse(fs.readFileSync(path.join(root,'data/questions.json'))),JSON.parse(fs.readFileSync(path.join(root,'data/exam-plan.json'))),root);
  console.log(JSON.stringify(result,null,2));process.exitCode=result.valid?0:1;
}
