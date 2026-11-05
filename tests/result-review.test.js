import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {reviewState,matchesReviewFilter,correctionSpeech} from '../src/resultReview.js';
import {resultsHTML} from '../src/technicalUI.js';
import {createTechnicalAttempt} from '../src/technicalExam.js';

const evaluation=(id,score)=>({questionId:id,scoreOutOf10:score,appreciation:'Appréciation',correctElements:['Point correct'],missingElements:['Élément manquant'],errors:['Erreur précise'],improvedAnswer:'Réponse améliorée complète',keyTakeaway:'Règle à retenir',needsHumanReview:false});
const q={id:'short',type:'short',prompt:'Question écrite',modelAnswer:'Modèle canonique',essentials:['Critère un','Critère deux','Critère trois']};
const attempt=()=>({answers:{},written:{short:'Réponse présente'},comments:{},evaluations:{},commentEvaluations:{}});

test('Filtres : seuil 7/10, zéro réellement corrigé, absence et panne IA restent distincts',()=>{
  const a=attempt();assert.equal(reviewState(q,a).status,'pending');
  a.evaluations[q.id]=evaluation(q.id,0);assert.equal(reviewState(q,a).status,'wrong');
  a.evaluations[q.id]=evaluation(q.id,6.5);assert.equal(reviewState(q,a).status,'wrong');
  a.evaluations[q.id]=evaluation(q.id,7);assert.equal(reviewState(q,a).status,'correct');
  a.evaluations[q.id]={...evaluation(q.id,8),scoreOutOf10:7.2};assert.equal(reviewState(q,a).status,'pending');
  a.written.short='  ';assert.equal(reviewState(q,a).status,'unanswered');
  assert.equal(matchesReviewFilter(q,a,'wrong'),false);
  assert.equal(matchesReviewFilter(q,a,'unanswered'),true);
});

test('Un bon QCM avec commentaire insuffisant ou absent apparaît dans le filtre approprié',()=>{
  const m={id:'m',type:'mcq',answer:2,commentRequired:true},a=attempt();a.answers.m=2;a.comments.m='Justification';
  a.commentEvaluations.m=evaluation('m',6.5);
  assert.deepEqual(reviewState(m,a),{status:'correct',commentStatus:'wrong'});
  assert.equal(matchesReviewFilter(m,a,'wrong'),true);
  delete a.commentEvaluations.m;assert.equal(matchesReviewFilter(m,a,'pending'),true);
  a.comments.m=' ';assert.equal(matchesReviewFilter(m,a,'unanswered'),true);
  a.answers.m=1;assert.equal(matchesReviewFilter(m,a,'wrong'),true);
  delete a.answers.m;assert.equal(reviewState(m,a).status,'unanswered');
});

test('Une ancienne auto-évaluation reste lisible sans être confondue avec une panne IA actuelle',()=>{
  const a=attempt();a.ratings={short:4};delete a.evaluations;
  assert.equal(reviewState(q,a).status,'wrong');a.ratings.short=5;assert.equal(reviewState(q,a).status,'correct');
  a.evaluations={};assert.equal(reviewState(q,a).status,'pending');
});

test('Lecture OpenAI : modèle, quatre assertions, commentaire et correction complète prennent le bon contenu',()=>{
  const a=attempt();a.evaluations.short=evaluation('short',6.5);
  assert.match(correctionSpeech(q,a,'model'),/Modèle canonique.*Critère trois/);
  const text=correctionSpeech(q,a,'ai');
  for(const part of ['6.5 sur 10','Point correct','Élément manquant','Erreur précise','Réponse améliorée complète','Règle à retenir'])assert.ok(text.includes(part));
  const m={id:'m',type:'mcq',prompt:'Question QCM',choices:['Premier','Deuxième','Troisième','Quatrième'],answer:2,explanation:'Explication validée',choiceExplanations:['Raison A','Raison B','Raison C','Raison D'],commentRequired:true};
  a.answers.m=0;a.comments.m='Mon argument original';a.commentEvaluations.m=evaluation('m',4);
  assert.match(correctionSpeech(m,a,'mcq'),/Votre choix : Premier.*Réponse attendue : Troisième.*Raison D/);
  assert.match(correctionSpeech(m,a,'comment'),/Mon argument original.*4 sur 10.*Erreur précise/);
  assert.equal(correctionSpeech(q,a,'comment'),'');
  a.evaluations.short={};assert.equal(correctionSpeech(q,a,'ai'),'');
});

test('Affichage filtré : note globale conservée, erreurs en rouge, numéros originaux et contenu échappé',()=>{
  const exam=JSON.parse(fs.readFileSync(new URL('../data/company-exams.json',import.meta.url),'utf8')).exams[0],a=createTechnicalAttempt(exam,0);
  for(const m of exam.questions.filter(q=>q.type==='mcq')){a.answers[m.id]=m.answer;if(m.commentRequired){a.comments[m.id]='Justification';a.commentEvaluations[m.id]=evaluation(m.id,8);}}
  const shorts=exam.questions.filter(q=>q.type==='short');
  for(const s of shorts){a.written[s.id]='Réponse';a.evaluations[s.id]=evaluation(s.id,8);}
  a.evaluations[shorts[1].id]=evaluation(shorts[1].id,6.5);
  a.written[shorts[1].id]='<script>contenu</script>';
  const wrong=resultsHTML(exam,a,{filter:'wrong'}),all=resultsHTML(exam,a,{});
  assert.equal((wrong.match(/data-review-question=/g)||[]).length,1);
  assert.match(wrong,/RÉPONSE COURTE 2/);assert.match(wrong,/review-card review-wrong/);
  assert.match(wrong,/review-errors/);assert.match(wrong,/&lt;script&gt;/);assert.doesNotMatch(wrong,/<script>/);
  assert.equal(wrong.match(/technical-score-value[^>]*>([^<]+)/)[1],all.match(/technical-score-value[^>]*>([^<]+)/)[1]);
  assert.match(resultsHTML(exam,a,{filter:'unanswered'}),/Aucune question dans ce filtre/);
});
