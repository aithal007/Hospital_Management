import dotenv from 'dotenv';

// Load variables from .env file
dotenv.config();

export const PORT = process.env.PORT || 5000;
export const NODE_ENV = process.env.NODE_ENV || 'development';
export const DATABASE_URL = process.env.DATABASE_URL;
export const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key';
export const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
