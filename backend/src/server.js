import http from 'node:http';
import { app } from './app.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { env } from './config/env.js';

await connectDatabase();
const server=http.createServer(app);
server.listen(env.PORT,()=>console.log(`SGSITS API listening on port ${env.PORT}`));
let shuttingDown=false;

async function shutdown(signal){
  if(shuttingDown)return;shuttingDown=true;
  console.log(`${signal} received; shutting down`);
  server.close(async()=>{await disconnectDatabase();process.exit(0)});
  setTimeout(()=>process.exit(1),10_000).unref();
}
process.on('SIGTERM',()=>shutdown('SIGTERM'));
process.on('SIGINT',()=>shutdown('SIGINT'));
process.on('unhandledRejection',(error)=>{console.error(error);shutdown('unhandledRejection')});
