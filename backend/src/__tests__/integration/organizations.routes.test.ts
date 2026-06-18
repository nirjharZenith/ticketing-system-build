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
      // createOrganization: INSERT INTO organisations
      .mockResolvedValueOnce({ rows: [{ id: TEST_ORG_ID, name: 'ACME', created_at: new Date() }], rowCount: 1 })
      // createOrganization: INSERT INTO user_organisations
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
// GET /api/orgs/:org_id/members – list members (admin only)
// ---------------------------------------------------------------------------
describe('GET /api/orgs/:org_id/members', () => {
  it('200 – admin can list members', async () => {
    // authorizeRole checks user_organisations for role = admin
    mockQuery.mockResolvedValueOnce({
      rows: [{ role: 'admin' }],
    });
    // getOrganizationMembers query
    mockQuery.mockResolvedValueOnce({
      rows: [
        { id: TEST_USER.id, email: TEST_USER.email, name: 'Alice', role: 'admin' },
        { id: TEST_USER_2.id, email: TEST_USER_2.email, name: 'Bob', role: 'member' },
      ],
    });

    const res = await request(app)
      .get(`/api/orgs/${TEST_ORG_ID}/members`)
      .set('Authorization', bearerHeader(adminToken));

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(2);
  });

  it('403 – non-admin cannot list members', async () => {
    // authorizeRole finds the user as a 'member', not 'admin'
    mockQuery.mockResolvedValueOnce({ rows: [{ role: 'member' }] });

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
  it('201 – admin can invite a member', async () => {
    // authorizeRole
    mockQuery.mockResolvedValueOnce({ rows: [{ role: 'admin' }] });
    // lookup invited user
    mockQuery.mockResolvedValueOnce({ rows: [{ id: TEST_USER_2.id }] });
    // INSERT user_organisations
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

    const res = await request(app)
      .post(`/api/orgs/${TEST_ORG_ID}/members`)
      .set('Authorization', bearerHeader(adminToken))
      .send({ email: TEST_USER_2.email, role: 'member' });

    expect(res.status).toBe(201);
  });

  it('400 – rejects an invalid email', async () => {
    // authorizeRole
    mockQuery.mockResolvedValueOnce({ rows: [{ role: 'admin' }] });

    const res = await request(app)
      .post(`/api/orgs/${TEST_ORG_ID}/members`)
      .set('Authorization', bearerHeader(adminToken))
      .send({ email: 'not-valid', role: 'member' });

    expect(res.status).toBe(400);
  });

  it('403 – non-admin cannot invite', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ role: 'member' }] });

    const res = await request(app)
      .post(`/api/orgs/${TEST_ORG_ID}/members`)
      .set('Authorization', bearerHeader(memberToken))
      .send({ email: 'new@example.com', role: 'member' });

    expect(res.status).toBe(403);
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/orgs/:org_id/members/:user_id – remove member (admin only)
// ---------------------------------------------------------------------------
describe('DELETE /api/orgs/:org_id/members/:user_id', () => {
  it('200 – admin can remove a member', async () => {
    // authorizeRole
    mockQuery.mockResolvedValueOnce({ rows: [{ role: 'admin' }] });
    // removeOrganizationMember
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

    const res = await request(app)
      .delete(`/api/orgs/${TEST_ORG_ID}/members/${TEST_USER_2.id}`)
      .set('Authorization', bearerHeader(adminToken));

    expect(res.status).toBe(200);
  });

  it('400 – cannot remove yourself from the org', async () => {
    // authorizeRole
    mockQuery.mockResolvedValueOnce({ rows: [{ role: 'admin' }] });

    const res = await request(app)
      .delete(`/api/orgs/${TEST_ORG_ID}/members/${TEST_USER.id}`)
      .set('Authorization', bearerHeader(adminToken));

    expect(res.status).toBe(400);
  });

  it('403 – non-admin cannot remove members', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ role: 'member' }] });

    const res = await request(app)
      .delete(`/api/orgs/${TEST_ORG_ID}/members/${TEST_USER_2.id}`)
      .set('Authorization', bearerHeader(memberToken));

    expect(res.status).toBe(403);
  });
});
