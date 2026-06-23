import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import invoicesRouter from './src/modules/invoices/invoices.routes.js';
import { errorHandler } from './src/middleware/errorHandler.js';
import { startBillingConsumer } from './src/db/kafka.js';
import './src/workers/bill-generation.worker.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3011;

app.use(cors());
app.use(express.json());

// Basic health check route
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    service: 'billing-service',
    timestamp: new Date().toISOString(),
  });
});

// Mount invoices router
app.use('/invoices', invoicesRouter);

// Register the global error handler middleware
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Billing Service is running on port ${PORT}`);
  // Start the Kafka consumer to auto-generate invoices
  startBillingConsumer();
  console.log('[BillWorker] Bill generation PDF worker is running.');
});

export default app;

