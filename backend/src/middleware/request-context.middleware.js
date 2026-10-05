import { randomUUID } from 'node:crypto';

const validRequestId=/^[a-zA-Z0-9._-]{1,100}$/;

export function requestContext(request,response,next){
  const supplied=request.get('x-request-id');
  request.id=validRequestId.test(supplied||'')?supplied:randomUUID();
  response.set('X-Request-Id',request.id);
  next();
}
