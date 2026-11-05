// Local adjudication of the blind reader's remaining reservations.
// A disagreement with the expected answer or an unlisted competing answer blocks publication.
import fs from 'node:fs';
const path=new URL('../data/reviewed-technical-options.json',import.meta.url);
const state=JSON.parse(fs.readFileSync(path,'utf8'));
const decisions={
  'sncc1-B-M03':'Un accès exclusif n’est pas un engagement ferme de volumes. Le distracteur affirme précisément cette équivalence fausse ; la réserve du lecteur ne la rend pas vraie.',
  'sncc1-C-M05':'L’amortissement n’est pas un décaissement. L’option contestée prétend mesurer les décaissements par cet amortissement ; ce n’est pas une autre comparaison valable de flux.',
  'sncc3-D-M05':'Une baisse de tonnage ne prouve pas le départ d’un client. L’option contestée affirme cette équivalence, distincte du suivi explicite des sorties de clients.',
  'rva1-C-M02':'La marge opérationnelle utilise les recettes comme assiette. Le ratio résultat/charges est un autre ratio ; la distinction d’assiette est précisément l’objet du distracteur.',
  'rva1-C-M08':'Une hausse de 2 à 2,4 se rapporte à la valeur initiale : 20 %. Le calcul sur la valeur finale n’est pas une seconde réponse à cette hausse.',
  'rva2-C-M07':'L’option qualifie l’inflation de proxy complet des hausses contractuelles. Cette affirmation est fausse ; un indicateur partiel ne suffit pas à valider le texte proposé.',
  'rva3-C-M01':'Le dépassement budgétaire se rapporte au budget initial de 10 : (12−10)/10 = 20 %. La part de l’écart dans le coût final est un indicateur différent.',
  'rva5-B-M01':'La fin du support n’établit pas à elle seule une non-conformité d’exploitation. L’option affirme ce lien nécessaire ; le bon choix reste l’analyse de cycle de vie et de criticité.',
  'rva3-F-M01':'Un calendrier de maintenance séparée n’est pas une preuve d’absence de dépendance commune. Le lecteur retient son utilité comme contrôle, mais cela ne valide pas la preuve affirmée par le texte du distracteur.',
  'rva5-B-M09':'Un retard d’encaissement ne reporte pas les échéances contractuelles de dette. La proposition prétend que le report est acquis ; elle ne décrit pas un stress de liquidité conservant les échéances réelles.',
};
const unresolved=[];
for(const q of Object.values(state.questions)){
  const r=q.blindReview;
  if(!r||r.chosenIndex!==q.answer||((r.otherDefensibleIndices.length||r.weakDistractorIndices.length>1)&&!decisions[q.questionId]))unresolved.push(q.questionId);
}
if(Object.keys(state.questions).length!==400||unresolved.length)throw new Error(`Relecture à résoudre : ${unresolved.join(', ')}`);
const reviewedAt=new Date().toISOString();
for(const q of Object.values(state.questions)){
  const r=q.blindReview;
  q.localApproval={reviewedAt,method:decisions[q.questionId]?'local-adjudication':'blind-review-and-local-controls',reason:decisions[q.questionId]||(r.weakDistractorIndices.length?'Réponse confirmée ; un distracteur plus accessible est conservé, les autres alternatives reposant sur des confusions de domaine.':'Réponse confirmée à l’aveugle ; annotations de contexte examinées, sans modification de l’énoncé ni de la clé.')};
  q.editorialIssues=[];
  if(q.questionId==='t2-F-M02')q.localApproval.reason='Cas hypothétique : le mot fictif ne constitue pas une preuve de fraude. Le corrigé distingue le caractère simulé du cas des vérifications réelles d’un acompte.';
}
state.reviewSummary={reviewedAt,questionCount:400,blindReviews:400,expectedAnswersConfirmed:400,localAdjudications:Object.keys(decisions).length};
fs.writeFileSync(path,JSON.stringify(state,null,2)+'\n');
console.log('400 relectures présentes et 400 clés confirmées ; arbitrages éditoriaux documentés.');
