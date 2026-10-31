import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const questions=JSON.parse(fs.readFileSync(new URL('../data/questions.json',import.meta.url))).filter(q=>q.category==='mathematiques');
// Independent numeric checks: these calculations verify the authored answers,
// rather than testing the compiler against its own source answer field.
const expected=[
  7.2+.085,15-3.75,.6*.04,8.4/.7,125*16,2.35+4.8+.65,99*37,3.6/100,3.075*2,48*25,
  18-3*4+2,(20+4)/(8-2),6+24/3*2,5*(12-(3+4)),40/(2*5)+7,3**2+2*5,7+3*(15-9)/2,(8-3)**2-4**2,
  1/3+1/4,42/56,250*3/5,5/8,7/8-1/4,(2/3)/(4/5),5/6-1/3,.125,18000*3,(9/10)*(5/6),
  80000*.85,240000*1.125,(250-200)/200*100,64000/.8,'Baisse de 1 %',42/60*100,360000*.025,55-40,500*.3*.4,(1-.8*.75)*100,
  9000/6*10,12*8/16,180/3*7,6*50000/100000,8*350/100,300/4*10,3*4,80/2*5,45*2/9,2800*25,
  14,180/2.25,'11 h 25',96000*3/8,(12+15+9+16)/4,4*13-(10+12+14),12000/50000*100,(60+90)/2,120/(60/30+60/60),18*5000+7*10000,1-3/8-1/4,2*(18+12),8*5/.5,900/15,1/(1/6+1/3),30-(18+16-8),72000/1.2,(5*18-26)/4,'17 h 40',120+20-95,
  (37-9)/4,21/3+4,(13+8)/(5-2),(8-3)*4,50/(1+2/3),(15-6)/.5,(57-1)/2,9+5,
  25,11*2,8+13,17+16,27/3,28-8,40*3+1,40,
  2.4*60,3.75*1000,.85*1000,2.5*1000,'2 h 15 min',72/3.6,1.2*10000,2+75/1000,.45*100,72/60,
  'Mardi seulement',180/(120+180+300)*100,40000+2000*15,5,(10*4000+30*2000)/40,96,Math.ceil(65*.7),(40+2*50+60)/4,120*.95-108,1000000*(1-.4-.35),13-4
];
function numeric(text){
  const s=text.replaceAll(' ','').replace(',','.');
  const fraction=s.match(/^(\d+)\/(\d+)/);
  if(fraction)return Number(fraction[1])/Number(fraction[2]);
  return Number(s.match(/^[0-9.]+/)?.[0]);
}
test('Les 105 bonnes réponses numériques sont vérifiées indépendamment',()=>{
  assert.equal(expected.length,105);assert.equal(questions.length,105);
  questions.forEach((q,i)=>{
    const answer=q.choices[q.correctAnswer],truth=expected[i];
    if(typeof truth==='string')assert.equal(answer,truth,`${q.id} : ${q.question}`);
    else {
      assert.ok(Math.abs(numeric(answer)-truth)<1e-8,`${q.id} : ${answer} ; attendu ${truth}`);
      const matching=q.choices.filter(c=>Math.abs(numeric(c)-truth)<1e-8);
      assert.equal(matching.length,1,`${q.id} : plusieurs choix numériquement corrects`);
    }
  });
});
