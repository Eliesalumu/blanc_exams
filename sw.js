const CACHE = 'cap70-2026-10-31-v2';
const FILES = [
  './', './index.html', './assets/favicon.svg', './src/app.js', './src/config.js',
  './src/timer.js', './src/scoring.js', './src/exam.js', './src/storage.js',
  './src/analytics.js', './src/questionLoader.js', './src/styles/main.css',
  './data/questions.json', './data/exam-plan.json',
  ...Array.from({length:60},(_,i)=>`./assets/psychotechnique/LO-VIS-${String(i+1).padStart(3,'0')}.svg`),
];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('cap70-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;
  event.respondWith(fetch(event.request).then(response=>{
    if(response.ok&&FILES.some(f=>new URL(f,self.registration.scope).pathname===new URL(event.request.url).pathname)){
      const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(event.request,copy)));
    }
    return response;
  }).catch(async()=>await caches.match(event.request)||(event.request.mode==='navigate'?await caches.match(new URL('./index.html',self.registration.scope)):Response.error())));
});
