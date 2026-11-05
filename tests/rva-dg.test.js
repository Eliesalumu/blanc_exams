import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {buildRvaDgExams,RVA_DG_VERSION} from '../scripts/rva-dg-bank.js';
import {createTechnicalAttempt,examForAttempt,scoreTechnicalAttempt,validateTechnicalExams} from '../src/technicalExam.js';
import {companyCards,resultsHTML,technicalHistory} from '../src/technicalUI.js';

const read=name=>JSON.parse(fs.readFileSync(new URL('../data/'+name,import.meta.url),'utf8'));
const previous=read('technical-options-previous.json');
const raw=read('company-exams.json').exams.filter(e=>e.company==='RVA');
const exams=raw.map(e=>({...e,previousExam:previous.exams[e.id],previousOptions:previous.questions}));

test('RVA DG : 250 questions nouvelles, distinctes des anciennes ; source reproductible et format complet',()=>{
  assert.deepEqual(buildRvaDgExams(),raw);
  assert.equal(validateTechnicalExams({exams:raw}).length,5);
  assert.equal(raw.flatMap(e=>e.questions).length,250);
  const oldPrompts=new Set(Object.values(previous.exams).flatMap(e=>e.questions.map(q=>q.prompt)));
  const oldIds=new Set(Object.values(previous.exams).flatMap(e=>e.questions.map(q=>q.id)));
  for(const e of raw){
    assert.equal(e.role,'DG');assert.equal(e.bankVersion,RVA_DG_VERSION);
    assert.match(e.title,/RVA DG/);
    const mcq=e.questions.filter(q=>q.type==='mcq');
    for(const q of e.questions){
      assert.ok(!oldPrompts.has(q.prompt),q.id);assert.ok(!oldIds.has(q.id),q.id);
      if(q.type==='short'){
        assert.match(q.instruction,/directeur général/);
        assert.doesNotMatch(q.prompt,/quel rôle du PCA|qu.attendez-vous de la DG|comment le PCA/i);
        continue;
      }
      assert.equal(q.choiceExplanations.length,4);
      assert.ok(q.choiceExplanations.every(x=>x.length>=20));
      assert.equal(new Set(q.choiceExplanations).size,4);
      assert.ok(q.discriminant.length>=20);
    }
    for(const fn of [Math.max,Math.min]){
      const cues=mcq.filter(q=>q.choices[q.answer].length===fn(...q.choices.map(c=>c.length))).length;
      assert.ok(cues<=20,`${e.id} : ${cues} réponses à l’extrême de longueur`);
    }
  }
});

test('RVA : une copie PCA conserve énoncés, corrigés, rôle et score dans les deux versions historiques',()=>{
  const exam=exams[0],archive=previous.exams[exam.id];
  for(const optionsVersion of [undefined,'options-2026-11-05-v1']){
    const attempt={...createTechnicalAttempt(archive,0),optionsVersion};
    for(const q of archive.questions.filter(q=>q.type==='mcq'))attempt.answers[q.id]=q.answer;
    const resolved=examForAttempt(exam,attempt);
    assert.equal(resolved.role,'PCA');assert.equal(resolved.archived,true);
    assert.deepEqual(resolved.questions.map(q=>[q.id,q.prompt,q.modelAnswer]),archive.questions.map(q=>[q.id,q.prompt,q.modelAnswer]));
    for(const q of resolved.questions.filter(q=>q.type==='mcq'))assert.deepEqual(q.choices,optionsVersion?archive.questions.find(x=>x.id===q.id).choices:previous.questions[q.id].choices);
    assert.equal(scoreTechnicalAttempt(exam,attempt).mcqScore,40);
    assert.match(resultsHTML(resolved,attempt,{}),/Ancienne banque RVA PCA/);
    assert.match(technicalHistory(exams,{attempts:[{...attempt,submittedAt:0}]}),/QCM 40\/40/);
  }
  const fresh=createTechnicalAttempt(exam,0);
  assert.equal(fresh.bankVersion,RVA_DG_VERSION);
  assert.equal(examForAttempt(exam,fresh),exam);
  assert.deepEqual(fresh.questionIds,exam.questions.map(q=>q.id));
});

test('RVA : les copies PCA restent accessibles sans bloquer ni fausser les statistiques DG',()=>{
  const archive=previous.exams['rva-1'],old=createTechnicalAttempt(archive,0);old.result={total:100};
  const html=companyCards(exams,{active:null,attempts:[old]});
  assert.match(html,/RVA — PRÉPARATION TECHNIQUE DG/);
  assert.match(html,/Consulter l’ancienne copie PCA/);
  assert.match(html,/technical-instructions:rva-1/);
  assert.match(html,/5 examens disponibles · 0 terminés/);
});

test('RVA DG : calculs indépendants, bonne réponse unique, signes et unités préservés',()=>{
  const expected={
    'rvaDG1-C-M01':13.5/18*100,'rvaDG1-C-M02':(24-18)/24*100,'rvaDG1-C-M06':3e6/15,
    'rvaDG2-C-M01':(720-9)/720*100,'rvaDG2-C-M02':360/6,'rvaDG2-C-M04':240/40,'rvaDG2-C-M06':12000*15-90000,
    'rvaDG3-C-M01':6/36*360,'rvaDG3-C-M02':800000*(12-5),'rvaDG3-C-M03':2.31e6/1.1-2e6,'rvaDG3-C-M04':100000*(2800-2500),'rvaDG3-C-M05':(4-2.8-.9)*1e6,'rvaDG3-C-M07':1.8e6/(20-8),
    'rvaDG4-C-M01':(4-5)*1e6,'rvaDG4-C-M02':(2+.3+.1+.6)*1e6,'rvaDG4-C-M03':2/.4,'rvaDG4-C-M04':1.5e6*.08,'rvaDG4-C-M07':.2/4*100,
    'rvaDG5-C-M01':(3.4-2-.8)*1e6,'rvaDG5-C-M02':15e6*.2,'rvaDG5-C-M03':(.45-.3)*1e6,'rvaDG5-C-M05':1e6*.09*8/12,
  };
  const value=text=>{
    const n=text.match(/\d[\d ]*(?:[.,]\d+)?/);
    if(!n)return NaN;
    return Number(n[0].replaceAll(' ','').replace(',','.'))*(/million/i.test(text)?1e6:1)*(/moins/i.test(text)?-1:1);
  };
  for(const [id,result]of Object.entries(expected)){
    const q=raw.flatMap(e=>e.questions).find(q=>q.id===id);
    const hits=q.choices.map((c,i)=>Math.abs(value(c)-result)<=Math.max(.006,Math.abs(result)*1e-6)?i:-1).filter(i=>i>=0);
    assert.deepEqual(hits,[q.answer],id);
  }
});
