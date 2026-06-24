import { query } from '../db';
import { v4 as uuidv4 } from 'uuid';
import * as githubIssueService from './githubIssueService';
import { addIssueToProject, isProjectConfigured } from './githubProjectService';
import { NotFoundError, ValidationError as ValidationErrorClass } from '../middleware/errorHandler';


export const createTicket = async (
  orgId: string,
  creatorId: string,
  title: string,
  description: string,
  priority: string = 'medium'
) => {
  const ticketId = uuidv4();

  try {
    let githubIssue: githubIssueService.GitHubIssueResult | null = null;
    if (githubIssueService.isGitHubConfigured()) {
      githubIssue = await githubIssueService.createGithubIssue(title, description, ticketId);
    }

    const githubIssueNumber = githubIssue?.number || null;
    const githubIssueUrl = githubIssue?.url || null;
    const githubRepoOwner = githubIssue?.owner || null;
    const githubRepoName = githubIssue?.repo || null;
    const githubIssueNodeId = githubIssue?.node_id || null;

    const insertResult = await query(
      `INSERT INTO tickets (id, organisation_id, creator_id, title, description, priority,
                            github_issue_number, github_issue_url, github_repo_owner, github_repo_name, github_issue_node_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [ticketId, orgId, creatorId, title, description, priority,
        githubIssueNumber, githubIssueUrl, githubRepoOwner, githubRepoName, githubIssueNodeId]
    );

    // Log activity
    await logTicketActivity(ticketId, creatorId, 'created', null, `Ticket created`);

    // Add the new issue to the GitHub Project board (fire-and-forget, requires Classic PAT + project scope)
    if (githubIssueNodeId && isProjectConfigured()) {
      addIssueToProject(githubIssueNodeId).catch((err) => {
        console.error('[ticketService] Failed to add issue to GitHub Project:', err.message);
      });
    }

    return insertResult.rows[0];
  } catch (error) {
    throw error;
  }
};

export const getTicketById = async (ticketId: string, orgId?: string) => {
  let query_text = 'SELECT * FROM tickets WHERE id = $1';
  const params: any[] = [ticketId];

  if (orgId) {
    query_text += ' AND organisation_id = $2';
    params.push(orgId);
  }

  const result = await query(query_text, params);

  if (result.rows.length === 0) {
    throw new NotFoundError('Ticket');
  }

  return result.rows[0];
};

export const getOrgTickets = async (orgId: string, filters?: any) => {
  let query_text = 'SELECT * FROM tickets WHERE organisation_id = $1';
  const params: any[] = [orgId];
  let paramIndex = 2;

  if (filters?.status) {
    query_text += ` AND status = $${paramIndex}`;
    params.push(filters.status);
    paramIndex++;
  }

  if (filters?.priority) {
    query_text += ` AND priority = $${paramIndex}`;
    params.push(filters.priority);
    paramIndex++;
  }

  if (filters?.assignedTo) {
    query_text += ` AND assigned_to = $${paramIndex}`;
    params.push(filters.assignedTo);
    paramIndex++;
  }

  query_text += ' ORDER BY created_at DESC';

  if (filters?.limit) {
    query_text += ` LIMIT $${paramIndex}`;
    params.push(filters.limit);
    paramIndex++;
  }

  if (filters?.offset) {
    query_text += ` OFFSET $${paramIndex}`;
    params.push(filters.offset);
    paramIndex++;
  }

  const result = await query(query_text, params);
  return result.rows;
};

export const updateTicket = async (
  ticketId: string,
  orgId: string,
  updates: Record<string, any>,
  userId: string
) => {
  // status is managed exclusively by GitHub webhooks/polling — never via API update
  const allowedFields = ['title', 'description', 'priority', 'assigned_to'];
  const updateFields: string[] = [];
  const updateValues: any[] = [];
  let paramIndex = 1;

  Object.entries(updates).forEach(([key, value]) => {
    if (allowedFields.includes(key)) {
      updateFields.push(`${key} = $${paramIndex}`);
      updateValues.push(value);
      paramIndex++;
    }
  });

  if (updateFields.length === 0) {
    throw new ValidationErrorClass('No valid fields to update');
  }

  updateFields.push(`updated_at = $${paramIndex}`);
  updateValues.push(new Date());
  paramIndex++;

  updateValues.push(ticketId, orgId);

  const result = await query(
    `UPDATE tickets SET ${updateFields.join(', ')}
     WHERE id = $${paramIndex} AND organisation_id = $${paramIndex + 1}
     RETURNING *`,
    updateValues
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('Ticket');
  }

  // Log activity
  await logTicketActivity(ticketId, userId, 'updated', null, JSON.stringify(updates));

  return result.rows[0];
};

export const deleteTicket = async (ticketId: string, orgId: string) => {
  const result = await query(
    'DELETE FROM tickets WHERE id = $1 AND organisation_id = $2',
    [ticketId, orgId]
  );
  return (result.rowCount ?? 0) > 0;
};

export const logTicketActivity = async (
  ticketId: string,
  userId: string | null,
  action: string,
  oldValue: string | null,
  newValue: string
) => {
  await query(
    `INSERT INTO ticket_activity (ticket_id, user_id, action, old_value, new_value)
     VALUES ($1, $2, $3, $4, $5)`,
    [ticketId, userId, action, oldValue, newValue]
  );
};

export const getTicketActivity = async (ticketId: string) => {
  const result = await query(
    `SELECT ta.*, COALESCE(u.name, 'System') AS name, COALESCE(u.email, '') AS email FROM ticket_activity ta
     LEFT JOIN users u ON ta.user_id = u.id
     WHERE ta.ticket_id = $1
     ORDER BY ta.created_at DESC`,
    [ticketId]
  );
  return result.rows;
};

export const addAttachment = async (
  ticketId: string,
  filename: string,
  fileUrl: string,
  uploadedBy: string
) => {
  const attachmentId = uuidv4();

  await query(
    `INSERT INTO ticket_attachments (id, ticket_id, filename, file_url, uploaded_by)
     VALUES ($1, $2, $3, $4, $5)`,
    [attachmentId, ticketId, filename, fileUrl, uploadedBy]
  );

  return { id: attachmentId, filename, fileUrl };
};

export const getTicketAttachments = async (ticketId: string) => {
  const result = await query(
    'SELECT * FROM ticket_attachments WHERE ticket_id = $1 ORDER BY created_at DESC',
    [ticketId]
  );
  return result.rows;
};

export const getAttachmentCount = async (ticketId: string): Promise<number> => {
  const result = await query(
    'SELECT COUNT(*)::int AS count FROM ticket_attachments WHERE ticket_id = $1',
    [ticketId]
  );
  return result.rows[0]?.count ?? 0;
};

export const getComments = async (ticketId: string) => {
  const result = await query(
    `SELECT tc.*, u.name, u.email FROM ticket_comments tc
     JOIN users u ON tc.user_id = u.id
     WHERE tc.ticket_id = $1
     ORDER BY tc.created_at ASC`,
    [ticketId]
  );
  return result.rows;
};

export const addComment = async (ticketId: string, userId: string, commentText: string) => {
  const commentId = uuidv4();
  const result = await query(
    `INSERT INTO ticket_comments (id, ticket_id, user_id, comment)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [commentId, ticketId, userId, commentText]
  );

  // Log activity
  await logTicketActivity(ticketId, userId, 'comment_added', null, commentText.slice(0, 100));

  return result.rows[0];
};
