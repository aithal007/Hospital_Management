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

test.describe('Patients Module Integration Tests', () => {
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

  test('POST /patients - success when creating own profile', async () => {
    mockResults.push(
      { result: { rows: [] } }, // check if patient profile already exists
      {
        result: {
          rows: [
            {
              id: patientProfileUuid,
              user_id: patientUserUuid,
              date_of_birth: '1995-05-15',
              gender: 'Male',
            },
          ],
        },
      } // insert patient profile query
    );

    const res = await fetch(`${baseUrl}/patients`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${patientToken}`,
      },
      body: JSON.stringify({
        date_of_birth: '1995-05-15',
        gender: 'Male',
      }),
    });

    const body = await res.json();
    assert.strictEqual(res.status, 201);
    assert.strictEqual(body.status, 'success');
    assert.strictEqual(body.data.id, patientProfileUuid);
  });

  test('GET /patients/:id - success when patient views own profile', async () => {
    mockResults.push({
      result: {
        rows: [
          {
            id: patientProfileUuid,
            user_id: patientUserUuid,
            first_name: 'John',
            last_name: 'Doe',
            email: 'pat@example.com',
            date_of_birth: '1995-05-15',
            gender: 'Male',
          },
        ],
      },
    });

    const res = await fetch(`${baseUrl}/patients/${patientProfileUuid}`, {
      headers: {
        Authorization: `Bearer ${patientToken}`,
      },
    });

    const body = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.status, 'success');
    assert.strictEqual(body.data.email, 'pat@example.com');
  });
});
