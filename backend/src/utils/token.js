import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export const signAccessToken = (user) => jwt.sign(
  { sub: user.id, role: user.role, tokenVersion: user.tokenVersion },
  env.JWT_SECRET,
  { expiresIn: env.JWT_EXPIRES_IN, issuer: 'sgsits-api', audience: 'sgsits-web' }
);

export const verifyAccessToken = (token) => jwt.verify(token, env.JWT_SECRET, {
  issuer: 'sgsits-api', audience: 'sgsits-web'
});
