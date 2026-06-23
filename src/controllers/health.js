import { query } from '../db/index.js';
import redis from '../db/redis.js';

export const getHealth = async (req, res) => {
  const health = {
    status: 'UP',
    timestamp: new Date().toISOString(),
    services: {},
  };

  // Check PostgreSQL
  try {
    await query('SELECT NOW()');
    health.services.postgres = { status: 'UP' };
  } catch {
    health.services.postgres = { status: 'DOWN' };
    health.status = 'DEGRADED';
  }

  // Check Redis
  try {
    const pong = await redis.ping();
    health.services.redis = { status: pong === 'PONG' ? 'UP' : 'DOWN' };
    if (pong !== 'PONG') health.status = 'DEGRADED';
  } catch {
    health.services.redis = { status: 'DOWN' };
    health.status = 'DEGRADED';
  }

  const httpStatus = health.status === 'UP' ? 200 : 503;
  res.status(httpStatus).json(health);
};
