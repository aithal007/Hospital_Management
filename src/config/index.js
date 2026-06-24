import dotenv from 'dotenv';

// Load variables from .env file
dotenv.config();

export const PORT = process.env.PORT || 5000;
export const NODE_ENV = process.env.NODE_ENV || 'development';
export const DATABASE_URL = process.env.DATABASE_URL;
export const JWT_SECRET = process.env.JWT_SECRET;
export const REDIS_URL = process.env.REDIS_URL;

export const SMTP_HOST = process.env.SMTP_HOST || 'smtp.ethereal.email';
export const SMTP_PORT = Number(process.env.SMTP_PORT) || 587;
export const SMTP_USER = process.env.SMTP_USER;
export const SMTP_PASS = process.env.SMTP_PASS;
export const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL;
export const KAFKA_BROKER = process.env.KAFKA_BROKER;
export const FRONTEND_URL = process.env.FRONTEND_URL;
