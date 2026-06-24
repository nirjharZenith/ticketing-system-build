import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { query } from '../db';
import { isValidUUID } from '../utils/validation';
import { AuthenticationError, AuthorizationError, NotFoundError } from './errorHandler';

/**
 * Verifies the authenticated user is a member of the org in req.params.org_id.
 * Sets req.user.org_role on success.
 */
export const checkOrgMembership = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { org_id } = req.params;

    if (!req.user) {
      return next(new AuthenticationError('Unauthorized'));
    }

    if (!isValidUUID(org_id)) {
      return next(new NotFoundError('Organization'));
    }

    const result = await query(
      'SELECT role FROM user_organisations WHERE user_id = $1 AND organisation_id = $2',
      [req.user.id, org_id]
    );

    if (result.rows.length === 0) {
      return next(new AuthorizationError('Access denied'));
    }

    req.user.org_role = result.rows[0].role;
    next();
  } catch (error) {
    next(error);
  }
};
