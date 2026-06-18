/**
 * Integration tests for /api/tickets routes.
 * Covers: create, list, get, update, delete tickets.
 * All email sends are mocked so no SMTP connection is needed.
 */
import request from 'supertest';
import { mockQuery } from '../../__mocks__/db';
import { buildTestApp } from '../helpers/testApp';
import {
  TEST_USER,
  TEST_USER_2,
  TEST_ORG_ID,
  TEST_TICKET_ID,
  makeToken,
  bearerHeader,
} from '../helpers/tokenFactory';

jest.mock('../../db');
jest.mock('../../services/emailService', () => ({
  sendTicketCreatedEmail: jest.fn().mockResolvedValue(undefined),
  sendTicketUpdatedEmail: jest.fn().mockResolvedValue(undefined),
  sendAssignmentEmail: jest.fn().mockResolvedValue(undefined),
}));

const app = buildTestApp();
const token = makeToken(TEST_USER);
const otherToken = makeToken(TEST_USER_2);

/** Mocks the checkOrgMembership middleware to pass with a given role. */
function mockMembership(role: 'admin' | 'member' = 'member') {
  mockQuery.mockResolvedValueOnce({ rows: [{ role }] });
}

beforeEach(() => jest.clearAllMocks());

// ---------------------------------------------------------------------------
// POST /:org_id/tickets – create ticket
// ---------------------------------------------------------------------------
describe('POST /api/tickets/:org_id/tickets', () => {
  const validTicket = { title: 'Fix login bug', description: 'Users cannot log in', priority: 'high' };

  it('201 – creates a ticket for an org member', async () => {
    mockMembership();
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: TEST_TICKET_ID, title: 'Fix login bug', status: 'open', priority: 'high' }],
    });
    // email: fetch members
    mockQuery.mockResolvedValueOnce({ rows: [] });
    // email: fetch creator name
    mockQuery.mockResolvedValueOnce({ rows: [{ name: 'Alice' }] });

    const res = await request(app)
      .post(`/api/tickets/${TEST_ORG_ID}/tickets`)
      .set('Authorization', bearerHeader(token))
      .send(validTicket);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.ticket.title).toBe('Fix login bug');
  });

  it('400 – rejects a missing title', async () => {
    mockMembership();
    const res = await request(app)
      .post(`/api/tickets/${TEST_ORG_ID}/tickets`)
      .set('Authorization', bearerHeader(token))
      .send({ description: 'no title', priority: 'low' });
    expect(res.status).toBe(400);
  });

  it('400 – rejects an invalid priority value', async () => {
    mockMembership();
    const res = await request(app)
      .post(`/api/tickets/${TEST_ORG_ID}/tickets`)
      .set('Authorization', bearerHeader(token))
      .send({ title: 'Bug', priority: 'extreme' });
    expect(res.status).toBe(400);
  });

  it('400 – rejects a title longer than 200 characters', async () => {
    mockMembership();
    const res = await request(app)
      .post(`/api/tickets/${TEST_ORG_ID}/tickets`)
      .set('Authorization', bearerHeader(token))
      .send({ title: 'a'.repeat(201), priority: 'low' });
    expect(res.status).toBe(400);
  });

  it('403 – non-member cannot create a ticket (IDOR guard)', async () => {
    // checkOrgMembership returns no rows → access denied
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const res = await request(app)
      .post(`/api/tickets/${TEST_ORG_ID}/tickets`)
      .set('Authorization', bearerHeader(otherToken))
      .send(validTicket);
    expect(res.status).toBe(403);
  });

  it('404 – org_id that is not a valid UUID returns 404', async () => {
    const res = await request(app)
      .post('/api/tickets/not-a-uuid/tickets')
      .set('Authorization', bearerHeader(token))
      .send(validTicket);
    expect(res.status).toBe(404);
  });

  it('401 – returns 401 without a token', async () => {
    const res = await request(app)
      .post(`/api/tickets/${TEST_ORG_ID}/tickets`)
      .send(validTicket);
    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// GET /:org_id/tickets – list tickets
// ---------------------------------------------------------------------------
describe('GET /api/tickets/:org_id/tickets', () => {
  it('200 – returns an array of tickets', async () => {
    mockMembership();
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: TEST_TICKET_ID, title: 'Bug', status: 'open', priority: 'high' }],
    });

    const res = await request(app)
      .get(`/api/tickets/${TEST_ORG_ID}/tickets`)
      .set('Authorization', bearerHeader(token));

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0].id).toBe(TEST_TICKET_ID);
  });

  it('200 – returns an empty array when there are no tickets', async () => {
    mockMembership();
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .get(`/api/tickets/${TEST_ORG_ID}/tickets`)
      .set('Authorization', bearerHeader(token));

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('403 – non-member cannot list tickets', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] }); // membership check fails
    const res = await request(app)
      .get(`/api/tickets/${TEST_ORG_ID}/tickets`)
      .set('Authorization', bearerHeader(otherToken));
    expect(res.status).toBe(403);
  });
});

// ---------------------------------------------------------------------------
// GET /:org_id/tickets/:ticket_id – get single ticket
// ---------------------------------------------------------------------------
describe('GET /api/tickets/:org_id/tickets/:ticket_id', () => {
  it('200 – returns the ticket', async () => {
    mockMembership();
    mockQuery
      // getTicketById
      .mockResolvedValueOnce({
        rows: [{ id: TEST_TICKET_ID, title: 'Bug', status: 'open', priority: 'high' }],
      });

    const res = await request(app)
      .get(`/api/tickets/${TEST_ORG_ID}/tickets/${TEST_TICKET_ID}`)
      .set('Authorization', bearerHeader(token));

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(TEST_TICKET_ID);
  });

  it('404 – returns 404 for a non-existent ticket', async () => {
    mockMembership();
    mockQuery.mockResolvedValueOnce({ rows: [] }); // ticket not found

    const res = await request(app)
      .get(`/api/tickets/${TEST_ORG_ID}/tickets/${TEST_TICKET_ID}`)
      .set('Authorization', bearerHeader(token));

    expect(res.status).toBe(404);
  });

  it('403 – non-member cannot read a ticket (IDOR guard)', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] }); // membership check
    const res = await request(app)
      .get(`/api/tickets/${TEST_ORG_ID}/tickets/${TEST_TICKET_ID}`)
      .set('Authorization', bearerHeader(otherToken));
    expect(res.status).toBe(403);
  });
});

// ---------------------------------------------------------------------------
// PATCH /:org_id/tickets/:ticket_id – update ticket
// ---------------------------------------------------------------------------
describe('PATCH /api/tickets/:org_id/tickets/:ticket_id', () => {
  it('200 – creator can update own ticket', async () => {
    mockMembership('member');
    // SELECT creator_id check
    mockQuery.mockResolvedValueOnce({ rows: [{ creator_id: TEST_USER.id, title: 'Bug' }] });
    // UPDATE tickets RETURNING *
    mockQuery.mockResolvedValueOnce({ rows: [{ id: TEST_TICKET_ID, status: 'in_progress' }] });
    // INSERT ticket_activity (inside updateTicket)
    mockQuery.mockResolvedValueOnce({ rows: [] });
    // email: members for status change notification
    mockQuery.mockResolvedValueOnce({ rows: [] });
    // email: updater name
    mockQuery.mockResolvedValueOnce({ rows: [{ name: 'Alice' }] });

    const res = await request(app)
      .patch(`/api/tickets/${TEST_ORG_ID}/tickets/${TEST_TICKET_ID}`)
      .set('Authorization', bearerHeader(token))
      .send({ status: 'in_progress' });

    expect(res.status).toBe(200);
  });

  it('200 – admin can update any ticket', async () => {
    mockMembership('admin');
    // SELECT creator_id check
    mockQuery.mockResolvedValueOnce({ rows: [{ creator_id: TEST_USER_2.id, title: 'Bug' }] });
    // UPDATE tickets RETURNING *
    mockQuery.mockResolvedValueOnce({ rows: [{ id: TEST_TICKET_ID, status: 'closed' }] });
    // INSERT ticket_activity
    mockQuery.mockResolvedValueOnce({ rows: [] });
    // email: members
    mockQuery.mockResolvedValueOnce({ rows: [] });
    // email: updater name
    mockQuery.mockResolvedValueOnce({ rows: [{ name: 'Admin' }] });

    const res = await request(app)
      .patch(`/api/tickets/${TEST_ORG_ID}/tickets/${TEST_TICKET_ID}`)
      .set('Authorization', bearerHeader(token))
      .send({ status: 'closed' });

    expect(res.status).toBe(200);
  });

  it('403 – non-creator member cannot update another user ticket', async () => {
    mockMembership('member');
    // owned by TEST_USER
    mockQuery.mockResolvedValueOnce({ rows: [{ creator_id: TEST_USER.id, title: 'Bug' }] });

    const res = await request(app)
      .patch(`/api/tickets/${TEST_ORG_ID}/tickets/${TEST_TICKET_ID}`)
      .set('Authorization', bearerHeader(otherToken)) // TEST_USER_2 attempts update
      .send({ status: 'closed' });

    expect(res.status).toBe(403);
  });

  it('404 – returns 404 when ticket does not exist', async () => {
    mockMembership('admin');
    mockQuery.mockResolvedValueOnce({ rows: [] }); // SELECT creator_id returns nothing

    const res = await request(app)
      .patch(`/api/tickets/${TEST_ORG_ID}/tickets/${TEST_TICKET_ID}`)
      .set('Authorization', bearerHeader(token))
      .send({ status: 'closed' });

    expect(res.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// DELETE /:org_id/tickets/:ticket_id – delete ticket
// ---------------------------------------------------------------------------
describe('DELETE /api/tickets/:org_id/tickets/:ticket_id', () => {
  it('200 – admin can delete a ticket', async () => {
    mockMembership('admin');
    // DELETE FROM tickets RETURNING – rowCount=1 means success
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

    const res = await request(app)
      .delete(`/api/tickets/${TEST_ORG_ID}/tickets/${TEST_TICKET_ID}`)
      .set('Authorization', bearerHeader(token));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('403 – regular member cannot delete a ticket', async () => {
    mockMembership('member'); // role = member, not admin

    const res = await request(app)
      .delete(`/api/tickets/${TEST_ORG_ID}/tickets/${TEST_TICKET_ID}`)
      .set('Authorization', bearerHeader(token));

    expect(res.status).toBe(403);
  });

  it('404 – returns 404 when ticket does not exist', async () => {
    mockMembership('admin');
    // DELETE affects 0 rows → rowCount = 0
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const res = await request(app)
      .delete(`/api/tickets/${TEST_ORG_ID}/tickets/${TEST_TICKET_ID}`)
      .set('Authorization', bearerHeader(token));

    expect(res.status).toBe(404);
  });
});
