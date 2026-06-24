import { Request, Response, NextFunction } from 'express';
import { ValidationException } from '../utils/validation';
import { logger } from './logger';


export interface AppError extends Error {
  status?: number;
  code?: string;
}

export class AppException extends Error implements AppError {
  constructor(
    public status: number = 500,
    public message: string = 'Internal Server Error',
    public code: string = 'INTERNAL_ERROR'
  ) {
    super(message);
    this.name = 'AppException';
    Object.setPrototypeOf(this, AppException.prototype);
  }
}

export class ValidationError extends AppException {
  constructor(message: string = 'Validation failed', public details: any = {}) {
    super(400, message, 'VALIDATION_ERROR');
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

export class AuthenticationError extends AppException {
  constructor(message: string = 'Authentication failed') {
    super(401, message, 'AUTHENTICATION_ERROR');
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

export class AuthorizationError extends AppException {
  constructor(message: string = 'Access denied') {
    super(403, message, 'AUTHORIZATION_ERROR');
    Object.setPrototypeOf(this, AuthorizationError.prototype);
  }
}

export class NotFoundError extends AppException {
  constructor(resource: string = 'Resource') {
    super(404, `${resource} not found`, 'NOT_FOUND');
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

export class ConflictError extends AppException {
  constructor(message: string = 'Conflict') {
    super(409, message, 'CONFLICT');
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}

export class RateLimitError extends AppException {
  constructor(message: string = 'Too many requests') {
    super(429, message, 'RATE_LIMIT_EXCEEDED');
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }
}

export const errorHandler = (
  err: Error | AppException | ValidationException,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  logger.error('Unhandled error', {
    name: err.name,
    message: err.message,
    path: req.path,
    method: req.method,
  });

  // Handle validation exceptions
  if (err instanceof ValidationException) {
    return res.status(400).json({
      success: false,
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      errors: err.errors,
    });
  }

  // Handle app exceptions
  if (err instanceof AppException) {
    return res.status(err.status).json({
      success: false,
      code: err.code,
      message: err.message,
      ...(err instanceof ValidationError && { details: err.details }),
    });
  }

  // Handle database errors
  if ((err as any).code === '23505') {
    // Unique violation
    return res.status(409).json({
      success: false,
      code: 'DUPLICATE_ENTRY',
      message: 'This resource already exists',
    });
  }

  if ((err as any).code === '23503') {
    // Foreign key violation
    return res.status(400).json({
      success: false,
      code: 'INVALID_REFERENCE',
      message: 'Referenced resource does not exist',
    });
  }

  if ((err as any).code === '22P02') {
    // Invalid input format
    return res.status(400).json({
      success: false,
      code: 'INVALID_FORMAT',
      message: 'Invalid input format',
    });
  }

  // Handle payload size errors
  if (err.name === 'PayloadTooLargeError' || (err as any).type === 'entity.too.large') {
    return res.status(413).json({
      success: false,
      code: 'PAYLOAD_TOO_LARGE',
      message: 'Request body is too large',
    });
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      code: 'INVALID_TOKEN',
      message: 'Invalid or malformed token',
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      code: 'TOKEN_EXPIRED',
      message: 'Token has expired',
    });
  }

  // Default error response
  res.status(500).json({
    success: false,
    code: 'INTERNAL_ERROR',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal Server Error',
  });
};

// Async error wrapper
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
