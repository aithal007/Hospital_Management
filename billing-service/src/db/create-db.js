import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;

const createDatabase = async () => {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL is not defined in env variables.');
    process.exit(1);
  }

  // Parse target DB name and construct a connection string to the default 'postgres' DB
  const urlObj = new URL(connectionString);
  const targetDbName = urlObj.pathname.substring(1); // Remove the leading '/'
  urlObj.pathname = '/postgres'; // Connect to postgres administrative DB
  const defaultConnectionString = urlObj.toString();

  console.log(`Checking if database "${targetDbName}" exists on ${urlObj.host}...`);

  const client = new Client({
    connectionString: defaultConnectionString,
  });

  try {
    await client.connect();

    // Query pg_database catalog to check if target DB exists
    const checkQuery = `SELECT 1 FROM pg_database WHERE datname = $1`;
    const res = await client.query(checkQuery, [targetDbName]);

    if (res.rowCount === 0) {
      console.log(`Database "${targetDbName}" does not exist. Creating it now...`);
      // CREATE DATABASE cannot be executed inside a transaction block or query with parameters
      await client.query(`CREATE DATABASE "${targetDbName}"`);
      console.log(`Database "${targetDbName}" created successfully!`);
    } else {
      console.log(`Database "${targetDbName}" already exists.`);
    }
  } catch (error) {
    console.error('Error during database creation:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
};

createDatabase();
