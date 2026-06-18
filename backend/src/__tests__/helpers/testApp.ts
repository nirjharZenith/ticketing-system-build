import { createApp } from '../../app';

/**
 * Returns a configured Express app instance with rate limiting disabled.
 * Re-used across all integration test files to avoid port conflicts.
 */
export function buildTestApp() {
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-jwt-secret-for-testing-only';
  return createApp();
}
