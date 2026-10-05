import { isIP } from 'node:net';

export function parseTrustedProxyCidrs(value=''){
  const entries=String(value).split(',').map((entry)=>entry.trim()).filter(Boolean);
  for(const entry of entries){
    const separator=entry.lastIndexOf('/');
    const address=separator===-1?entry:entry.slice(0,separator);
    const version=isIP(address);
    if(!version)throw new Error(`Invalid trusted proxy IP or CIDR: ${entry}`);
    if(separator!==-1){
      const prefix=entry.slice(separator+1);
      const maximum=version===4?32:128;
      if(!/^\d+$/.test(prefix)||Number(prefix)>maximum)throw new Error(`Invalid trusted proxy CIDR prefix: ${entry}`);
      if(Number(prefix)===0)throw new Error(`Refusing to trust every address as a proxy: ${entry}`);
    }
  }
  return [...new Set(entries)];
}
