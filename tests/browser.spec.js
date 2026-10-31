import { test, expect } from '@playwright/test';
import fs from 'node:fs';
const bank=JSON.parse(fs.readFileSync(new URL('../data/questions.json',import.meta.url))),byId=new Map(bank.map(q=>[q.id,q]));
const key='cap70.progress.v1';
const start=async page=>{await page.goto('/');await page.locator('[data-action="instructions:1"]').first().click();await page.locator('[data-action="start"]').click();await expect(page.locator('#timer')).toHaveText(/^(60:00|59:\d{2})$/);};
test('Affichage desktop, tablette, mobile ; navigation et figures',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  for(const [name,width,height] of [['desktop',1440,1000],['tablette',820,1180],['mobile',390,844]]){
    await page.setViewportSize({width,height});await page.goto('/');await expect(page.locator('h1')).toContainText('Votre objectif');
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
    await page.screenshot({path:`test-results/accueil-${name}.png`,fullPage:true});
  }
  await page.locator('[data-action="nav:revision"]').first().click();await page.locator('[data-action="review:logique"]').click();
  for(let i=0;i<150;i++){
    if(await page.locator('.question-figure').count())break;
    await page.locator('.choice').first().click();await page.locator('[data-action="review-check"]').click();await page.locator('[data-action="review-next"]').click();
  }
  await expect(page.locator('.question-figure img')).toBeVisible();expect(await page.locator('.question-figure img').evaluate(img=>img.complete&&img.naturalWidth>0)).toBeTruthy();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();await page.screenshot({path:'test-results/figure-mobile.png',fullPage:true});
  expect(errors).toEqual([]);
});
test('Examen : réponses, marqueur, navigation et reprise après rafraîchissement',async({page})=>{
  await page.clock.install({time:new Date('2026-10-31T12:00:00Z')});await page.clock.pauseAt(new Date('2026-10-31T12:01:00Z'));await start(page);
  await page.locator('.choice').nth(2).click();await page.locator('[data-action="mark"]').click();await page.locator('[data-action="next"]').click();
  await page.clock.fastForward(65000);await page.reload();await expect(page.locator('#timer')).toHaveText('58:55');
  await expect(page.locator('h1')).toContainText('Question 2');await page.locator('[data-action="jump:0"]').click();
  await expect(page.locator('input[name="answer"][value="2"]')).toBeChecked();await expect(page.locator('[data-action="jump:0"]')).toHaveClass(/marked/);
  await page.locator('[data-action="finish-confirm"]').click();await expect(page.locator('dialog')).toContainText('64 question(s) sans réponse');
  await page.locator('[data-action="dialog-cancel"]').click();await expect(page.locator('#timer')).toBeVisible();
});
test('Un examen complet à 46 bonnes réponses réussit et conserve la correction',async({page})=>{
  test.setTimeout(180000);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));await start(page);
  const ids=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)).active.ids,key);
  for(let i=0;i<65;i++){
    await page.locator(`[data-action="jump:${i}"]`).click();
    const q=byId.get(ids[i]),choice=i<46?q.correctAnswer:(q.correctAnswer+1)%4;
    await page.locator('.choice').nth(choice).click();
  }
  await page.getByRole('button',{name:'Terminer le test',exact:true}).click();await page.locator('[data-action="dialog-confirm"]').click();
  await expect(page.locator('.result-hero')).toContainText('OBJECTIF ATTEINT');await expect(page.locator('.result-ring')).toContainText('70,77');
  await page.screenshot({path:'test-results/resultat-desktop.png',fullPage:true});await page.locator('[data-action="correction"]').click();
  await expect(page.locator('.correction-card')).toHaveCount(65);await page.selectOption('#correction-filter','wrong');await expect(page.locator('.correction-card')).toHaveCount(19);
  await page.locator('[data-action="nav:errors"]').first().click();await expect(page.locator('.error-row').first()).toBeVisible();
  await page.locator('[data-action="review:errors"]').click();await page.locator('.choice').first().click();await page.locator('[data-action="review-check"]').click();await expect(page.locator('.explanation')).toBeVisible();
  await page.reload();await page.locator('[data-action="nav:history"]').first().click();await expect(page.locator('tbody tr')).toHaveCount(1);expect(errors).toEqual([]);
});
test('Avertissements puis auto-submit à 60 minutes ; aucune double soumission',async({page})=>{
  await page.clock.install({time:new Date('2026-10-31T12:00:00Z')});await page.clock.pauseAt(new Date('2026-10-31T12:01:00Z'));await start(page);
  await page.clock.fastForward(50*60000);await expect(page.locator('#time-alert')).toContainText('10 minutes');
  await page.clock.fastForward(5*60000);await expect(page.locator('#time-alert')).toContainText('5 minutes');
  await page.clock.fastForward(4*60000);await expect(page.locator('#time-alert')).toContainText('une minute');
  await page.clock.fastForward(60000);await expect(page.locator('.result-hero')).toContainText('OBJECTIF NON ATTEINT');
  const data=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);expect(data.active).toBeNull();expect(data.attempts).toHaveLength(1);expect(data.attempts[0].automatic).toBeTruthy();expect(data.attempts[0].result.unanswered).toBe(65);
  await page.reload();expect(await page.evaluate(k=>JSON.parse(localStorage.getItem(k)).attempts.length,key)).toBe(1);
});
test('Une tentative expirée pendant la fermeture est soumise à la reprise',async({page})=>{
  await start(page);await page.evaluate(k=>{const data=JSON.parse(localStorage.getItem(k));data.active.startedAt=Date.now()-3601000;data.active.deadline=data.active.startedAt+3600000;localStorage.setItem(k,JSON.stringify(data));},key);
  await page.reload();await expect(page.locator('.result-hero')).toBeVisible();await expect(page.locator('.page-heading')).toContainText('Envoi automatique');
});
test('Hors ligne : banque, navigation, figure et examen sont disponibles',async({page,context})=>{
  await page.goto('/');await page.evaluate(()=>navigator.serviceWorker.ready);await page.reload();await page.waitForFunction(()=>Boolean(navigator.serviceWorker.controller));
  await context.setOffline(true);await page.reload();await expect(page.locator('h1')).toContainText('Votre objectif');
  await page.locator('[data-action="instructions:1"]').first().click();await page.locator('[data-action="start"]').click();
  const ids=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)).active.ids,key),index=ids.findIndex(id=>byId.get(id).image);
  await page.locator(`[data-action="jump:${index}"]`).click();await expect(page.locator('.question-figure img')).toBeVisible();
  await page.waitForFunction(()=>document.querySelector('.question-figure img')?.naturalWidth>0);await context.setOffline(false);
});
test('Réinitialisation : deux confirmations obligatoires',async({page})=>{
  await start(page);
  await page.getByRole('button',{name:'Terminer le test',exact:true}).click();await page.locator('[data-action="dialog-confirm"]').click();
  await page.locator('[data-action="nav:dashboard"]').first().click();
  await page.locator('[data-action="instructions:2"]').first().click();await page.locator('[data-action="start"]').click();
  await page.locator('[data-action="nav:dashboard"]').first().click();
  await page.evaluate(()=>localStorage.setItem('cap70-test-unrelated','à conserver'));
  await page.getByRole('button',{name:'Réinitialiser ma progression',exact:true}).click();
  await page.locator('[data-action="dialog-cancel"]').click();
  expect(await page.evaluate(k=>JSON.parse(localStorage.getItem(k)).active!==null,key)).toBeTruthy();
  expect(await page.evaluate(k=>JSON.parse(localStorage.getItem(k)).attempts.length,key)).toBe(1);
  await page.getByRole('button',{name:'Réinitialiser ma progression',exact:true}).click();
  await page.locator('[data-action="dialog-confirm"]').click();await expect(page.locator('dialog')).toContainText('seconde confirmation');
  expect(await page.evaluate(k=>JSON.parse(localStorage.getItem(k)).active!==null,key)).toBeTruthy();
  await page.locator('[data-action="dialog-confirm"]').click();await expect(page.locator('h1')).toContainText('Votre objectif');
  expect(await page.evaluate(k=>JSON.parse(localStorage.getItem(k)).active,key)).toBeNull();
  await page.reload();await expect(page.getByRole('button',{name:'Réinitialiser ma progression',exact:true})).toBeVisible();
  expect(await page.evaluate(k=>JSON.parse(localStorage.getItem(k)).attempts,key)).toEqual([]);
  expect(await page.evaluate(()=>localStorage.getItem('cap70-test-unrelated'))).toBe('à conserver');
  await page.locator('[data-action="nav:guide"]').first().click();await expect(page.getByRole('button',{name:'Réinitialiser toute ma progression',exact:true})).toBeVisible();
});
