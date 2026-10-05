import http from 'node:http';
import { app } from './app.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { connectRedis, disconnectRedis } from './config/redis.js';
import { env } from './config/env.js';

await Promise.all([connectDatabase(),connectRedis()]);
const server=http.createServer(app);
server.keepAliveTimeout=env.HTTP_KEEP_ALIVE_TIMEOUT_MS;
server.headersTimeout=env.HTTP_HEADERS_TIMEOUT_MS;
server.requestTimeout=env.HTTP_REQUEST_TIMEOUT_MS;
server.listen(env.PORT,()=>console.log(`SGSITS API listening on port ${env.PORT}`));
let shuttingDown=false;

async function shutdown(signal,exitCode=0){
  if(shuttingDown)return;shuttingDown=true;
  console.log(`${signal} received; shutting down`);
  server.close(async()=>{
    const results=await Promise.allSettled([disconnectDatabase(),disconnectRedis()]);
    if(results.some((result)=>result.status==='rejected')){
      console.error('Service disconnect failed',results.filter((result)=>result.status==='rejected').map((result)=>result.reason));
      exitCode=1;
    }
    process.exit(exitCode);
  });
  setTimeout(()=>process.exit(1),env.SHUTDOWN_TIMEOUT_MS).unref();
}
process.on('SIGTERM',()=>shutdown('SIGTERM'));
process.on('SIGINT',()=>shutdown('SIGINT'));
process.on('unhandledRejection',(error)=>{console.error(error);shutdown('unhandledRejection',1)});
process.on('uncaughtException',(error)=>{console.error(error);shutdown('uncaughtException',1)});
