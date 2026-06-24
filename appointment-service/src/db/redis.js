import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const nodeEnv = process.env.NODE_ENV || 'development';

const redis = new Redis(redisUrl, {
  lazyConnect: true,
  tls: redisUrl?.startsWith('rediss://') ? {} : undefined,
  maxRetriesPerRequest: 0,
  enableOfflineQueue: false,
});

redis.on('connect', () => {
  console.log('Successfully connected to Redis at:', redisUrl);
});

redis.on('error', () => {
  // Suppress connection error spam; errors are handled per-call
});

if (nodeEnv !== 'test') {
  redis.connect().catch(() => {});
}

export default redis;
