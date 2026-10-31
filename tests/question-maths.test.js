import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const questions=JSON.parse(fs.readFileSync(new URL('../data/questions.json',import.meta.url))).filter(q=>q.category==='quantitatif');
// Independent numeric oracle: recompute each management exercise, without using
// the source answer field or compiler allocation logic.
const expected=[
 (92000-80000)/80000*100,(1.1*.9-1)*100,50-35,300000/15,100+250-290,120+200-150,
 .6/3.6*360,8/10*100,30/5*50,1200/8,68/80*100,(460000-400000)/400000*100,
 .24/2*100,24000/80000,(60*20+40*30)/100,1e6*.08*.5,110000/1.1,
 121000/(1.1**2)-100000,240000/60000,360000/300000,100000*(3000-2500)/1e6,
 Math.min(900,600,750),(200-30)/200*100,12*8,96+24,500000/25000,100000+8*20000,
 500000-300000-150000,210000/300000*100,.05*2e6,'B et C','B, avec 135 000 USD',
 (10-8)/10*100,88-80,900000/3e6*100,2+3+1,600/150,1200/4,(2+4+3+7)/4,
 96/(96+4)*100,10000*1.1**2,(40-25)*12000-150000,200000*(1-.6-.25),[2,2,3,3,20].sort((a,b)=>a-b)[2],500000+80000-450000
];
function firstNumber(s){const n=Number(s.replace(/[\s\u00a0\u202f]/g,'').replace(',','.').match(/[-−]?\d+(?:\.\d+)?/)?.[0]?.replace('−','-'));return /baisse/i.test(s)?-n:n;}
test('Les 45 calculs de gestion ont une réponse numériquement correcte et unique',()=>{
 assert.equal(questions.length,45);assert.equal(expected.length,45);
 questions.forEach((q,i)=>{const want=expected[i],answer=q.choices[q.correctAnswer];
   if(typeof want==='string'){assert.equal(answer,want,q.id);return;}
   assert.ok(Math.abs(firstNumber(answer)-want)<1e-7,`${q.id} : ${answer} / ${want}`);
   assert.equal(q.choices.filter(c=>(q.id!=='NU-034'||c.includes('points'))&&Math.abs(firstNumber(c)-want)<1e-7).length,1,`${q.id} : une seule réponse numérique dans l'unité demandée`);
 });
});
