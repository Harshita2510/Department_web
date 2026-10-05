import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { isRedisReady } from '../config/redis.js';

function dependencies(){
  return {
    database:mongoose.connection.readyState===1?'connected':'disconnected',
    rateLimitStore:env.REDIS_URL?(isRedisReady()?'connected':'disconnected'):'in-memory-development'
  };
}

export function health(_request,response){
  response.json({success:true,data:{service:'sgsits-api',...dependencies(),timestamp:new Date().toISOString()}});
}

export function live(_request,response){
  response.json({success:true,data:{service:'sgsits-api',status:'live',timestamp:new Date().toISOString()}});
}

export function ready(_request,response){
  const databaseReady=mongoose.connection.readyState===1;
  const redisReady=!env.REDIS_URL||isRedisReady();
  const ready=databaseReady&&redisReady;
  response.status(ready?200:503).json({
    success:ready,
    data:{service:'sgsits-api',status:ready?'ready':'not-ready',...dependencies(),timestamp:new Date().toISOString()}
  });
}
