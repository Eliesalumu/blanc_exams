// Optional end-to-end local smoke: two provider calls, no secrets in output.
import fs from 'node:fs';
const base=process.env.LOCAL_API_URL||'http://127.0.0.1:4173';
const headers={'Content-Type':'application/json',Origin:base};
const send=async(path,data)=>{
  const response=await fetch(base+path,{method:'POST',headers,body:JSON.stringify(data),signal:AbortSignal.timeout(45000)});
  const result=await response.json();if(!response.ok)throw new Error(result.error||result.failures?.[0]?.message||'API unavailable');return result;
};
try{
  const health=await(await fetch(base+'/api/health')).json();
  const {token}=await send('/api/session',{});headers.Authorization='Bearer '+token;
  const chat=await send('/api/tutor/chat',{mode:'Comprendre',messages:[{role:'user',content:'Quelle différence entre PCA et DG ? Réponds en 40 mots.'}],context:{company:'SNCC',examActive:false,frequentErrors:[]}});
  const exam=JSON.parse(fs.readFileSync(new URL('../data/company-exams.json',import.meta.url),'utf8')).exams[0],question=exam.questions.find(q=>q.type==='short');
  const correction=await send('/api/evaluate-answer',{examId:exam.id,questionId:question.id,answer:question.modelAnswer,kind:'short',selectedChoice:null});
  console.log(JSON.stringify({localApi:health.status,model:health.model,chatReceived:!!chat.message,chatCharacters:chat.message?.length,evaluationReceived:!!correction.evaluations?.[0],score:correction.evaluations?.[0]?.scoreOutOf10}));
}catch(error){console.log(JSON.stringify({success:false,message:error.message}));process.exitCode=1;}
