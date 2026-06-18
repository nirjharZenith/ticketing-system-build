import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { mockQuery } from '../../__mocks__/db';

// Hoist mock before imports that use the db module
jest.mock('../../db');

import { createUser, authenticateUser, getUserById, verifyToken } from '../../services/authService';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const HASHED = '$2a$10$examplehashedpasswordfortesting123';
const SECRET = 'test-jwt-secret-for-testing-only';

beforeAll(() => {
  process.env.JWT_SECRET = SECRET;
});

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// createUser
// ---------------------------------------------------------------------------
describe('createUser', () => {
  it('inserts a user and returns id/email/name', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

    const user = await createUser('alice@example.com', 'Alice', 'StrongPass1!');

    expect(mockQuery).toHaveBeenCalledTimes(1);
    const [sql, params] = mockQuery.mock.calls[0];
    expect(sql).toMatch(/INSERT INTO users/i);
    expect(params[1]).toBe('alice@example.com');
    expect(params[2]).toBe('Alice');
    // Password must be hashed – not stored as plain text
    expect(params[3]).not.toBe('StrongPass1!');
    expect(user.email).toBe('alice@example.com');
    expect(user.name).toBe('Alice');
    expect(typeof user.id).toBe('string');
  });

  it('throws a readable error on duplicate email (pg code 23505)', async () => {
    const pgErr: any = new Error('unique violation');
    pgErr.code = '23505';
    mockQuery.mockRejectedValueOnce(pgErr);

    await expect(createUser('dup@example.com', 'Dup', 'StrongPass1!')).rejects.toThrow('Email already exists');
  });

  it('re-throws unknown database errors', async () => {
    mockQuery.mockRejectedValueOnce(new Error('connection lost'));
    await expect(createUser('x@x.com', 'X', 'StrongPass1!')).rejects.toThrow('connection lost');
  });
});

// ---------------------------------------------------------------------------
// authenticateUser
// ---------------------------------------------------------------------------
describe('authenticateUser', () => {
  it('returns user and JWT token on valid credentials', async () => {
    const hash = await bcryptjs.hash('StrongPass1!', 1);
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 'user-1', email: 'alice@example.com', name: 'Alice', password_hash: hash }],
    });

    const { user, token } = await authenticateUser('alice@example.com', 'StrongPass1!');

    expect(user.email).toBe('alice@example.com');
    expect(typeof token).toBe('string');

    const decoded: any = jwt.verify(token, SECRET);
    expect(decoded.id).toBe('user-1');
    expect(decoded.email).toBe('alice@example.com');
  });

  it('throws on unknown email', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    await expect(authenticateUser('ghost@example.com', 'any')).rejects.toThrow('Invalid email or password');
  });

  it('throws on wrong password', async () => {
    const hash = await bcryptjs.hash('CorrectPass1!', 1);
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 'user-1', email: 'alice@example.com', name: 'Alice', password_hash: hash }],
    });
    await expect(authenticateUser('alice@example.com', 'WrongPass1!')).rejects.toThrow('Invalid email or password');
  });

  it('does not leak whether the email or password was wrong (same error message)', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    let err1: Error | undefined;
    try { await authenticateUser('ghost@example.com', 'any'); } catch (e: any) { err1 = e; }

    const hash = await bcryptjs.hash('CorrectPass1!', 1);
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 'u', email: 'a@a.com', name: 'A', password_hash: hash }],
    });
    let err2: Error | undefined;
    try { await authenticateUser('a@a.com', 'WrongPass1!'); } catch (e: any) { err2 = e; }

    expect(err1?.message).toBe(err2?.message);
  });
});

// ---------------------------------------------------------------------------
// getUserById
// ---------------------------------------------------------------------------
describe('getUserById', () => {
  it('returns user data for a valid id', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 'user-1', email: 'alice@example.com', name: 'Alice', created_at: new Date() }],
    });
    const user = await getUserById('user-1');
    expect(user.email).toBe('alice@example.com');
  });

  it('throws when user is not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    await expect(getUserById('nonexistent-id')).rejects.toThrow('User not found');
  });
});

// ---------------------------------------------------------------------------
// verifyToken
// ---------------------------------------------------------------------------
describe('verifyToken', () => {
  it('returns decoded payload for a valid token', () => {
    const token = jwt.sign({ id: 'u1', email: 'a@a.com' }, SECRET, { expiresIn: '1h' });
    const decoded: any = verifyToken(token);
    expect(decoded.id).toBe('u1');
  });

  it('throws on an invalid / tampered token', () => {
    expect(() => verifyToken('completely.invalid.token')).toThrow('Invalid token');
  });

  it('throws on an expired token', () => {
    const expired = jwt.sign({ id: 'u1' }, SECRET, { expiresIn: '0ms' });
    expect(() => verifyToken(expired)).toThrow('Invalid token');
  });
});
