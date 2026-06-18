import { Router, Response, Router as ExpressRouter } from 'express';
import { AuthRequest, authenticateToken } from '../middleware/auth';
import { uploadMiddleware, getFileUrl } from '../services/fileService';
import * as ticketService from '../services/ticketService';
import { query } from '../db';

const router: ExpressRouter = Router();

// Middleware to check org membership
const checkOrgMembership = async (req: AuthRequest, res: Response, next: any) => {
  try {
    const { org_id } = req.params;
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const result = await query(
      'SELECT role FROM user_organisations WHERE user_id = $1 AND organisation_id = $2',
      [req.user.id, org_id]
    );

    if (result.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }

    req.user.org_role = result.rows[0].role;
    next();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Upload file to ticket
router.post(
  '/:org_id/tickets/:ticket_id/upload',
  authenticateToken,
  checkOrgMembership,
  uploadMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file provided' });
      }

      const { org_id, ticket_id } = req.params;

      // Verify ticket belongs to organization
      const ticketResult = await query(
        'SELECT id FROM tickets WHERE id = $1 AND organisation_id = $2',
        [ticket_id, org_id]
      );

      if (ticketResult.rows.length === 0) {
        return res.status(404).json({ error: 'Ticket not found' });
      }

      // Add attachment to database
      const fileUrl = getFileUrl(req.file.filename);
      await ticketService.addAttachment(
        ticket_id,
        req.file.originalname,
        fileUrl,
        req.user!.id
      );

      res.status(201).json({
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        url: fileUrl,
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
);

// Download file
router.get('/:filename', (req: any, res: Response) => {
  try {
    const { filename } = req.params;

    // Security: prevent directory traversal
    if (filename.includes('..') || filename.includes('/')) {
      return res.status(400).json({ error: 'Invalid filename' });
    }

    const filepath = require('../services/fileService').getFilePath(filename);
    res.download(filepath);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
