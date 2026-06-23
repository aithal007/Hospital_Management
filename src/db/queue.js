import { REDIS_URL } from '../config/index.js';
import Redis from 'ioredis';

// BullMQ requires maxRetriesPerRequest to be set to null for workers.
// We reuse a shared Redis instance with lazyConnect: true to avoid eager test-hangs.
export const queueConnection = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null,
  lazyConnect: true,
});
