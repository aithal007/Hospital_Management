import dotenv from 'dotenv';
dotenv.config();

import { performance } from 'perf_hooks';
import doctorsRepository from './doctors.repository.js';
import redis from '../../db/redis.js';
import pool from '../../db/index.js';

async function run() {
  // Ensure Redis is connected
  if (redis.status === 'wait') {
    try {
      await redis.connect();
    } catch (err) {
      console.error('Failed to connect to Redis:', err.message);
      process.exit(1);
    }
  }

  // Retrieve a doctor ID from the database
  const doctorRes = await pool.query('SELECT id FROM doctors LIMIT 1;');
  if (doctorRes.rows.length === 0) {
    console.warn('No doctors found in the database. Seeding a temporary one for benchmarking...');
    // Try to find a user to link
    const userRes = await pool.query("SELECT id FROM users WHERE role = 'doctor' LIMIT 1;");
    if (userRes.rows.length === 0) {
      console.error('Please seed the database before running the benchmark.');
      await redis.quit();
      await pool.end();
      process.exit(1);
    }
    const userId = userRes.rows[0].id;
    await pool.query(
      `INSERT INTO doctors (id, user_id, specialization, license_number, consultation_fee, bio)
       VALUES (gen_random_uuid(), $1, 'General Medicine', 'LIC-BENCH-999', 150.00, 'Benchmarking profile')
       ON CONFLICT DO NOTHING;`,
      [userId]
    );
  }

  const doctorIdRes = await pool.query('SELECT id FROM doctors LIMIT 1;');
  const doctorId = doctorIdRes.rows[0].id;
  const cacheKey = `doctor:details:${doctorId}`;

  console.log(`Benchmarking doctor details lookup for Doctor ID: ${doctorId}\n`);

  const iterations = 100;
  let totalUncachedTime = 0;
  let totalCachedTime = 0;

  for (let i = 0; i < iterations; i++) {
    // 1. Uncached lookup (Force cache miss by deleting key)
    await redis.del(cacheKey);
    const t0 = performance.now();
    await doctorsRepository.findDoctorProfileWithUserDetails(doctorId);
    const t1 = performance.now();
    totalUncachedTime += t1 - t0;

    // 2. Cached lookup (Cache hit)
    const t2 = performance.now();
    await doctorsRepository.findDoctorProfileWithUserDetails(doctorId);
    const t3 = performance.now();
    totalCachedTime += t3 - t2;
  }

  const avgUncached = totalUncachedTime / iterations;
  const avgCached = totalCachedTime / iterations;
  const speedup = (avgUncached / avgCached).toFixed(1);

  console.log(`Results over ${iterations} iterations:`);
  console.log(`- Average Uncached (PostgreSQL Query): ${avgUncached.toFixed(4)} ms`);
  console.log(`- Average Cached (Redis Lookup):      ${avgCached.toFixed(4)} ms`);
  console.log(`\nRedis caching is ~${speedup}x faster than PostgreSQL queries.`);

  // Cleanup connections
  await redis.quit();
  await pool.end();
}

run().catch(async (err) => {
  console.error(err);
  await redis.quit();
  await pool.end();
});
