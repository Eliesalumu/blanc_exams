import {apiRequest,isEvaluation,unavailable,tutorAllowed} from './ai.js';
import {createTutor} from './tutor.js';
import {companyCards,resultsHTML,technicalHistory} from './technicalUI.js';
import { CATEGORIES, DURATION, BANK_VERSION, SUBSCRIPTION_EXPIRY, SUBSCRIPTION_REMINDER_ENABLED, escapeHTML as h, percent, fmt } from './config.js';
import { loadQuestions } from './questionLoader.js';
import { loadProgress, saveProgress } from './storage.js';
import { createAttempt, setAnswer, toggleMark, completeAttempt, shuffle } from './exam.js';
import { scoreExam } from './scoring.js';
import { analyze } from './analytics.js';
import { formatTime, remaining, startClock } from './timer.js';
import { TECHNICAL_SECTIONS, loadTechnicalExams, loadTechnicalProgress, saveTechnicalProgress, createTechnicalAttempt, scoreTechnicalAttempt, missingRequiredComments } from './technicalExam.js';
import { daysUntilExpiry } from './subscription.js';

const app = document.querySelector('#app'), modal = document.querySelector('#modal');
modal.addEventListener('click',e=>{if(e.target.closest('[data-action="subscription-close"]'))modal.close();});
const icon = (name, size=20) => {
  const paths = { home:'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z', book:'M4 4h7a3 3 0 0 1 3 3v14a4 4 0 0 0-4-2H4zM14 7a3 3 0 0 1 3-3h4v15h-3a4 4 0 0 0-4 2', chart:'M4 20V10m8 10V4m8 16v-7', flag:'M5 21V3m0 1c5-4 9 4 14 0v10c-5 4-9-4-14 0', clock:'M12 8v5l3 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0', arrow:'M5 12h14m-6-6 6 6-6 6', check:'m5 12 4 4 10-10', shield:'m12 2 9 4v6c0 5-9 10-9 10S3 17 3 12V6z', info:'M12 11v6m0-10v1M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0', download:'M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5', expand:'M9 3H3v6m12-6h6v6M3 15v6h6m12-6v6h-6' };
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name]||paths.info}"/></svg>`;
};
let bank, plan, byId, progress, technicalExams, technicalProgress, page='dashboard', selectedDay=1, resultId=null, technicalResultId=null, correctionFilter='all', categoryFilter='all';
let review=null, stopClock=null, stopTechnicalClock=null, storageWarning=false, technicalStorageWarning=false, offlineReady=false;
const toast = message => { const t=document.querySelector('#toast'); t.textContent=message; t.classList.add('visible'); clearTimeout(toast.timeout); toast.timeout=setTimeout(()=>t.classList.remove('visible'),5000); };
const persist = () => { const saved=saveProgress(progress); if (!saved) { storageWarning=true; toast('Sauvegarde impossible : exportez vos résultats avant de fermer cette page.'); } return saved; };
const persistTechnical = () => { const saved=saveTechnicalProgress(technicalProgress); if (!saved) toast('Sauvegarde technique impossible : gardez cette page ouverte et exportez votre progression.'); return saved; };
const button = (label,action,classes='btn',extra='') => `<button class="${classes}" data-action="${action}" ${extra}>${label}</button>`;
const nameSub = value => value.replace(/^rdc_/, 'RDC · ').replaceAll('_',' ').replace(/^./, s=>s.toUpperCase());
const latest = day => progress.attempts.filter(a=>a.day===day).at(-1);
const analysis = () => analyze(progress.attempts,byId);
const currentResult = () => progress.attempts.find(a=>a.id===resultId) || progress.attempts.at(-1);
function navigate(target) { page=target; review=null; render(); window.scrollTo(0,0); }
let tutorQuestionId=null,tutorCompany='ONATRA',technicalReview=null;
const aiBusy=new Set(),aiErrors=new Map();
function tutorContext(){
  const attempt=technicalProgress?.attempts.find(a=>a.id===technicalResultId)||technicalProgress?.attempts.find(a=>a.examId===technicalResultId);
  const exam=technicalReview?.exam||technicalExams?.find(e=>e.id===attempt?.examId)||technicalExams?.find(e=>e.id===technicalResultId);
  const questionId=tutorQuestionId||technicalReview?.question?.id||(page==='revision'&&review?review.ids[review.index]:null);
  const context={company:exam?.company||tutorCompany,examActive:!!(progress?.active||technicalProgress?.active),frequentErrors:[]};
  if(exam)context.examId=exam.id;
  if(questionId){context.questionId=questionId;const evaluation=attempt?.evaluations?.[questionId]||attempt?.commentEvaluations?.[questionId];if(evaluation){const {evaluatedAt,...correction}=evaluation;context.correction=correction;}context.candidateAnswer=attempt?.written?.[questionId]||attempt?.comments?.[questionId]||'';}
  if(attempt)context.frequentErrors=exam.questions.filter(q=>q.type==='mcq'&&attempt.answers[q.id]!==q.answer).slice(0,6).map(q=>q.prompt.slice(0,200));
  else if(technicalProgress&&technicalExams)context.frequentErrors=technicalProgress.attempts.filter(a=>(technicalExam(a.examId)?.company||'ONATRA')===context.company).flatMap(a=>technicalExam(a.examId).questions.filter(q=>q.type==='mcq'&&a.answers[q.id]!==q.answer).map(q=>q.prompt.slice(0,200))).slice(0,6);
  if(!exam&&questionId&&byId?.has(questionId)){context.company='ONATRA';const q=byId.get(questionId);context.candidateAnswer=Number.isInteger(review?.answers[q.id])?q.choices[review.answers[q.id]]:'';}
  return context;
}
const tutor=createTutor(tutorContext,toast);
app.addEventListener('toggle',e=>{const id=e.target.dataset.reviewQuestion;if(id&&e.target.open){tutorQuestionId=id;tutor.update(tutorAllowed({active:progress?.active,technicalActive:technicalProgress?.active}));}},true);
async function evaluateTechnical(id){
  const attempt=technicalProgress.attempts.find(a=>a.id===id);if(!attempt||aiBusy.has(id))return;
  if(technicalProgress.active||progress.active){aiErrors.set(id,'Terminez la simulation en cours avant de lancer une correction IA.');if(page==='technical-results')technicalResults();return;}
  const exam=technicalExam(attempt.examId);aiBusy.add(id);aiErrors.delete(id);
  delete attempt.aiError;
  if(page==='technical-results')technicalResults();
  let errors=false;
  try{
    const items=[...exam.questions.filter(q=>q.type==='short'),...exam.questions.filter(q=>q.type==='mcq'&&q.commentRequired)];
    for(const q of items){
      if(technicalProgress.active||progress.active)break;
      const field=q.type==='short'?'evaluations':'commentEvaluations';
      if(isEvaluation(attempt[field]?.[q.id],q.id))continue;
      try{
        const result=await apiRequest('/api/evaluate-answer',{examId:exam.id,questionId:q.id,kind:q.type==='short'?'short':'comment',answer:(q.type==='short'?attempt.written[q.id]:attempt.comments[q.id])||'',selectedChoice:attempt.answers[q.id]??null});
        const evaluation=result.evaluations?.[0];if(!isEvaluation(evaluation,q.id))throw new Error(unavailable);
        attempt[field]??={};attempt[field][q.id]={...evaluation,evaluatedAt:new Date().toISOString()};
        attempt.result=scoreTechnicalAttempt(exam,attempt);persistTechnical();
        if(page==='technical-results'&&technicalResultId===id)technicalResults();
      }catch(error){errors=true;aiErrors.set(id,error.message);attempt.aiError=error.message;persistTechnical();break;}
    }
  }finally{aiBusy.delete(id);if(errors&&!aiErrors.has(id))aiErrors.set(id,unavailable);if(page==='technical-results'&&technicalResultId===id)technicalResults();}
}
function frame(content) {
  const inExam=page==='exam'||page==='technical-exam', items=[['dashboard','home','Vue d’ensemble'],['revision','book','Banque d’entraînement'],['history','chart','Mes résultats'],['errors','flag','Mes erreurs fréquentes'],['guide','info','Mode d’emploi']];
  app.innerHTML=`<aside class="sidebar ${inExam?'exam-sidebar':''}"><a href="#" class="brand" data-action="nav:dashboard" aria-label="CAP 70, accueil"><span class="brand-mark">${icon('check',24)}</span><span>CAP<span class="brand-number">70</span><small>PRÉPARATION TECHNIQUE PCA</small></span></a><div class="nav-caption">VOTRE ESPACE CANDIDAT</div><nav aria-label="Navigation principale">${items.map(([id,ic,label])=>button(icon(ic)+`<span>${label}</span>`,`nav:${id}`,`nav-link ${page===id?'active':''}`,page===id?'aria-current="page"':'')).join('')}</nav><div class="sidebar-bottom"><div class="goal-mini"><span>VOTRE CAP</span><strong>70<span>%</span></strong><p>46 bonnes réponses sur 65</p><div class="mini-line"><i></i></div></div><p class="local-note">${icon('shield',17)} Progression sur cet appareil</p><span class="offline-indicator">${offlineReady?'● Disponible hors ligne':'○ Préparation hors ligne…'}</span></div></aside>
  <div class="workspace ${inExam?'exam-workspace':''}"><header class="topbar"><div class="breadcrumb">Espace de préparation <span>/</span> ${inExam?'Simulation en cours':page==='dashboard'?'Tableau de bord':page==='revision'?'Entraînement':page==='errors'?'Journal des erreurs':page==='guide'?'Mode d’emploi':'Résultats'}</div><div class="topbar-right"><span class="status-dot"></span><span>Parcours de 5 jours</span><span class="avatar" aria-label="Espace personnel">C</span></div></header><main id="main" tabindex="-1">${storageWarning?'<div class="alert urgent" role="alert">La sauvegarde locale est indisponible. Exportez régulièrement vos résultats.</div>':''}${technicalStorageWarning?'<div class="alert urgent" role="alert">La sauvegarde des examens techniques est indisponible ou illisible. Vos réponses ne sont pas garanties après fermeture.</div>':''}${content}</main><footer>CAP 70 <span>Outil indépendant d’entraînement. Questions originales, non officielles et non confidentielles.</span></footer></div>`;
  tutor.update(tutorAllowed({active:progress?.active,technicalActive:technicalProgress?.active}));
}
function heading(eyebrow,title,desc,action='') { return `<div class="page-heading"><div><p class="eyebrow">${eyebrow}</p><h1>${title}</h1><p class="muted">${desc}</p></div>${action}</div>`; }
function dashboard() {
  const stats=analysis(), done=new Set(progress.attempts.map(a=>a.day)).size, next=[1,2,3,4,5].find(d=>!latest(d))||5;
  const catBars=Object.entries(CATEGORIES).map(([c,s])=>{const v=stats.categories[c],p=percent(v.correct,v.total);return `<div class="subject-row"><span class="subject-icon" style="--subject:${s.color}">${s.short}</span><div><div class="subject-label"><strong>${s.label}</strong><span>${v.total?`${fmt(p)} %`:'À évaluer'}</span></div><div class="track"><i style="width:${p}%;background:${s.color}"></i></div></div></div>`;}).join('');
  const dayCards=[1,2,3,4,5].map(d=>{const a=latest(d),active=progress.active?.day===d;return `<article class="day-card ${d===next&&!a?'recommended':''}"><div class="day-top"><span class="day-number">0${d}</span><span class="pill ${a?(a.result.passed?'success':'warning'):active?'blue':''}">${a?(a.result.passed?'Réussi':'À renforcer'):active?'En cours':d===next?'Prochaine étape':'À votre rythme'}</span></div><h3>Jour ${d}</h3><p>${['Prendre ses repères','Consolider les bases','Affiner son raisonnement','Gagner en précision','Viser la maîtrise'][d-1]}</p><div class="day-details"><span>${icon('book',15)}65 questions</span><span>${icon('clock',15)}60 min</span></div>${a?`<div class="day-result ${a.result.passed?'good':'bad'}">${fmt(a.result.percentage)}<small> %</small><span>${a.result.correct}/65</span></div>`:'<div class="day-empty">Un nouveau pas vers votre objectif</div>'}${button(a?'Voir mon résultat':active?'Reprendre':`Préparer le jour ${d}`,a?`result:${a.id}`:`instructions:${d}`,`btn ${d===next&&!a?'primary':'outline'} full`)}${a?button('Refaire cette simulation',`instructions:${d}`,'text-button retry'):''}</article>`;}).join('');
  frame(heading('PRÉPARATION TECHNIQUE PCA','Votre objectif, à portée de méthode.','Préparation intensive — 5 jours pour progresser avec confiance.',`<div class="heading-actions">${button(icon('book')+' Mode révision','nav:revision','btn outline')}${button('Réinitialiser ma progression','reset','btn danger')}</div>`)+
  `<section class="hero"><div><span class="hero-tag"><span></span> UN PARCOURS. UN CAP CLAIR.</span><h2>5 jours pour vous préparer.<br><em>70 % pour atteindre le cap.</em></h2><p>Programme de préparation technique estimatif fondé sur les exigences du poste et les textes applicables.<br class="desktop-br"> PCA de l’ONATRA · Questions originales non officielles.</p><div class="hero-actions">${button((progress.active?'Reprendre ma simulation':'Commencer ma préparation')+' '+icon('arrow'),progress.active?'resume':`instructions:${next}`,'btn light')}<span>${icon('clock',17)} Une heure par jour</span></div></div><div class="hero-visual" aria-label="Objectif : 46 bonnes réponses sur 65"><div class="orbit orbit-one"></div><div class="orbit orbit-two"></div><div class="hero-gauge"><strong>70<small>%</small></strong><span>VOTRE OBJECTIF</span></div><div class="gauge-caption">46 <span>/ 65 bonnes réponses</span></div></div></section>
  <section class="stat-grid" aria-label="Votre progression"><article class="stat-card"><span>Simulations terminées</span><strong>${done}<small>/ 5</small></strong><div class="stat-steps">${[1,2,3,4,5].map(d=>`<i class="${latest(d)?'filled':''}"></i>`).join('')}</div></article><article class="stat-card"><span>Meilleur score</span><strong>${stats.best===null?'—':fmt(stats.best)}<small>${stats.best===null?'':'%'}</small></strong><p>${stats.best===null?'Votre premier résultat vous attend':'Votre meilleure performance'}</p></article><article class="stat-card"><span>Moyenne générale</span><strong>${stats.average===null?'—':fmt(stats.average)}<small>${stats.average===null?'':'%'}</small></strong><p>${progress.attempts.length?`${progress.attempts.length} tentative(s) enregistrée(s)`:'Une progression qui se construit'}</p></article><article class="stat-card accent-stat"><span>À renforcer en priorité</span><strong class="stat-subject">${stats.weakest?CATEGORIES[stats.weakest].label:'À découvrir'}</strong><p>${stats.weakest?'Votre matière au taux le plus faible':'Commencez par une simulation'}</p></article></section>
  <section class="section"><div class="section-heading"><div><h2>Vos cinq simulations</h2><p>Cinq examens distincts. La même exigence, chaque jour.</p></div><span class="section-meta">325 questions sans répétition</span></div><div class="day-grid">${dayCards}</div></section>
  ${companyCards(technicalExams,technicalProgress)}
  <div class="dashboard-lower"><section class="panel"><div class="section-heading"><h2>Vos repères par matière</h2><span class="subtle-label">Toutes vos tentatives</span></div>${catBars}</section><section class="panel revision-callout"><span class="outlined-icon">${icon('book',26)}</span><span class="eyebrow">PROGRESSER ENTRE DEUX TESTS</span><h2>La bonne réponse,<br>c’est aussi la comprendre.</h2><p>175 questions supplémentaires, des explications immédiates et un entraînement ciblé sur vos erreurs.</p>${button('Explorer la banque '+icon('arrow'),'nav:revision','text-button')}<div class="callout-bottom">500 questions originales <span>·</span> 6 domaines techniques</div></section></div><div class="info-strip">${icon('info',19)}<p><strong>Le seuil exact : 46 bonnes réponses.</strong> 45/65 = 69,23 % ; 46/65 = 70,77 %. Chaque bonne réponse compte.</p></div>`);
}
const technicalExam = id => technicalExams.find(exam=>exam.id===id);
const activeTechnicalAttempt = () => technicalProgress.active;
const technicalQuestion = attempt => technicalExam(attempt.examId)?.questions.find(question=>question.id===attempt.questionIds[attempt.index]);
function technicalInstructions(id) {
  const exam=technicalExam(id),attempt=technicalProgress.attempts.find(item=>item.examId===id),active=technicalProgress.active;
  if(!exam)return navigate('dashboard');
  frame(`<div class="narrow">${button('← Retour au tableau de bord','nav:dashboard','text-button back')}${heading('EXAMEN TECHNIQUE · FORMAT PÉDAGOGIQUE',h(exam.title),'Une simulation indépendante, conçue pour travailler les compétences attendues d’un PCA.') }<section class="panel instructions"><div class="instruction-metrics"><div><strong>50</strong><span>questions au total</span></div><div><strong>60</strong><span>minutes</span></div><div><strong>70/100</strong><span>objectif pédagogique</span></div></div><p><strong>Composition simulée :</strong> 40 QCM à réponse unique (1 point chacun) et 10 réponses courtes (6 points chacune). Les questions peuvent inclure une justification obligatoire. La répartition par section et le barème sont pédagogiques et ne constituent pas une information officielle.</p><p>Les réponses écrites sont conservées et restent modifiables jusqu’à l’envoi. Elles seront évaluées par IA sur 10, puis converties sur 6 points (note × 0,6). En cas de panne, la copie reste sauvegardée et la correction peut être relancée.</p><p>Le chronomètre commence au lancement, continue après fermeture ou rafraîchissement et entraîne l’envoi automatique après 60 minutes. Une tentative initiale est conservée jusqu’à réinitialisation volontaire.</p><div class="exam-distribution">${Object.entries(TECHNICAL_SECTIONS).map(([section,detail])=>`<span><b>${section}</b> ${detail.label} · ${detail.points} pts</span>`).join('')}</div>${active?`<div class="alert notice">Une simulation technique est déjà en cours. Reprenez-la avant d’en démarrer une autre.</div>${button('Reprendre la simulation en cours','technical-resume','btn primary full')}`:attempt?`${button('Voir ma copie et la correction',`technical-result:${attempt.id}`,'btn outline full')}`:button('COMMENCER LE TEST '+icon('arrow'),`technical-start:${id}`,'btn primary full')}<p class="center muted small">Questions originales, non officielles et non confidentielles. Les cas financiers sont fictifs.</p></section></div>`);
}
function technicalExamScreen() {
  const attempt=activeTechnicalAttempt();
  if(!attempt)return navigate('dashboard');
  const exam=technicalExam(attempt.examId),question=technicalQuestion(attempt);
  if(!question)throw new Error('Question technique de la sauvegarde introuvable.');
  const answered=exam.questions.filter(item=>item.type==='mcq'?Number.isInteger(attempt.answers[item.id]):Boolean(attempt.written[item.id]?.trim())).length;
  const missingComments=missingRequiredComments(exam,attempt).length;
  const remainingQuestions=50-answered;
  frame(`<div class="exam-heading"><div><p class="eyebrow">${h(exam.title.toUpperCase())}</p><h1>Question ${attempt.index+1} <span>/ 50</span></h1></div><div class="exam-tools"><div id="timer-box" class="timer-box"><span>TEMPS RESTANT</span><strong id="timer" role="timer" aria-label="Temps restant">${formatTime(remaining(attempt.deadline))}</strong></div></div></div><div id="time-alert" role="status" class="time-alert"></div><div class="exam-progress"><div class="track"><i style="width:${answered/50*100}%"></i></div><span>${answered} / 50 renseignées · ${missingComments} commentaire(s) manquant(s)</span></div><div class="exam-layout"><section class="panel question-panel" aria-labelledby="question-title"><div class="question-meta"><span class="category-tag">${question.section} · ${TECHNICAL_SECTIONS[question.section].label}</span><span>${question.type==='mcq'?'QCM · 1 POINT':'RÉPONSE COURTE · 6 POINTS'}</span></div>${question.commentRequired?'<p class="comment-required">RÉPONSE À COMMENTER — justification obligatoire</p>':''}<h2 id="question-title" tabindex="-1">${h(question.prompt)}</h2>${question.type==='mcq'?`<fieldset class="choices"><legend class="sr-only">Choisissez une réponse</legend>${question.choices.map((choice,index)=>`<label class="choice ${attempt.answers[question.id]===index?'selected':''}"><input type="radio" name="technical-answer" value="${index}" ${attempt.answers[question.id]===index?'checked':''}><span class="choice-letter">${'ABCD'[index]}</span><span>${h(choice)}</span><span class="radio-indicator"></span></label>`).join('')}</fieldset>${question.commentRequired?`<label class="written-label" for="comment-${question.id}">Justifiez brièvement votre choix <span>(obligatoire avant l’envoi)</span></label><textarea id="comment-${question.id}" class="written-answer comment-answer" data-technical-field="comments" data-question="${question.id}" rows="4" placeholder="Expliquez votre raisonnement…">${h(attempt.comments[question.id]||'')}</textarea>`:''}`:`<div class="short-answer-instruction"><strong>Réponse courte</strong><p>${h(question.instruction)}</p><span>Longueur souhaitée : ${question.minWords} à ${question.maxWords} mots.</span></div><label class="written-label" for="written-${question.id}">Votre réponse</label><textarea id="written-${question.id}" class="written-answer" data-technical-field="written" data-question="${question.id}" rows="8" placeholder="Rédigez votre réponse…">${h(attempt.written[question.id]||'')}</textarea>`}<div class="question-actions">${button('← Précédente','technical-previous','btn outline',attempt.index===0?'disabled':'')}${button(attempt.marked.includes(question.id)?'✓ À revoir':'⚑ À revoir','technical-mark',`btn ${attempt.marked.includes(question.id)?'marked-button':'subtle'}`)}${button(attempt.index===49?'Vérifier et terminer':'Suivante →',attempt.index===49?'technical-finish':'technical-next','btn primary')}</div></section><aside class="panel question-map"><h2>Votre parcours</h2><div class="map-counts"><span><b>${answered}</b> renseignées</span><span><b>${remainingQuestions}</b> restantes</span></div><div class="number-grid" aria-label="Accès direct aux questions">${exam.questions.map((item,index)=>button(String(index+1),`technical-jump:${index}`,`question-number ${item.type==='mcq'?Number.isInteger(attempt.answers[item.id])?'answered':'':attempt.written[item.id]?.trim()?'answered':''} ${attempt.marked.includes(item.id)?'marked':''} ${index===attempt.index?'current':''}`,`aria-label="Question ${index+1}, ${item.type==='mcq'?Number.isInteger(attempt.answers[item.id])?'répondue':'sans réponse':attempt.written[item.id]?.trim()?'répondue':'sans réponse'}${attempt.marked.includes(item.id)?', à revoir':''}"`)).join('')}</div><div class="map-legend"><span><i class="answered"></i>Renseignée</span><span><i></i>Non renseignée</span><span><i class="marked"></i>À revoir (${attempt.marked.length})</span></div><p class="small muted">${missingComments} justification(s) obligatoire(s) manquante(s).</p>${button('Terminer le test','technical-finish','btn outline full')}</aside></div>`);
  document.querySelector('#question-title')?.focus({preventScroll:true});
  updateTimer(remaining(attempt.deadline));
}
function technicalResults() {
  const attempt=technicalProgress.attempts.find(a=>a.id===technicalResultId)||technicalProgress.attempts.find(a=>a.examId===technicalResultId);
  if(!attempt)return navigate('dashboard');
  const exam=technicalExam(attempt.examId);
  frame(heading('RÉSULTAT PÉDAGOGIQUE',h(exam.title),'Copie et évaluations conservées sur cet appareil.',button('← Tableau de bord','nav:dashboard','btn outline'))+resultsHTML(exam,attempt,{busy:aiBusy.has(attempt.id),error:aiErrors.get(attempt.id)||attempt.aiError})+button('Réinitialiser cette tentative','technical-reset:'+exam.id,'btn danger'));
}
function technicalRevision(company,selectedIds=null){
  const questions=technicalExams.filter(e=>(e.company||'ONATRA')===company).flatMap(exam=>exam.questions.filter(q=>!selectedIds||selectedIds.has(q.id)).map(question=>({exam,question})));
  if(!questions.length){toast('Aucune question à réviser pour cette sélection.');return;}
  technicalReview={company,questions,index:0,...questions[0]};tutorCompany=company;tutorQuestionId=null;page='technical-revision';render();
}
function technicalRevisionScreen(){
  const r=technicalReview,q=r.question;
  frame(heading('RÉVISION '+r.company,h(r.exam.title),'Révision libre, sans chronomètre.',button('Retour','nav:dashboard','btn outline'))+`<section class="panel narrow"><p>${r.index+1}/${r.questions.length} · ${q.section} — ${TECHNICAL_SECTIONS[q.section].label}</p><h2>${h(q.prompt)}</h2>${q.type==='mcq'?`<ol type="A">${q.choices.map(c=>`<li>${h(c)}</li>`).join('')}</ol>`:''}<details data-revision-correction><summary>Consulter la correction</summary><p>${h(q.type==='mcq'?q.choices[q.answer]+' — '+q.explanation:q.modelAnswer)}</p></details><div class="question-actions">${button('Précédente','technical-review-prev','btn outline',r.index?'':'disabled')}${button('Suivante','technical-review-next','btn primary',r.index<r.questions.length-1?'':'disabled')}</div></section>`);
}
function submitTechnical(automatic=false) {
  const attempt=activeTechnicalAttempt();
  if(!attempt)return;
  if(modal.open)modal.close();
  const exam=technicalExam(attempt.examId);
  const completed={...attempt,submittedAt:Math.min(Date.now(),attempt.deadline),automatic,result:scoreTechnicalAttempt(exam,attempt)};
  technicalProgress.attempts=[...technicalProgress.attempts.filter(item=>item.examId!==attempt.examId),completed];
  technicalProgress.active=null;stopTechnicalClock?.();stopTechnicalClock=null;persistTechnical();technicalResultId=completed.id;page='technical-results';render();window.scrollTo(0,0);
  void evaluateTechnical(completed.id);
  if(automatic)toast('Le temps est écoulé. Votre copie a été envoyée automatiquement.');
}
function armTechnicalClock() {
  stopTechnicalClock?.();stopTechnicalClock=null;
  if(technicalProgress.active)stopTechnicalClock=startClock(technicalProgress.active.deadline,updateTimer,()=>submitTechnical(true));
}
function subscriptionDaysRemaining() {
  return daysUntilExpiry(SUBSCRIPTION_EXPIRY);
}
function showSubscriptionReminder() {
  if(!SUBSCRIPTION_REMINDER_ENABLED||progress?.active||technicalProgress?.active||modal.open)return;
  const days=subscriptionDaysRemaining();
  const message=days>0?`Votre abonnement arrive à échéance dans ${days} jour${days===1?'':'s'}. Pensez à le renouveler afin de continuer à accéder à la plateforme d’entraînement.`:days===0?'Votre abonnement arrive à échéance aujourd’hui. Pensez à le renouveler afin de continuer à accéder à la plateforme d’entraînement.':`La date d’échéance configurée de votre abonnement est dépassée depuis ${Math.abs(days)} jour${days===-1?'':'s'}. Vérifiez les informations de votre abonnement auprès de la plateforme.`;
  modal.innerHTML=`<div class="subscription-icon">${icon('info',24)}</div><p class="eyebrow">RAPPEL DE RENOUVELLEMENT</p><h2 id="modal-title">RENOUVELLEMENT DE VOTRE ABONNEMENT</h2><p>${h(message)}</p><p class="small muted">Rappel informatif uniquement — aucun paiement ni changement d’accès n’est effectué ici.</p><div class="dialog-actions">${button('J’ai compris','subscription-close','btn primary')}</div>`;
  modal.showModal();
}
function instructions() {
  const hasActive=!!progress.active;
  frame(`<div class="narrow">${button('← Retour au tableau de bord','nav:dashboard','text-button back')}${heading(`SIMULATION · JOUR ${selectedDay}`,'Une heure pour vous mettre en situation.','Prenez quelques instants pour lire les consignes. Le chronomètre démarrera uniquement au clic sur le bouton de lancement.')}<section class="panel instructions"><div class="instruction-metrics"><div><strong>65</strong><span>questions à choix multiple</span></div><div><strong>60</strong><span>minutes exactement</span></div><div><strong>70 %</strong><span>46 bonnes réponses minimum</span></div></div><h2>Avant de commencer</h2><ol class="instruction-list"><li>Installez-vous au calme, avec du brouillon. Une seule réponse est correcte par question.</li><li>Vous pouvez modifier vos réponses, passer une question et y revenir via la grille.</li><li>Le marqueur « À revoir » vous aide à retrouver les questions à vérifier.</li><li>À la fin des 60 minutes, vos réponses sont automatiquement envoyées. Le temps continue si vous quittez ou rafraîchissez la page.</li><li>Une réponse fausse ou absente vaut 0 point. Une bonne réponse vaut 1 point, sans pénalité.</li><li>Votre correction et vos résultats seront disponibles après l’envoi.</li></ol><div class="exam-distribution">${Object.values(CATEGORIES).map(c=>`<span><b>${c.count}</b> ${c.label}</span>`).join('')}</div>${hasActive?`<div class="alert notice">Le jour ${progress.active.day} est déjà en cours. Reprenez-le ou terminez-le avant de lancer une autre tentative.</div>${button('Reprendre la simulation en cours','resume','btn primary full')}`:button('COMMENCER LE TEST '+icon('arrow'),'start','btn primary full')}<p class="center muted small">Vos réponses et votre heure de fin sont sauvegardées sur cet appareil.</p></section></div>`);
}
function showExam() {
  const a=progress.active;
  if (!a) return navigate('dashboard');
  const q=byId.get(a.ids[a.index]); if (!q) throw new Error('Question de la sauvegarde introuvable');
  const count=Object.keys(a.answers).length;
  frame(`<div class="exam-heading"><div><p class="eyebrow">JOUR ${a.day} — SIMULATION</p><h1>Question ${a.index+1} <span>/ 65</span></h1></div><div class="exam-tools">${button(icon('expand')+' Mode examen','fullscreen','btn outline')}<div id="timer-box" class="timer-box"><span>TEMPS RESTANT</span><strong id="timer" role="timer" aria-label="Temps restant">${formatTime(remaining(a.deadline))}</strong></div></div></div><div id="time-alert" role="status" class="time-alert"></div><div class="exam-progress"><div class="track"><i style="width:${count/65*100}%"></i></div><span>${count} / 65 réponses</span></div><div class="exam-layout"><section class="panel question-panel" aria-labelledby="question-title"><div class="question-meta"><span class="category-tag" style="--subject:${CATEGORIES[q.category].color}">${CATEGORIES[q.category].label}</span><span>UNE SEULE RÉPONSE</span></div><h2 id="question-title" tabindex="-1">${h(q.question)}</h2>${figure(q)}<fieldset class="choices"><legend class="sr-only">Choisissez votre réponse</legend>${q.choices.map((choice,i)=>`<label class="choice ${a.answers[q.id]===i?'selected':''}"><input type="radio" name="answer" value="${i}" ${a.answers[q.id]===i?'checked':''}><span class="choice-letter">${'ABCD'[i]}</span><span>${h(choice)}</span><span class="radio-indicator"></span></label>`).join('')}</fieldset><div class="question-actions">${button('← Précédente','previous','btn outline',a.index===0?'disabled':'')}${button(icon('flag',17)+(a.marked.includes(q.id)?' Marquée à revoir':' À revoir'),'mark',`btn ${a.marked.includes(q.id)?'marked-button':'subtle'}`)}${button(a.index===64?'Vérifier et terminer':'Suivante →',a.index===64?'finish-confirm':'next','btn primary')}</div>${Number.isInteger(a.answers[q.id])?button('Effacer ma réponse','clear-answer','text-button small'):''}</section><aside class="panel question-map"><h2>Votre parcours</h2><div class="map-counts"><span><b>${count}</b> répondues</span><span><b>${65-count}</b> restantes</span></div><div class="number-grid" aria-label="Accès direct aux questions">${a.ids.map((id,i)=>button(String(i+1),`jump:${i}`,`question-number ${Number.isInteger(a.answers[id])?'answered':''} ${a.marked.includes(id)?'marked':''} ${i===a.index?'current':''}`,`aria-label="Question ${i+1}, ${Number.isInteger(a.answers[id])?'répondue':'sans réponse'}${a.marked.includes(id)?', à revoir':''}" ${i===a.index?'aria-current="step"':''}`)).join('')}</div><div class="map-legend"><span><i class="answered"></i>Répondue</span><span><i></i>Non répondue</span><span><i class="marked"></i>À revoir (${a.marked.length})</span><span><i class="current"></i>Actuelle</span></div>${button('Terminer le test','finish-confirm','btn outline full')}<p class="small muted">Vous pouvez passer une question puis y revenir à tout moment.</p></aside></div>`);
  document.querySelector('#question-title')?.focus({preventScroll:true}); updateTimer(remaining(a.deadline));
}
function figure(q) { return q.image?`<figure class="question-figure"><img src="./${h(q.image)}" alt="${h(q.imageAlt)}" width="660" height="260"></figure>`:''; }
function updateTimer(ms,level='') {
  const timer=document.querySelector('#timer'); if (timer) timer.textContent=formatTime(ms);
  const box=document.querySelector('#timer-box'); if(box) box.className=`timer-box ${level}`;
  const alert=document.querySelector('#time-alert');
  if(alert) {
    alert.className=`time-alert ${level}`;
    const message=level==='critical'?'Moins d’une minute : l’envoi automatique est imminent.':level==='urgent'?'Moins de 5 minutes. Vérifiez vos dernières réponses.':level==='notice'?'Moins de 10 minutes. Pensez aux questions sans réponse.':'';
    if(alert.textContent!==message)alert.textContent=message;
  }
}
function armClock() {
  stopClock?.(); stopClock=null;
  if(progress.active) stopClock=startClock(progress.active.deadline,updateTimer,()=>submit(true));
}
function submit(automatic=false) {
  const a=progress.active; if(!a) return;
  if (modal.open) modal.close();
  const completed=completeAttempt(a,a.ids.map(id=>byId.get(id)),scoreExam,Date.now(),automatic);
  // Idempotent completion, including two tabs reaching the same deadline.
  const disk=loadProgress().data;
  progress.attempts=[...new Map([...progress.attempts,...disk.attempts,completed].map(item=>[item.id,item])).values()];
  progress.active=null; stopClock?.(); stopClock=null; persist(); resultId=completed.id; page='results';
  document.body.classList.remove('focus-mode');
  if(document.fullscreenElement)document.exitFullscreen().catch(()=>{});
  render(); window.scrollTo(0,0);
  if(automatic) toast('Le temps est écoulé. Vos réponses ont été envoyées automatiquement.');
}
function results() {
  const a=currentResult(); if(!a) return history(); const r=a.result;
  frame(heading(`SIMULATION TERMINÉE · JOUR ${a.day}`,'Votre résultat, votre prochaine étape.',a.automatic?'Envoi automatique à l’expiration des 60 minutes.':'Votre tentative est enregistrée sur cet appareil.',button(icon('download')+' Exporter','export','btn outline'))+
    `<section class="result-hero ${r.passed?'pass':'fail'}"><div class="result-ring" style="--score:${r.percentage}%"><div><strong>${fmt(r.percentage)}<small>%</small></strong><span>${r.correct} bonnes réponses sur ${r.total}</span></div></div><div><span class="pill ${r.passed?'success':'warning'}">${r.passed?'OBJECTIF ATTEINT':'OBJECTIF NON ATTEINT'}</span><h2>${r.passed?'Le cap des 70 % est franchi.':'Chaque erreur indique où progresser.'}</h2><p>${r.passed?'Consolidez vos acquis et cherchez maintenant la régularité.':`Il vous manque ${Math.max(0,46-r.correct)} bonne(s) réponse(s) pour atteindre 46/65.`}</p><div class="hero-actions">${button('Voir la correction '+icon('arrow'),'correction','btn primary')}${button('Réviser mes erreurs',`review-attempt:${a.id}`,'btn outline')}</div></div></section><div class="result-metrics">${[[r.correct,'Bonnes réponses'],[r.wrong,'Mauvaises réponses'],[r.unanswered,'Sans réponse'],[formatTime(r.elapsed),'Temps utilisé'],[`${Math.round(r.elapsed/1000/65)} s`,'Moyenne par question']].map(([v,l])=>`<article><strong>${v}</strong><span>${l}</span></article>`).join('')}</div><section class="panel"><div class="section-heading"><h2>Performances par matière</h2><span class="subtle-label">Objectif : 70 %</span></div>${Object.entries(CATEGORIES).map(([c,s])=>{const v=r.categories[c],p=percent(v.correct,v.total);return `<div class="performance-row"><span>${s.label}</span><div class="track threshold"><i class="${p>=70?'bg-good':'bg-bad'}" style="width:${p}%"></i></div><strong>${v.correct}/${v.total}</strong><span class="${p>=70?'good':'bad'}">${fmt(p)} %</span></div>`;}).join('')}</section><div class="info-strip">${icon('info')}<p><strong>À renforcer :</strong> ${Object.entries(r.categories).filter(([,v])=>percent(v.correct,v.total)<70).map(([c])=>CATEGORIES[c].label).join(', ')||'Aucune matière sous 70 % sur cette tentative.'}</p></div>`);
}
function correction() {
  const a=currentResult(); if(!a)return navigate('dashboard');
  const questions=a.ids.map(id=>byId.get(id)).filter(q=>(categoryFilter==='all'||q.category===categoryFilter)&& (correctionFilter==='all'||correctionFilter==='wrong'&&Number.isInteger(a.answers[q.id])&&a.answers[q.id]!==q.correctAnswer||correctionFilter==='unanswered'&&!Number.isInteger(a.answers[q.id])||correctionFilter==='marked'&&a.marked.includes(q.id)));
  frame(heading(`CORRECTION · JOUR ${a.day}`,'Comprendre pour mieux réussir.','Retrouvez votre réponse, la solution et la règle à retenir.',button('← Mon résultat',`result:${a.id}`,'btn outline'))+`<div class="filter-bar"><label>Afficher<select id="correction-filter">${[['all','Toutes les questions'],['wrong','Réponses incorrectes'],['unanswered','Sans réponse'],['marked','Marquées à revoir']].map(([v,l])=>`<option value="${v}" ${v===correctionFilter?'selected':''}>${l}</option>`).join('')}</select></label>${categorySelect()}<span>${questions.length} question(s)</span></div><div class="correction-list">${questions.length?questions.map(q=>correctionCard(q,a.answers[q.id],a.ids.indexOf(q.id)+1)).join(''):'<div class="empty-state panel">Aucune question dans ce filtre.</div>'}</div>`);
}
function correctionCard(q,answer,num) {
  const ok=answer===q.correctAnswer,missing=!Number.isInteger(answer);
  return `<article class="panel correction-card"><div class="correction-top"><span>QUESTION ${num} <span class="muted">· ${CATEGORIES[q.category].label}</span></span><span class="pill ${ok?'success':'warning'}">${ok?'Correct':missing?'Sans réponse':'Incorrect'}</span></div><h2>${h(q.question)}</h2>${figure(q)}<div class="answer-comparison"><p><span>Votre réponse</span><strong class="${ok?'good':'bad'}">${missing?'Non répondue':`${'ABCD'[answer]}. ${h(q.choices[answer])}`}</strong></p><p><span>Bonne réponse</span><strong class="good">${'ABCD'[q.correctAnswer]}. ${h(q.choices[q.correctAnswer])}</strong></p></div><div class="explanation"><strong>${ok?'Le raisonnement à retenir':missing?'Comment résoudre cette question':'Comprendre votre erreur'}</strong><p>${!ok&&!missing?`Votre choix « ${h(q.choices[answer])} » ne convient pas. `:''}${h(q.explanation)}</p></div>${q.source?`<p class="source small">Source : <a href="${h(q.source.url)}" target="_blank" rel="noopener noreferrer">${h(q.source.name)}</a> · Vérifiée le ${h(q.lastVerified)}</p>`:''}<span class="question-id">${q.id}</span></article>`;
}
function categorySelect(id='category-filter') { return `<label>Matière<select id="${id}"><option value="all">Toutes les matières</option>${Object.entries(CATEGORIES).map(([c,s])=>`<option value="${c}" ${c===categoryFilter?'selected':''}>${s.label}</option>`).join('')}</select></label>`; }
function revision() {
  if(review)return reviewScreen();
  const stats=analysis();
  frame(heading('BANQUE D’ENTRAÎNEMENT','Une question. Un déclic.','Révisez sans chronomètre, avec une correction immédiate après chaque réponse.')+`<div class="revision-featured"><section class="panel"><span class="eyebrow">POUR ALLER PLUS LOIN</span><h2>175 questions supplémentaires</h2><p>Une réserve entièrement distincte des cinq simulations.</p>${button('Commencer la révision '+icon('arrow'),'review:reserve','btn primary')}</section><section class="panel"><span class="eyebrow">VOTRE ENTRAÎNEMENT CIBLÉ</span><h2>${stats.errorIds.length} question(s) à retravailler</h2><p>Reprenez vos erreurs et les questions laissées sans réponse.</p>${button('Réviser mes erreurs','review:errors','btn outline',stats.errorIds.length?'':'disabled')}</section></div><div class="section-heading"><h2>Travailler une matière</h2><span class="muted small">Les 500 questions de la banque</span></div><div class="category-grid">${Object.entries(CATEGORIES).map(([c,s])=>`<article class="panel"><span class="subject-icon" style="--subject:${s.color}">${s.short}</span><h2>${s.label}</h2><p>${bank.filter(q=>q.category===c).length} questions · Explications détaillées</p>${button('M’entraîner →',`review:${c}`,'text-button')}</article>`).join('')}</div><p class="muted small">Les révisions n’altèrent pas vos scores d’examen. Les questions d’une matière incluent celles des simulations. Gouvernance : PCA et OHADA ; finance : KPI et audit ; ONATRA : logistique multimodale.</p>`);
}
function startReview(ids,label) {
  if(!ids.length) {toast('Aucune question à réviser pour le moment.');return;}
  review={ids:shuffle(ids),label,index:0,answers:{},revealed:new Set(),correct:0};page='revision';render();window.scrollTo(0,0);
}
function reviewScreen() {
  const q=byId.get(review.ids[review.index]),answer=review.answers[q.id],revealed=review.revealed.has(q.id),last=review.index===review.ids.length-1;
  frame(heading('RÉVISION LIBRE',review.label,`Question ${review.index+1} / ${review.ids.length} · ${review.correct} réponse(s) correcte(s)`,button('Quitter la révision','quit-review','btn outline'))+`<div class="narrow"><section class="panel question-panel"><span class="category-tag" style="--subject:${CATEGORIES[q.category].color}">${CATEGORIES[q.category].label}</span><h2>${h(q.question)}</h2>${figure(q)}<fieldset class="choices"><legend class="sr-only">Choisissez votre réponse</legend>${q.choices.map((choice,i)=>`<label class="choice ${revealed&&i===q.correctAnswer?'correct-choice':revealed&&answer===i?'wrong-choice':answer===i?'selected':''}"><input type="radio" name="review-answer" value="${i}" ${answer===i?'checked':''} ${revealed?'disabled':''}><span class="choice-letter">${'ABCD'[i]}</span><span>${h(choice)}</span><span class="radio-indicator"></span></label>`).join('')}</fieldset>${revealed?`<div class="explanation" role="status"><strong class="${answer===q.correctAnswer?'good':'bad'}">${answer===q.correctAnswer?'Bonne réponse':'Réponse à retenir : '+h(q.choices[q.correctAnswer])}</strong><p>${h(q.explanation)}</p>${q.source?`<a class="small" target="_blank" rel="noopener noreferrer" href="${h(q.source.url)}">Source : ${h(q.source.name)}</a> · <span class="small">${q.lastVerified}</span>`:''}</div>`:''}<div class="question-actions">${button('← Précédente','review-prev','btn outline',review.index?'':'disabled')}${!revealed?button('Vérifier ma réponse','review-check','btn primary',Number.isInteger(answer)?'':'disabled'):button(last?'Terminer la révision':'Question suivante →',last?'review-done':'review-next','btn primary')}</div></section></div>`);
}
function history() {
  const attempts=[...progress.attempts].reverse(),stats=analysis();
  const chart=attempts.length?`<section class="panel"><h2>Dernier score par journée</h2><div class="progress-chart" aria-label="Scores par jour">${[1,2,3,4,5].map(d=>{const a=latest(d);return `<div class="chart-column"><div class="chart-value">${a?fmt(a.result.percentage)+' %':'—'}</div><div class="chart-track"><div class="chart-goal" aria-hidden="true"></div><div class="chart-bar ${a?.result.passed?'bg-good':''}" style="height:${a?.result.percentage||0}%"></div></div><span>Jour ${d}</span></div>`;}).join('')}</div><p class="small muted">Ligne repère : 70 % · Meilleure matière : ${CATEGORIES[stats.strongest]?.label||'—'} · À renforcer : ${CATEGORIES[stats.weakest]?.label||'—'}</p></section>`:'';
  const rows=attempts.map(a=>`<tr><td>Jour ${a.day}</td><td>${new Date(a.submittedAt).toLocaleString('fr-FR')}</td><td><strong>${fmt(a.result.percentage)} %</strong> <span class="muted">${a.result.correct}/65</span></td><td><span class="pill ${a.result.passed?'success':'warning'}">${a.result.passed?'Réussi':'À renforcer'}</span></td><td>${button('Consulter →',`result:${a.id}`,'text-button')}</td></tr>`).join('');
  const table=attempts.length?`<div class="table-scroll panel"><table><caption>Historique complet des tentatives</caption><thead><tr><th>Simulation</th><th>Date</th><th>Score</th><th>Résultat</th><th>Détail</th></tr></thead><tbody>${rows}</tbody></table></div>`:`<section class="panel empty-state">${icon('chart',40)}<h2>Votre courbe commence au jour 1.</h2><p>Une première simulation vous donnera des repères précis.</p>${button('Préparer ma première simulation','instructions:1','btn primary')}</section>`;
  frame(heading('SUIVI DE PROGRESSION','Vos résultats, dans la durée.','Toutes les tentatives sont conservées. Le tableau de bord affiche la dernière par jour.',button(icon('download')+' Exporter ma progression','export','btn outline'))+technicalHistory(technicalExams,technicalProgress)+chart+table);
}
function errors() {
  const stats=analysis(), sorted=Object.entries(stats.errors).sort((a,b)=>b[1]-a[1]);
  frame(heading('JOURNAL DES ERREURS','Transformez vos erreurs en repères.','Les erreurs et absences de réponse de votre dernière tentative à chaque question.',button('Réviser mes erreurs','review:errors','btn primary',stats.errorIds.length?'':'disabled'))+`<section class="panel">${sorted.length?sorted.map(([sub,n])=>`<div class="error-row"><div><strong>${h(nameSub(sub))}</strong><p>${n} question(s) à retravailler</p></div>${button('Réviser →',`review-sub:${sub}`,'text-button')}</div>`).join(''):`<div class="empty-state">${icon('flag',40)}<h2>Aucune erreur enregistrée pour l’instant.</h2><p>Après une simulation, vos pistes de travail apparaîtront ici.</p></div>`}</section>`);
}
function guide() {
  frame(heading('MODE D’EMPLOI','Un cadre simple pour progresser.','Un test par jour, puis une révision attentive de vos erreurs.')+`<div class="guide-grid"><section class="panel prose"><h2>Votre parcours en cinq jours</h2><p>Prévoyez une heure au calme pour chaque simulation. Relisez ensuite la correction et consacrez 15 à 30 minutes à vos points faibles. Les cinq journées restent accessibles librement.</p><h2>Le score exact</h2><p>Chaque question vaut un point. Ni les erreurs ni les absences de réponse ne retirent de points. Le seuil se calcule sur les 65 questions : <strong>46/65 = 70,77 %</strong>, contre 45/65 = 69,23 %. L’affichage est arrondi, la décision de réussite ne l’est pas.</p><h2>Gérer votre temps</h2><p>Vous disposez en moyenne d’environ 55 secondes par question. Passez les questions longues et marquez-les à revoir. Le chronomètre continue en arrière-plan, après fermeture ou rechargement. Au retour, une tentative expirée est envoyée automatiquement.</p><h2>Révision et cas professionnels</h2><p>Les 175 questions de réserve sont distinctes des examens. Les filtres par matière permettent aussi de reprendre les questions d’examen. La banque porte sur la gouvernance, l’ONATRA et la logistique, la finance, les risques, les calculs de gestion et la communication. Les situations et chiffres d’exercice sont fictifs.</p><h2>Un entraînement indépendant</h2><p>Programme de préparation technique estimatif fondé sur les exigences du poste et les textes applicables. Nous ne disposons pas d’un syllabus officiel : la répartition proposée est pédagogique. Ce simulateur n’est affilié à aucun recruteur et ne reproduit aucune question officielle ou confidentielle. Atteindre le seuil ici ne garantit pas le résultat d’un véritable concours.</p></section><aside><section class="panel prose"><h2>Vos données restent ici</h2><p>Réponses, chronomètre et résultats sont sauvegardés dans ce navigateur, sur cet appareil. Effacer les données du navigateur efface cette progression. Un autre appareil ne la reçoit pas automatiquement.</p><p>Une fois la préparation hors ligne terminée, l’application et les figures restent disponibles sans connexion. Gardez la même adresse locale pour retrouver la sauvegarde.</p>${button(icon('download')+' Exporter ma progression','export','btn outline full')}<p class="small muted">L’export JSON contient vos réponses et vos résultats.</p></section><section class="panel danger-zone"><h2>Repartir de zéro</h2><p>Supprime toutes les tentatives et la simulation en cours sur cet appareil.</p>${button('Réinitialiser toute ma progression','reset','btn danger full')}</section></aside></div>`);
}
function render() {
  if(page==='technical-revision'){technicalRevisionScreen();return;}
  if(page==='dashboard')dashboard();else if(page==='instructions')instructions();else if(page==='exam')showExam();else if(page==='technical-instructions')technicalInstructions(technicalResultId);else if(page==='technical-exam')technicalExamScreen();else if(page==='technical-results')technicalResults();else if(page==='results')results();else if(page==='correction')correction();else if(page==='revision')revision();else if(page==='history')history();else if(page==='errors')errors();else guide();
}
function confirmDialog(title,message,confirmLabel,onConfirm) {
  const previousFocus=document.activeElement;
  modal.innerHTML=`<div class="dialog-icon">${icon('info',28)}</div><h2 id="modal-title">${title}</h2><p>${h(message)}</p><div class="dialog-actions">${button('Retour','dialog-cancel','btn outline')}${button(confirmLabel,'dialog-confirm','btn primary')}</div>`;
  modal.showModal();modal.querySelector('[data-action="dialog-cancel"]').focus();
  modal.onclick=e=>{const a=e.target.closest('[data-action]')?.dataset.action;if(a==='dialog-cancel')modal.close();if(a==='dialog-confirm'){modal.close();onConfirm();}};
  modal.onclose=()=>previousFocus?.isConnected&&previousFocus.focus();
}
function exportProgress() {
  const blob=new Blob([JSON.stringify({exportedAt:new Date().toISOString(),...progress,technical:technicalProgress},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');
  link.href=url;link.download=`cap70-progression-${new Date().toISOString().slice(0,10)}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Votre progression a été exportée.');
}
app.addEventListener('click',async e=>{
  const target=e.target.closest('[data-action]');if(!target)return;e.preventDefault();const [action,...rest]=target.dataset.action.split(':'),value=rest.join(':');
  // Never accept edits after the saved deadline, even if an inactive tab delayed its timer.
  if(progress.active&&remaining(progress.active.deadline)===0){submit(true);return;}
  if(technicalProgress.active&&remaining(technicalProgress.active.deadline)===0){submitTechnical(true);return;}
  if(action==='technical-evaluate'){void evaluateTechnical(value);return;}
  if(action==='tutor-summary'||action==='technical-review-weak'){
    const attempt=technicalProgress.attempts.find(a=>a.id===value);if(!attempt)return;
    const exam=technicalExam(attempt.examId),score=scoreTechnicalAttempt(exam,attempt);
    if(action==='technical-review-weak'){
      const sections=Object.entries(score.sections).filter(([,s])=>s.score!==null&&s.score/s.max<.7).map(([key])=>key);
      const ids=new Set(exam.questions.filter(q=>sections.includes(q.section)||(q.type==='mcq'&&attempt.answers[q.id]!==q.answer)||(q.type==='short'&&attempt.evaluations?.[q.id]?.scoreOutOf10<7)).map(q=>q.id));
      technicalRevision(exam.company||'ONATRA',ids.size?ids:new Set(exam.questions.map(q=>q.id)));return;
    }
    tutorQuestionId=null;technicalResultId=attempt.id;tutor.update(tutorAllowed({active:progress?.active,technicalActive:technicalProgress?.active}));
    tutor.ask(`Analyse mon résultat ${exam.company||'ONATRA'} : QCM ${score.mcqScore}/40 ; écrit ${score.writtenScore??'en attente'}/60 ; total ${score.total??'provisoire'}/100. Sections : ${Object.entries(score.sections).map(([key,s])=>`${key} ${s.score??'en attente'}/${s.max}`).join(', ')}. Donne deux points forts et trois priorités concrètes de révision, en signalant les notes encore manquantes.`);return;
  }
  if(action==='read-correction'){
    const attempt=technicalProgress.attempts.find(a=>a.id===technicalResultId)||technicalProgress.attempts.find(a=>a.examId===technicalResultId),evaluation=attempt?.evaluations?.[value];if(!evaluation)return;
    tutorQuestionId=value;tutor.update(tutorAllowed({active:progress?.active,technicalActive:technicalProgress?.active}));
    tutor.speak(`Note : ${evaluation.scoreOutOf10} sur 10. ${evaluation.appreciation}. Ce qui est correct : ${evaluation.correctElements.join('. ')}. Ce qui manque : ${[...evaluation.missingElements,...evaluation.errors].join('. ')}. Réponse améliorée : ${evaluation.improvedAnswer}. À retenir : ${evaluation.keyTakeaway}`);return;
  }
  if(action==='tutor-question'){tutorQuestionId=value;tutor.update(tutorAllowed({active:progress?.active,technicalActive:technicalProgress?.active}));tutor.open();return;}
  if(action==='technical-review'){technicalRevision(value);return;}
  if(action==='technical-review-next'||action==='technical-review-prev'){technicalReview.index+=action==='technical-review-next'?1:-1;Object.assign(technicalReview,technicalReview.questions[technicalReview.index]);tutorQuestionId=null;technicalRevisionScreen();return;}
  if(action==='nav'){tutorQuestionId=null;technicalReview=null;technicalResultId=null;return navigate(value);}
  if(action==='instructions'){selectedDay=Number(value);page='instructions';render();window.scrollTo(0,0);}
  else if(action==='start'){
    if(technicalProgress.active){page='technical-exam';render();armTechnicalClock();return;}
    const disk=loadProgress().data;if(disk.active){progress=disk;armClock();page='exam';render();return;}
    if(progress.active)return;progress.active=createAttempt(selectedDay,plan.exams[selectedDay-1].ids);persist();page='exam';render();armClock();
  }else if(action==='resume'){if(progress.active){page='exam';render();}}
  else if(action==='technical-instructions'){tutorQuestionId=null;tutorCompany=technicalExam(value).company||'ONATRA';technicalResultId=value;page='technical-instructions';render();window.scrollTo(0,0);}
  else if(action==='technical-start'){
    if(progress.active){toast('Reprenez ou terminez d’abord la simulation en cours.');return;}
    const active=activeTechnicalAttempt();
    if(active){if(active.examId===value){page='technical-exam';render();armTechnicalClock();}else toast('Terminez ou reprenez d’abord la simulation technique déjà en cours.');return;}
    if(technicalProgress.attempts.some(item=>item.examId===value)){toast('Cette simulation a déjà une tentative. Réinitialisez-la volontairement pour recommencer.');return;}
    technicalProgress.active=createTechnicalAttempt(technicalExam(value));persistTechnical();page='technical-exam';render();armTechnicalClock();
  }else if(action==='technical-resume'){if(activeTechnicalAttempt()){page='technical-exam';render();armTechnicalClock();}}
  else if(action==='technical-result'){tutorQuestionId=null;technicalResultId=value;page='technical-results';render();window.scrollTo(0,0);}
  else if(action==='technical-jump'||action==='technical-next'||action==='technical-previous'){
    const attempt=activeTechnicalAttempt();if(!attempt)return;
    attempt.index=action==='technical-jump'?Number(value):Math.max(0,Math.min(49,attempt.index+(action==='technical-next'?1:-1)));
    persistTechnical();technicalExamScreen();
  }else if(action==='technical-mark'){
    const attempt=activeTechnicalAttempt();if(!attempt)return;const id=attempt.questionIds[attempt.index];
    attempt.marked=attempt.marked.includes(id)?attempt.marked.filter(item=>item!==id):[...attempt.marked,id];persistTechnical();technicalExamScreen();
  }else if(action==='technical-finish'){
    const attempt=activeTechnicalAttempt();if(!attempt)return;
    const exam=technicalExam(attempt.examId),missing=missingRequiredComments(exam,attempt)[0];
    if(missing){attempt.index=attempt.questionIds.indexOf(missing.id);persistTechnical();technicalExamScreen();toast('Ajoutez une justification à chaque question marquée « Réponse à commenter » avant de soumettre.');return;}
    const unanswered=exam.questions.filter(question=>question.type==='mcq'?!Number.isInteger(attempt.answers[question.id]):!attempt.written[question.id]?.trim()).length;
    confirmDialog('Terminer votre simulation technique ?',`Il reste ${unanswered} question(s) sans réponse et ${attempt.marked.length} question(s) marquée(s) à revoir. Les commentaires obligatoires sont renseignés. Après l’envoi, la copie ne pourra plus être modifiée.`,'Terminer quand même',()=>submitTechnical(false));
  }else if(action==='technical-reset'){
    const exam=technicalExam(value);
    if(!exam)return;
    confirmDialog('Réinitialiser cette tentative ?',`La copie enregistrée de « ${exam.title} » sera supprimée de cet appareil. Cette action permet de recommencer l’entraînement.`, 'Réinitialiser',()=>{
      if(technicalProgress.active?.examId===value){stopTechnicalClock?.();stopTechnicalClock=null;technicalProgress.active=null;}
      technicalProgress.attempts=technicalProgress.attempts.filter(item=>item.examId!==value);persistTechnical();page='dashboard';render();
    });
  }
  else if(action==='jump'||action==='next'||action==='previous'){
    const a=progress.active;if(!a)return;a.index=action==='jump'?Number(value):Math.max(0,Math.min(64,a.index+(action==='next'?1:-1)));persist();showExam();
  }else if(action==='mark'){const a=progress.active;if(!a)return;toggleMark(a,a.ids[a.index]);persist();showExam();}
  else if(action==='clear-answer'){const a=progress.active;delete a.answers[a.ids[a.index]];persist();showExam();}
  else if(action==='finish-confirm'){const n=65-Object.keys(progress.active.answers).length;confirmDialog('Terminer votre simulation ?',`Il reste ${n} question(s) sans réponse et ${progress.active.marked.length} question(s) marquée(s) à revoir. Après l’envoi, les réponses ne pourront plus être modifiées.`,'Terminer quand même',()=>submit(false));}
  else if(action==='fullscreen'){try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{document.body.classList.toggle('focus-mode');toast('Affichage examen activé.');}}
  else if(action==='result'){resultId=value;page='results';render();window.scrollTo(0,0);}
  else if(action==='correction'){correctionFilter='all';categoryFilter='all';page='correction';render();window.scrollTo(0,0);}
  else if(action==='review'){const stats=analysis();startReview(value==='reserve'?plan.reserve:value==='errors'?stats.errorIds:bank.filter(q=>q.category===value).map(q=>q.id),value==='reserve'?'Questions supplémentaires':value==='errors'?'Mes erreurs à retravailler':CATEGORIES[value].label);}
  else if(action==='review-sub'){startReview(analysis().errorIds.filter(id=>byId.get(id).subcategory===value),nameSub(value));}
  else if(action==='review-attempt'){const a=progress.attempts.find(a=>a.id===value);startReview(a.result.errors,`Erreurs du jour ${a.day}`);}
  else if(action==='quit-review'){confirmDialog('Quitter la révision ?','Les scores d’examen sont conservés. Cette session de révision libre ne sera pas sauvegardée.','Quitter',()=>{review=null;render();});}
  else if(action==='review-check'){const id=review.ids[review.index],q=byId.get(id);if(!Number.isInteger(review.answers[id])||review.revealed.has(id))return;review.revealed.add(id);if(review.answers[id]===q.correctAnswer)review.correct++;render();}
  else if(action==='review-next'||action==='review-prev'){review.index+=action==='review-next'?1:-1;render();}
  else if(action==='review-done'){const correct=review.correct,total=review.ids.length;review=null;render();toast(`Révision terminée : ${correct}/${total} réponses correctes.`);}
  else if(action==='export')exportProgress();
  else if(action==='reset')confirmDialog('Réinitialiser votre progression ?','Toutes vos réponses, vos scores et votre simulation en cours seront supprimés de cet appareil.','Continuer',()=>confirmDialog('Confirmer la suppression définitive','Cette seconde confirmation effacera votre progression. Exportez-la auparavant si vous souhaitez la conserver.','Effacer toute ma progression',()=>{stopClock?.();stopClock=null;progress={version:BANK_VERSION,attempts:[],active:null};resultId=null;const saved=persist();navigate('dashboard');toast(saved?'Votre progression a été réinitialisée.':'Réinitialisation en mémoire uniquement : le navigateur refuse la modification de la sauvegarde.');}));
});
app.addEventListener('change',e=>{
  if(e.target.name==='answer'){const a=progress.active;if(!a)return;if(!setAnswer(a,a.ids[a.index],Number(e.target.value))){submit(true);return;}persist();const focused=Number(e.target.value);showExam();document.querySelector(`input[name="answer"][value="${focused}"]`)?.focus();}
  else if(e.target.name==='technical-answer'){const attempt=activeTechnicalAttempt();if(!attempt)return;attempt.answers[attempt.questionIds[attempt.index]]=Number(e.target.value);persistTechnical();technicalExamScreen();document.querySelector(`input[name="technical-answer"][value="${e.target.value}"]`)?.focus();}
  else if(e.target.dataset.technicalRating){const attempt=technicalProgress.attempts.find(item=>item.id===technicalResultId)||technicalProgress.attempts.find(item=>item.examId===technicalResultId);if(!attempt)return;const value=e.target.value;if(value==='')delete attempt.ratings[e.target.dataset.technicalRating];else attempt.ratings[e.target.dataset.technicalRating]=Number(value);attempt.result=scoreTechnicalAttempt(technicalExam(attempt.examId),attempt);persistTechnical();technicalResults();}
  else if(e.target.name==='review-answer'){review.answers[review.ids[review.index]]=Number(e.target.value);const focused=e.target.value;render();document.querySelector(`input[name="review-answer"][value="${focused}"]`)?.focus();}
  else if(e.target.id==='correction-filter'){correctionFilter=e.target.value;render();}
  else if(e.target.id==='category-filter'){categoryFilter=e.target.value;render();}
});
app.addEventListener('input',e=>{
  const field=e.target.dataset.technicalField,question=e.target.dataset.question;
  if(!field||!question||!technicalProgress.active)return;
  if(remaining(technicalProgress.active.deadline)===0){submitTechnical(true);return;}
  technicalProgress.active[field][question]=e.target.value;persistTechnical();
});
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&progress?.active&&remaining(progress.active.deadline)===0)submit(true);if(!document.hidden&&technicalProgress?.active&&remaining(technicalProgress.active.deadline)===0)submitTechnical(true);});
window.addEventListener('storage',e=>{if(e.key==='cap70.progress.v1'){const loaded=loadProgress();if(!loaded.warning){progress=loaded.data;armClock();render();toast('Progression synchronisée avec l’autre onglet.');}}});
try {
  [{bank,plan,byId},technicalExams]=await Promise.all([loadQuestions(),loadTechnicalExams()]);
  const loaded=loadProgress(),technicalLoaded=loadTechnicalProgress();progress=loaded.data;technicalProgress=technicalLoaded.data;storageWarning=!!loaded.warning;technicalStorageWarning=!!technicalLoaded.warning;
  if(progress.active&&progress.active.ids.some(id=>!byId.has(id)))throw new Error('Sauvegarde incompatible avec cette banque');
  if(technicalProgress.active&&technicalProgress.active.questionIds.some(id=>!technicalExams.some(exam=>exam.questions.some(question=>question.id===id))))throw new Error('Sauvegarde incompatible avec les simulations techniques');
  if(technicalProgress.active)page='technical-exam';else if(progress.active)page='exam';render();armClock();armTechnicalClock();if(loaded.warning||loaded.notice||technicalLoaded.warning)toast(loaded.warning||loaded.notice||technicalLoaded.warning);if(!progress.active&&!technicalProgress.active)showSubscriptionReminder();
  window.addEventListener('storage',e=>{if(e.key==='cap70.technical.v1'){const stored=loadTechnicalProgress();if(!stored.warning){technicalProgress=stored.data;armTechnicalClock();page=technicalProgress.active?'technical-exam':'dashboard';render();}}});
  if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').then(()=>navigator.serviceWorker.ready).then(()=>{offlineReady=true;const el=document.querySelector('.offline-indicator');if(el)el.textContent='● Disponible hors ligne';}).catch(()=>{const el=document.querySelector('.offline-indicator');if(el)el.textContent='○ Mode connecté';});
} catch(error) {
  app.innerHTML=`<main id="main" class="fatal-error"><h1>Votre espace n’a pas pu se charger.</h1><p>${h(error.message)}</p><p>Lancez le projet avec <code>npm run dev</code>, puis ouvrez l’adresse affichée. L’ouverture directe du fichier HTML n’est pas prise en charge.</p><button id="retry-load" class="btn primary">Réessayer</button></main>`;
  document.querySelector('#retry-load').addEventListener('click',()=>location.reload());
  console.error(error);
}
