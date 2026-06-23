import test from 'node:test';
import assert from 'node:assert';
import pool from '../../db/index.js';
import bcrypt from 'bcryptjs';

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

const userUuid = '11111111-1111-4111-a111-111111111111';

test.describe('Auth Module Integration Tests', () => {
  let server;
  let baseUrl;

  test.before(() => {
    server = app.listen(0);
    const { port } = server.address();
    baseUrl = `http://localhost:${port}`;
  });

  test.after(() => {
    server.close();
  });

  test.afterEach(() => {
    mockResults = [];
  });

  test('POST /auth/register - success', async () => {
    mockResults.push(
      { result: { rows: [] } }, // check email uniqueness query
      {
        result: {
          rows: [
            {
              id: userUuid,
              email: 'test@example.com',
              role: 'patient',
              first_name: 'John',
              last_name: 'Doe',
            },
          ],
        },
      } // create user insert query
    );

    const res = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'password123',
        role: 'patient',
        first_name: 'John',
        last_name: 'Doe',
      }),
    });

    const body = await res.json();
    assert.strictEqual(res.status, 201);
    assert.strictEqual(body.status, 'success');
    assert.strictEqual(body.data.email, 'test@example.com');
  });

  test('POST /auth/login - success', async () => {
    const hash = bcrypt.hashSync('password123', 10);

    mockResults.push({
      result: {
        rows: [
          {
            id: userUuid,
            email: 'test@example.com',
            password_hash: hash,
            role: 'patient',
            first_name: 'John',
            last_name: 'Doe',
          },
        ],
      },
    });

    const res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'password123',
      }),
    });

    const body = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.status, 'success');
    assert.ok(body.token);
  });

  test('GET /auth/me - unauthorized without token', async () => {
    const res = await fetch(`${baseUrl}/auth/me`);
    assert.strictEqual(res.status, 401);
  });
});
