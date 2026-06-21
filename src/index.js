import express from 'express';
import cors from 'cors';
import { PORT } from './config/index.js';
import mainRouter from './routes/index.js';
import { query } from './db/index.js';
import { requestLogger } from './middleware/logger.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

// Enable request logging
app.use(requestLogger);

// Enable CORS for frontend requests
app.use(cors({
  origin: 'http://localhost:3000',
}));

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

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});



