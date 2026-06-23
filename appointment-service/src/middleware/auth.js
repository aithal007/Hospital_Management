import jwt from 'jsonwebtoken';
import redis from '../db/redis.js';

const jwtSecret = process.env.JWT_SECRET || 'super_secret_key_123_change_this_in_production';

export const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    const error = new Error('Authentication required. Please provide a valid Bearer token.');
    error.statusCode = 401;
    return next(error);
  }

  const token = authHeader.split(' ')[1];

  try {
    const isBlacklisted = await redis.get(`blacklist:${token}`);
    if (isBlacklisted) {
      const error = new Error('Authentication failed. Token has been invalidated (logged out).');
      error.statusCode = 401;
      return next(error);
    }
  } catch (err) {
    // Suppress redis failures
  }

  try {
    const decoded = jwt.verify(token, jwtSecret);
    req.user = decoded;
    next();
  } catch (err) {
    const error = new Error('Authentication failed. Token is invalid or expired.');
    error.statusCode = 401;
    next(error);
  }
};

export const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      const error = new Error(
        'Server error: Authentication context missing. requireRole must run after authenticate.'
      );
      error.statusCode = 500;
      return next(error);
    }

    if (!allowedRoles.includes(req.user.role)) {
      const error = new Error('Access denied. Insufficient permissions.');
      error.statusCode = 403;
      return next(error);
    }

    next();
  };
};
