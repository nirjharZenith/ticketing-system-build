/**
 * Integration tests for POST /api/auth/register, /login, /verify
 * and GET /api/auth/me.
 *
 * The database is fully mocked via src/__mocks__/db.ts so no real
 * Postgres connection is required.
 */
import request from 'supertest';
import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { mockQuery } from '../../__mocks__/db';
import { buildTestApp } from '../helpers/testApp';
import { TEST_USER, makeToken, bearerHeader } from '../helpers/tokenFactory';

jest.mock('../../db');

const app = buildTestApp();
const SECRET = 'test-jwt-secret-for-testing-only';

beforeEach(() => jest.clearAllMocks());

// ---------------------------------------------------------------------------
// POST /api/auth/register
// ---------------------------------------------------------------------------
describe('POST /api/auth/register', () => {
  const validBody = {
    email: 'alice@example.com',
    name: 'Alice',
    password: 'StrongPass1!',
    confirmPassword: 'StrongPass1!',
  };

  it('201 – creates a user and returns id/email/name', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

    const res = await request(app).post('/api/auth/register').send(validBody);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.user.email).toBe('alice@example.com');
    expect(res.body.user).not.toHaveProperty('password');
    expect(res.body.user).not.toHaveProperty('password_hash');
  });

  it('400 – rejects missing email', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...validBody, email: '' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('400 – rejects invalid email format', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...validBody, email: 'not-an-email' });
    expect(res.status).toBe(400);
  });

  it('400 – rejects weak password (no special char)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...validBody, password: 'WeakPass1', confirmPassword: 'WeakPass1' });
    expect(res.status).toBe(400);
  });

  it('400 – rejects mismatched confirmPassword', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...validBody, confirmPassword: 'DifferentPass1!' });
    expect(res.status).toBe(400);
  });

  it('400 – rejects missing name', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...validBody, name: '' });
    expect(res.status).toBe(400);
  });

  it('409 – returns conflict when email already exists', async () => {
    const pgErr: any = new Error('unique violation');
    pgErr.code = '23505';
    mockQuery.mockRejectedValueOnce(pgErr);

    const res = await request(app).post('/api/auth/register').send(validBody);
    expect(res.status).toBe(409);
  });

  it('400 – rejects oversized JSON body', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ email: 'a@a.com', name: 'x'.repeat(1_100_000) }));
    // Express returns 413 or our error handler 400; either indicates rejection
    expect([400, 413]).toContain(res.status);
  });
});

// ---------------------------------------------------------------------------
// POST /api/auth/login
// ---------------------------------------------------------------------------
describe('POST /api/auth/login', () => {
  it('200 – returns token on valid credentials', async () => {
    const hash = await bcryptjs.hash('StrongPass1!', 1);
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: TEST_USER.id, email: TEST_USER.email, name: 'Alice', password_hash: hash }],
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: TEST_USER.email, password: 'StrongPass1!' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(typeof res.body.token).toBe('string');
    // Token must be a valid JWT
    const decoded: any = jwt.verify(res.body.token, SECRET);
    expect(decoded.email).toBe(TEST_USER.email);
  });

  it('401 – returns 401 on wrong password', async () => {
    const hash = await bcryptjs.hash('CorrectPass1!', 1);
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: TEST_USER.id, email: TEST_USER.email, name: 'Alice', password_hash: hash }],
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: TEST_USER.email, password: 'WrongPass1!' });

    expect(res.status).toBe(401);
  });

  it('401 – returns 401 on unknown email', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ghost@example.com', password: 'StrongPass1!' });

    expect(res.status).toBe(401);
  });

  it('400 – returns 400 when email is missing', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ password: 'StrongPass1!' });
    expect(res.status).toBe(400);
  });

  it('400 – returns 400 when password is missing', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: TEST_USER.email });
    expect(res.status).toBe(400);
  });

  it('normalises email to lowercase before lookup', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    await request(app)
      .post('/api/auth/login')
      .send({ email: 'ALICE@EXAMPLE.COM', password: 'any' });
    const calledWith: string = mockQuery.mock.calls[0][1][0];
    expect(calledWith).toBe('alice@example.com');
  });
});

// ---------------------------------------------------------------------------
// GET /api/auth/me
// ---------------------------------------------------------------------------
describe('GET /api/auth/me', () => {
  it('200 – returns user for a valid token', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: TEST_USER.id, email: TEST_USER.email, name: 'Alice', created_at: new Date() }],
    });
    const token = makeToken(TEST_USER);

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', bearerHeader(token));

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(TEST_USER.email);
  });

  it('401 – returns 401 with no Authorization header', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('403 – returns 403 for a malformed token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer totally.invalid.token');
    expect(res.status).toBe(403);
  });

  it('403 – returns 403 for an expired token', async () => {
    const expired = jwt.sign(TEST_USER, SECRET, { expiresIn: '0ms' });
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', bearerHeader(expired));
    expect(res.status).toBe(403);
  });
});

// ---------------------------------------------------------------------------
// POST /api/auth/verify
// ---------------------------------------------------------------------------
describe('POST /api/auth/verify', () => {
  it('200 – confirms a valid token', async () => {
    const token = makeToken(TEST_USER);
    const res = await request(app)
      .post('/api/auth/verify')
      .send({ token });
    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(true);
  });

  it('400 – returns 400 when token field is missing', async () => {
    const res = await request(app)
      .post('/api/auth/verify')
      .send({});
    expect(res.status).toBe(400);
  });

  it('401 – returns 401/400 for an expired token', async () => {
    const expired = jwt.sign(TEST_USER, SECRET, { expiresIn: '0ms' });
    const res = await request(app)
      .post('/api/auth/verify')
      .send({ token: expired });
    expect([400, 401]).toContain(res.status);
  });
});

// ---------------------------------------------------------------------------
// 404 fallthrough
// ---------------------------------------------------------------------------
describe('Non-existent endpoint', () => {
  it('404 – returns JSON 404 for unknown routes', async () => {
    const res = await request(app).get('/api/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.code).toBe('NOT_FOUND');
  });
});
