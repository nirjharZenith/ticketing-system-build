import { Router, Response, Router as ExpressRouter } from 'express';
import { AuthRequest, authenticateToken, authorizeRole } from '../middleware/auth';
import * as orgService from '../services/orgService';
import { query } from '../db';
import { isValidEmail, isValidOrgName } from '../utils/validation';

const router: ExpressRouter = Router();

const normalizeRole = (role: string) => (role === 'member' ? 'user' : role);

// Create organization
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { name } = req.body;

    if (!name || !isValidOrgName(name)) {
      return res.status(400).json({ error: 'Organization name must be between 2 and 100 characters' });
    }

    const org = await orgService.createOrganization(name, req.user.id);
    res.status(201).json(org);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Get user's organizations
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const orgs = await orgService.getUserOrganizations(req.user.id);
    res.json(orgs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get organization members (admin only)
router.get('/:org_id/members', authenticateToken, authorizeRole(['admin']), async (req: AuthRequest, res: Response) => {
  try {
    const { org_id } = req.params;
    const members = await orgService.getOrganizationMembers(org_id);
    res.json(members);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Add user to organization (admin only)
router.post('/:org_id/members', authenticateToken, authorizeRole(['admin']), async (req: AuthRequest, res: Response) => {
  try {
    const { org_id } = req.params;
    const { email, role = 'user' } = req.body;

    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ error: 'Valid email required' });
    }

    const normalizedRole = normalizeRole(role);
    if (!['admin', 'user'].includes(normalizedRole)) {
      return res.status(400).json({ error: 'Invalid role. Must be admin or user' });
    }

    // Find user by email
    const userResult = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase().trim()]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userId = userResult.rows[0].id;
    await orgService.addUserToOrganization(org_id, userId, normalizedRole);
    res.status(201).json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Remove user from organization (admin only)
router.delete('/:org_id/members/:user_id', authenticateToken, authorizeRole(['admin']), async (req: AuthRequest, res: Response) => {
  try {
    const { org_id, user_id } = req.params;

    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await orgService.removeUserFromOrganization(org_id, user_id, req.user.id);
    res.json({ success: true });
  } catch (error: any) {
    const status = error.message.includes('Cannot remove yourself') ? 400 : 500;
    res.status(status).json({ error: error.message });
  }
});

export default router;
