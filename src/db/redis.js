import Redis from 'ioredis';
import { REDIS_URL, NODE_ENV } from '../config/index.js';

const redis = new Redis(REDIS_URL, {
  lazyConnect: true,
  // Suppress ioredis retry errors in test/offline scenarios
  maxRetriesPerRequest: 0,
  enableOfflineQueue: false,
});

redis.on('connect', () => {
  console.log('Successfully connected to Redis at:', REDIS_URL);
});

redis.on('error', () => {
  // Suppress connection error spam; errors are handled per-call
});

// Only connect eagerly outside of test environment
if (NODE_ENV !== 'test') {
  redis.connect().catch(() => {});
}

export default redis;
