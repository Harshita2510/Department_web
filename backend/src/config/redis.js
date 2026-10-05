import { createClient } from 'redis';
import { env } from './env.js';

export const redisClient=env.REDIS_URL?createClient({url:env.REDIS_URL}):null;

redisClient?.on('error',(error)=>console.error('Redis client error',error));

export async function connectRedis(){
  if(redisClient&&!redisClient.isOpen)await redisClient.connect();
}

export async function disconnectRedis(){
  if(redisClient?.isOpen)await redisClient.quit();
}

export function isRedisReady(){
  return Boolean(redisClient?.isReady);
}
