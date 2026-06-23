import IORedis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

// BullMQ requires maxRetriesPerRequest: null for queue connections
export const queueConnection = new IORedis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: null,
});
