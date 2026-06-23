import pool from '../../db/index.js';
import redis from '../../db/redis.js';

export const getHealth = async (req, res) => {
  const healthInfo = {
    status: 'UP',
    timestamp: new Date().toISOString(),
    services: {
      database: { status: 'UNKNOWN' },
      redis: { status: 'UNKNOWN' },
    },
  };

  let hasError = false;

  // 1. Check PostgreSQL Database Connection
  try {
    const startTime = Date.now();
    await pool.query('SELECT NOW()');
    healthInfo.services.database = {
      status: 'UP',
      latencyMs: Date.now() - startTime,
    };
  } catch (error) {
    hasError = true;
    healthInfo.services.database = {
      status: 'DOWN',
      error: error.message,
    };
  }

  // 2. Check Redis Cache Connection
  try {
    const startTime = Date.now();
    const pingResult = await redis.ping();
    if (pingResult === 'PONG') {
      healthInfo.services.redis = {
        status: 'UP',
        latencyMs: Date.now() - startTime,
      };
    } else {
      throw new Error(`Unexpected ping response: ${pingResult}`);
    }
  } catch (error) {
    hasError = true;
    healthInfo.services.redis = {
      status: 'DOWN',
      error: error.message,
    };
  }

  if (hasError) {
    healthInfo.status = 'DOWN';
    return res.status(503).json(healthInfo);
  }

  return res.status(200).json(healthInfo);
};
