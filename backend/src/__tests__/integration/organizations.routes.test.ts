/**
 * Integration tests for /api/orgs routes.
 */
import request from 'supertest';
import { mockQuery } from '../../__mocks__/db';
import { buildTestApp } from '../helpers/testApp';
import {
  TEST_USER,
  TEST_USER_2,
  TEST_ORG_ID,
  makeToken,
  bearerHeader,
} from '../helpers/tokenFactory';

jest.mock('../../db');

const app = buildTestApp();
const adminToken = makeToken(TEST_USER);
const memberToken = makeToken(TEST_USER_2);

beforeEach(() => jest.clearAllMocks());

// ---------------------------------------------------------------------------
// POST /api/orgs  – create organisation
// ---------------------------------------------------------------------------
describe('POST /api/orgs', () => {
  it('201 – creates an organization and returns it', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: TEST_ORG_ID, name: 'ACME', created_at: new Date() }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [], rowCount: 1 });

    const res = await request(app)
      .post('/api/orgs')
      .set('Authorization', bearerHeader(adminToken))
      .send({ name: 'ACME' });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.name).toBe('ACME');
  });

  it('400 – rejects a missing name', async () => {
    const res = await request(app)
      .post('/api/orgs')
      .set('Authorization', bearerHeader(adminToken))
      .send({});
    expect(res.status).toBe(400);
  });

  it('400 – rejects a name that is only whitespace', async () => {
    const res = await request(app)
      .post('/api/orgs')
      .set('Authorization', bearerHeader(adminToken))
      .send({ name: '   ' });
    expect(res.status).toBe(400);
  });

  it('401 – returns 401 without a token', async () => {
    const res = await request(app).post('/api/orgs').send({ name: 'X' });
    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// GET /api/orgs  – list organisations for the current user
// ---------------------------------------------------------------------------
describe('GET /api/orgs', () => {
  it('200 – returns a list of organizations', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        { id: TEST_ORG_ID, name: 'ACME', role: 'admin', created_at: new Date() },
      ],
    });

    const res = await request(app)
      .get('/api/orgs')
      .set('Authorization', bearerHeader(adminToken));

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0].id).toBe(TEST_ORG_ID);
  });

  it('200 – returns an empty array when user has no organisations', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .get('/api/orgs')
      .set('Authorization', bearerHeader(adminToken));

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('401 – returns 401 without a token', async () => {
    const res = await request(app).get('/api/orgs');
    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// GET /api/orgs/:org_id/members – list members (all org members)
// ---------------------------------------------------------------------------
describe('GET /api/orgs/:org_id/members', () => {
  it('200 – admin can list members with management access', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ role: 'admin' }] });
    mockQuery.mockResolvedValueOnce({
      rows: [
        { id: TEST_USER.id, email: TEST_USER.email, name: 'Alice', role: 'admin' },
        { id: TEST_USER_2.id, email: TEST_USER_2.email, name: 'Bob', role: 'user' },
      ],
    });

    const res = await request(app)
      .get(`/api/orgs/${TEST_ORG_ID}/members`)
      .set('Authorization', bearerHeader(adminToken));

    expect(res.status).toBe(200);
    expect(res.body.members).toHaveLength(2);
    expect(res.body.access.canInviteMembers).toBe(true);
    expect(res.body.access.canRemoveMembers).toBe(true);
  });

  it('200 – regular members can list teammates read-only', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ role: 'user' }] });
    mockQuery.mockResolvedValueOnce({
      rows: [
        { id: TEST_USER.id, email: TEST_USER.email, name: 'Alice', role: 'admin' },
        { id: TEST_USER_2.id, email: TEST_USER_2.email, name: 'Bob', role: 'user' },
      ],
    });

    const res = await request(app)
      .get(`/api/orgs/${TEST_ORG_ID}/members`)
      .set('Authorization', bearerHeader(memberToken));

    expect(res.status).toBe(200);
    expect(res.body.members).toHaveLength(2);
    expect(res.body.access.canInviteMembers).toBe(false);
    expect(res.body.access.canRemoveMembers).toBe(false);
  });

  it('403 – non-members cannot list members', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .get(`/api/orgs/${TEST_ORG_ID}/members`)
      .set('Authorization', bearerHeader(memberToken));

    expect(res.status).toBe(403);
  });

  it('401 – returns 401 without a token', async () => {
    const res = await request(app).get(`/api/orgs/${TEST_ORG_ID}/members`);
    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// POST /api/orgs/:org_id/members – invite a member (admin only)
// ---------------------------------------------------------------------------
describe('POST /api/orgs/:org_id/members', () => {
  it('201 – admin can add a new team member with credentials', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ role: 'admin' }] });
    mockQuery.mockResolvedValueOnce({ rows: [] });
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

    const res = await request(app)
      .post(`/api/orgs/${TEST_ORG_ID}/members`)
      .set('Authorization', bearerHeader(adminToken))
      .send({
        email: 'new@example.com',
        name: 'New User',
        password: 'Password1!',
        role: 'user',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.member.email).toBe('new@example.com');
  });

  it('400 – rejects missing password', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ role: 'admin' }] });

    const res = await request(app)
      .post(`/api/orgs/${TEST_ORG_ID}/members`)
      .set('Authorization', bearerHeader(adminToken))
      .send({ email: TEST_USER_2.email, name: 'Bob', role: 'user' });

    expect(res.status).toBe(400);
  });

  it('400 – rejects an invalid email', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ role: 'admin' }] });

    const res = await request(app)
      .post(`/api/orgs/${TEST_ORG_ID}/members`)
      .set('Authorization', bearerHeader(adminToken))
      .send({ email: 'not-valid', name: 'Bob', password: 'Password1!', role: 'user' });

    expect(res.status).toBe(400);
  });

  it('403 – regular members cannot invite teammates', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ role: 'user' }] });

    const res = await request(app)
      .post(`/api/orgs/${TEST_ORG_ID}/members`)
      .set('Authorization', bearerHeader(memberToken))
      .send({ email: 'new@example.com', name: 'New', password: 'Password1!', role: 'user' });

    expect(res.status).toBe(403);
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/orgs/:org_id/members/:user_id – remove member (admin only)
// ---------------------------------------------------------------------------
describe('DELETE /api/orgs/:org_id/members/:user_id', () => {
  it('200 – admin can remove a member', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ role: 'admin' }] });
    mockQuery.mockResolvedValueOnce({ rows: [{ role: 'user' }] });
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

    const res = await request(app)
      .delete(`/api/orgs/${TEST_ORG_ID}/members/${TEST_USER_2.id}`)
      .set('Authorization', bearerHeader(adminToken));

    expect(res.status).toBe(200);
  });

  it('400 – cannot remove yourself from the org', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ role: 'admin' }] });

    const res = await request(app)
      .delete(`/api/orgs/${TEST_ORG_ID}/members/${TEST_USER.id}`)
      .set('Authorization', bearerHeader(adminToken));

    expect(res.status).toBe(400);
  });

  it('400 – cannot remove another admin', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ role: 'admin' }] });
    mockQuery.mockResolvedValueOnce({ rows: [{ role: 'admin' }] });

    const res = await request(app)
      .delete(`/api/orgs/${TEST_ORG_ID}/members/${TEST_USER_2.id}`)
      .set('Authorization', bearerHeader(adminToken));

    expect(res.status).toBe(400);
  });

  it('403 – regular members cannot remove teammates', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ role: 'user' }] });

    const res = await request(app)
      .delete(`/api/orgs/${TEST_ORG_ID}/members/${TEST_USER_2.id}`)
      .set('Authorization', bearerHeader(memberToken));

    expect(res.status).toBe(403);
  });
});
