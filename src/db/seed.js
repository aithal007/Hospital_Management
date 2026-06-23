import pool from './index.js';
import bcrypt from 'bcryptjs';

const seed = async () => {
  try {
    console.log('--- Starting Database Seeding ---');

    // 1. Truncate tables with CASCADE to wipe old data clean
    console.log('Clearing old data...');
    await pool.query('TRUNCATE TABLE users, patients, doctors, appointments CASCADE;');

    // Hash the password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash('Password123', saltRounds);

    // 2. Seed Doctor 1 (Alice Smith)
    console.log('Seeding Doctor 1 (Dr. Alice Smith)...');
    const doc1UserResult = await pool.query(
      `INSERT INTO users (email, password_hash, role, first_name, last_name, phone)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id;`,
      ['alice.smith@hospital.com', hashedPassword, 'doctor', 'Alice', 'Smith', '123-456-7890']
    );
    const doc1UserId = doc1UserResult.rows[0].id;

    await pool.query(
      `INSERT INTO doctors (user_id, specialization, license_number, consultation_fee, bio)
       VALUES ($1, $2, $3, $4, $5);`,
      [
        doc1UserId,
        'Cardiology',
        'LIC12345',
        150.0,
        'Dr. Smith has over 10 years of experience in cardiology.',
      ]
    );

    // 3. Seed Doctor 2 (Bob Jones)
    console.log('Seeding Doctor 2 (Dr. Bob Jones)...');
    const doc2UserResult = await pool.query(
      `INSERT INTO users (email, password_hash, role, first_name, last_name, phone)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id;`,
      ['bob.jones@hospital.com', hashedPassword, 'doctor', 'Bob', 'Jones', '987-654-3210']
    );
    const doc2UserId = doc2UserResult.rows[0].id;

    await pool.query(
      `INSERT INTO doctors (user_id, specialization, license_number, consultation_fee, bio)
       VALUES ($1, $2, $3, $4, $5);`,
      [
        doc2UserId,
        'Pediatrics',
        'LIC67890',
        100.0,
        'Dr. Jones loves working with children and pediatric care.',
      ]
    );

    // 4. Seed Patient 1 (John Doe)
    console.log('Seeding Patient 1 (John Doe)...');
    const patientUserResult = await pool.query(
      `INSERT INTO users (email, password_hash, role, first_name, last_name, phone)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id;`,
      ['john.doe@gmail.com', hashedPassword, 'patient', 'John', 'Doe', '555-555-5555']
    );
    const patientUserId = patientUserResult.rows[0].id;

    await pool.query(
      `INSERT INTO patients (user_id, date_of_birth, gender, address, insurance_provider, insurance_policy_number)
       VALUES ($1, $2, $3, $4, $5, $6);`,
      [patientUserId, '1990-05-15', 'Male', '123 Elm St, Springfield', 'BlueCross', 'POL99999']
    );

    console.log('--- Database Seeding Completed Successfully ---');
  } catch (error) {
    console.error('Seeding failed:', error.message);
  } finally {
    await pool.end();
  }
};

seed();
