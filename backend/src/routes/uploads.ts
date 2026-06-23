import { Router, Response, Router as ExpressRouter } from 'express';
import { AuthRequest, authenticateToken } from '../middleware/auth';
import { uploadImagesMiddleware, MAX_IMAGES_PER_TICKET } from '../services/fileService';
import { storeTicketImage, localFileExists, getLocalFilePath } from '../services/storageService';
import * as ticketService from '../services/ticketService';
import { query } from '../db';
import { appendAttachmentToGithubIssue } from '../services/githubIssueService';

const router: ExpressRouter = Router();

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

const getUsername = async (userId: string): Promise<string> => {
  const result = await query('SELECT name, email FROM users WHERE id = $1', [userId]);
  if (result.rows.length === 0) return 'user';
  const { name, email } = result.rows[0];
  return name || email.split('@')[0];
};

router.post(
  '/:org_id/tickets/:ticket_id/upload',
  authenticateToken,
  checkOrgMembership,
  uploadImagesMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const files = req.files as Express.Multer.File[] | undefined;

      if (!files || files.length === 0) {
        return res.status(400).json({ error: 'No images provided' });
      }

      const { org_id, ticket_id } = req.params;

      const ticketResult = await query(
        'SELECT id, github_issue_number, github_repo_owner, github_repo_name FROM tickets WHERE id = $1 AND organisation_id = $2',
        [ticket_id, org_id]
      );

      if (ticketResult.rows.length === 0) {
        return res.status(404).json({ error: 'Ticket not found' });
      }

      const ticket = ticketResult.rows[0];

      const existingCount = await ticketService.getAttachmentCount(ticket_id);
      if (existingCount + files.length > MAX_IMAGES_PER_TICKET) {
        return res.status(400).json({
          error: `Maximum ${MAX_IMAGES_PER_TICKET} images per ticket. You have ${existingCount}, tried to add ${files.length}.`,
        });
      }

      const username = await getUsername(req.user!.id);
      const uploaded: Array<{ id: string; filename: string; fileUrl: string; size: number }> = [];

      for (const file of files) {
        const stored = await storeTicketImage(file.buffer, username, org_id, ticket_id);
        const attachment = await ticketService.addAttachment(
          ticket_id,
          stored.filename,
          stored.url,
          req.user!.id
        );
        uploaded.push({ ...attachment, size: stored.size });

        if (ticket.github_issue_number && ticket.github_repo_owner && ticket.github_repo_name) {
          await appendAttachmentToGithubIssue(
            ticket.github_repo_owner,
            ticket.github_repo_name,
            ticket.github_issue_number,
            stored.filename,
            stored.url
          );
        }
      }

      await ticketService.logTicketActivity(
        ticket_id,
        req.user!.id,
        'attachment_added',
        null,
        `${uploaded.length} image(s) uploaded`
      );

      res.status(201).json({ success: true, attachments: uploaded });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
);

router.get(
  '/:org_id/tickets/:ticket_id/files/:filename',
  authenticateToken,
  checkOrgMembership,
  async (req: AuthRequest, res: Response) => {
    try {
      const { org_id, ticket_id, filename } = req.params;

      const attachmentResult = await query(
        `SELECT ta.file_url FROM ticket_attachments ta
         JOIN tickets t ON ta.ticket_id = t.id
         WHERE ta.ticket_id = $1 AND t.organisation_id = $2 AND ta.filename = $3`,
        [ticket_id, org_id, filename]
      );

      if (attachmentResult.rows.length === 0) {
        return res.status(404).json({ error: 'File not found' });
      }

      const fileUrl = attachmentResult.rows[0].file_url;

      if (fileUrl.startsWith('http')) {
        return res.redirect(fileUrl);
      }

      if (!localFileExists(filename)) {
        return res.status(404).json({ error: 'File not found on server' });
      }

      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.sendFile(getLocalFilePath(filename));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

export default router;
