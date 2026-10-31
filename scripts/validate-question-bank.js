import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CATEGORIES, BANK_VERSION } from '../src/config.js';
import { validateRuntime } from '../src/questionLoader.js';
export const normalize=text=>String(text??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const tokens=text=>new Set(normalize(text).split(' ').filter(s=>s.length>2||/\d/.test(s)));
function similarity(a,b){const x=tokens(a),y=tokens(b),same=[...x].filter(t=>y.has(t)).length;return same/(x.size+y.size-same||1);}
export function validateBank(bank,plan,root=process.cwd()){
  const errors=[],similarityWarnings=[],editorialWarnings=[],check=(ok,msg)=>{if(!ok)errors.push(msg);};
  try{validateRuntime(bank,plan);}catch(e){errors.push(e.message);}
  check(bank.length===500,'La banque technique doit contenir exactement 500 questions');check(plan.version===BANK_VERSION&&plan.durationMinutes===60&&plan.thresholdPercent===70,'Paramètres du programme incohérents');
  const ids=new Set(),texts=new Map();
  for(const q of bank){
    check(/^[A-Z]{2}-\d{3}$/.test(q.id),`ID invalide : ${q.id}`);check(!ids.has(q.id),`ID dupliqué : ${q.id}`);ids.add(q.id);
    const text=normalize(q.question);check(!texts.has(text),`Énoncé identique : ${q.id} / ${texts.get(text)}`);texts.set(text,q.id);
    check(typeof q.question==='string'&&q.question.trim().length>20,`Énoncé trop court : ${q.id}`);check(Object.hasOwn(CATEGORIES,q.category),`Catégorie invalide : ${q.id}`);
    check(['easy','medium','hard'].includes(q.difficulty),`Difficulté absente : ${q.id}`);check(typeof q.subcategory==='string'&&q.subcategory.trim().length>2,`Sous-catégorie absente : ${q.id}`);
    const choices=Array.isArray(q.choices)?q.choices:[];check(choices.length===4&&choices.every(c=>typeof c==='string'&&c.trim()),`Choix invalides : ${q.id}`);check(new Set(choices.map(c=>String(c).normalize('NFC').toLowerCase().trim().replace(/\s+/g,' '))).size===4,`Choix identiques : ${q.id}`);
    check(Number.isInteger(q.correctAnswer)&&q.correctAnswer>=0&&q.correctAnswer<4,`Bonne réponse invalide : ${q.id}`);check(typeof q.explanation==='string'&&q.explanation.trim().length>=50,`Explication insuffisante : ${q.id}`);
    check(['case','concept'].includes(q.kind)&&q.editorialStatus==='draft-reviewed',`Métadonnées éditoriales absentes : ${q.id}`);
    if(q.requiresSource||q.category==='gouvernance'&&['ohada','portefeuille'].includes(q.subcategory)){
      check(Boolean(q.source?.name)&&/^https:\/\//.test(q.source?.url??''),`Source absente : ${q.id}`);check(q.sourceTitle===q.source?.name&&q.sourceUrl===q.source?.url,`Métadonnées source incohérentes : ${q.id}`);
      check(/^\d{4}-\d{2}-\d{2}$/.test(q.lastVerified??'')&&q.lastVerified<='2026-10-31',`Date source invalide : ${q.id}`);
    }
    if(q.image){check(!q.image.includes('..')&&q.image.startsWith('assets/psychotechnique/'),`Chemin image interdit : ${q.id}`);check(fs.existsSync(path.join(root,q.image)),`Image manquante : ${q.id}`);check(Boolean(q.imageAlt),`Alternative image absente : ${q.id}`);}
    if(choices.length===4){const lengths=choices.map(c=>String(c).length),other=lengths.filter((_,i)=>i!==q.correctAnswer),ratio=lengths[q.correctAnswer]/(other.reduce((a,b)=>a+b,0)/3);
      if(ratio>1.65)editorialWarnings.push({id:q.id,type:'correct-answer-longer',ratio:Number(ratio.toFixed(2))});
      if(choices.some((c,i)=>i!==q.correctAnswer&&/\b(toujours|jamais|forcément|au hasard)\b/i.test(c)))editorialWarnings.push({id:q.id,type:'absolute-distractor'});
      if(choices.some((c,i)=>i!==q.correctAnswer&&/couleur|logo|diapositives|brochure|photos|pages|police|protocol/i.test(c)))editorialWarnings.push({id:q.id,type:'weak-distractor-review'});
    }
  }
  const byId=new Map(bank.map(q=>[q.id,q])),all=plan.exams.flatMap(e=>e.ids),examDetails=[];
  check(all.length===325&&new Set(all).size===325,'Les examens doivent avoir 325 IDs distincts');check(plan.reserve.length===175,'La réserve doit contenir 175 questions');check(new Set([...all,...plan.reserve]).size===bank.length,'Partition incomplète');
  for(const e of plan.exams){const qs=e.ids.map(id=>byId.get(id)).filter(Boolean),positions=[0,1,2,3].map(p=>qs.filter(q=>q.correctAnswer===p).length),difficulty=Object.fromEntries(['easy','medium','hard'].map(d=>[d,qs.filter(q=>q.difficulty===d).length]));
    check(qs.filter(q=>q.kind==='case').length>=25,`Moins de 25 cas au jour ${e.day}`);check(positions.every(n=>n===16||n===17),`Positions déséquilibrées au jour ${e.day}`);check(difficulty.easy===13&&difficulty.medium===36&&difficulty.hard===16,`Difficultés déséquilibrées au jour ${e.day}`);
    examDetails.push({day:e.day,cases:qs.filter(q=>q.kind==='case').length,positions,difficulty,categories:Object.fromEntries(Object.keys(CATEGORIES).map(c=>[c,qs.filter(q=>q.category===c).length]))});
  }
  const answerPositions=[0,1,2,3].map(p=>bank.filter(q=>q.correctAnswer===p).length);check(answerPositions.every(n=>n===125),'Positions globales déséquilibrées');
  for(let i=0;i<bank.length;i++)for(let j=i+1;j<bank.length;j++)if(bank[i].category===bank[j].category){const score=similarity(bank[i].question,bank[j].question);if(score>=0.75)similarityWarnings.push({ids:[bank[i].id,bank[j].id],similarity:Number(score.toFixed(2))});}
  const longestCorrect=bank.filter(q=>q.choices[q.correctAnswer]?.length===Math.max(...q.choices.map(c=>String(c).length))).length;
  check(longestCorrect/bank.length<=0.35,'La longueur maximale donne un indice de réponse excessif');
  return {valid:errors.length===0,total:bank.length,visuals:bank.filter(q=>q.image).length,cases:bank.filter(q=>q.kind==='case').length,examQuestions:all.length,reserve:plan.reserve.length,answerPositions,
    difficulty:Object.fromEntries(['easy','medium','hard'].map(d=>[d,bank.filter(q=>q.difficulty===d).length])),longestCorrect,longestCorrectPercent:longestCorrect/bank.length*100,
    sourcedQuestions:bank.filter(q=>q.source).length,categories:Object.fromEntries(Object.keys(CATEGORIES).map(c=>[c,bank.filter(q=>q.category===c).length])),exams:examDetails,errors,similarityWarnings,editorialWarnings};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),result=validateBank(JSON.parse(fs.readFileSync(path.join(root,'data/questions.json'))),JSON.parse(fs.readFileSync(path.join(root,'data/exam-plan.json'))),root);
  fs.mkdirSync(path.join(root,'artifacts/qa'),{recursive:true});fs.writeFileSync(path.join(root,'artifacts/qa/validation-pca.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));process.exitCode=result.valid?0:1;
}
