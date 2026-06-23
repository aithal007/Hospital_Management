import pool from './db/index.js';
import { queueConnection } from './db/queue.js';

export const getHealth = async (req, res) => {
  const healthInfo = {
    status: 'UP',
    service: 'billing-service',
    timestamp: new Date().toISOString(),
    services: {
      database: { status: 'UNKNOWN' },
      redis: { status: 'UNKNOWN' },
    },
  };

  let hasError = false;

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

  try {
    const startTime = Date.now();
    const pingResult = await queueConnection.ping();
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
