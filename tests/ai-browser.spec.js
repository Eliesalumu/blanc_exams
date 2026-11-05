// Imported by browser.spec.js, sharing its configuration and helpers via this file's own tests.
import {test,expect} from '@playwright/test';
import fs from 'node:fs';
const exams=JSON.parse(fs.readFileSync(new URL('../data/company-exams.json',import.meta.url),'utf8')).exams;
const key='cap70.technical.v1';
const value=(id)=>({questionId:id,scoreOutOf10:8,appreciation:'Bonne réponse',correctElements:['Supervision bien comprise'],missingElements:['Préciser le suivi'],errors:[],improvedAnswer:'Le conseil supervise le plan de la DG et suit les indicateurs.',keyTakeaway:'Suivre les résultats sans diriger les opérations.',needsHumanReview:false});
const open=async page=>{await page.goto('/');await expect(page.locator('#main h1')).toBeVisible();const close=page.locator('[data-action="subscription-close"]');if(await close.isVisible())await close.click();};
async function completed(page,exam,optionsVersion='options-2026-11-05-v1'){
  await open(page);
  await page.evaluate(({exam,key,optionsVersion})=>{
    const now=Date.now(),attempt={id:'ai-browser-copy',examId:exam.id,questionIds:exam.questions.map(q=>q.id),startedAt:now,deadline:now+3600000,submittedAt:now,index:0,marked:[],answers:Object.fromEntries(exam.questions.filter(q=>q.type==='mcq').map(q=>[q.id,q.answer])),written:Object.fromEntries(exam.questions.filter(q=>q.type==='short').map(q=>[q.id,q.modelAnswer])),comments:Object.fromEntries(exam.questions.filter(q=>q.commentRequired).map(q=>[q.id,'Le conseil supervise la DG et demande des preuves.'])),ratings:{},evaluations:{},commentEvaluations:{},result:{mcqScore:40,total:null}};
    if(optionsVersion!=='legacy')attempt.optionsVersion=optionsVersion;
    localStorage.setItem(key,JSON.stringify({active:null,attempts:[attempt]}));
  },{exam,key,optionsVersion});
  await page.reload();await expect(page.locator('#main h1')).toBeVisible();const close=page.locator('[data-action="subscription-close"]');if(await close.isVisible())await close.click();
  await page.locator('[data-action="technical-result:ai-browser-copy"]').click();
}

test('QCM révisés : raisons par choix dans les nouvelles copies et texte historique dans les anciennes',async({page})=>{
  await page.route('**/api/**',route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'Indisponible'})}));
  const exam=exams[0],q=exam.questions.find(q=>q.type==='mcq');
  const old=JSON.parse(fs.readFileSync(new URL('../data/technical-options-previous.json',import.meta.url),'utf8')).questions[q.id];
  await completed(page,exam,'legacy');
  let card=page.locator(`[data-review-question="${q.id}"]`);
  await card.locator('summary').click();
  await expect(card).toContainText(old.choices[q.answer]);
  await expect(card.locator('.choice-rationale')).toHaveCount(0);
  await completed(page,exam);
  card=page.locator(`[data-review-question="${q.id}"]`);
  await card.locator('summary').click();
  await expect(card).toContainText(q.choices[q.answer]);
  await expect(card.locator('.choice-rationale li')).toHaveCount(4);
  await expect(card.locator('.choice-rationale')).toContainText(q.discriminant);
});
test('IA progressive : conservation partielle, relance sans doublons, calcul /100 et rechargement',async({page})=>{
  const counts={},exam=exams[0];let failed=false;
  await page.route('**/api/**',async route=>{
    const url=route.request().url();let status=200,result;
    if(url.endsWith('/api/session'))result={token:'mock'};
    else{const {questionId}=route.request().postDataJSON();counts[questionId]=(counts[questionId]||0)+1;
      if(Object.keys(counts).length===3&&!failed){failed=true;status=503;result={error:'Correction IA momentanément indisponible. Vos réponses sont sauvegardées.'};}
      else result={evaluations:[value(questionId)],failures:[]};}
    await route.fulfill({status,contentType:'application/json',body:JSON.stringify(result)});
  });
  await completed(page,exam);
  await page.locator('[data-action="technical-evaluate:ai-browser-copy"]').click();
  await expect(page.locator('.ai-status')).toContainText('momentanément indisponible');
  const first=Object.keys(counts)[0];expect(counts[first]).toBe(1);
  await page.locator('[data-action="technical-evaluate:ai-browser-copy"]').click();
  await expect(page.locator('.result-hero')).toContainText('88/100');
  await expect(page.locator('.technical-metrics')).toContainText('48/60');
  expect(await page.locator('.technical-score-value').evaluate(el=>parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(60);
  await expect(page.locator('.technical-performance [role="progressbar"]')).toHaveCount(6);
  await expect(page.locator('.written-review .ai-evaluation')).toHaveCount(10);
  expect(counts[first]).toBe(1);
  const before=JSON.stringify(counts);await page.reload();await expect(page.locator('#main h1')).toBeVisible();
  const close=page.locator('[data-action="subscription-close"]');if(await close.isVisible())await close.click();
  await page.locator('[data-action="technical-result:ai-browser-copy"]').click();
  await expect(page.locator('.result-hero')).toContainText('88/100');expect(JSON.stringify(counts)).toBe(before);
});
test('Assistant : contexte RVA, suivi conversationnel, effacement et disparition pendant une simulation',async({page})=>{
  const requests=[];
  await page.route('**/api/**',async route=>{
    const url=route.request().url();let data;
    if(url.endsWith('/api/session'))data={token:'mock'};
    else{requests.push(route.request().postDataJSON());data={message:'Le conseil supervise ; la DG met en œuvre les mesures de continuité.'};}
    await route.fulfill({contentType:'application/json',body:JSON.stringify(data)});
  });
  const exam=exams.find(e=>e.id==='rva-1');await completed(page,exam);
  const q=exam.questions.find(q=>q.type==='short');
  await page.locator(`[data-action="tutor-question:${q.id}"]`).click();
  await page.locator('#tutor-input').fill('Pourquoi ce raisonnement ?');await page.locator('.tutor-form button').click();
  await expect(page.locator('.tutor-message.assistant')).toHaveCount(1);
  await page.locator('#tutor-input').fill('Un exemple plus simple ?');await page.locator('.tutor-form button').click();
  await expect(page.locator('.tutor-message.assistant')).toHaveCount(2);
  expect(requests[1].messages).toHaveLength(3);expect(requests[1].context.company).toBe('RVA');expect(requests[1].context.questionId).toBe(q.id);expect(requests[1].context.candidateAnswer).toBe(q.modelAnswer);
  await page.locator('.tutor-clear').click();await expect(page.locator('.tutor-message')).toHaveCount(0);
  await page.locator('.tutor-close').click();await page.locator('[data-action="nav:dashboard"]').first().click();
  await page.locator('[data-action="technical-instructions:sncc-2"]').click();await page.locator('[data-action="technical-start:sncc-2"]').click();
  await expect(page.locator('.tutor-toggle')).toHaveCount(0);
  await page.locator('[data-action="nav:dashboard"]').first().click();await expect(page.locator('.tutor-toggle')).toHaveCount(0);
});
test('Trois entreprises, révision dédiée et mobile sans débordement',async({page})=>{
  await page.setViewportSize({width:390,height:844});await open(page);
  await expect(page.locator('[data-company="SNCC"] .technical-card')).toHaveCount(3);await expect(page.locator('[data-company="RVA"] .technical-card')).toHaveCount(5);
  await page.locator('[data-action="technical-review:RVA"]').click();await expect(page.locator('#main')).toContainText('RÉVISION RVA');
  await page.locator('.tutor-toggle').click();await expect(page.locator('#tutor-panel')).toContainText('RVA');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:'test-results/assistant-mobile.png',fullPage:true});
});
test('Suggestions directes sous la saisie et erreur persistante relançable sans doublonner le message',async({page})=>{
  const requests=[];let fail=true;
  await page.route('**/api/**',async route=>{
    if(route.request().url().endsWith('/api/session'))return route.fulfill({contentType:'application/json',body:JSON.stringify({token:'mock'})});
    requests.push(route.request().postDataJSON());
    if(fail){fail=false;return route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'Le serveur ne parvient pas à joindre OpenAI. Vérifiez sa connexion Internet puis réessayez.'})});}
    await route.fulfill({contentType:'application/json',body:JSON.stringify({message:'Le PCA anime le conseil ; le DG conduit les opérations.'})});
  });
  await open(page);await page.locator('.tutor-toggle').click();
  await expect(page.locator('.tutor-suggestion')).toHaveCount(3);
  expect(await page.locator('.tutor-form').evaluate(el=>!!(el.compareDocumentPosition(document.querySelector('.tutor-suggestions'))&Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true);
  await page.locator('.tutor-suggestion').first().click();
  await expect(page.locator('.tutor-error')).toContainText('joindre OpenAI');
  await page.locator('.tutor-close').click();await page.locator('.tutor-toggle').click();
  await expect(page.locator('.tutor-error')).toContainText('joindre OpenAI');
  await page.locator('.tutor-retry').click();await expect(page.locator('.tutor-message.assistant')).toHaveCount(1);
  await expect(page.locator('.tutor-message.user')).toHaveCount(1);
  await expect(page.locator('.tutor-error')).toHaveCount(0);
  expect(requests[1].messages).toEqual(requests[0].messages);
  await page.locator('#tutor-input').fill('Un exemple ?');await page.locator('#tutor-input').press('Enter');
  await expect(page.locator('.tutor-message.assistant')).toHaveCount(2);
});
test('Réponse en flux, grande zone de lecture et audio avec pause, reprise et arrêt',async({page})=>{
  let speechCalls=0,streamRequested=false;
  await page.addInitScript(()=>{
    window.audioEvents={play:0,pause:0};
    window.Audio=class{async play(){window.audioEvents.play++;}pause(){window.audioEvents.pause++;}};
  });
  await page.route('**/api/**',async route=>{
    const url=route.request().url();
    if(url.endsWith('/api/session'))return route.fulfill({contentType:'application/json',body:JSON.stringify({token:'mock'})});
    if(url.endsWith('/api/tutor/speech')){speechCalls++;return route.fulfill({contentType:'audio/mpeg',body:Buffer.from('audio-test')});}
    streamRequested=route.request().postDataJSON().stream;
    const events=[{type:'delta',delta:'Le conseil '},{type:'delta',delta:'supervise la stratégie.'},{type:'done',message:'Le conseil supervise la stratégie.'}];
    await route.fulfill({contentType:'text/event-stream',body:events.map(e=>'data: '+JSON.stringify(e)+'\n\n').join('')});
  });
  await open(page);await page.locator('.tutor-toggle').click();await page.locator('.tutor-suggestion').first().click();
  await expect(page.locator('.tutor-message.assistant')).toContainText('Le conseil supervise la stratégie.');expect(streamRequested).toBe(true);
  expect(await page.locator('.tutor-messages').evaluate(el=>el.clientHeight)).toBeGreaterThan(250);
  await page.locator('.tutor-expand').click();await expect(page.locator('.tutor-panel')).toHaveClass(/tutor-expanded/);
  await page.locator('.tutor-speak').click();await expect(page.locator('.tutor-speak')).toContainText('Pause');
  await page.locator('.tutor-speak').click();await expect(page.locator('.tutor-speak')).toContainText('Reprendre');
  await page.locator('.tutor-speak').click();await expect(page.locator('.tutor-speak')).toContainText('Pause');expect(speechCalls).toBe(1);
  await page.locator('.tutor-audio-stop').click();await expect(page.locator('.tutor-audio-status')).toHaveCount(0);
  expect(await page.evaluate(()=>window.audioEvents.play)).toBe(2);
  await page.screenshot({path:'test-results/assistant-stream-voice-desktop.png',fullPage:true});
});
