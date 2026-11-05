import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createApi,bank} from '../server/app.js';
import {createEvaluator,evaluationInstructions} from '../server/evaluator.js';
import {evaluationSchema} from '../server/schemas.js';
import {scoreTechnicalAttempt,createTechnicalAttempt,loadTechnicalProgress,saveTechnicalProgress,validateTechnicalExams,TECHNICAL_SECTIONS} from '../src/technicalExam.js';
import {isEvaluation,tutorAllowed,apiRequest,readTutorStream} from '../src/ai.js';
import {splitSpeechText} from '../src/speech.js';
import {publicAiError} from '../server/errors.js';
import {evaluationHTML} from '../src/technicalUI.js';

const exams=bank(),exam=exams.find(e=>e.id==='sncc-1'),short=exam.questions.find(q=>q.type==='short');
const evaluation=(id,score=7.5)=>({questionId:id,scoreOutOf10:score,appreciation:'Bonne réponse, avec quelques omissions',correctElements:['Rôle de supervision distingué de la gestion'],missingElements:['Préciser les indicateurs de suivi'],errors:[],improvedAnswer:'Le conseil examine le diagnostic et suit un plan de la DG fondé sur des indicateurs, sans diriger les opérations.',keyTakeaway:'Superviser le plan et ses résultats.',needsHumanReview:false});
const context={questionId:short.id,candidateAnswer:short.modelAnswer};

test('Diagnostic IA : crédit, clé, réseau et délais sont expliqués sans exposer le fournisseur',()=>{
  class APIConnectionError extends Error {}
  class APIConnectionTimeoutError extends Error {}
  for(const [error,code]of [[{status:401,message:'SECRET'},'credentials'],[{status:429,code:'insufficient_quota',message:'SECRET'},'billing'],[{status:429},'rate_limit'],[new APIConnectionError('SECRET'),'connection'],[new APIConnectionTimeoutError('SECRET'),'timeout']]){
    const result=publicAiError(error);assert.equal(result.code,code);assert.doesNotMatch(result.message,/SECRET/);
  }
});
test('Frontend : un serveur purement statique renvoie un diagnostic visible, pas une erreur JSON silencieuse',async()=>{
  const original=globalThis.fetch;
  globalThis.fetch=async()=>({status:404,ok:false,headers:new Headers({'content-type':'text/html'})});
  try{await assert.rejects(()=>apiRequest('/api/tutor/chat',{}),/Ce serveur ne fournit pas l’API IA/);}
  finally{globalThis.fetch=original;}
});

test('Évaluateur : bonnes, partielles, fausses et reformulées passent intégralement au modèle ; cache et déduplication',async()=>{
  const scores=new Map([['Bonne réponse',9],['Réponse partielle',5.5],['Réponse fausse',1],['Formulation équivalente',9]]),inputs=[];
  const client={responses:{parse:async req=>{inputs.push(req);return {output_parsed:evaluation(short.id,scores.get(JSON.parse(req.input).candidateAnswer))};}}};
  const evaluate=createEvaluator({client,model:'test'});
  for(const [candidateAnswer,score]of scores)assert.equal((await evaluate({...context,candidateAnswer})).scoreOutOf10,score);
  await Promise.all([evaluate({...context,candidateAnswer:'Bonne réponse'}),evaluate({...context,candidateAnswer:'Bonne réponse'})]);
  assert.equal(inputs.length,4);
  let count=0,release;
  const gate=new Promise(resolve=>release=resolve);
  const concurrent=createEvaluator({client:{responses:{parse:async()=>{count++;await gate;return {output_parsed:evaluation(short.id)};}}},model:'test'});
  const first=concurrent(context),second=concurrent(context);release();
  assert.deepEqual(await first,await second);assert.equal(count,1);
  assert.ok(inputs.every(req=>req.store===false&&req.max_output_tokens===1100&&req.text.format.type==='json_schema'));
  assert.match(evaluationInstructions,/SENS/);assert.match(evaluationInstructions,/3, exactitude/);
});
test('JSON invalide, identité erronée, hors barème et notes sans demi-points sont rejetés, pas notés zéro',async()=>{
  for(const value of [null,{},evaluation(short.id,-1),evaluation(short.id,10.5),evaluation(short.id,7.2),evaluation('other',8)]){
    const evaluate=createEvaluator({client:{responses:{parse:async()=>({output_parsed:value})}},model:'test'});
    await assert.rejects(()=>evaluate(context));
  }
  assert.ok(evaluationSchema.safeParse(evaluation(short.id,0)).success);
  assert.ok(isEvaluation(evaluation(short.id,10),short.id));
  assert.equal(isEvaluation(evaluation(short.id,12),short.id),false);
  assert.equal(isEvaluation(undefined,undefined),false);
  assert.match(evaluationHTML(undefined),/en attente/);
  assert.match(evaluationHTML({questionId:short.id,scoreOutOf10:8}),/en attente/);
});
test('Conversion IA : chaque demi-point et bornes 0–10, 40+60, seuil 70 et six sections',()=>{
  const a=createTechnicalAttempt(exam,0);
  for(const q of exam.questions.filter(q=>q.type==='mcq'))a.answers[q.id]=q.answer;
  for(let n=0;n<=10;n+=0.5){
    for(const q of exam.questions.filter(q=>q.type==='short'))a.evaluations[q.id]=evaluation(q.id,n);
    const score=scoreTechnicalAttempt(exam,a);
    assert.equal(score.total,40+n*6);assert.equal(score.passed,score.total>=70);
    for(const [key,section]of Object.entries(TECHNICAL_SECTIONS))assert.ok(score.sections[key].score<=section.points);
  }
  for(const q of exam.questions.filter(q=>q.type==='short'))a.evaluations[q.id]=evaluation(q.id,8);
  a.commentEvaluations={x:evaluation('x',10)};
  assert.equal(scoreTechnicalAttempt(exam,a).writtenScore,48);
  delete a.evaluations[short.id];assert.equal(scoreTechnicalAttempt(exam,a).total,null);
  a.ratings[short.id]=6;assert.equal(scoreTechnicalAttempt(exam,a).total,null);
});
test('Les 400 nouvelles questions respectent les comptes, la répartition, les identifiants et les sources',()=>{
  assert.equal(validateTechnicalExams({exams}).length,11);
  assert.equal(exams.filter(e=>e.company==='SNCC').length,3);assert.equal(exams.filter(e=>e.company==='RVA').length,5);
  const added=exams.filter(e=>e.company).flatMap(e=>e.questions);
  assert.equal(added.length,400);assert.equal(added.filter(q=>q.type==='mcq').length,320);assert.equal(added.filter(q=>q.type==='short').length,80);
  const normalize=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  const old=JSON.parse(fs.readFileSync(new URL('../data/questions.json',import.meta.url),'utf8'));
  const all=[...old.map(q=>q.question),...exams.flatMap(e=>e.questions.map(q=>q.prompt))].map(normalize);
  assert.equal(new Set(all).size,all.length);
  assert.ok(added.every(q=>q.sources.length&&q.sources.every(s=>s.url.startsWith('https://'))));
  for(const e of exams.filter(e=>e.company)){
    const mcq=e.questions.filter(q=>q.type==='mcq');
    assert.ok(mcq.filter(q=>q.choices[q.answer].length>=Math.max(...q.choices.map(c=>c.length))).length<=20,'La longueur ne doit pas indiquer la bonne réponse');
    assert.ok(mcq.some((q,i)=>i&&q.answer!==(mcq[i-1].answer+1)%4),'Pas de cycle prévisible des bonnes réponses');
  }
});
test('Sauvegarde des corrections partielles, réponses originales et nouvelles entreprises',()=>{
  const a=createTechnicalAttempt(exam,0);a.evaluations[short.id]=evaluation(short.id);a.written[short.id]='Copie originale';
  const values=new Map(),storage={setItem:(k,v)=>values.set(k,v),getItem:k=>values.get(k)};
  const state={active:a,attempts:[]};saveTechnicalProgress(state,storage);
  assert.deepEqual(loadTechnicalProgress(storage).data,state);
  assert.equal(tutorAllowed({active:{},technicalActive:null}),false);assert.equal(tutorAllowed({active:null,technicalActive:{}}),false);assert.equal(tutorAllowed({active:null,technicalActive:null}),true);
});

async function fixture(t,{client,env={}}={}){
  const server=createApi({client,env:{ALLOWED_ORIGINS:'http://localhost:4173',...env}});server.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
  t.after(()=>new Promise(r=>server.close(r)));
  const url=`http://127.0.0.1:${server.address().port}`;
  const send=(path,body,token,origin='http://localhost:4173')=>fetch(url+path,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(body)});
  const session=await send('/api/session',{}),{token}=await session.json();
  return {url,send,token};
}
const request={examId:exam.id,questionId:short.id,answer:'Réponse candidate à conserver',kind:'short',selectedChoice:null};
test('API : contexte canonique, correction de commentaire séparée, pas de confiance dans les barèmes clients',async t=>{
  const inputs=[],client={responses:{parse:async req=>{const c=JSON.parse(req.input);inputs.push(c);return {output_parsed:evaluation(c.questionId)};}}};
  const {send,token}=await fixture(t,{client});
  let res=await send('/api/evaluate-answer',request,token);assert.equal(res.status,200);
  assert.equal(inputs[0].company,'SNCC');assert.equal(inputs[0].role,'PCA');assert.equal(inputs[0].referenceAnswer,short.modelAnswer);
  res=await send('/api/evaluate-answer',{...request,model:'unlimited',score:10},token);assert.equal(res.status,400);
  const mcq=exam.questions.find(q=>q.commentRequired);
  res=await send('/api/evaluate-answer',{...request,questionId:mcq.id,kind:'comment',selectedChoice:(mcq.answer+1)%4},token);
  assert.equal(res.status,200);assert.equal(inputs[1].correctChoice,mcq.answer);assert.notEqual(inputs[1].selectedChoice,inputs[1].correctChoice);
});
test('API : lot partiel conserve les évaluations valides ; erreur de fournisseur expurgée',async t=>{
  let count=0;const client={responses:{parse:async req=>{if(count++===1)throw new Error('SECRET-NEVER-RETURN');return {output_parsed:evaluation(JSON.parse(req.input).questionId)};}}};
  const {send,token}=await fixture(t,{client});const shorts=exam.questions.filter(q=>q.type==='short');
  const res=await send('/api/evaluate-exam',{examId:exam.id,answers:shorts.slice(0,2).map(q=>({questionId:q.id,answer:'Texte',kind:'short',selectedChoice:null}))},token);
  assert.equal(res.status,200);const result=await res.json();assert.equal(result.evaluations.length,1);assert.equal(result.failures.length,1);assert.doesNotMatch(JSON.stringify(result),/SECRET/);
});
test('API : panne IA et JSON invalide ne créent aucune note ; clés jamais exposées',async t=>{
  const {send,token,url}=await fixture(t);
  assert.equal((await send('/api/evaluate-answer',request,token)).status,503);
  const health=await(await fetch(url+'/api/health')).json();assert.equal(health.aiConfigured,false);
  assert.doesNotMatch(JSON.stringify(health),/API_KEY|sk-/);
  const provider={responses:{create:async()=>{throw Object.assign(new Error('SECRET-KEY-FROM-PROVIDER'),{status:401});}}};
  const api=await fixture(t,{client:provider});
  const res=await api.send('/api/tutor/chat',{mode:'Comprendre',messages:[{role:'user',content:'CAPEX ?'}],context:{company:'RVA',examActive:false,frequentErrors:[]}},api.token);
  assert.equal(res.status,503);assert.doesNotMatch(await res.text(),/SECRET/);
});
test('API : session, origines, tailles et quotas globaux protègent contre abus',async t=>{
  const client={responses:{parse:async req=>({output_parsed:evaluation(JSON.parse(req.input).questionId)})}};
  const {send,token}=await fixture(t,{client,env:{AI_DAILY_CALL_LIMIT:'1'}});
  assert.equal((await send('/api/evaluate-answer',request)).status,401);
  assert.equal((await send('/api/evaluate-answer',request,token,'https://intrus.test')).status,403);
  assert.equal((await send('/api/evaluate-answer',{...request,answer:'x'.repeat(6001)},token)).status,400);
  assert.equal((await send('/api/evaluate-answer',{...request,answer:'x'.repeat(71000)},token)).status,413);
  assert.equal((await send('/api/evaluate-answer',request,token)).status,200);
  assert.equal((await send('/api/evaluate-answer',{...request,answer:'autre copie'},token)).status,503);
});
test('Chatbot : contexte, historique multi-tours et refus en simulation ; pas de modèle choisi par client',async t=>{
  const inputs=[],client={responses:{create:async req=>{inputs.push(req);return {status:'completed',output_text:'La disponibilité ne suffit pas sans équipes et sillons.'};}}};
  const {send,token}=await fixture(t,{client});
  const body={mode:'Analyser mes erreurs',messages:[{role:'user',content:'Explique la disponibilité'},{role:'assistant',content:'C’est l’aptitude au service.'},{role:'user',content:'Un exemple ?'}],context:{company:'SNCC',examId:exam.id,questionId:short.id,correction:evaluation(short.id),candidateAnswer:'Ma copie',frequentErrors:['Capacité'],examActive:false}};
  assert.equal((await send('/api/tutor/chat',body,token)).status,200);
  assert.equal(inputs[0].input.length,4);assert.match(inputs[0].input[0].content,/SNCC/);assert.match(inputs[0].input[0].content,/Ma copie/);
  assert.equal((await send('/api/tutor/chat',{...body,context:{...body.context,examActive:true}},token)).status,409);assert.equal(inputs.length,1);
  assert.equal((await send('/api/tutor/chat',{...body,model:'other'},token)).status,400);
});
test('Chat : les fragments SSE sont reçus avant la fin, et un flux interrompu reste une erreur',async t=>{
  let release;const gate=new Promise(resolve=>release=resolve);
  t.after(()=>release());
  const client={responses:{create:async options=>{assert.equal(options.stream,true);return (async function*(){yield {type:'response.output_text.delta',delta:'Le conseil '};await gate;yield {type:'response.output_text.delta',delta:'supervise.'};yield {type:'response.completed'};})();}}};
  const {send,token}=await fixture(t,{client});
  const res=await send('/api/tutor/chat',{stream:true,mode:'Comprendre',messages:[{role:'user',content:'Quel rôle ?'}],context:{company:'SNCC',examActive:false,frequentErrors:[]}},token);
  assert.match(res.headers.get('content-type'),/text\/event-stream/);
  let first;const firstDelta=new Promise(resolve=>first=resolve),parts=[];
  const done=readTutorStream(res,(delta)=>{parts.push(delta);first();});
  await firstDelta;assert.deepEqual(parts,['Le conseil ']);release();
  assert.equal((await done).message,'Le conseil supervise.');
  await assert.rejects(()=>readTutorStream(new Response('data: {"type":"delta","delta":"Partiel"}\n\n'),()=>{}),/interrompue/);
});
test('Lecture OpenAI : voix fixée côté serveur, cache, refus en examen et validation',async t=>{
  const inputs=[],client={audio:{speech:{create:async options=>{inputs.push(options);return {arrayBuffer:async()=>new Uint8Array([73,68,51,1]).buffer};}}}};
  const {send,token}=await fixture(t,{client});
  const body={text:'Le conseil supervise la stratégie.',examActive:false};
  const res=await send('/api/tutor/speech',body,token);assert.equal(res.status,200);assert.match(res.headers.get('content-type'),/audio\/mpeg/);assert.equal((await res.arrayBuffer()).byteLength,4);
  assert.equal((await send('/api/tutor/speech',body,token)).status,200);assert.equal(inputs.length,1);assert.equal(inputs[0].voice,'marin');assert.equal(inputs[0].model,'gpt-4o-mini-tts');
  assert.equal((await send('/api/tutor/speech',{...body,examActive:true},token)).status,409);
  assert.equal((await send('/api/tutor/speech',{...body,model:'other'},token)).status,400);
  assert.equal((await send('/api/tutor/speech',{...body,text:'a'.repeat(3001)},token)).status,400);
});
test('Les longs textes sont découpés pour une lecture complète et bornée',()=>{
  const text=Array.from({length:200},(_,i)=>`Phrase ${i} : le conseil supervise les résultats.`).join(' ');
  const parts=splitSpeechText(text);assert.ok(parts.length>1);assert.ok(parts.every(p=>p.length<=2800));assert.equal(parts.join(' '),text);
});
