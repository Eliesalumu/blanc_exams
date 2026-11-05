// Deliberate editorial job, never part of the build or automated tests.
// Resumable structured generation + blind review; prints no credentials/provider errors.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import OpenAI from 'openai';
import {z} from 'zod';
import {zodTextFormat} from 'openai/helpers/zod';
import {verifiedContext} from '../server/verified-context.js';
const root=new URL('../',import.meta.url),read=name=>JSON.parse(fs.readFileSync(new URL(name,root),'utf8'));
const files=['data/technical-exams.json','data/company-exams.json'];
const exams=files.flatMap(name=>read(name).exams),scope=exams.filter(e=>e.id!=='technical-1');
const work=scope.flatMap(exam=>exam.questions.filter(q=>q.type==='mcq').map((q,i)=>({examId:exam.id,company:exam.company||'ONATRA',...q,desiredCorrectLengthRank:(i*7+Math.floor(i/4))%4+1})));
const path=new URL('data/reviewed-technical-options.json',root);
const state=fs.existsSync(path)?JSON.parse(fs.readFileSync(path,'utf8')):{version:'options-2026-11-05-v1',model:process.env.EDITORIAL_MODEL||'gpt-5.2',questions:{},usage:{input:0,output:0,calls:0}};
const save=()=>fs.writeFileSync(path,JSON.stringify(state,null,2)+'\n');
const hash=q=>createHash('sha256').update(JSON.stringify([q.id,q.prompt,q.answer])).digest('hex');
const item=z.object({questionId:z.string(),choices:z.array(z.string().min(1).max(300)).length(4),explanation:z.string().min(30).max(1000),choiceExplanations:z.array(z.string().min(15).max(500)).length(4),discriminant:z.string().min(10).max(400),concerns:z.array(z.string().max(350)).max(4)}).strict();
const option=z.object({text:z.string().min(1).max(300),explanation:z.string().min(15).max(500)}).strict();
const authored=z.object({questionId:z.string(),correctChoice:option,distractors:z.array(option.extend({falseAssumption:z.string().min(15).max(500)}).strict()).length(3),explanation:z.string().min(30).max(1000),discriminant:z.string().min(10).max(400),concerns:z.array(z.string().max(350)).max(4)}).strict();
const resultSchema=z.object({questions:z.array(authored)}).strict();
const verdict=z.object({questionId:z.string(),chosenIndex:z.number().int().min(0).max(3),otherDefensibleIndices:z.array(z.number().int().min(0).max(3)).max(3),weakDistractorIndices:z.array(z.number().int().min(0).max(3)).max(3).describe('Only absurd or linguistically self-disqualifying choices, NOT all incorrect answers. A plausible technical misconception or arithmetic error is NOT weak.'),issue:z.string().max(800)}).strict();
const reviewSchema=z.object({questions:z.array(verdict)}).strict();
const forbidden=/\b(toujours|jamais|au hasard|sans aucune|ignorer totalement|seul|seule|seuls|seules|uniquement|automatiquement|systématiquement)\b/i;
const reasoning=state.model.startsWith('gpt-5')?{reasoning:{effort:process.argv[2]==='generate'?'low':'medium'}}:{};
const client=new OpenAI({apiKey:process.env.OPENAI_API_KEY,timeout:180000,maxRetries:0});
function validate(value,q){
  item.parse(value);
  if(value.questionId!==q.id||new Set(value.choices.map(s=>s.toLowerCase().trim())).size!==4)throw new Error('identity/duplicates');
}
async function generate(group,feedback=[]){
  const strictInstructions=`Tu rédiges des QCM exigeants pour des PCA ONATRA/SNCC/RVA en RDC. Conserve EXACTEMENT l'énoncé et le principe de la réponse de référence. Rédige UNE bonne proposition et TROIS propositions techniquement FAUSSES mais crédibles pour un candidat partiellement formé. Les erreurs doivent demander de la connaissance pour être reconnues. Des actions utiles mais incomplètes ne sont PAS des distracteurs valables avec des énoncés larges.
Pour chaque distracteur, falseAssumption nomme la règle ou le lien FACTUELLEMENT FAUX affirmé par cette proposition. Si tu ne peux pas désigner une affirmation fausse et vérifiable, abandonne ce distracteur et invente-en un autre. 'C'est insuffisant', 'c'est un autre axe', 'ne remplace pas' ne constituent PAS une réfutation. Ne réutilise pas les anciennes options. N'invente pas de loi, chiffre du cas ou condition nouvelle. Le PCA supervise, la DG exécute, l'AAC régule et supervise, la RVA exploite/fournit les services.
EXEMPLE : 'Quel est l'usage d'un calendrier annuel des travaux du CA ?' Bonne : 'Programmer les dossiers récurrents et stratégiques en réservant une capacité pour les urgences.' Fausses mais plausibles : 'Donner aux dates validées par le conseil la valeur de convocations régulières des administrateurs.' (planification != convocation) ; 'Formaliser par son adoption la délégation des décisions prévues aux commissions chargées des dossiers.' (programme != transfert de compétence) ; 'Transformer les jalons prévisionnels du conseil en autorisations d'engagement budgétaire pour la direction générale.' (calendrier != autorisation budgétaire). À éviter : 'fixer les dates', 'préparer les commissions', 'vérifier les délais' car ces réponses seraient aussi vraies.
EXEMPLE : 'Quel contrôle fiabilise le recensement des immobilisations ?' Bonne : rapprocher inventaire physique et registre dans les deux sens. Faux : déduire le parc détenu des charges d'entretien (charges != parc) ; considérer la vérification des seuls biens inscrits comme preuve d'exhaustivité (existence != exhaustivité) ; rapprocher valeur assurée et valeur nette pour conclure à l'existence physique (valeur != existence).
Les quatre options ont le même ton, la même construction et une longueur voisine, sans allonger artificiellement les distracteurs. Souvent 12 à 22 mots ; moins pour calculs et définitions. La bonne réponse ne doit pas être la seule nuancée ou détaillée. desiredCorrectLengthRank suggère un rang de longueur de 1 (court) à 4 (long), secondaire à la justesse. Pour les calculs, trois erreurs d'assiette ou d'opération plausibles avec la même unité.
INTERDIT dans les options : toujours, jamais, seul/seule/seuls/seules, uniquement, automatiquement, systématiquement, au hasard, sans aucune, ignorer totalement. Pas d'absurdités, pas de faute avouée (éviter le contrôle, sans vérification, etc.), pas d'option hors sujet (publicité, logo), pas de caricature. Chaque choix doit pouvoir être défendu de bonne foi par quelqu'un qui confond précisément deux notions.
Explique précisément les quatre propositions, avec un discriminant pédagogique. Mets les éventuels vrais problèmes de référence dans concerns. Les facts institutionnels fournis prévalent sur les suppositions tirées du nom de la société.`;
  const balanceInstructions=phase==='balance'?`\nRÉVISION PRIORITAIRE DE FORME ET D'AMBIGUÏTÉ : les quatre options actuelles, leurs raisons et reviewFindings sont fournies. Conserve les concepts des options valables, mais remplace les distracteurs signalés comme également défendables ou trop évidents par de vraies confusions techniques. Réécris AUSSI la bonne réponse, sans copier sa formulation trop courte. Chaque option doit compter targetWords mots, à un mot près. Aucune ne doit dépasser cette fourchette. Vise un rang de longueur de 2 ou 3 pour la bonne réponse : ni plus courte ni plus longue. Reformule naturellement, sans remplir par des mots vides. Pour développer la bonne réponse, explicite son mécanisme utile ; pour réduire un distracteur, conserve sa confusion technique. Garde une seule réponse correcte. Ne réintroduis pas un autre bon conseil comme distracteur. Une option dont le défaut est 'incomplète' doit être remplacée par une option qui affirme un lien techniquement faux.`:'';
  const generationReasoning=phase==='balance'&&state.model.startsWith('gpt-5')?{reasoning:{effort:'low'}}:reasoning;
  const response=await client.responses.parse({model:state.model,...generationReasoning,store:false,max_output_tokens:20000,instructions:strictInstructions+balanceInstructions,input:JSON.stringify({questions:group.map(q=>({questionId:q.id,company:q.company,institutionalFacts:verifiedContext[q.company]?.facts,question:q.prompt,correctPrinciple:q.choices[q.answer],referenceExplanation:q.explanation,desiredCorrectLengthRank:q.desiredCorrectLengthRank,...(phase==='balance'?{targetWords:q.targetWords,currentChoices:q.choices,currentReasons:state.questions[q.id].choiceExplanations,reviewFindings:state.questions[q.id].blindReview}:{})})),feedback:phase==='repair'?feedback:[]}),text:{format:zodTextFormat(resultSchema,'revised_options')}});
  state.usage.calls++;state.usage.input+=response.usage?.input_tokens||0;state.usage.output+=response.usage?.output_tokens||0;
  const data=resultSchema.parse(response.output_parsed);if(data.questions.length!==group.length)throw new Error('incomplete batch');
  for(const q of group){const authored=data.questions.find(v=>v.questionId===q.id);if(!authored)throw new Error('identity/duplicates');const options=[...authored.distractors];options.splice(q.answer,0,authored.correctChoice);const {correctChoice,distractors,...metadata}=authored;const value={...metadata,choices:options.map(o=>o.text),choiceExplanations:options.map(o=>o.explanation)};validate(value,q);state.questions[q.id]={...value,misconceptions:options.map(o=>o.falseAssumption||''),editorialRevision:3,editorialIssues:[...value.concerns,...(value.choices.some(c=>forbidden.test(c))?['Retirer les mots interdits des propositions.']:[])],sourceHash:hash(q),examId:q.examId,answer:q.answer};}
  save();
}
async function review(group){
  const reviewStandard=`IMPORTANT : weakDistractorIndices ne signifie PAS 'indices des réponses fausses'. Un distracteur fondé sur une confusion réelle de domaine ou une erreur de calcul plausible est acceptable. Par exemple disponibilité 12/20 : 40 % (indisponibilité), 50 % (mauvaise assiette), 67 % (exclusion indue d'unités) ne sont PAS faibles. Ne les signale pas parce que tu sais calculer 60 %. Réserve weakDistractorIndices aux absurdités hors sujet ou aux fautes avouées détectables sans connaissance de la matière ; laisse vide si les erreurs sont conceptuelles. Pour otherDefensibleIndices, juge le texte proposé, sans lui ajouter des conditions absentes qui le rendraient vrai. Une affirmation techniquement fausse n'est pas défendable simplement parce qu'elle mentionne un bon objectif. Les faits institutionnels fournis proviennent des sources de la banque ; utilise-les (notamment SNCC multimodale) plutôt qu'une supposition sur le nom de l'entreprise. Signale les ambiguïtés réellement présentes dans les options, pas toutes les réponses qu'on aurait pu imaginer hors des choix.`;
  const response=await client.responses.parse({model:state.model,...reasoning,store:false,max_output_tokens:12000,
    instructions:`Tu es un examinateur contradicteur exigeant. Résous chaque QCM de manière indépendante, à partir de son libellé exact et des choix proposés. La position attendue n'est pas fournie. Une seule meilleure réponse doit être défendable. Signale les autres indices réellement défendables, même si moins exhaustifs, et les distracteurs ridicules ou éliminables sans connaissance du sujet. Les options sont destinées à des PCA en RDC ; ne fabrique pas de règle juridique. Si un libellé large admet plusieurs démarches raisonnables, signale-les. Explique le défaut précis dans issue ; laisse issue vide si aucune réserve. N'accepte pas un choix uniquement parce qu'il contient plus de critères.`,
    input:JSON.stringify({reviewStandard,questions:group.map(q=>({questionId:q.id,company:q.company,institutionalFacts:verifiedContext[q.company]?.facts,question:q.prompt,choices:state.questions[q.id].choices}))}),text:{format:zodTextFormat(reviewSchema,'blind_review')}});
  state.usage.calls++;state.usage.input+=response.usage?.input_tokens||0;state.usage.output+=response.usage?.output_tokens||0;
  const data=reviewSchema.parse(response.output_parsed);
  if(data.questions.length!==group.length)throw new Error('incomplete review');
  for(const q of group){const v=data.questions.find(v=>v.questionId===q.id);if(!v)throw new Error('review identity');state.questions[q.id].blindReview=v;}
  save();
}
const phase=process.argv[2]||'generate',limit=Number(process.env.EDITORIAL_LIMIT)||work.length;
let queue=work.filter(q=>phase==='rewrite'?state.questions[q.id]?.editorialRevision!==3:phase==='generate'?!state.questions[q.id]:phase==='review'?state.questions[q.id]&&!state.questions[q.id].blindReview:!!state.questions[q.id]?.blindReview&&(state.questions[q.id].editorialIssues?.length||state.questions[q.id].blindReview.chosenIndex!==q.answer||state.questions[q.id].blindReview.otherDefensibleIndices.length||state.questions[q.id].blindReview.weakDistractorIndices.length||state.questions[q.id].blindReview.issue)).slice(0,limit);
if(phase==='balance'){
  const chosen=new Map();
  for(const exam of scope){
    const qs=work.filter(q=>q.examId===exam.id).map(q=>({...q,...state.questions[q.id],id:q.id}));
    for(const direction of ['short','long']){
      const hits=qs.filter(q=>q.choices[q.answer].length===(direction==='short'?Math.min:Math.max)(...q.choices.map(c=>c.length)));
      if(hits.length<=16)continue;
      hits.sort((a,b)=>{const ratio=q=>q.choices[q.answer].length/(q.choices.reduce((n,c)=>n+c.length,0)/4);return direction==='short'?ratio(a)-ratio(b):ratio(b)-ratio(a);});
      for(const q of hits.slice(0,hits.length-12))chosen.set(q.id,{...q,desiredCorrectLengthRank:direction==='short'?3:2,targetWords:Math.max(9,Math.min(17,Math.round(q.choices.reduce((n,c)=>n+c.trim().split(/\s+/u).length,0)/4)))});
    }
    for(const q of qs){const r=q.blindReview;if(r&&(r.chosenIndex!==q.answer||r.otherDefensibleIndices.length||r.weakDistractorIndices.length>1)&&!chosen.has(q.id))chosen.set(q.id,{...q,desiredCorrectLengthRank:2,targetWords:Math.max(9,Math.min(17,Math.round(q.choices.reduce((n,c)=>n+c.trim().split(/\s+/u).length,0)/4)))});}
  }
  queue=[...chosen.values()].slice(0,limit);
}
const batchSize=['repair','rewrite','balance'].includes(phase)?8:4;
const groups=[];for(let i=0;i<queue.length;i+=batchSize)groups.push(queue.slice(i,i+batchSize));
let next=0,done=0,failures=0;
async function worker(){while(next<groups.length){const group=groups[next++];try{
  if(phase==='review')await review(group);
  else{await generate(group,['repair','rewrite'].includes(phase)?group.map(q=>({...state.questions[q.id].blindReview,requiredCorrectIndex:q.answer,editorialIssues:state.questions[q.id].editorialIssues,previousChoices:state.questions[q.id].choices,instruction:'Corriger les défauts signalés, avec la bonne proposition EXACTEMENT à requiredCorrectIndex (indices 0 à 3). Les trois autres propositions doivent être plausibles mais incorrectes pour le libellé exact, pas seulement moins exhaustives.'})):[]);if(['repair','rewrite','balance'].includes(phase))await review(group);}
  done+=group.length;console.log(JSON.stringify({phase,done,total:queue.length,last:group.at(-1).id,calls:state.usage.calls}));
}catch(error){failures++;console.log(JSON.stringify({phase,failed:group.map(q=>q.id),status:Number.isInteger(error.status)?error.status:null,type:error.constructor?.name||'Error',validation:['identity/duplicates','elimination cue','content concern','incomplete batch','incomplete review','review identity'].includes(error.message)?error.message:undefined}));}}}
await Promise.all(Array.from({length:phase==='balance'?8:phase==='rewrite'?6:4},()=>worker()));save();
if(failures)process.exitCode=1;
