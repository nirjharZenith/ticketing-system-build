import { Router, Response, Router as ExpressRouter } from 'express';
import { AuthRequest, authenticateToken } from '../middleware/auth';
import * as ticketService from '../services/ticketService';
import * as emailService from '../services/emailService';
import { query } from '../db';
import { isValidUUID, validateTicketCreation, isValidPriority, isValidStatus, ValidationException, isValidPagination } from '../utils/validation';
import { AuthenticationError, AuthorizationError, NotFoundError } from '../middleware/errorHandler';
import { createGithubIssueComment } from '../services/githubIssueService';
import { emitToOrg } from '../services/socketService';

const router: ExpressRouter = Router();

// Middleware to check org membership
const checkOrgMembership = async (req: AuthRequest, res: Response, next: any) => {
  try {
    const { org_id } = req.params;
    
    if (!req.user) {
      throw new AuthenticationError('Unauthorized');
    }

    if (!isValidUUID(org_id)) {
      throw new NotFoundError('Organization');
    }

    const result = await query(
      'SELECT role FROM user_organisations WHERE user_id = $1 AND organisation_id = $2',
      [req.user.id, org_id]
    );

    if (result.rows.length === 0) {
      throw new AuthorizationError('Access denied');
    }

    req.user.org_role = result.rows[0].role;
    next();
  } catch (error) {
    next(error);
  }
};

// Create ticket
router.post('/:org_id/tickets', authenticateToken, checkOrgMembership, async (req: AuthRequest, res: Response, next: any) => {
  try {
    const { org_id } = req.params;
    const { title, description, priority } = req.body;

    // Validate input
    const validationErrors = validateTicketCreation({ title, description, priority });
    if (validationErrors.length > 0) {
      throw new ValidationException(validationErrors);
    }

    const ticket = await ticketService.createTicket(org_id, req.user!.id, title, description || '', priority || 'medium');
    
    // Send notification emails to organization members (fire and forget)
    try {
      const membersResult = await query(
        `SELECT u.email, u.name FROM users u
         INNER JOIN user_organisations uo ON u.id = uo.user_id
         WHERE uo.organisation_id = $1 AND u.is_active = true AND u.id != $2`,
        [org_id, req.user!.id]
      );

      const creatorResult = await query('SELECT name FROM users WHERE id = $1', [req.user!.id]);
      const creatorName = creatorResult.rows[0]?.name || 'Unknown';

      for (const member of membersResult.rows) {
        emailService.sendTicketCreatedEmail(member.email, title, ticket.id, creatorName).catch((err) => {
          console.error('[v0] Failed to send notification email:', err);
        });
      }
    } catch (emailError) {
      console.error('[v0] Error sending notification emails:', emailError);
      // Don't fail the request if email fails
    }

    emitToOrg(org_id, 'ticket:created', ticket);
    res.status(201).json({ success: true, ticket });
  } catch (error) {
    next(error);
  }
});

// Get organization tickets
router.get('/:org_id/tickets', authenticateToken, checkOrgMembership, async (req: AuthRequest, res: Response) => {
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
});

// Get single ticket
router.get('/:org_id/tickets/:ticket_id', authenticateToken, checkOrgMembership, async (req: AuthRequest, res: Response) => {
  const { org_id, ticket_id } = req.params;
  const ticket = await ticketService.getTicketById(ticket_id, org_id);
  res.json(ticket);
});

// Update ticket
router.patch('/:org_id/tickets/:ticket_id', authenticateToken, checkOrgMembership, async (req: AuthRequest, res: Response) => {
    const { org_id, ticket_id } = req.params;
    const updates = req.body;

    // Check if user is admin or creator and fetch status/github info for constraints/sync
    const ticketResult = await query(
      'SELECT creator_id, title, status, github_issue_number, github_repo_owner, github_repo_name FROM tickets WHERE id = $1',
      [ticket_id]
    );

    if (ticketResult.rows.length === 0) {
      throw new NotFoundError('Ticket');
    }

    const currentTicket = ticketResult.rows[0];

    // Enforce closed ticket constraints: only description updates allowed
    if (currentTicket.status === 'closed') {
      const allowedFields = ['description'];
      const updateKeys = Object.keys(updates);
      const nonDescKeys = updateKeys.filter(k => k !== 'description');
      if (nonDescKeys.length > 0) {
        throw new ValidationException([{ field: 'status', message: 'Ticket is closed' }]);
      }
    }

    if (req.user!.org_role !== 'admin' && currentTicket.creator_id !== req.user!.id) {
      throw new AuthorizationError('Only creator or admin can update');
    }

    const ticket = await ticketService.updateTicket(ticket_id, org_id, updates, req.user!.id);

    // Sync updates to GitHub if ticket is linked to a GitHub issue
    if (currentTicket.github_issue_number) {
      const githubIssueService = require('../services/githubIssueService');
      
      // If transitioned to closed, close it on GitHub
      if (updates.status === 'closed' && currentTicket.status !== 'closed') {
        githubIssueService.closeGithubIssue(
          currentTicket.github_repo_owner,
          currentTicket.github_repo_name,
          currentTicket.github_issue_number
        ).catch((err: any) => {
          console.error('[github-issue] Failed to close GitHub issue on update:', err);
        });
      }

      // If title or description changed, update it on GitHub
      if (updates.title !== undefined || updates.description !== undefined) {
        githubIssueService.updateGithubIssue(
          currentTicket.github_repo_owner,
          currentTicket.github_repo_name,
          currentTicket.github_issue_number,
          updates.title,
          updates.description,
          ticket_id
        ).catch((err: any) => {
          console.error('[github-issue] Failed to update GitHub issue on update:', err);
        });
      }
    }
    
    // Send notification emails about updates (fire and forget)
    try {
      if (updates.assigned_to) {
        const assignedUserResult = await query('SELECT email FROM users WHERE id = $1', [updates.assigned_to]);
        const userResult = await query('SELECT name FROM users WHERE id = $1', [req.user!.id]);
        
        if (assignedUserResult.rows.length > 0) {
          const assignedEmail = assignedUserResult.rows[0].email;
          const updaterName = userResult.rows[0]?.name || 'Unknown';
          
          emailService.sendAssignmentEmail(
            assignedEmail,
            ticketResult.rows[0].title,
            ticket_id,
            updaterName
          ).catch((err) => {
            console.error('[v0] Failed to send assignment email:', err);
          });
        }
      }

      // Notify organization members about status/priority changes
      if (updates.status || updates.priority) {
        const membersResult = await query(
          `SELECT u.email, u.name FROM users u
           INNER JOIN user_organisations uo ON u.id = uo.user_id
           WHERE uo.organisation_id = $1 AND u.is_active = true AND u.id != $2`,
          [org_id, req.user!.id]
        );

        const updaterResult = await query('SELECT name FROM users WHERE id = $1', [req.user!.id]);
        const updaterName = updaterResult.rows[0]?.name || 'Unknown';
        const changes = JSON.stringify(updates);

        for (const member of membersResult.rows) {
          emailService.sendTicketUpdatedEmail(
            member.email,
            ticketResult.rows[0].title,
            ticket_id,
            updaterName,
            changes
          ).catch((err) => {
            console.error('[v0] Failed to send update email:', err);
          });
        }
      }
    } catch (emailError) {
      console.error('[v0] Error sending notification emails:', emailError);
    }

    emitToOrg(org_id, 'ticket:updated', ticket);
    res.json(ticket);
});

// Delete ticket (admin only)
router.delete('/:org_id/tickets/:ticket_id', authenticateToken, checkOrgMembership, async (req: AuthRequest, res: Response) => {
  const { org_id, ticket_id } = req.params;

  if (req.user!.org_role !== 'admin') {
    throw new AuthorizationError('Only admins can delete');
  }

  const success = await ticketService.deleteTicket(ticket_id, org_id);

  if (!success) {
    throw new NotFoundError('Ticket');
  }

  emitToOrg(org_id, 'ticket:deleted', { id: ticket_id });
  res.json({ success: true });
});

// Get ticket activity
router.get('/:org_id/tickets/:ticket_id/activity', authenticateToken, checkOrgMembership, async (req: AuthRequest, res: Response) => {
  const { ticket_id } = req.params;
  const activity = await ticketService.getTicketActivity(ticket_id);
  res.json(activity);
});

// Add attachment (metadata only — prefer upload endpoint for files)
router.post('/:org_id/tickets/:ticket_id/attachments', authenticateToken, checkOrgMembership, async (req: AuthRequest, res: Response) => {
  const { org_id, ticket_id } = req.params;
  const { filename, fileUrl } = req.body;

  if (!filename || !fileUrl) {
    throw new ValidationException([{ field: 'filename', message: 'Filename and fileUrl required' }]);
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
});

// Get ticket attachments
router.get('/:org_id/tickets/:ticket_id/attachments', authenticateToken, checkOrgMembership, async (req: AuthRequest, res: Response) => {
  const { ticket_id } = req.params;
  const attachments = await ticketService.getTicketAttachments(ticket_id);
  res.json(attachments);
});

// Get ticket comments
router.get('/:org_id/tickets/:ticket_id/comments', authenticateToken, checkOrgMembership, async (req: AuthRequest, res: Response, next: any) => {
  try {
    const { ticket_id } = req.params;
    const localComments = await ticketService.getComments(ticket_id);

    const ticketResult = await query(
      'SELECT github_issue_number, github_repo_owner, github_repo_name FROM tickets WHERE id = $1',
      [ticket_id]
    );

    let allComments = [...localComments];

    if (ticketResult.rows.length > 0) {
      const ticket = ticketResult.rows[0];
      if (ticket.github_issue_number && ticket.github_repo_owner && ticket.github_repo_name) {
        const githubIssueService = require('../services/githubIssueService');
        const githubComments = await githubIssueService.fetchGithubIssueComments(
          ticket.github_repo_owner,
          ticket.github_repo_name,
          ticket.github_issue_number
        );

        const formattedGithubComments = githubComments.map((gc: any) => ({
          id: `github-${gc.id}`,
          ticket_id,
          user_id: `github-${gc.user.login}`,
          comment: gc.body,
          created_at: gc.created_at,
          name: `${gc.user.login} (GitHub)`,
          email: `${gc.user.login}@users.noreply.github.com`
        }));

        allComments = [...allComments, ...formattedGithubComments];
        allComments.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      }
    }

    res.json(allComments);
  } catch (error) {
    next(error);
  }
});

// Add ticket comment
router.post('/:org_id/tickets/:ticket_id/comments', authenticateToken, checkOrgMembership, async (req: AuthRequest, res: Response, next: any) => {
  try {
    const { org_id, ticket_id } = req.params;
    const { comment } = req.body;

    if (!comment || typeof comment !== 'string' || !comment.trim()) {
      return res.status(400).json({ error: 'Comment text is required' });
    }

    const createdComment = await ticketService.addComment(ticket_id, req.user!.id, comment);

    // Sync to GitHub if ticket is linked to a GitHub issue
    const ticketResult = await query(
      'SELECT github_issue_number, github_repo_owner, github_repo_name FROM tickets WHERE id = $1',
      [ticket_id]
    );

    if (ticketResult.rows.length > 0) {
      const ticket = ticketResult.rows[0];
      if (ticket.github_issue_number && ticket.github_repo_owner && ticket.github_repo_name) {
        const usernameResult = await query('SELECT name, email FROM users WHERE id = $1', [req.user!.id]);
        const userRow = usernameResult.rows[0];
        const username = userRow ? (userRow.name || userRow.email.split('@')[0]) : 'user';
        const commentBody = `**Comment from ${username} (via Zenith):**\n\n${comment}`;
        await createGithubIssueComment(
          ticket.github_repo_owner,
          ticket.github_repo_name,
          ticket.github_issue_number,
          commentBody
        );
      }
    }

    emitToOrg(org_id, 'ticket:commented', { ticket_id, comment: createdComment });
    res.status(201).json(createdComment);
  } catch (error) {
    next(error);
  }
});

export default router;
