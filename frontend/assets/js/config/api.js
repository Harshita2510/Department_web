const metaUrl=document.querySelector('meta[name="sgsits-api-url"]')?.content;
const sameOriginUrl=new URL('/api',window.location.origin);
// Frontend dev servers may choose different ports (for example 4173, 54239
// or a port selected by a local static-server command).  All local frontend
// hosts use the Node API on 5000 unless an explicit deployment URL is given.
if(['localhost','127.0.0.1','0.0.0.0','[::1]'].includes(window.location.hostname)&&window.location.port!=='5000')sameOriginUrl.port='5000';
export const API_BASE_URL=(window.SGSITS_API_URL||metaUrl||sameOriginUrl.href).replace(/\/$/,'');
