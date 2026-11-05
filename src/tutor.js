import {apiRequest} from './ai.js';
import {createSpeechPlayer} from './speech.js';
import {escapeHTML as h} from './config.js';
const KEY='cap70.tutor.v1';
const preparedRole=context=>context.company==='RVA'&&(!context.examId||context.bankVersion==='rva-dg-2026-11-v1')?'DG':'PCA';
export function suggestedQuestions(context){
  if(context.questionId)return ['Explique-moi cette question simplement.',context.candidateAnswer?.trim()?'Pourquoi ma réponse est-elle insuffisante ?':'Comment structurer une bonne réponse ?','Donne-moi un exemple concret.'];
  const sector={ONATRA:'Comment prioriser les investissements de transport ?',SNCC:'Pourquoi la maintenance préventive est-elle essentielle à la SNCC ?',RVA:'Quelle différence entre sécurité et sûreté aéroportuaire ?'};
  return [preparedRole(context)==='DG'?'Comment organiser les cent premiers jours du DG RVA ?':'Quelle différence entre PCA et DG ?',sector[context.company]||sector.ONATRA,'Comment calculer une marge opérationnelle ?'];
}
export function createTutor(getContext,onWarning) {
  let open=false,busy=false,messages=[],company='ONATRA',historyCompany='ONATRA',mode='Comprendre',contextKey='',enabled=true,generation=0,draft='',error='',failedRequest=null,expanded=false,partial='';
  const root=document.createElement('div');root.className='tutor';document.body.append(root);
  const speaker=createSpeechPlayer(()=>enabled&&!getContext().examActive,()=>draw());
  const format=text=>h(text).replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>');
  function voiceButton(id,text){const state=speaker.state,active=state.id===id;return `<button class="tutor-speak text-button" data-speak="${id}" ${active&&state.status==='loading'?'disabled':''}>${active&&state.status==='loading'?'Préparation audio…':active&&state.status==='playing'?'Ⅱ Pause':active&&state.status==='paused'?'▶ Reprendre':'▷ Écouter'}</button>`;}
  function load(){try{messages=JSON.parse(localStorage.getItem(KEY+'.'+historyCompany)||'[]').filter(m=>['user','assistant'].includes(m.role)&&typeof m.content==='string').slice(-12);}catch{messages=[];}}
  function save(){try{localStorage.setItem(KEY+'.'+historyCompany,JSON.stringify(messages.slice(-12)));}catch{onWarning('Historique de discussion non sauvegardé.');}}
  function captureDraft(){const input=root.querySelector('textarea');if(input)draft=input.value;}
  function draw(){
    const previousLog=root.querySelector('.tutor-messages'),scrollTop=previousLog?.scrollTop||0;
    const follow=!previousLog||previousLog.scrollHeight-previousLog.clientHeight-scrollTop<60;
    const focused=document.activeElement?.id==='tutor-input';
    root.hidden=!enabled;
    if(!enabled){open=false;root.innerHTML='';return;}
    const suggestions=suggestedQuestions(getContext());
    root.innerHTML=`<button class="btn primary tutor-toggle" aria-expanded="${open}" aria-controls="tutor-panel">Assistant pédagogique IA</button>${open?`<section id="tutor-panel" class="panel tutor-panel ${expanded?'tutor-expanded':''}" aria-label="Assistant pédagogique IA"><header><div><strong>Assistant pédagogique IA</strong><span class="tutor-context">${company} · Préparation ${preparedRole(getContext())}${getContext().questionId?' · Question consultée':''}</span></div><button class="text-button tutor-expand" aria-label="${expanded?'Réduire':'Agrandir'} l’assistant">${expanded?'↙':'↗'}</button><button class="text-button tutor-close" aria-label="Fermer l’assistant">✕</button></header><label class="tutor-mode-label">Je veux <select class="tutor-mode">${['Comprendre','Réviser','Analyser mes erreurs'].map(m=>`<option ${mode===m?'selected':''}>${m}</option>`).join('')}</select></label><div class="tutor-messages" role="log" aria-live="polite">${messages.length?messages.map((m,i)=>`<div class="tutor-message ${m.role}"><strong>${m.role==='user'?'Vous':'Assistant'}</strong><p>${format(m.content)}</p>${m.role==='assistant'?voiceButton(String(i),m.content):''}</div>`).join(''):'<div class="tutor-welcome"><strong>Un point à éclaircir ?</strong><p>Posez votre question ou choisissez un exemple ci-dessous. Je tiens compte de l’entreprise et de la question consultée.</p></div>'}${partial?`<div class="tutor-message assistant streaming"><strong>Assistant</strong><p>${format(partial)}</p><span class="typing-cursor" aria-hidden="true"></span></div>`:''}${busy&&!partial?'<p class="tutor-loading" role="status"><span class="loading-dot"></span> Je prépare une explication…</p>':''}</div>${error?`<div class="tutor-error" role="alert"><strong>Le message n’a pas abouti</strong><p>${h(error)}</p><button class="btn outline tutor-retry" ${busy?'disabled':''}>Réessayer ce message</button></div>`:''}${speaker.state.id!==null?`<div class="tutor-audio-status" role="status"><span>${speaker.state.status==='loading'?'Préparation de la voix OpenAI…':speaker.state.status==='playing'?'Lecture en cours · voix OpenAI':'Lecture vocale'}</span><button class="text-button tutor-audio-toggle" ${speaker.state.status==='loading'?'disabled':''}>${speaker.state.status==='paused'?'Reprendre':'Pause'}</button><button class="text-button tutor-audio-stop">Arrêter</button></div>`:''}${speaker.state.error?`<p class="tutor-audio-error" role="alert">${h(speaker.state.error)}</p>`:''}<form class="tutor-form"><label class="sr-only" for="tutor-input">Votre question</label><textarea id="tutor-input" rows="2" maxlength="2000" required placeholder="Écrivez votre question…" ${busy?'disabled':''}>${h(draft)}</textarea><button class="btn primary" ${busy?'disabled':''}>${busy?'En cours…':'Envoyer'}</button></form><div class="tutor-suggestions ${messages.length?'compact-suggestions':''}"><span class="small muted">Essayez une question</span>${suggestions.map((s,i)=>`<button class="tutor-suggestion" data-suggestion="${i}" ${busy?'disabled':''}>${h(s)} <span aria-hidden="true">↗</span></button>`).join('')}</div><div class="tutor-foot"><button class="text-button tutor-clear" ${busy?'disabled':''}>Effacer la conversation</button><span class="small muted">Voix générée par IA · Historique local.</span></div></section>`:''}`;
    const log=root.querySelector('.tutor-messages');if(log)log.scrollTop=follow?log.scrollHeight:scrollTop;
    if(focused&&!busy)root.querySelector('textarea')?.focus();
  }
  async function send(content,retry=false){
    const context=getContext();if(context.examActive||busy||!enabled||!content?.trim())return;
    const key=contextKey,requestGeneration=generation,companyAtStart=company;
    if(!retry){messages.push({role:'user',content});messages=messages.slice(-11);save();}
    const request=retry&&failedRequest?failedRequest:{mode,messages:messages.map(m=>({...m,content:m.content.slice(0,2000)})),context};
    busy=true;error='';draft='';partial='';draw();
    try{
      const response=await apiRequest('/api/tutor/chat',{...request,stream:true},true,{onDelta:(_delta,text)=>{if(requestGeneration===generation&&key===contextKey){partial=text;draw();}}});
      if(company!==companyAtStart||contextKey!==key||requestGeneration!==generation)return;
      if(typeof response.message!=='string'||!response.message.trim())throw new Error('L’assistant n’a pas renvoyé de réponse. Réessayez ce message.');
      messages.push({role:'assistant',content:response.message});failedRequest=null;save();
    }catch(failure){if(requestGeneration===generation&&key===contextKey){error=failure.message;failedRequest=request;}}
    finally{busy=false;partial='';draw();}
  }
  root.addEventListener('input',e=>{if(e.target.id==='tutor-input')draft=e.target.value;});
  root.addEventListener('click',e=>{
    if(e.target.closest('.tutor-toggle')){captureDraft();open=!open;draw();if(open)root.querySelector('textarea')?.focus();}
    if(e.target.closest('.tutor-close')){captureDraft();open=false;speaker.stop();draw();}
    if(e.target.closest('.tutor-expand')){captureDraft();expanded=!expanded;draw();}
    if(e.target.closest('.tutor-audio-stop'))speaker.stop();
    if(e.target.closest('.tutor-audio-toggle'))void speaker.toggle(speaker.state.id,'');
    const voice=e.target.closest('[data-speak]');if(voice){const message=messages[Number(voice.dataset.speak)];if(message)void speaker.toggle(voice.dataset.speak,message.content);}
    if(e.target.closest('.tutor-clear')&&!busy){generation++;messages=[];draft='';error='';failedRequest=null;speaker.stop();save();draw();}
    if(e.target.closest('.tutor-retry')&&failedRequest)void send(failedRequest.messages.at(-1).content,true);
    const suggestion=e.target.closest('[data-suggestion]');if(suggestion)void send(suggestedQuestions(getContext())[Number(suggestion.dataset.suggestion)]);
  });
  root.addEventListener('change',e=>{if(e.target.matches('.tutor-mode'))mode=e.target.value;});
  root.addEventListener('submit',e=>{e.preventDefault();void send(draft.trim());});
  root.addEventListener('keydown',e=>{if(e.target.id==='tutor-input'&&e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();void send(draft.trim());}});
  load();
  return {
    update(allowed){
      captureDraft();enabled=allowed;if(!allowed&&speaker.state.id!==null)speaker.stop();const context=getContext(),key=(context.examId||context.company)+':'+(context.bankVersion||'PCA')+':'+(context.questionId||'');
      const scope=context.company==='RVA'&&preparedRole(context)==='DG'?'RVA.DG':context.company;
      if(historyCompany!==scope){company=context.company;historyCompany=scope;draft='';load();}
      if(contextKey!==key){generation++;error='';failedRequest=null;partial='';speaker.stop();}contextKey=key;draw();
    },
    ask(text){if(!enabled)return;open=true;draw();void send(text);},
    speak(text,id='correction'){if(!enabled)return;open=true;draw();void speaker.toggle(id,text);},
    open(){if(!enabled)return;captureDraft();open=true;draw();root.querySelector('textarea')?.focus();},
  };
}
