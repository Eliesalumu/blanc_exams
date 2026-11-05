import { createApi } from './app.js';
createApi().listen(Number(process.env.PORT||3001),'0.0.0.0',()=>console.log('API pédagogique démarrée.'));
