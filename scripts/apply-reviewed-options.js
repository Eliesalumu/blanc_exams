import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

const root=new URL('../',import.meta.url);
export const sourceHash=q=>createHash('sha256').update(JSON.stringify([q.id,q.prompt,q.answer])).digest('hex');
export function applyReviewedOptions(exams,review) {
  for(const exam of exams)for(const q of exam.questions){
    const revised=review.questions[q.id];
    if(!revised)continue;
    if(revised.sourceHash!==sourceHash(q)||revised.answer!==q.answer)throw new Error(`Révision incompatible : ${q.id}`);
    if(!revised.localApproval&&(revised.editorialIssues?.length||!revised.blindReview||revised.blindReview.chosenIndex!==q.answer||revised.blindReview.otherDefensibleIndices.length||revised.blindReview.weakDistractorIndices.length||revised.blindReview.issue))throw new Error(`Révision à résoudre : ${q.id}`);
    q.choices=revised.choices;
    q.explanation=revised.explanation;
    q.choiceExplanations=revised.choiceExplanations;
    q.discriminant=revised.discriminant;
  }
  return exams;
}

if(process.argv[1]&&fileURLToPath(import.meta.url)===fs.realpathSync(process.argv[1])){
  const review=JSON.parse(fs.readFileSync(new URL('data/reviewed-technical-options.json',root),'utf8'));
  if(Object.keys(review.questions).length!==400)throw new Error('Les 400 QCM doivent être révisés avant application.');
  const updates=['technical-exams','company-exams'].map(name=>{
    const path=new URL(`data/${name}.json`,root),data=JSON.parse(fs.readFileSync(path,'utf8'));
    applyReviewedOptions(data.exams,review);
    return {path,data};
  });
  for(const {path,data} of updates)fs.writeFileSync(path,JSON.stringify(data,null,2)+'\n');
  console.log('400 QCM révisés appliqués ; énoncés et clés de réponse conservés.');
}
