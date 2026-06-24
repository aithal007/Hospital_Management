import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { errorHandler } from './src/middleware/errorHandler.js';
import pool from './src/db/index.js';
import claimsRouter from './src/modules/claims/claims.routes.js';
import { connectKafka } from './src/db/kafka.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3013;

app.use(cors());
app.use(express.json());

app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT NOW()');
    res.status(200).json({
      status: 'UP',
      service: 'insurance-service',
      database: 'UP',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: 'DOWN',
      service: 'insurance-service',
      database: 'DOWN',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

app.use('/claims', claimsRouter);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Insurance Service is running on port ${PORT}`);
});

connectKafka();

export default app;
