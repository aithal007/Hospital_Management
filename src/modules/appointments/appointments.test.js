import test from 'node:test';
import assert from 'node:assert';
import pool from '../../db/index.js';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../../config/index.js';

// Setup mock queries
let mockResults = [];
pool.query = async (text, params) => {
  const mock = mockResults.shift();
  if (!mock) return { rows: [] };
  if (mock.error) throw mock.error;
  return mock.result;
};

// Set env and import app
process.env.NODE_ENV = 'test';
const { default: app } = await import('../../index.js');

const patientUserUuid = '11111111-1111-4111-a111-111111111111';
const patientProfileUuid = '22222222-2222-4222-a222-222222222222';
const doctorProfileUuid = '44444444-4444-4444-a444-444444444444';
const appointmentUuid = '55555555-5555-4555-a555-555555555555';

test.describe('Appointments Module Integration Tests', () => {
  let server;
  let baseUrl;
  let patientToken;

  test.before(() => {
    server = app.listen(0);
    const { port } = server.address();
    baseUrl = `http://localhost:${port}`;

    patientToken = jwt.sign(
      { id: patientUserUuid, role: 'patient', email: 'pat@example.com' },
      JWT_SECRET
    );
  });

  test.after(() => {
    server.close();
  });

  test.afterEach(() => {
    mockResults = [];
  });

  test('POST /appointments - success', async () => {
    mockResults.push(
      { result: { rows: [{ id: patientProfileUuid }] } }, // findPatientProfileByUserId query
      { result: { rows: [{ id: doctorProfileUuid }] } }, // findDoctorById query
      { result: { rows: [] } }, // checkDoctorOverlap query
      { result: { rows: [] } }, // checkPatientOverlap query
      {
        result: {
          rows: [
            {
              id: appointmentUuid,
              patient_id: patientProfileUuid,
              doctor_id: doctorProfileUuid,
              appointment_date: '2026-07-01',
              start_time: '10:00:00',
              end_time: '10:30:00',
              status: 'pending',
            },
          ],
        },
      }, // createAppointment query
      {
        result: {
          rows: [
            {
              patient_email: 'pat@example.com',
              patient_first_name: 'John',
              doctor_email: 'doc@example.com',
              doctor_first_name: 'Jane',
              doctor_last_name: 'Smith',
            },
          ],
        },
      } // fetchEmailDetails query
    );

    const res = await fetch(`${baseUrl}/appointments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${patientToken}`,
      },
      body: JSON.stringify({
        doctor_id: doctorProfileUuid,
        appointment_date: '2026-07-01',
        start_time: '10:00:00',
        end_time: '10:30:00',
        reason: 'Regular Checkup',
      }),
    });

    const body = await res.json();
    assert.strictEqual(res.status, 201);
    assert.strictEqual(body.status, 'success');
    assert.strictEqual(body.data.id, appointmentUuid);
  });

  test('GET /appointments - success for patient', async () => {
    mockResults.push(
      { result: { rows: [{ id: patientProfileUuid }] } }, // findPatientProfileByUserId query
      {
        result: {
          rows: [
            {
              id: appointmentUuid,
              patient_id: patientProfileUuid,
              doctor_id: doctorProfileUuid,
              appointment_date: '2026-07-01',
              start_time: '10:00:00',
              end_time: '10:30:00',
              status: 'pending',
              patient_first_name: 'John',
              patient_last_name: 'Doe',
              doctor_first_name: 'Jane',
              doctor_last_name: 'Smith',
            },
          ],
        },
      } // findAppointmentsList query
    );

    const res = await fetch(`${baseUrl}/appointments`, {
      headers: {
        Authorization: `Bearer ${patientToken}`,
      },
    });

    const body = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.status, 'success');
    assert.strictEqual(body.data[0].id, appointmentUuid);
  });
});
