import { chromium } from '@playwright/test';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const edge='C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const browser=await chromium.launch({headless:true,...(fs.existsSync(edge)?{executablePath:edge}:{})});
const context=await browser.newContext({baseURL:'http://127.0.0.1:4173',viewport:{width:1440,height:1000}}),page=await context.newPage();
const errors=[],failedResponses=[],widths=[320,390,820,1440];
page.on('pageerror',e=>errors.push(e.message));
page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
page.on('response',r=>{if(r.status()>=400)failedResponses.push({url:r.url(),status:r.status()});});
fs.mkdirSync('artifacts/qa',{recursive:true});
try{
  await page.goto('http://127.0.0.1:4173/');await page.locator('.day-card').first().waitFor();
  const response=await page.request.get('/data/questions.json');assert.equal(response.status(),200);
  for(const width of widths){
    await page.setViewportSize({width,height:1000});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Débordement à ${width}px`);
    await page.screenshot({path:`artifacts/qa/accueil-${width}.png`,fullPage:true});
  }
  await page.setViewportSize({width:1440,height:1000});
  await page.locator('[data-action="instructions:1"]').first().click();
  await page.locator('[data-action="start"]').click();
  await page.locator('input[name="answer"]').first().focus();await page.keyboard.press('ArrowDown');
  assert.equal(await page.locator('input[name="answer"]:checked').count(),1,'Navigation clavier des choix');
  await page.screenshot({path:'artifacts/qa/examen-desktop.png',fullPage:true});
  for(const width of [320,390,820]){
    await page.setViewportSize({width,height:900});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Examen débordant à ${width}px`);
  }
  await page.screenshot({path:'artifacts/qa/examen-tablette.png',fullPage:true});
  await page.setViewportSize({width:1440,height:1000});
  const bank=JSON.parse(fs.readFileSync('data/questions.json','utf8'));
  // Known 46/65 fixture, isolated from the user's browser profile.
  await page.evaluate(questions=>{
    const data=JSON.parse(localStorage.getItem('cap70.progress.v1'));
    const lookup=new Map(questions.map(q=>[q.id,q]));
    data.active.ids.forEach((id,i)=>{const q=lookup.get(id);data.active.answers[id]=i<46?q.correctAnswer:(q.correctAnswer+1)%4;});
    localStorage.setItem('cap70.progress.v1',JSON.stringify(data));
  },bank);
  await page.reload();await page.locator('#timer').waitFor();
  await page.locator('[data-action="fullscreen"]').click();
  await page.getByRole('button',{name:'Terminer le test',exact:true}).click();
  await page.locator('[data-action="dialog-confirm"]').click();
  await page.locator('.result-hero').waitFor();
  await page.waitForFunction(()=>!document.fullscreenElement&&!document.body.classList.contains('focus-mode'));
  assert.ok((await page.locator('.result-ring').textContent()).includes('70,77'));
  await page.screenshot({path:'artifacts/qa/resultat-46-sur-65.png',fullPage:true});
  const figures=bank.filter(q=>q.image);
  for(let batch=0;batch<6;batch++){
    await page.setViewportSize({width:1360,height:1000});
    await page.setContent(`<html lang="fr"><head><title>Relecture des figures</title><style>body{margin:20px;font:14px Arial;background:#eef2f7;color:#183653}main{display:grid;grid-template-columns:1fr 1fr;gap:15px}article{background:white;border:1px solid #d8e1ea;padding:12px;border-radius:8px}img{width:100%;height:auto}h2{font-size:14px;margin:0 0 8px}p{font-size:12px;margin:0 0 8px;min-height:38px}</style></head><body><main>${figures.slice(batch*10,batch*10+10).map(q=>`<article><h2>${q.id}</h2><p>${q.question.replaceAll('&','&amp;').replaceAll('<','&lt;')}</p><img src="http://127.0.0.1:4173/${q.image}" alt="Figure ${q.id}"></article>`).join('')}</main></body></html>`);
    await page.waitForFunction(()=>[...document.images].every(img=>img.complete&&img.naturalWidth>0));
    await page.screenshot({path:`artifacts/qa/figures-planche-${batch+1}.png`,fullPage:true});
  }
  assert.deepEqual(errors,[],'Console du navigateur');assert.deepEqual(failedResponses,[],'Ressources HTTP');
  const result={date:'2026-10-31',browser:'Microsoft Edge / Chromium',widths,figuresRendered:figures.length,keyboard:true,fullscreenExit:true,consoleErrors:errors,failedResponses};
  fs.writeFileSync('artifacts/qa/audit-browser.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
}finally{await browser.close();}
