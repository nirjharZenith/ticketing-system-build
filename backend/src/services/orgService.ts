import { query } from '../db';
import { v4 as uuidv4 } from 'uuid';

export const createOrganization = async (name: string, userId: string) => {
  const orgId = uuidv4();
  const slug = name.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

  await query(
    'INSERT INTO organisations (id, name, slug, created_by) VALUES ($1, $2, $3, $4)',
    [orgId, name.trim(), slug, userId]
  );

  await query(
    'INSERT INTO user_organisations (user_id, organisation_id, role) VALUES ($1, $2, $3)',
    [userId, orgId, 'admin']
  );

  return { id: orgId, name: name.trim(), slug };
};

export const getUserOrganizations = async (userId: string) => {
  const result = await query(
    `SELECT o.id, o.name, o.slug, uo.role
     FROM organisations o
     INNER JOIN user_organisations uo ON o.id = uo.organisation_id
     WHERE uo.user_id = $1
     ORDER BY o.created_at DESC`,
    [userId]
  );
  return result.rows;
};

export const addUserToOrganization = async (orgId: string, userId: string, role: string = 'user') => {
  try {
    await query(
      'INSERT INTO user_organisations (user_id, organisation_id, role) VALUES ($1, $2, $3)',
      [userId, orgId, role]
    );
    return true;
  } catch (error: any) {
    if (error.code === '23505') {
      throw new Error('User already in organization');
    }
    throw error;
  }
};

export const getOrganizationMembers = async (orgId: string) => {
  const result = await query(
    `SELECT u.id, u.email, u.name, uo.role
     FROM users u
     INNER JOIN user_organisations uo ON u.id = uo.user_id
     WHERE uo.organisation_id = $1 AND u.is_active = true`,
    [orgId]
  );
  return result.rows;
};

export const removeUserFromOrganization = async (orgId: string, userId: string, requestingUserId?: string) => {
  if (requestingUserId && requestingUserId === userId) {
    throw new Error('Cannot remove yourself from the organization');
  }

  await query(
    'DELETE FROM user_organisations WHERE user_id = $1 AND organisation_id = $2',
    [userId, orgId]
  );
  return true;
};
