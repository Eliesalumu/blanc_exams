import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { CATEGORIES, DURATION, BANK_VERSION } from '../src/config.js';
import { scoreExam } from '../src/scoring.js';
import { remaining, formatTime, startClock, timerLevel, newDeadline } from '../src/timer.js';
import { createAttempt, setAnswer, completeAttempt, shuffle, toggleMark } from '../src/exam.js';
import { loadProgress, saveProgress, emptyProgress, STORAGE_KEY } from '../src/storage.js';
import { validateRuntime } from '../src/questionLoader.js';
import { validateBank, normalize } from '../scripts/validate-question-bank.js';
import { analyze } from '../src/analytics.js';
const bank=JSON.parse(fs.readFileSync(new URL('../data/questions.json',import.meta.url)));
const plan=JSON.parse(fs.readFileSync(new URL('../data/exam-plan.json',import.meta.url)));
const byId=validateRuntime(bank,plan),questions=plan.exams[0].ids.map(id=>byId.get(id));
for(const [correct,passed,pct] of [[45,false,45/65*100],[46,true,46/65*100],[65,true,100],[0,false,0]])test(`Score ${correct}/65 : ${passed?'réussite':'échec'}`,()=>{
  const answers=Object.fromEntries(questions.map((q,i)=>[q.id,i<correct?q.correctAnswer:(q.correctAnswer+1)%4]));
  const result=scoreExam(questions,answers,0,DURATION+1000);
  assert.equal(result.correct,correct);assert.equal(result.passed,passed);assert.equal(result.percentage,pct);
  assert.equal(result.correct+result.wrong+result.unanswered,65);assert.equal(result.elapsed,DURATION);
});
test('Les absences valent zéro, catégories et temps sont cohérents',()=>{
  const answers={[questions[0].id]:questions[0].correctAnswer};const r=scoreExam(questions,answers,100,60100);
  assert.equal(r.unanswered,64);assert.equal(r.wrong,0);assert.equal(r.elapsed,60000);assert.equal(r.errors.length,64);
  for(const [c,s] of Object.entries(CATEGORIES))assert.equal(r.categories[c].total,s.count);
  assert.equal(scoreExam([],{},1,0).percentage,0);assert.equal(scoreExam([],{},1,0).passed,false);
});
test('Chronomètre : timestamp, arrondi et niveaux des avertissements',()=>{
  assert.equal(newDeadline(10),3600010);assert.equal(remaining(500,100),400);assert.equal(remaining(500,501),0);
  assert.equal(formatTime(DURATION),'60:00');assert.equal(formatTime(1),'00:01');assert.equal(formatTime(0),'00:00');
  assert.equal(timerLevel(600001),'');assert.equal(timerLevel(600000),'notice');assert.equal(timerLevel(300000),'urgent');assert.equal(timerLevel(60000),'critical');
});
test('Expiration : auto-soumission une seule fois, même après des ticks retardés',()=>{
  let now=0,tick,submitted=0,cancelled=0;
  startClock(100,()=>{},()=>submitted++,{now:()=>now,schedule:fn=>{tick=fn;return 8;},cancel:()=>cancelled++});
  now=1000;tick();tick();assert.equal(submitted,1);assert.equal(cancelled,1);
  let scheduled=false;startClock(100,()=>{},()=>submitted++,{now:()=>200,schedule:()=>{scheduled=true;}});
  assert.equal(scheduled,false);assert.equal(submitted,2);
});
test('Une tentative reste à 60 minutes et interdit les réponses tardives',()=>{
  const a=createAttempt(1,plan.exams[0].ids,123);assert.equal(a.deadline-a.startedAt,DURATION);
  assert.deepEqual([...a.ids].sort(),[...plan.exams[0].ids].sort());
  assert.equal(setAnswer(a,a.ids[0],2,124),true);assert.equal(setAnswer(a,a.ids[0],1,a.deadline),false);
  assert.equal(setAnswer(a,'inconnu',1,124),false);assert.equal(setAnswer(a,a.ids[0],4,124),false);
  toggleMark(a,a.ids[0]);assert.equal(a.marked.length,1);toggleMark(a,a.ids[0]);assert.equal(a.marked.length,0);
  const done=completeAttempt(a,a.ids.map(id=>byId.get(id)),scoreExam,a.deadline+5000,true);
  assert.equal(done.submittedAt,a.deadline);assert.equal(done.result.elapsed,DURATION);
});
test('Persistance : reprise exacte, erreur de quota et données invalides',()=>{
  const memory=new Map(),storage={getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)};
  const data=emptyProgress();data.active=createAttempt(2,plan.exams[1].ids,500);data.active.answers[data.active.ids[2]]=1;data.active.index=2;
  assert.equal(saveProgress(data,storage),true);assert.deepEqual(loadProgress(storage).data,data);
  assert.equal(saveProgress(data,{setItem:()=>{throw Error('quota');}}),false);
  memory.set(STORAGE_KEY,'invalid json');assert.ok(loadProgress(storage).warning);
  memory.set(STORAGE_KEY,JSON.stringify({version:BANK_VERSION,attempts:[],active:{ids:[]}}));assert.ok(loadProgress(storage).warning);
});
test('Banque complète : IDs, textes, figures, sources, catégories et partition',()=>{
  const result=validateBank(bank,plan);assert.deepEqual(result.errors,[]);assert.equal(result.total,500);assert.equal(result.visuals,10);assert.equal(result.reserve,175);
  assert.equal(result.examQuestions,325);assert.ok(result.cases>=400);assert.deepEqual(result.answerPositions,[125,125,125,125]);
  assert.equal(new Set(bank.map(q=>normalize(q.question))).size,500);
  for(const exam of plan.exams)for(const [category,spec] of Object.entries(CATEGORIES))assert.equal(exam.ids.filter(id=>byId.get(id).category===category).length,spec.count);
});
test('Le validateur rejette les altérations, même si les IDs sont conservés',()=>{
  const corrupted=structuredClone(bank);corrupted[1].question=corrupted[0].question;
  assert.ok(validateBank(corrupted,plan).errors.some(s=>s.includes('identique')));
  const overlap=structuredClone(plan);overlap.exams[1].ids[0]=overlap.exams[0].ids[0];
  assert.throws(()=>validateRuntime(bank,overlap));
});
test('Le mélange préserve les identifiants et les bonnes réponses ne dépendent pas de l’ordre',()=>{
  for(let n=0;n<30;n++){
    const shuffled=shuffle(questions),answers=Object.fromEntries(shuffled.map(q=>[q.id,q.correctAnswer]));
    assert.equal(scoreExam(shuffled,answers,0,1).correct,65);
  }
  assert.deepEqual(shuffle([1,2,3],()=>0),[2,3,1]);
});
test('Analyse : les anciennes erreurs corrigées disparaissent du journal',()=>{
  const q=questions[0],a={ids:[q.id],answers:{},result:{percentage:0,categories:{[q.category]:{correct:0,total:1}}}};
  const b={ids:[q.id],answers:{[q.id]:q.correctAnswer},result:{percentage:100,categories:{[q.category]:{correct:1,total:1}}}};
  assert.equal(analyze([a],byId).errorIds.length,1);assert.equal(analyze([a,b],byId).errorIds.length,0);assert.equal(analyze([a,b],byId).average,50);
});
