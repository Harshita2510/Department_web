import { env } from '../config/env.js';

export function setPublicCache(response) {
  response.set('Cache-Control',[
    'public',
    `max-age=${env.PUBLIC_CACHE_MAX_AGE_SECONDS}`,
    `s-maxage=${env.PUBLIC_CACHE_SHARED_MAX_AGE_SECONDS}`,
    `stale-while-revalidate=${env.PUBLIC_CACHE_STALE_SECONDS}`
  ].join(', '));
}
