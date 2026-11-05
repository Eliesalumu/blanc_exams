// Optional real smoke test: one streamed chat and one short generated voice sample.
import fs from 'node:fs';
import {readTutorStream} from '../src/ai.js';
const base=process.env.LOCAL_API_URL||'http://127.0.0.1:4173';
const headers={'Content-Type':'application/json',Origin:base};
const post=(path,data)=>fetch(base+path,{method:'POST',headers,body:JSON.stringify(data),signal:AbortSignal.timeout(45000)});
try{
  const session=await(await post('/api/session',{})).json();headers.Authorization='Bearer '+session.token;
  const res=await post('/api/tutor/chat',{stream:true,mode:'Comprendre',messages:[{role:'user',content:'Explique le rôle du PCA en deux phrases.'}],context:{company:'SNCC',examActive:false,frequentErrors:[]}});
  if(!res.ok||!res.headers.get('content-type')?.includes('text/event-stream'))throw new Error('Streaming route unavailable');
  let deltas=0;const text=await readTutorStream(res,()=>deltas++);
  const audio=await post('/api/tutor/speech',{text:'Le conseil définit les orientations. La direction générale assure leur exécution.',examActive:false});
  if(!audio.ok||!audio.headers.get('content-type')?.startsWith('audio/'))throw new Error('Speech route unavailable');
  const bytes=Buffer.from(await audio.arrayBuffer());fs.mkdirSync('test-results',{recursive:true});fs.writeFileSync('test-results/voice-openai.mp3',bytes);
  console.log(JSON.stringify({stream:true,deltas,characters:text.message.length,audioStatus:audio.status,audioBytes:bytes.length,voice:'marin'}));
}catch{console.log(JSON.stringify({success:false,error:'Streaming or voice check failed. No credentials logged.'}));process.exitCode=1;}
