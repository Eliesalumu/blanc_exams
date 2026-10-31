import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { BANK_VERSION } from '../src/config.js';
import { STORAGE_KEY, loadProgress, saveProgress, emptyProgress } from '../src/storage.js';
import { validateBank } from '../scripts/validate-question-bank.js';
const bank=JSON.parse(fs.readFileSync(new URL('../data/questions.json',import.meta.url))),plan=JSON.parse(fs.readFileSync(new URL('../data/exam-plan.json',import.meta.url)));
test('Une ancienne banque est archivée avant remplacement sans mélange de résultats',()=>{
 const old={version:'2026-10-31-v1',attempts:[{id:'ancien'}],active:null},memory=new Map([[STORAGE_KEY,JSON.stringify(old)]]),storage={getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)};
 const loaded=loadProgress(storage);assert.deepEqual(loaded.data,emptyProgress());assert.equal(loaded.warning,null);assert.ok(loaded.notice.includes('archive'));
 assert.deepEqual(JSON.parse(memory.get(`${STORAGE_KEY}.archive.${old.version}`)),old);assert.equal(saveProgress(loaded.data,storage),true);assert.equal(JSON.parse(memory.get(STORAGE_KEY)).version,BANK_VERSION);
});
test('Une sauvegarde illisible peut être réparée sans perdre sa copie brute',()=>{
 const memory=new Map([[STORAGE_KEY,'invalid json']]),storage={getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)};
 assert.equal(saveProgress(emptyProgress(),storage),true);assert.equal(memory.get(`${STORAGE_KEY}.archive.unreadable`),'invalid json');assert.deepEqual(loadProgress(storage).data,emptyProgress());
});
test('Un archivage impossible ne permet pas d’écraser l’ancienne progression',()=>{
 const old=JSON.stringify({version:'old',attempts:[],active:null}),storage={getItem:key=>key===STORAGE_KEY?old:null,setItem:()=>{throw Error('quota');}};
 assert.equal(saveProgress(emptyProgress(),storage),false);assert.ok(loadProgress(storage).warning);
});
test('Les sources et l’équilibre des cas sont contrôlés, y compris après altération',()=>{
 const result=validateBank(bank,plan);assert.deepEqual(result.errors,[]);for(const e of result.exams){assert.ok(e.cases>=25);assert.deepEqual(e.difficulty,{easy:13,medium:36,hard:16});}
 const damaged=structuredClone(bank),q=damaged.find(q=>q.requiresSource);q.source=null;assert.ok(validateBank(damaged,plan).errors.some(e=>e.includes('Source absente')));
});
