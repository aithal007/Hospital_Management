import express from 'express';
import cors from 'cors';
import { PORT } from './config/index.js';
import mainRouter from './routes/index.js';
import { query } from './db/index.js';
import './db/redis.js'; // Initialize Redis connection on startup
import { connectKafka } from './db/kafka.js'; // Initialize Kafka client
import './workers/appointment-reminder.worker.js'; // Start background queue worker
import './workers/prescription-reminder.worker.js'; // Start background prescription worker
import './workers/bill-generation.worker.js'; // Start background billing worker
import { requestLogger } from './middleware/logger.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

// Enable request logging
app.use(requestLogger);

// Enable CORS for frontend requests
app.use(
  cors({
    origin: 'http://localhost:3000',
  })
);

// Parse JSON request bodies
app.use(express.json());

// Mount the centralized router
app.use('/', mainRouter);

// Register the global error handler (Must be placed after routes)
app.use(errorHandler);

// Test database connection on startup
query('SELECT NOW()')
  .then((res) => {
    console.log('Successfully connected to PostgreSQL at:', res.rows[0].now);
  })
  .catch((err) => {
    console.error('Failed to connect to PostgreSQL database:', err.message);
  });

// Connect to Kafka
connectKafka();

// Start Kafka Consumers
import('./consumers/appointment-created.consumer.js').then(({ startAppointmentCreatedConsumer }) => {
  startAppointmentCreatedConsumer();
});
import('./consumers/appointment-cancelled.consumer.js').then(({ startAppointmentCancelledConsumer }) => {
  startAppointmentCancelledConsumer();
});




if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

export default app;
