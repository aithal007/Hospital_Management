import pg from 'pg';
import { DATABASE_URL } from '../config/index.js';

const { Pool } = pg;

// Create connection pool
const pool = new Pool({
  connectionString: DATABASE_URL,
});

// Export helper query function
export const query = (text, params) => pool.query(text, params);

export default pool;
