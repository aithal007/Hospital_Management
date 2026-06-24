import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

export const queueConnection = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
  lazyConnect: true,
});
