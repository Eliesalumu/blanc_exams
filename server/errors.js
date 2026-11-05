// Translate only known conditions, never return provider messages or credentials.
export function publicAiError(error){
  const type=error.constructor?.name||error.name;
  if(error.safe)return {code:error.status===429?'quota':'request',message:error.message};
  if(error.code==='insufficient_quota')return {code:'billing',message:'Le crédit ou le quota OpenAI du projet est épuisé. Vérifiez la facturation du projet OpenAI. Vos réponses restent sauvegardées.'};
  if(error.status===401||error.status===403)return {code:'credentials',message:'L’accès OpenAI du serveur est refusé. Vérifiez la clé et les autorisations du projet côté serveur. Vos réponses restent sauvegardées.'};
  if(error.status===429)return {code:'rate_limit',message:'OpenAI reçoit trop de demandes. Patientez un instant puis réessayez. Vos réponses restent sauvegardées.'};
  if(error.status===404)return {code:'model',message:'Le modèle OpenAI configuré n’est pas accessible à ce projet. Vérifiez OPENAI_MODEL côté serveur.'};
  if(type==='APIConnectionTimeoutError'||error.name==='AbortError')return {code:'timeout',message:'OpenAI met trop de temps à répondre. Vous pouvez relancer sans refaire le test.'};
  if(type==='APIConnectionError')return {code:'connection',message:'Le serveur ne parvient pas à joindre OpenAI. Vérifiez sa connexion Internet puis réessayez.'};
  return {code:'unavailable',message:'Correction IA momentanément indisponible. Vos réponses sont sauvegardées.'};
}
