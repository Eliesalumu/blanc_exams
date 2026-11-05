import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {createTechnicalAttempt,examForAttempt,questionForOptionsVersion,scoreTechnicalAttempt,validateTechnicalExams,OPTIONS_VERSION} from '../src/technicalExam.js';
import {choiceRationaleHTML} from '../src/technicalUI.js';
import {applyReviewedOptions} from '../scripts/apply-reviewed-options.js';

const read=name=>JSON.parse(fs.readFileSync(new URL('../'+name,import.meta.url),'utf8'));
// These regressions protect the previous editorial revision, including the RVA
// PCA snapshots. The replacement DG bank has separate role/version regressions.
const currentExams=['data/technical-exams.json','data/company-exams.json'].flatMap(name=>read(name).exams);
const archives=read('data/technical-options-previous.json').exams;
const exams=currentExams.map(exam=>{
  if(!archives[exam.id])return exam;
  const {role,...original}=archives[exam.id];return original;
});
const baseline=read('data/options-review-baseline.json'),previous=read('data/technical-options-previous.json').questions;
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
test('Révision : énoncés, réponses courtes, ONATRA 1, cinq modules et clés inchangés',()=>{
  const protectedData=exams.map(e=>({...e,questions:e.questions.map(q=>{
    if(!baseline.scope.includes(e.id)||q.type!=='mcq')return q;
    const {choices,explanation,choiceExplanations,discriminant,...rest}=q;
    return rest;
  })}));
  assert.equal(hash(protectedData),baseline.protectedContentHash);
  assert.equal(hash(read('data/questions.json')),baseline.legacyGeneralHash);
  const selected=exams.filter(e=>baseline.scope.includes(e.id));
  assert.equal(hash(selected.flatMap(e=>e.questions.filter(q=>q.type==='mcq').map(q=>[q.id,q.answer]))),baseline.originalAnswerKeyHash);
});
test('400 QCM révisés : explication de chaque proposition et absence de signal de longueur dominant',()=>{
  const selected=exams.filter(e=>baseline.scope.includes(e.id));
  const review=read('data/reviewed-technical-options.json');
  let count=0;
  for(const e of selected){
    const mcq=e.questions.filter(q=>q.type==='mcq');count+=mcq.length;
    for(const q of mcq){
      assert.equal(review.questions[q.id]?.blindReview?.chosenIndex,q.answer,q.id);
      assert.ok(review.questions[q.id]?.localApproval?.reason.length>=20,q.id);
      assert.equal(q.choiceExplanations?.length,4,q.id);
      assert.ok(q.choiceExplanations.every(x=>typeof x==='string'&&x.length>=15),q.id);
      assert.ok(q.discriminant?.length>=10,q.id);
      assert.ok([...q.choices,...q.choiceExplanations,q.explanation,q.discriminant].every(text=>!/[\p{L}]\?[\p{L}]/u.test(text)),`Encodage altéré : ${q.id}`);
      assert.notDeepEqual(q.choices,previous[q.id].choices,q.id);
    }
    for(const direction of [Math.max,Math.min]){
      // Ties do not provide a unique guessing cue, but are counted conservatively.
      const hits=mcq.filter(q=>q.choices[q.answer].length===direction(...q.choices.map(c=>c.length))).length;
      assert.ok(hits<=20,`${e.id} : ${hits}/40 bonnes réponses à l'extrême de longueur`);
    }
  }
  assert.equal(count,400);
});
test('Une ancienne copie conserve ses propositions et son score ; une nouvelle utilise la révision',()=>{
  const source=exams.find(e=>e.id==='technical-2'),exam={...source,previousOptions:previous};
  const fresh=createTechnicalAttempt(exam,0),old=structuredClone(fresh);delete old.optionsVersion;
  assert.equal(fresh.optionsVersion,OPTIONS_VERSION);
  const oldExam=examForAttempt(exam,old);
  for(const q of source.questions.filter(q=>q.type==='mcq')){
    assert.deepEqual(oldExam.questions.find(x=>x.id===q.id).choices,previous[q.id].choices);
    old.answers[q.id]=q.answer;fresh.answers[q.id]=q.answer;
  }
  assert.equal(examForAttempt(exam,fresh),exam);
  assert.equal(scoreTechnicalAttempt(oldExam,old).mcqScore,40);
  assert.equal(scoreTechnicalAttempt(exam,fresh).mcqScore,40);
  const q=source.questions[0];
  assert.deepEqual(questionForOptionsVersion(q,'legacy',previous).choices,previous[q.id].choices);
  assert.equal(questionForOptionsVersion(q,OPTIONS_VERSION,previous),q);
  assert.equal(oldExam.questions[0].choiceExplanations,undefined);
});
test('La source éditoriale reproduit la banque révisée et rejette une révision incompatible',()=>{
  const review=read('data/reviewed-technical-options.json'),copy=structuredClone(exams);
  applyReviewedOptions(copy,review);assert.deepEqual(copy,exams);
  const q=copy.find(e=>e.id==='technical-2').questions[0];q.prompt+=' altération';
  assert.throws(()=>applyReviewedOptions(copy,review),/incompatible/);
});
test('Les raisons des quatre choix sont échappées et accessibles dans le corrigé',()=>{
  const q={choices:['<img src=x>','B','C','D'],answer:1,choiceExplanations:['<script>danger</script>','Motif B','Motif C','Motif D'],discriminant:'<b>distinction</b>'};
  const html=choiceRationaleHTML(q);
  assert.doesNotMatch(html,/<script>|<img|<b>/);
  assert.match(html,/&lt;script&gt;/);assert.match(html,/Réponse attendue/);
  assert.equal(choiceRationaleHTML({choices:[]}), '');
});

test('Calculs techniques : valeur correcte et aucun distracteur numériquement équivalent',()=>{
  const expected={
    'sncc1-C-M01':12/20*100,'sncc1-C-M02':(8-5)*1e6,
    'sncc2-C-M01':80/8,'sncc2-C-M02':300000*200,'sncc2-C-M08':6e6/3e6,
    'sncc3-C-M01':(12-9)/12*100,'sncc3-C-M02':6e6/18e6,'sncc3-C-M07':170/200*100,
    'rva1-C-M01':714/720*100,'rva1-C-M02':(12-9)/12*100,'rva1-C-M08':(2.4-2)/2*100,
    'rva2-C-M01':480/2,'rva2-C-M02':2e6*.75,'rva2-C-M05':4/.8,
    'rva3-C-M01':(12-10)/10*100,'rva3-C-M02':45e6/900000,'rva3-C-M07':3/8*100,
    'rva4-C-M01':7.2e6/1.2e6,'rva4-C-M02':1.2e6-900000,'rva4-C-M05':.3*5e6,
    'rva5-C-M01':(2+1-2.4)*1e6,'rva5-C-M02':(7-8)*1e6,'rva5-C-M05':20/10,
  };
  const value=text=>{
    const compact=text.replace(/[\u00a0\u202f]/g,' ').replace(/[−–]/g,'-');
    const number=compact.match(/-?\d[\d ]*(?:[.,]\d+)?/);
    if(!number)return NaN;
    let n=Number(number[0].replaceAll(' ','').replace(',','.'));
    if(/moins|négatif|déficit/i.test(compact)&&n>0)n=-n;
    if(/million/i.test(compact))n*=1e6;
    return n;
  };
  const all=exams.flatMap(e=>e.questions);
  for(const [id,result] of Object.entries(expected)){
    const q=all.find(q=>q.id===id),tolerance=Math.max(.006,Math.abs(result)*1e-6);
    const matches=q.choices.map((text,i)=>Math.abs(value(text)-result)<=tolerance?i:-1).filter(i=>i!==-1);
    assert.deepEqual(matches,[q.answer],`${id} : ${q.choices.join(' | ')}`);
  }
});

test('Le validateur distingue un montant positif de son opposé et rejette les signes équivalents',()=>{
  assert.equal(validateTechnicalExams({exams}).length,11);
  const copy=structuredClone(exams),q=copy.find(e=>e.id==='rva-5').questions.find(q=>q.id==='rva5-C-M01');
  q.choices[1]='Moins 1,4 million';
  assert.throws(()=>validateTechnicalExams({exams:copy}),/QCM invalide : rva5-C-M01/);
});
