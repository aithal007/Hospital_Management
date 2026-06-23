import test from 'node:test';
import assert from 'node:assert';
import pool from '../src/db/index.js';
import { createPatientProfile } from '../src/modules/patients/patients.controller.js';
import { getDoctorById } from '../src/modules/doctors/doctors.controller.js';

// Save the original pool query function to restore after mock tests
const originalQuery = pool.query;

test.describe('Patient Controller Tests', () => {
  test.afterEach(() => {
    // Restore original DB query method
    pool.query = originalQuery;
  });

  test('createPatientProfile - successful patient profile creation', async () => {
    const mockUser = { id: 'patient-user-uuid', role: 'patient' };
    const mockBody = {
      date_of_birth: '1995-05-15',
      gender: 'Female',
      address: '123 Main St',
    };

    const req = {
      user: mockUser,
      body: mockBody,
    };

    const res = {
      statusCode: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        this.body = data;
        return this;
      },
    };

    const next = () => {};

    // Mock DB queries inside controller:
    // Query 1: checks existing profile -> returns empty rows
    // Query 2: inserts profile -> returns created profile
    let queryCallCount = 0;
    pool.query = async (text, params) => {
      queryCallCount++;
      if (queryCallCount === 1) {
        return { rows: [] };
      }
      if (queryCallCount === 2) {
        return {
          rows: [
            {
              id: 'new-profile-uuid',
              user_id: 'patient-user-uuid',
              date_of_birth: '1995-05-15',
              gender: 'Female',
              address: '123 Main St',
            },
          ],
        };
      }
    };

    await createPatientProfile(req, res, next);

    assert.strictEqual(res.statusCode, 201);
    assert.strictEqual(res.body.status, 'success');
    assert.strictEqual(res.body.data.id, 'new-profile-uuid');
    assert.strictEqual(res.body.data.user_id, 'patient-user-uuid');
  });

  test('createPatientProfile - deny if patient tries to create profile for someone else', async () => {
    const mockUser = { id: 'patient-user-uuid', role: 'patient' };
    const mockBody = {
      user_id: 'someone-else-uuid',
      date_of_birth: '1995-05-15',
      gender: 'Female',
    };

    const req = {
      user: mockUser,
      body: mockBody,
    };

    const res = {};
    let errorPassed = null;
    const next = (err) => {
      errorPassed = err;
    };

    await createPatientProfile(req, res, next);

    assert.ok(errorPassed instanceof Error);
    assert.strictEqual(errorPassed.statusCode, 403);
    assert.match(errorPassed.message, /Access denied/);
  });
});

test.describe('Doctor Controller Tests', () => {
  test.afterEach(() => {
    // Restore original DB query method
    pool.query = originalQuery;
  });

  test('getDoctorById - returns doctor profile details if it exists', async () => {
    const req = {
      params: { id: 'doctor-profile-uuid' },
      user: { id: 'patient-uuid', role: 'patient' },
    };

    const res = {
      statusCode: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        this.body = data;
        return this;
      },
    };

    const next = () => {};

    pool.query = async (text, params) => {
      return {
        rows: [
          {
            id: 'doctor-profile-uuid',
            user_id: 'doctor-user-uuid',
            first_name: 'John',
            last_name: 'Smith',
            specialization: 'Cardiology',
            consultation_fee: '150.00',
          },
        ],
      };
    };

    await getDoctorById(req, res, next);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.status, 'success');
    assert.strictEqual(res.body.data.specialization, 'Cardiology');
  });

  test('getDoctorById - returns 404 error if doctor profile does not exist', async () => {
    const req = {
      params: { id: 'non-existent-uuid' },
      user: { id: 'patient-uuid', role: 'patient' },
    };

    const res = {};
    let errorPassed = null;
    const next = (err) => {
      errorPassed = err;
    };

    pool.query = async (text, params) => {
      return { rows: [] };
    };

    await getDoctorById(req, res, next);

    assert.ok(errorPassed instanceof Error);
    assert.strictEqual(errorPassed.statusCode, 404);
    assert.match(errorPassed.message, /Doctor profile not found/);
  });
});
