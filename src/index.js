import express from 'express';
import { PORT } from './config/index.js';
import mainRouter from './routes/index.js';
import { query } from './db/index.js';

const app = express();

// Mount the centralized router
app.use('/', mainRouter);

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



