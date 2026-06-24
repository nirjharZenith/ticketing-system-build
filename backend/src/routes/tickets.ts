import express, { Request, Response } from 'express';
import { AuthRequest, authenticateToken } from '../middleware/auth';
import { checkOrgMembership } from '../middleware/checkOrgMembership';
import * as ticketService from '../services/ticketService';
import * as emailService from '../services/emailService';
import { query } from '../db';
import {
  isValidUUID,
  validateTicketCreation,
  isValidPriority,
  ValidationException,
  isValidPagination,
} from '../utils/validation';
import {
  AuthorizationError,
  NotFoundError,
  asyncHandler,
} from '../middleware/errorHandler';
import * as githubIssueService from '../services/githubIssueService';
import { createGithubIssueComment } from '../services/githubIssueService';
import { emitToOrg } from '../services/socketService';
import { syncProjectStatusesToDB, isProjectConfigured } from '../services/githubProjectService';
import { logger } from '../middleware/logger';

const router: express.Router = express.Router();

// ──────────────────────────────────────────
// Create ticket
// ──────────────────────────────────────────
router.post(
  '/:org_id/tickets',
  authenticateToken,
  checkOrgMembership,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { org_id } = req.params;
    const { title, description, priority } = req.body;

    const validationErrors = validateTicketCreation({ title, description, priority });
    if (validationErrors.length > 0) {
      throw new ValidationException(validationErrors);
    }

    const ticket = await ticketService.createTicket(
      org_id,
      req.user!.id,
      title,
      description || '',
      priority || 'medium'
    );

    // Fire-and-forget email notifications
    try {
      const [membersResult, creatorResult] = await Promise.all([
        query(
          `SELECT u.email, u.name FROM users u
           INNER JOIN user_organisations uo ON u.id = uo.user_id
           WHERE uo.organisation_id = $1 AND u.is_active = true AND u.id != $2`,
          [org_id, req.user!.id]
        ),
        query('SELECT name FROM users WHERE id = $1', [req.user!.id]),
      ]);
      const creatorName = creatorResult.rows[0]?.name || 'Unknown';
      for (const member of membersResult.rows) {
        emailService
          .sendTicketCreatedEmail(member.email, title, ticket.id, creatorName)
          .catch((err) => logger.error('[tickets] Failed to send creation email', { err: err.message }));
      }
    } catch (emailError: any) {
      logger.error('[tickets] Error fetching members for email', { err: emailError.message });
    }

    emitToOrg(org_id, 'ticket:created', ticket);
    res.status(201).json({ success: true, ticket });
  })
);

// ──────────────────────────────────────────
// List org tickets
// ──────────────────────────────────────────
router.get(
  '/:org_id/tickets',
  authenticateToken,
  checkOrgMembership,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { org_id } = req.params;
    const { status, priority, assignedTo, page, limit } = req.query;

    const filters: any = {};
    if (status) filters.status = status;
    if (priority) filters.priority = priority;
    if (assignedTo) filters.assignedTo = assignedTo;

    const pagination = isValidPagination(page || 1, limit || 20);
    if (pagination) {
      filters.limit = pagination.limit;
      filters.offset = (pagination.page - 1) * pagination.limit;
    }

    const tickets = await ticketService.getOrgTickets(org_id, filters);
    res.json(tickets);
  })
);

// ──────────────────────────────────────────
// Get single ticket
// ──────────────────────────────────────────
router.get(
  '/:org_id/tickets/:ticket_id',
  authenticateToken,
  checkOrgMembership,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { org_id, ticket_id } = req.params;

    if (!isValidUUID(ticket_id)) {
      throw new NotFoundError('Ticket');
    }

    const ticket = await ticketService.getTicketById(ticket_id, org_id);
    res.json(ticket);
  })
);

// ──────────────────────────────────────────
// Update ticket (status field blocked — GitHub-only via webhook/polling)
// ──────────────────────────────────────────
router.patch(
  '/:org_id/tickets/:ticket_id',
  authenticateToken,
  checkOrgMembership,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { org_id, ticket_id } = req.params;

    if (!isValidUUID(ticket_id)) {
      throw new NotFoundError('Ticket');
    }

    // Strip status — status is managed exclusively by GitHub webhook/polling
    const { status: _ignoredStatus, ...updates } = req.body;

    // Validate priority if provided
    if (updates.priority !== undefined && !isValidPriority(updates.priority)) {
      throw new ValidationException([
        { field: 'priority', message: 'Invalid priority. Must be: low, medium, high, or urgent' },
      ]);
    }

    const ticketResult = await query(
      'SELECT creator_id, title, status, github_issue_number, github_repo_owner, github_repo_name FROM tickets WHERE id = $1 AND organisation_id = $2',
      [ticket_id, org_id]
    );

    if (ticketResult.rows.length === 0) {
      throw new NotFoundError('Ticket');
    }

    const currentTicket = ticketResult.rows[0];

    if (req.user!.org_role !== 'admin' && currentTicket.creator_id !== req.user!.id) {
      throw new AuthorizationError('Only creator or admin can update');
    }

    const ticket = await ticketService.updateTicket(ticket_id, org_id, updates, req.user!.id);

    // Sync title/description to GitHub if linked
    if (currentTicket.github_issue_number) {
      if (updates.title !== undefined || updates.description !== undefined) {
        githubIssueService
          .updateGithubIssue(
            currentTicket.github_repo_owner,
            currentTicket.github_repo_name,
            currentTicket.github_issue_number,
            updates.title,
            updates.description,
            ticket_id
          )
          .catch((err: any) =>
            logger.error('[tickets] Failed to update GitHub issue', { err: err.message })
          );
      }
    }

    // Fire-and-forget email notifications
    try {
      if (updates.assigned_to) {
        const [assignedUserResult, userResult] = await Promise.all([
          query('SELECT email FROM users WHERE id = $1', [updates.assigned_to]),
          query('SELECT name FROM users WHERE id = $1', [req.user!.id]),
        ]);
        if (assignedUserResult.rows.length > 0) {
          emailService
            .sendAssignmentEmail(
              assignedUserResult.rows[0].email,
              currentTicket.title,
              ticket_id,
              userResult.rows[0]?.name || 'Unknown'
            )
            .catch((err) => logger.error('[tickets] Failed to send assignment email', { err: err.message }));
        }
      }

      if (updates.priority) {
        const [membersResult, updaterResult] = await Promise.all([
          query(
            `SELECT u.email, u.name FROM users u
             INNER JOIN user_organisations uo ON u.id = uo.user_id
             WHERE uo.organisation_id = $1 AND u.is_active = true AND u.id != $2`,
            [org_id, req.user!.id]
          ),
          query('SELECT name FROM users WHERE id = $1', [req.user!.id]),
        ]);
        const updaterName = updaterResult.rows[0]?.name || 'Unknown';
        const changes = JSON.stringify(updates);
        for (const member of membersResult.rows) {
          emailService
            .sendTicketUpdatedEmail(member.email, currentTicket.title, ticket_id, updaterName, changes)
            .catch((err) => logger.error('[tickets] Failed to send update email', { err: err.message }));
        }
      }
    } catch (emailError: any) {
      logger.error('[tickets] Error sending update emails', { err: emailError.message });
    }

    emitToOrg(org_id, 'ticket:updated', ticket);
    res.json(ticket);
  })
);

// ──────────────────────────────────────────
// Delete ticket (admin only)
// ──────────────────────────────────────────
router.delete(
  '/:org_id/tickets/:ticket_id',
  authenticateToken,
  checkOrgMembership,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { org_id, ticket_id } = req.params;

    if (!isValidUUID(ticket_id)) {
      throw new NotFoundError('Ticket');
    }

    if (req.user!.org_role !== 'admin') {
      throw new AuthorizationError('Only admins can delete tickets');
    }

    const success = await ticketService.deleteTicket(ticket_id, org_id);
    if (!success) {
      throw new NotFoundError('Ticket');
    }

    emitToOrg(org_id, 'ticket:deleted', { id: ticket_id });
    res.json({ success: true });
  })
);

// ──────────────────────────────────────────
// Get ticket activity
// ──────────────────────────────────────────
router.get(
  '/:org_id/tickets/:ticket_id/activity',
  authenticateToken,
  checkOrgMembership,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { org_id, ticket_id } = req.params;

    if (!isValidUUID(ticket_id)) {
      throw new NotFoundError('Ticket');
    }

    // Verify ticket belongs to this org
    const ticketCheck = await query(
      'SELECT id FROM tickets WHERE id = $1 AND organisation_id = $2',
      [ticket_id, org_id]
    );
    if (ticketCheck.rows.length === 0) {
      throw new NotFoundError('Ticket');
    }

    const activity = await ticketService.getTicketActivity(ticket_id);
    res.json(activity);
  })
);

// ──────────────────────────────────────────
// Add attachment metadata
// ──────────────────────────────────────────
router.post(
  '/:org_id/tickets/:ticket_id/attachments',
  authenticateToken,
  checkOrgMembership,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { org_id, ticket_id } = req.params;
    const { filename, fileUrl } = req.body;

    if (!isValidUUID(ticket_id)) {
      throw new NotFoundError('Ticket');
    }

    if (!filename || !fileUrl) {
      throw new ValidationException([
        { field: 'filename', message: 'Filename and fileUrl are required' },
      ]);
    }

    const ticketResult = await query(
      'SELECT id FROM tickets WHERE id = $1 AND organisation_id = $2',
      [ticket_id, org_id]
    );
    if (ticketResult.rows.length === 0) {
      throw new NotFoundError('Ticket');
    }

    const attachment = await ticketService.addAttachment(ticket_id, filename, fileUrl, req.user!.id);
    res.status(201).json(attachment);
  })
);

// ──────────────────────────────────────────
// Get ticket attachments
// ──────────────────────────────────────────
router.get(
  '/:org_id/tickets/:ticket_id/attachments',
  authenticateToken,
  checkOrgMembership,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { org_id, ticket_id } = req.params;

    if (!isValidUUID(ticket_id)) {
      throw new NotFoundError('Ticket');
    }

    const ticketCheck = await query(
      'SELECT id FROM tickets WHERE id = $1 AND organisation_id = $2',
      [ticket_id, org_id]
    );
    if (ticketCheck.rows.length === 0) {
      throw new NotFoundError('Ticket');
    }

    const attachments = await ticketService.getTicketAttachments(ticket_id);
    res.json(attachments);
  })
);

// ──────────────────────────────────────────
// Get ticket comments
// ──────────────────────────────────────────
router.get(
  '/:org_id/tickets/:ticket_id/comments',
  authenticateToken,
  checkOrgMembership,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { ticket_id } = req.params;

    if (!isValidUUID(ticket_id)) {
      throw new NotFoundError('Ticket');
    }

    const comments = await ticketService.getComments(ticket_id);
    res.json(comments);
  })
);

// ──────────────────────────────────────────
// Add ticket comment
// ──────────────────────────────────────────
const MAX_COMMENT_LENGTH = 5000;

router.post(
  '/:org_id/tickets/:ticket_id/comments',
  authenticateToken,
  checkOrgMembership,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { org_id, ticket_id } = req.params;
    const { comment } = req.body;

    if (!isValidUUID(ticket_id)) {
      throw new NotFoundError('Ticket');
    }

    if (!comment || typeof comment !== 'string' || !comment.trim()) {
      throw new ValidationException([{ field: 'comment', message: 'Comment text is required' }]);
    }

    if (comment.trim().length > MAX_COMMENT_LENGTH) {
      throw new ValidationException([
        {
          field: 'comment',
          message: `Comment must not exceed ${MAX_COMMENT_LENGTH} characters`,
        },
      ]);
    }

    // Verify ticket belongs to org
    const ticketResult = await query(
      'SELECT github_issue_number, github_repo_owner, github_repo_name FROM tickets WHERE id = $1 AND organisation_id = $2',
      [ticket_id, org_id]
    );
    if (ticketResult.rows.length === 0) {
      throw new NotFoundError('Ticket');
    }

    const createdComment = await ticketService.addComment(ticket_id, req.user!.id, comment.trim());

    // Sync comment to GitHub (fire-and-forget)
    const ticket = ticketResult.rows[0];
    if (ticket.github_issue_number && ticket.github_repo_owner && ticket.github_repo_name) {
      const usernameResult = await query('SELECT name, email FROM users WHERE id = $1', [req.user!.id]);
      const userRow = usernameResult.rows[0];
      const username = userRow ? userRow.name || userRow.email.split('@')[0] : 'user';
      const commentBody = `**Comment from ${username} (via Zenith):**\n\n${comment.trim()}`;
      createGithubIssueComment(
        ticket.github_repo_owner,
        ticket.github_repo_name,
        ticket.github_issue_number,
        commentBody
      ).catch((err: any) =>
        logger.error('[tickets] Failed to sync comment to GitHub', { err: err.message })
      );
    }

    emitToOrg(org_id, 'ticket:commented', { ticket_id, comment: createdComment });
    res.status(201).json(createdComment);
  })
);

// ──────────────────────────────────────────
// Manual GitHub Project sync
// ──────────────────────────────────────────
router.post(
  '/:org_id/sync-github',
  authenticateToken,
  checkOrgMembership,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!isProjectConfigured()) {
      return res.status(400).json({
        success: false,
        message: 'GitHub Project not configured. Set GITHUB_PROJECT_NUMBER in backend .env.',
      });
    }
    const updatedCount = await syncProjectStatusesToDB();
    res.json({
      success: true,
      updatedCount,
      message: `Synced ${updatedCount} ticket(s) from GitHub Project`,
    });
  })
);

export default router;
