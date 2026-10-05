const metaUrl=document.querySelector('meta[name="sgsits-api-url"]')?.content;
const sameOriginUrl=new URL('/api',window.location.origin);
if(['4173','54239'].includes(window.location.port))sameOriginUrl.port='5000';
export const API_BASE_URL=(window.SGSITS_API_URL||metaUrl||sameOriginUrl.href).replace(/\/$/,'');
