import express, { Request, Response } from 'express';
import { AuthRequest, authenticateToken } from '../middleware/auth';
import { checkOrgMembership } from '../middleware/checkOrgMembership';
import { uploadImagesMiddleware, MAX_IMAGES_PER_TICKET } from '../services/fileService';
import { storeTicketImage, localFileExists, getLocalFilePath } from '../services/storageService';
import * as ticketService from '../services/ticketService';
import { query } from '../db';
import { appendAttachmentToGithubIssue } from '../services/githubIssueService';
import { isValidUUID } from '../utils/validation';
import { NotFoundError, asyncHandler } from '../middleware/errorHandler';
import { logger } from '../middleware/logger';

const router: express.Router = express.Router();

const getUsername = async (userId: string): Promise<string> => {
  const result = await query('SELECT name, email FROM users WHERE id = $1', [userId]);
  if (result.rows.length === 0) return 'user';
  const { name, email } = result.rows[0];
  return name || email.split('@')[0];
};

// ──────────────────────────────────────────
// Upload images to a ticket
// ──────────────────────────────────────────
router.post(
  '/:org_id/tickets/:ticket_id/upload',
  authenticateToken,
  checkOrgMembership,
  uploadImagesMiddleware,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const files = req.files as Express.Multer.File[] | undefined;

    if (!files || files.length === 0) {
      return res.status(400).json({ success: false, code: 'NO_FILES', message: 'No images provided' });
    }

    const { org_id, ticket_id } = req.params;

    if (!isValidUUID(ticket_id)) {
      throw new NotFoundError('Ticket');
    }

    const ticketResult = await query(
      'SELECT id, github_issue_number, github_repo_owner, github_repo_name FROM tickets WHERE id = $1 AND organisation_id = $2',
      [ticket_id, org_id]
    );

    if (ticketResult.rows.length === 0) {
      throw new NotFoundError('Ticket');
    }

    const ticket = ticketResult.rows[0];

    const existingCount = await ticketService.getAttachmentCount(ticket_id);
    if (existingCount + files.length > MAX_IMAGES_PER_TICKET) {
      return res.status(400).json({
        success: false,
        code: 'ATTACHMENT_LIMIT',
        message: `Maximum ${MAX_IMAGES_PER_TICKET} images per ticket. You have ${existingCount}, tried to add ${files.length}.`,
      });
    }

    const username = await getUsername(req.user!.id);
    const orgNameResult = await query('SELECT name FROM organisations WHERE id = $1', [org_id]);
    const orgNameRaw = orgNameResult.rows.length > 0 ? orgNameResult.rows[0].name : org_id;
    const sanitizedOrgName = orgNameRaw.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();

    const uploaded: Array<{ id: string; filename: string; fileUrl: string; size: number }> = [];

    for (const file of files) {
      const stored = await storeTicketImage(file.buffer, username, sanitizedOrgName, ticket_id);
      const attachment = await ticketService.addAttachment(
        ticket_id,
        stored.filename,
        stored.url,
        req.user!.id
      );
      uploaded.push({ ...attachment, size: stored.size });

      if (ticket.github_issue_number && ticket.github_repo_owner && ticket.github_repo_name) {
        appendAttachmentToGithubIssue(
          ticket.github_repo_owner,
          ticket.github_repo_name,
          ticket.github_issue_number,
          stored.filename,
          stored.url
        ).catch((err: any) =>
          logger.error('[uploads] Failed to append attachment to GitHub issue', { err: err.message })
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
  })
);

// ──────────────────────────────────────────
// Serve / proxy attachment file
// ──────────────────────────────────────────
router.get(
  '/:org_id/tickets/:ticket_id/files/:filename',
  authenticateToken,
  checkOrgMembership,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { org_id, ticket_id, filename } = req.params;

    if (!isValidUUID(ticket_id)) {
      throw new NotFoundError('Ticket');
    }

    // Sanitize filename — prevent path traversal
    if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({ success: false, code: 'INVALID_FILENAME', message: 'Invalid filename' });
    }

    const attachmentResult = await query(
      `SELECT ta.file_url FROM ticket_attachments ta
       JOIN tickets t ON ta.ticket_id = t.id
       WHERE ta.ticket_id = $1 AND t.organisation_id = $2 AND ta.filename = $3`,
      [ticket_id, org_id, filename]
    );

    if (attachmentResult.rows.length === 0) {
      throw new NotFoundError('File');
    }

    const fileUrl = attachmentResult.rows[0].file_url;

    if (fileUrl.startsWith('http')) {
      if (fileUrl.includes('github.com') || fileUrl.includes('githubusercontent.com')) {
        const githubToken = process.env.GITHUB_TOKEN || process.env.GITHUB_PAT;
        const fetchOptions: RequestInit = githubToken
          ? { headers: { Authorization: `Bearer ${githubToken}` } }
          : {};
        const fetchRes = await fetch(fileUrl, fetchOptions);
        if (!fetchRes.ok) {
          return res.status(fetchRes.status).json({
            success: false,
            code: 'REMOTE_FETCH_FAILED',
            message: 'Failed to fetch file from remote storage',
          });
        }
        const isInline = req.query.inline === 'true';
        res.setHeader('Content-Disposition', isInline ? 'inline' : `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', fetchRes.headers.get('content-type') || 'application/octet-stream');
        const buffer = Buffer.from(await fetchRes.arrayBuffer());
        return res.send(buffer);
      }
      return res.redirect(fileUrl);
    }

    if (!localFileExists(filename)) {
      throw new NotFoundError('File');
    }

    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.sendFile(getLocalFilePath(filename));
  })
);

export default router;
