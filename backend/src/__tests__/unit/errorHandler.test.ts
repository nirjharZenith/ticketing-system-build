import {
  AppException,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  errorHandler,
} from '../../middleware/errorHandler';
import { ValidationException } from '../../utils/validation';
import type { Request, Response, NextFunction } from 'express';

// ---------------------------------------------------------------------------
// Custom error classes
// ---------------------------------------------------------------------------
describe('AppException', () => {
  it('sets status, message, and code', () => {
    const err = new AppException(418, 'Teapot', 'IM_A_TEAPOT');
    expect(err.status).toBe(418);
    expect(err.message).toBe('Teapot');
    expect(err.code).toBe('IM_A_TEAPOT');
  });

  it('defaults to 500 / Internal Server Error', () => {
    const err = new AppException();
    expect(err.status).toBe(500);
    expect(err.code).toBe('INTERNAL_ERROR');
  });
});

describe('ValidationError', () => {
  it('has status 400 and code VALIDATION_ERROR', () => {
    const err = new ValidationError('bad input', { field: 'email' });
    expect(err.status).toBe(400);
    expect(err.code).toBe('VALIDATION_ERROR');
    expect(err.details).toEqual({ field: 'email' });
  });
});

describe('AuthenticationError', () => {
  it('has status 401', () => {
    const err = new AuthenticationError();
    expect(err.status).toBe(401);
    expect(err.code).toBe('AUTHENTICATION_ERROR');
  });
});

describe('AuthorizationError', () => {
  it('has status 403', () => {
    const err = new AuthorizationError();
    expect(err.status).toBe(403);
    expect(err.code).toBe('AUTHORIZATION_ERROR');
  });
});

describe('NotFoundError', () => {
  it('includes the resource name in the message', () => {
    const err = new NotFoundError('Ticket');
    expect(err.status).toBe(404);
    expect(err.message).toContain('Ticket');
  });
});

describe('ConflictError', () => {
  it('has status 409', () => {
    const err = new ConflictError();
    expect(err.status).toBe(409);
  });
});

describe('RateLimitError', () => {
  it('has status 429', () => {
    const err = new RateLimitError();
    expect(err.status).toBe(429);
    expect(err.code).toBe('RATE_LIMIT_EXCEEDED');
  });
});

// ---------------------------------------------------------------------------
// errorHandler middleware
// ---------------------------------------------------------------------------
function buildMockRes() {
  const res: Partial<Response> = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return res as Response;
}

describe('errorHandler middleware', () => {
  const req = {} as Request;
  const next = jest.fn() as NextFunction;

  beforeEach(() => jest.clearAllMocks());

  it('responds with 400 for a ValidationException', () => {
    const err = new ValidationException([{ field: 'email', message: 'Invalid email' }]);
    const res = buildMockRes();
    errorHandler(err, req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    const body: any = (res.json as jest.Mock).mock.calls[0][0];
    expect(body.success).toBe(false);
    expect(body.errors).toHaveLength(1);
  });

  it('responds with AppException status for AppException subclasses', () => {
    const err = new NotFoundError('Organization');
    const res = buildMockRes();
    errorHandler(err, req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
    const body: any = (res.json as jest.Mock).mock.calls[0][0];
    expect(body.code).toBe('NOT_FOUND');
  });

  it('maps a duplicate key database error (23505) to 409', () => {
    const err: any = new Error('duplicate key value');
    err.code = '23505';
    const res = buildMockRes();
    errorHandler(err, req, res, next);
    expect(res.status).toHaveBeenCalledWith(409);
  });

  it('maps a foreign key database error (23503) to 400', () => {
    const err: any = new Error('foreign key violation');
    err.code = '23503';
    const res = buildMockRes();
    errorHandler(err, req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('maps a generic Error to 500 in production and hides message', () => {
    const prevEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    const err = new Error('secret internal detail');
    const res = buildMockRes();
    errorHandler(err, req, res, next);
    expect(res.status).toHaveBeenCalledWith(500);
    const body: any = (res.json as jest.Mock).mock.calls[0][0];
    expect(body.message).not.toContain('secret internal detail');
    process.env.NODE_ENV = prevEnv;
  });

  it('maps a generic Error to 500 in development and shows message', () => {
    process.env.NODE_ENV = 'development';
    const err = new Error('some debug info');
    const res = buildMockRes();
    errorHandler(err, req, res, next);
    expect(res.status).toHaveBeenCalledWith(500);
    const body: any = (res.json as jest.Mock).mock.calls[0][0];
    expect(body.message).toContain('some debug info');
  });
});
