import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/index.js';

export const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;

  // 1. Check if the Authorization header is present and starts with 'Bearer '
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    const error = new Error('Authentication required. Please provide a valid Bearer token.');
    error.statusCode = 401;
    return next(error);
  }

  // 2. Extract the token value
  const token = authHeader.split(' ')[1];

  try {
    // 3. Verify the token signature and expiration
    const decoded = jwt.verify(token, JWT_SECRET);

    // 4. Attach decoded token contents (id, email, role) to req.user
    req.user = decoded;
    next();
  } catch (err) {
    const error = new Error('Authentication failed. Token is invalid or expired.');
    error.statusCode = 401;
    next(error);
  }
};

// Role-based Access Control (RBAC) middleware
export const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    // 1. Safety check to make sure 'authenticate' middleware was run first
    if (!req.user) {
      const error = new Error('Server error: Authentication context missing. requireRole must run after authenticate.');
      error.statusCode = 500;
      return next(error);
    }

    // 2. Check if the user's role is authorized for the endpoint
    if (!allowedRoles.includes(req.user.role)) {
      const error = new Error('Access denied. Insufficient permissions.');
      error.statusCode = 403; // Forbidden status code
      return next(error);
    }

    next();
  };
};

