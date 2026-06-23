import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from './index.js';

// Resolve __dirname in ES Modules environment
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const runMigrations = async () => {
  try {
    const migrationsDir = path.join(__dirname, 'migrations');

    // Create migrations directory if it doesn't exist
    if (!fs.existsSync(migrationsDir)) {
      fs.mkdirSync(migrationsDir, { recursive: true });
    }

    // Read and sort SQL files alphabetically
    const files = fs.readdirSync(migrationsDir).sort();

    console.log('--- Starting Billing Service Database Migrations ---');

    let migrationExecuted = false;
    for (const file of files) {
      if (file.endsWith('.sql')) {
        const filePath = path.join(migrationsDir, file);
        const sql = fs.readFileSync(filePath, 'utf8');

        console.log(`Executing: ${file}...`);
        await pool.query(sql);
        console.log(`Success: ${file}`);
        migrationExecuted = true;
      }
    }

    if (!migrationExecuted) {
      console.log('No SQL migration files found in migrations directory.');
    }

    console.log('--- All Migrations Completed Successfully ---');
  } catch (error) {
    console.error('Migration execution failed:', error.message);
  } finally {
    // Terminate connection pool so command line exits cleanly
    await pool.end();
  }
};

runMigrations();
