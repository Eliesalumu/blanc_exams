// Optional live smoke test. Prints only status/score; never provider errors or secrets.
import OpenAI from 'openai';
import { createEvaluator } from '../server/evaluator.js';
import { bank } from '../server/app.js';
if(!process.env.OPENAI_API_KEY){console.log('LIVE SKIPPED: OPENAI_API_KEY absente.');process.exitCode=1;}
else {
  const client=new OpenAI({apiKey:process.env.OPENAI_API_KEY,timeout:30000,maxRetries:0});
  const model=process.env.OPENAI_MODEL||'gpt-4.1-mini',exam=bank().find(e=>e.id==='sncc-1'),question=exam.questions.find(q=>q.type==='short');
  try {
    const evaluate=createEvaluator({client,model});
    const result=await evaluate({questionId:question.id,company:'SNCC',role:'PCA',section:'A',question:question.prompt,candidateAnswer:'Une locomotive apte peut rester sans emploi si les sillons, les wagons ou les conducteurs manquent. Le PCA demande à la DG un diagnostic de la chaîne et des indicateurs d’utilisation, puis le conseil suit un plan de levée des contraintes sans diriger les mouvements.',referenceAnswer:question.modelAnswer,criteria:question.essentials,scale:{scoreOutOf10:10},sources:question.sources});
    console.log(JSON.stringify({live:true,model,evaluationValid:true,score:result.scoreOutOf10}));
  }catch(error){console.log(JSON.stringify({live:false,model,status:Number.isInteger(error.status)?error.status:null,code:['EACCES','ENOTFOUND','ECONNRESET','ETIMEDOUT'].includes(error.cause?.code)?error.cause.code:'provider-or-network-error'}));process.exitCode=1;}
}
