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
const doctorUserUuid = '33333333-3333-4333-a333-333333333333';
const doctorProfileUuid = '44444444-4444-4444-a444-444444444444';

test.describe('Doctors Module Integration Tests', () => {
  let server;
  let baseUrl;
  let token;

  test.before(() => {
    server = app.listen(0);
    const { port } = server.address();
    baseUrl = `http://localhost:${port}`;

    token = jwt.sign(
      { id: patientUserUuid, role: 'patient', email: 'user@example.com' },
      JWT_SECRET
    );
  });

  test.after(() => {
    server.close();
  });

  test.afterEach(() => {
    mockResults = [];
  });

  test('GET /doctors - success fetching doctor directory listing', async () => {
    mockResults.push(
      { result: { rows: [{ count: '1' }] } }, // count doctors query
      {
        result: {
          rows: [
            {
              id: doctorProfileUuid,
              user_id: doctorUserUuid,
              first_name: 'Jane',
              last_name: 'Smith',
              specialization: 'Cardiology',
            },
          ],
        },
      } // list doctors query
    );

    const res = await fetch(`${baseUrl}/doctors?specialization=Cardiology`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const body = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.status, 'success');
    assert.strictEqual(body.results, 1);
    assert.strictEqual(body.data[0].id, doctorProfileUuid);
    assert.strictEqual(body.data[0].specialization, 'Cardiology');
  });
});
