// Local app and API share one server with npm run dev. Support VS Code Live Server too.
// Production builds replace this module with the configured public URL.
const liveServer=typeof location!=='undefined'&&['localhost','127.0.0.1'].includes(location.hostname)&&['5500','5501'].includes(location.port);
export const API_URL = liveServer?'http://127.0.0.1:4173':'';
