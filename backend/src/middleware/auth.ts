import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { query } from '../db';
import { OrgPermission, roleHasPermission } from '../permissions/orgPermissions';
import { AuthenticationError, AuthorizationError } from './errorHandler';

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('FATAL: JWT_SECRET environment variable is missing.');
  }
  return secret;
};

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    org_role?: string;
  };
  file?: Express.Multer.File;
}

export const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return next(new AuthenticationError('Access token required'));
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret()) as { id: string; email: string };

    if (process.env.NODE_ENV === 'test') {
      req.user = { id: decoded.id, email: decoded.email };
      next();
      return;
    }

    const result = await query(
      'SELECT id, email FROM users WHERE id = $1 AND is_active = true',
      [decoded.id]
    );

    if (result.rows.length === 0) {
      return next(new AuthenticationError('Invalid or expired token'));
    }

    req.user = {
      id: result.rows[0].id,
      email: result.rows[0].email,
    };
    next();
  } catch {
    return next(new AuthenticationError('Invalid or expired token'));
  }
};

export const requireOrgPermission = (permission: OrgPermission) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AuthenticationError('Unauthorized'));
    }

    const { org_id } = req.params;

    try {
      const result = await query(
        'SELECT role FROM user_organisations WHERE user_id = $1 AND organisation_id = $2',
        [req.user.id, org_id]
      );

      if (result.rows.length === 0) {
        return next(new AuthorizationError('You are not a member of this organization'));
      }

      const role = result.rows[0].role;
      if (!roleHasPermission(role, permission)) {
        return next(new AuthorizationError('Insufficient permissions'));
      }

      req.user.org_role = role;
      next();
    } catch {
      return next(new AuthorizationError('Authorization check failed'));
    }
  };
};

export const authorizeRole = (allowedRoles: string[]) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AuthenticationError('Unauthorized'));
    }

    const { org_id } = req.params;

    try {
      const result = await query(
        'SELECT role FROM user_organisations WHERE user_id = $1 AND organisation_id = $2',
        [req.user.id, org_id]
      );

      const role = result.rows[0]?.role;
      const effectiveRole = role === 'member' ? 'user' : role;

      if (result.rows.length === 0 || !allowedRoles.includes(effectiveRole)) {
        return next(new AuthorizationError('Insufficient permissions'));
      }

      req.user.org_role = role;
      next();
    } catch {
      return next(new AuthorizationError('Authorization check failed'));
    }
  };
};
