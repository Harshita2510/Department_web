import { User } from '../models/user.model.js';
import { AppError } from '../utils/app-error.js';
import { asyncHandler } from '../utils/async-handler.js';
import { verifyAccessToken } from '../utils/token.js';

export const authenticate = asyncHandler(async (request, _response, next) => {
  const token = request.cookies.accessToken || request.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) throw new AppError(401, 'Authentication required');
  let payload;
  try { payload = verifyAccessToken(token); } catch { throw new AppError(401, 'Invalid or expired session'); }
  const user = await User.findById(payload.sub);
  if (!user || user.status !== 'active' || user.tokenVersion !== payload.tokenVersion) throw new AppError(401, 'Session is no longer valid');
  request.user = user;
  next();
});

export const authorize = (...roles) => (request, _response, next) => {
  if (!roles.includes(request.user.role)) return next(new AppError(403, 'You do not have permission for this action'));
  next();
};
