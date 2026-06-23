import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import prescriptionsRouter from './src/modules/prescriptions/prescriptions.routes.js';
import { errorHandler } from './src/middleware/errorHandler.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3012;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    service: 'prescription-service',
    timestamp: new Date().toISOString(),
  });
});

app.use('/prescriptions', prescriptionsRouter);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Prescription Service is running on port ${PORT}`);
});

export default app;
