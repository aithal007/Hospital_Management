import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectKafka } from './src/db/kafka.js';
import appointmentsRouter from './src/modules/appointments/appointments.routes.js';
import { getHealth } from './src/modules/appointments/health.controller.js';
import { errorHandler } from './src/middleware/errorHandler.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3020;

app.use(cors());
app.use(express.json());

// Mount the health endpoint
app.get('/health', getHealth);

// Mount the appointments router
app.use('/appointments', appointmentsRouter);

// Register the global error handler middleware
app.use(errorHandler);

// Establish connection to Kafka broker on boot
connectKafka();

app.listen(PORT, () => {
  console.log(`Appointment Service is running on port ${PORT}`);
});

export default app;
