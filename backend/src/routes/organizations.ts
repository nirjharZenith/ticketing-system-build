import express, { Router, Response } from 'express';

import { AuthRequest, authenticateToken, requireOrgPermission } from '../middleware/auth';
import * as orgService from '../services/orgService';
import { getOrgAccess, ORG_PERMISSIONS } from '../permissions/orgPermissions';
import { isValidEmail, isValidOrgName } from '../utils/validation';
import {
  ValidationError as ValidationErrorClass,
  AuthenticationError,
  asyncHandler,
} from '../middleware/errorHandler';

const router: express.Router = express.Router();

const normalizeRole = (role: string) => (role === 'member' ? 'user' : role);

// Create organization
router.post(
  '/',
  authenticateToken,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      throw new AuthenticationError('Unauthorized');
    }

    const { name } = req.body;

    if (!name || !isValidOrgName(name)) {
      throw new ValidationErrorClass('Organization name must be between 2 and 100 characters');
    }

    const org = await orgService.createOrganization(name, req.user.id);
    res.status(201).json(org);
  })
);

// Get user's organizations
router.get(
  '/',
  authenticateToken,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      throw new AuthenticationError('Unauthorized');
    }

    const orgs = await orgService.getUserOrganizations(req.user.id);
    res.json(orgs);
  })
);

// List organization members
router.get(
  '/:org_id/members',
  authenticateToken,
  requireOrgPermission(ORG_PERMISSIONS.MEMBERS_READ),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { org_id } = req.params;
    const members = await orgService.getOrganizationMembers(org_id);
    const access = getOrgAccess(req.user?.org_role || 'user');
    res.json({ members, access });
  })
);

// Add / invite member (admin only)
router.post(
  '/:org_id/members',
  authenticateToken,
  requireOrgPermission(ORG_PERMISSIONS.MEMBERS_INVITE),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { org_id } = req.params;
    const { email, name, password, role = 'user' } = req.body;

    if (!email || !isValidEmail(email)) {
      throw new ValidationErrorClass('Valid email required');
    }

    if (!name || !name.trim()) {
      throw new ValidationErrorClass('Name is required');
    }

    if (!password) {
      throw new ValidationErrorClass('Password is required for new team members');
    }

    const normalizedRole = normalizeRole(role);
    if (!['admin', 'user'].includes(normalizedRole)) {
      throw new ValidationErrorClass('Invalid role. Must be admin or user');
    }

    const member = await orgService.inviteMemberToOrganization(
      org_id,
      email,
      name.trim(),
      password,
      normalizedRole
    );

    res.status(201).json({ success: true, member });
  })
);

// Remove member (admin only)
router.delete(
  '/:org_id/members/:user_id',
  authenticateToken,
  requireOrgPermission(ORG_PERMISSIONS.MEMBERS_REMOVE),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { org_id, user_id } = req.params;

    if (!req.user) {
      throw new AuthenticationError('Unauthorized');
    }

    await orgService.removeUserFromOrganization(org_id, user_id, req.user.id);
    res.json({ success: true });
  })
);

export default router;
