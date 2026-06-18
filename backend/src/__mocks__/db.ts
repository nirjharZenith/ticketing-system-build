/**
 * Manual Jest mock for the database module.
 * All tests that import from '../db' or './db' get this instead.
 * Each test file can override `mockQuery` to return custom data.
 */

export const mockQuery = jest.fn();

export const query = mockQuery;

export const initializeDatabase = jest.fn().mockResolvedValue(undefined);

const pool = { query: mockQuery, end: jest.fn().mockResolvedValue(undefined) };
export default pool;
