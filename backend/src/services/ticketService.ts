import { query } from '../db';
import { v4 as uuidv4 } from 'uuid';

export const createTicket = async (
  orgId: string,
  creatorId: string,
  title: string,
  description: string,
  priority: string = 'medium'
) => {
  const ticketId = uuidv4();

  try {
    await query(
      `INSERT INTO tickets (id, organisation_id, creator_id, title, description, priority)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [ticketId, orgId, creatorId, title, description, priority]
    );

    // Log activity
    await logTicketActivity(ticketId, creatorId, 'created', null, `Ticket created`);

    return { id: ticketId, title, description, priority, status: 'open' };
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
    throw new Error('Ticket not found');
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

  const result = await query(query_text, params);
  return result.rows;
};

export const updateTicket = async (
  ticketId: string,
  orgId: string,
  updates: Record<string, any>,
  userId: string
) => {
  const allowedFields = ['title', 'description', 'priority', 'status', 'assigned_to'];
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
    throw new Error('No valid fields to update');
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
    throw new Error('Ticket not found');
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
  userId: string,
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
    `SELECT ta.*, u.name, u.email FROM ticket_activity ta
     JOIN users u ON ta.user_id = u.id
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
