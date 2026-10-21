import { ipKeyGenerator, rateLimit } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { env } from '../config/env.js';
import { connectRedis, redisClient } from '../config/redis.js';

function sharedStore(prefix){
  if(!redisClient)return undefined;
  return new RedisStore({
    async sendCommand(...args){
      // Render/Valkey can close an idle connection. Reconnect before handing
      // the command to the shared limiter, rather than returning a 500 for
      // every public request with ClientClosedError.
      if(!redisClient.isOpen)await connectRedis();
      return redisClient.sendCommand(args);
    },
    prefix:`sgsits:${prefix}:`
  });
}

function reject(request, response) {
  response.status(429).json({
    success:false,
    message:'Too many requests. Please wait and try again.',
    requestId:request.id
  });
}

export const apiRateLimiter = rateLimit({
  windowMs:env.API_RATE_LIMIT_WINDOW_MS,
  limit:env.API_RATE_LIMIT_MAX,
  standardHeaders:'draft-8',
  legacyHeaders:false,
  // Probes must still report dependency failure when Redis itself is down.
  skip:(request)=>request.method==='OPTIONS'||request.path.startsWith('/health'),
  store:sharedStore('api'),
  // Rate limiting must never make the public site or an authenticated account
  // action unavailable when a free Redis/Valkey instance is waking up or
  // reconnecting. The store remains in use whenever it is healthy; during a
  // transient store failure express-rate-limit allows this request through.
  passOnStoreError:true,
  handler:reject
});

export const loginRateLimiter = rateLimit({
  windowMs:env.AUTH_RATE_LIMIT_WINDOW_MS,
  limit:env.AUTH_RATE_LIMIT_MAX,
  standardHeaders:'draft-8',
  legacyHeaders:false,
  skipSuccessfulRequests:true,
  store:sharedStore('login'),
  passOnStoreError:true,
  keyGenerator(request) {
    const identity=String(request.body?.identifier||request.body?.email||'unknown')
      .trim().toLowerCase().slice(0,150);
    return `${ipKeyGenerator(request.ip)}:${identity}`;
  },
  handler:reject
});
