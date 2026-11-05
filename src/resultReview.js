import {isEvaluation} from './ai.js';

export const REVIEW_FILTERS=[['all','Toutes'],['wrong','Échouées / à revoir'],['unanswered','Sans réponse'],['pending','Correction en attente']];
export const REVIEW_LABELS={correct:'Réussie',wrong:'Échouée / à revoir',unanswered:'Sans réponse',pending:'Correction en attente'};
const validEvaluation=(value,id)=>isEvaluation(value,id)?value:null;
export function reviewState(question,attempt){
  const id=question.id,evaluation=validEvaluation(attempt.evaluations?.[id],id);
  let status;
  if(question.type==='mcq')status=!Number.isInteger(attempt.answers[id])?'unanswered':attempt.answers[id]===question.answer?'correct':'wrong';
  else if(!attempt.written[id]?.trim())status='unanswered';
  else if(evaluation)status=evaluation.scoreOutOf10>=7?'correct':'wrong';
  else if(!Object.hasOwn(attempt,'evaluations')&&Number.isInteger(attempt.ratings?.[id]))status=attempt.ratings[id]/6>=.7?'correct':'wrong';
  else status='pending';
  const commentEvaluation=validEvaluation(attempt.commentEvaluations?.[id],id);
  const commentStatus=!question.commentRequired?null:!attempt.comments[id]?.trim()?'unanswered':commentEvaluation?(commentEvaluation.scoreOutOf10>=7?'correct':'wrong'):'pending';
  return {status,commentStatus};
}
export function matchesReviewFilter(question,attempt,filter){
  const {status,commentStatus}=reviewState(question,attempt);
  return filter==='all'||status===filter||commentStatus===filter;
}
function evaluationSpeech(value){
  return `Note : ${value.scoreOutOf10} sur 10. ${value.appreciation}. Points corrects : ${value.correctElements.join('. ')||'Aucun signalé'}. Éléments manquants : ${value.missingElements.join('. ')||'Aucun signalé'}. Erreurs à corriger : ${value.errors.join('. ')||'Aucune signalée'}. Réponse améliorée : ${value.improvedAnswer}. À retenir : ${value.keyTakeaway}`;
}
export function correctionSpeech(question,attempt,kind){
  const intro=`Question : ${question.prompt}. `,id=question.id;
  if(kind==='ai'){
    const value=validEvaluation(attempt.evaluations?.[id],id);
    return value?intro+evaluationSpeech(value):'';
  }
  if(kind==='model'&&question.type==='short')return intro+`Réponse modèle : ${question.modelAnswer}. Critères attendus : ${question.essentials.join('. ')}.`;
  if(kind==='mcq'&&question.type==='mcq'){
    const chosen=attempt.answers[id];
    return intro+`Votre choix : ${Number.isInteger(chosen)?question.choices[chosen]:'sans réponse'}. Réponse attendue : ${question.choices[question.answer]}. ${question.explanation}. `+(question.choiceExplanations?question.choices.map((c,i)=>`Proposition ${String.fromCharCode(65+i)} : ${c}. ${question.choiceExplanations[i]}`).join('. '):'');
  }
  if(kind==='comment'&&question.commentRequired){
    const value=validEvaluation(attempt.commentEvaluations?.[id],id);
    return intro+`Votre commentaire : ${attempt.comments[id]?.trim()||'aucun commentaire rédigé'}. `+(value?evaluationSpeech(value):'Correction IA du commentaire en attente.');
  }
  return '';
}
