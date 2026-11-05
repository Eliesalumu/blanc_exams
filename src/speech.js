import {apiRequest} from './ai.js';
export function splitSpeechText(text){
  const chunks=[];let rest=text.trim();
  while(rest.length>2800){let cut=rest.lastIndexOf('. ',2800);if(cut<1200)cut=rest.lastIndexOf(' ',2800);if(cut<1)cut=2800;else cut++;chunks.push(rest.slice(0,cut).trim());rest=rest.slice(cut).trim();}
  if(rest)chunks.push(rest);return chunks;
}
export function createSpeechPlayer(isAllowed,onChange){
  let audio=null,serial=0,state={id:null,status:'idle',error:''},parts=[],index=0;
  const cache=new Map();
  const update=values=>{state={...state,...values};onChange(state);};
  function stop(){serial++;audio?.pause();audio=null;parts=[];update({id:null,status:'idle',error:''});}
  async function load(current){
    if(!isAllowed()||current!==serial)return;
    const text=parts[index];update({status:'loading',error:''});
    try{
      let url=cache.get(text);
      if(!url){const blob=await apiRequest('/api/tutor/speech',{text,examActive:false},true,{audio:true});if(current!==serial||!isAllowed())return;url=URL.createObjectURL(blob);if(cache.size>=8){const first=cache.keys().next().value;URL.revokeObjectURL(cache.get(first));cache.delete(first);}cache.set(text,url);}
      if(current!==serial||!isAllowed())return;
      audio=new Audio(url);
      audio.onended=()=>{if(current!==serial)return;if(++index<parts.length)void load(current);else stop();};
      audio.onerror=()=>{if(current===serial)update({status:'error',error:'Impossible de lire cet audio. Réessayez la lecture.'});};
      try{await audio.play();if(current===serial)update({status:'playing'});}catch{if(current===serial)update({status:'paused',error:'Cliquez sur Reprendre pour autoriser la lecture audio.'});}
    }catch(error){if(current===serial)update({status:'error',error:error.message});}
  }
  return {
    get state(){return state;},stop,
    async toggle(id,text){
      if(!isAllowed())return;
      if(state.id===id&&state.status==='loading')return;
      if(state.id===id&&state.status==='playing'){audio.pause();update({status:'paused'});return;}
      if(state.id===id&&state.status==='paused'&&audio){try{await audio.play();update({status:'playing',error:''});}catch{update({error:'Le navigateur refuse encore la lecture. Réessayez.'});}return;}
      stop();parts=splitSpeechText(text);if(!parts.length)return;index=0;const current=serial;update({id,status:'loading'});await load(current);
    },
  };
}
