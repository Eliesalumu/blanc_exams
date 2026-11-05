import { API_URL } from './api-config.js';
let token=null,sessionPromise=null;
export const unavailable='Correction IA momentanément indisponible. Vos réponses sont sauvegardées.';
export async function apiRequest(path,data,retry=true,options={}) {
  if(API_URL===null)throw new Error('Le service IA n’est pas configuré sur ce site. Vos réponses restent sauvegardées.');
  async function request(route,payload,authorization) {
    const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),45000);
    try {
      const res=await fetch(API_URL+route,{method:'POST',headers:{'Content-Type':'application/json',...(authorization?{Authorization:'Bearer '+authorization}:{})},body:JSON.stringify(payload),signal:controller.signal});
      if(res.ok&&options.audio&&route!=='/api/session'){
        if(!res.headers.get('content-type')?.startsWith('audio/'))throw Object.assign(new Error('La lecture audio n’est pas disponible. Le texte reste consultable.'),{status:502});
        return await res.blob();
      }
      if(res.ok&&options.onDelta&&res.headers.get('content-type')?.includes('text/event-stream'))return await readTutorStream(res,options.onDelta);
      if(!res.headers.get('content-type')?.includes('application/json'))throw Object.assign(new Error('Ce serveur ne fournit pas l’API IA. Démarrez npm run dev et ouvrez http://127.0.0.1:4173. Vos réponses restent sauvegardées.'),{status:res.status||502});
      const result=await res.json();
      if(!res.ok)throw Object.assign(new Error(result.error||result.failures?.[0]?.message||unavailable),{status:res.status});
      return result;
    } finally {clearTimeout(timeout);}
  }
  try {
    if(!token){sessionPromise??=request('/api/session',{}).then(r=>token=r.token).finally(()=>sessionPromise=null);await sessionPromise;}
    return await request(path,data,token);
  } catch(error) {
    if(error.status===401&&retry){token=null;return apiRequest(path,data,false,options);}
    if(error.name==='AbortError')throw new Error('Le service IA met trop de temps à répondre. Réessayez dans un instant ; vos réponses sont sauvegardées.');
    throw new Error(error.status?error.message:'Impossible de joindre le service IA. En local, démarrez npm run dev puis ouvrez http://127.0.0.1:4173. Vos réponses restent sauvegardées.');
  }
}

export async function readTutorStream(response,onDelta){
  const reader=response.body.getReader(),decoder=new TextDecoder();let buffer='',message='',done=false;
  function consume(block){
    const data=block.split('\n').filter(line=>line.startsWith('data:')).map(line=>line.slice(5).trimStart()).join('\n');if(!data)return;
    const event=JSON.parse(data);
    if(event.type==='error')throw Object.assign(new Error(event.message||unavailable),{status:502});
    if(event.type==='delta'){message+=event.delta;onDelta(event.delta,message);}
    if(event.type==='done'){done=true;message=event.message||message;}
  }
  try{
    while(true){const chunk=await reader.read();buffer+=decoder.decode(chunk.value||new Uint8Array(),{stream:!chunk.done});buffer=buffer.replace(/\r\n/g,'\n');let index;while((index=buffer.indexOf('\n\n'))!==-1){consume(buffer.slice(0,index));buffer=buffer.slice(index+2);}if(chunk.done)break;}
    if(buffer.trim())consume(buffer);
    if(!done||!message.trim())throw Object.assign(new Error('La réponse a été interrompue. Vous pouvez relancer ce message.'),{status:502});
    return {message};
  }finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
}

export function isEvaluation(value,id) {
  return !!value&&typeof id==='string'&&value.questionId===id&&Number.isFinite(value.scoreOutOf10)&&value.scoreOutOf10>=0&&value.scoreOutOf10<=10&&Number.isInteger(value.scoreOutOf10*2)&&typeof value.appreciation==='string'&&['correctElements','missingElements','errors'].every(key=>Array.isArray(value[key])&&value[key].every(s=>typeof s==='string'))&&typeof value.improvedAnswer==='string'&&typeof value.keyTakeaway==='string'&&typeof value.needsHumanReview==='boolean';
}
export function tutorAllowed({active,technicalActive}) { return !active&&!technicalActive; }
