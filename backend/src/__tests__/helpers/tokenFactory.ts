import jwt, { SignOptions } from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET || 'test-jwt-secret-for-testing-only';

export interface TokenPayload {
  id: string;
  email: string;
}

/** Generates a valid signed JWT for use in Authorization headers. */
export function makeToken(payload: TokenPayload, expiresIn: SignOptions['expiresIn'] = '1h'): string {
  return jwt.sign(payload, SECRET, { expiresIn });
}

/** Generates an expired JWT (expiresIn 1ms ensures it is already expired on decode). */
export function makeExpiredToken(payload: TokenPayload): string {
  const token = jwt.sign(payload, SECRET, { expiresIn: 1 });
  // Wait is not needed – the token will be expired when verified due to clock skew / nbf
  return token;
}

/** Returns an Authorization header value. */
export function bearerHeader(token: string): string {
  return `Bearer ${token}`;
}

/** Default test user fixture. */
export const TEST_USER: TokenPayload = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  email: 'test@example.com',
};

export const TEST_USER_2: TokenPayload = {
  id: '223e4567-e89b-12d3-a456-426614174001',
  email: 'other@example.com',
};

export const TEST_ORG_ID = '323e4567-e89b-12d3-a456-426614174002';
export const TEST_TICKET_ID = '423e4567-e89b-12d3-a456-426614174003';
