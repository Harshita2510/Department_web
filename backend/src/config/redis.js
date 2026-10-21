import { createClient } from 'redis';
import { env } from './env.js';

export const redisClient=env.REDIS_URL?createClient({url:env.REDIS_URL}):null;
let connectionPromise=null;

redisClient?.on('error',(error)=>console.error('Redis client error',error));

export async function connectRedis(){
  if(!redisClient||redisClient.isOpen)return;
  // Several requests can arrive together after a free-tier datastore drops an
  // idle connection. Reuse one reconnect operation rather than asking the
  // node-redis client to open the same socket multiple times.
  if(!connectionPromise){
    connectionPromise=redisClient.connect().finally(()=>{connectionPromise=null;});
  }
  await connectionPromise;
}

export async function disconnectRedis(){
  if(redisClient?.isOpen)await redisClient.quit();
}

export function isRedisReady(){
  return Boolean(redisClient?.isReady);
}
