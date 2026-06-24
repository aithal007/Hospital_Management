import IORedis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

// BullMQ requires maxRetriesPerRequest: null for queue connections
export const queueConnection = new IORedis({
  host: new URL(process.env.REDIS_URL || 'redis://localhost:6379').hostname,
  port: parseInt(new URL(process.env.REDIS_URL || 'redis://localhost:6379').port || '6379'),
  maxRetriesPerRequest: null,
});
