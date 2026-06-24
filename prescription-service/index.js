import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import prescriptionsRouter from './src/modules/prescriptions/prescriptions.routes.js';
import { errorHandler } from './src/middleware/errorHandler.js';
import { connectKafka } from './src/db/kafka.js';

import pool from './src/db/index.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3012;

app.use(cors());
app.use(express.json());

app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT NOW()');
    res.status(200).json({
      status: 'UP',
      service: 'prescription-service',
      database: 'UP',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: 'DOWN',
      service: 'prescription-service',
      database: 'DOWN',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

app.use('/prescriptions', prescriptionsRouter);

app.use(errorHandler);

connectKafka();

app.listen(PORT, () => {
  console.log(`Prescription Service is running on port ${PORT}`);
});

export default app;
