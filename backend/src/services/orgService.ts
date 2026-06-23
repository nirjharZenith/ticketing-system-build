import { query } from '../db';
import { v4 as uuidv4 } from 'uuid';
import * as authService from './authService';
import { isValidEmail, isValidPassword, isValidUserName } from '../utils/validation';
import { ValidationError as ValidationErrorClass, NotFoundError } from '../middleware/errorHandler';

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
      throw new ValidationErrorClass('User already in organization');
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
    throw new ValidationErrorClass('Cannot remove yourself from the organization');
  }

  const targetMembership = await query(
    'SELECT role FROM user_organisations WHERE user_id = $1 AND organisation_id = $2',
    [userId, orgId]
  );

  if (targetMembership.rows.length === 0) {
    throw new ValidationErrorClass('User is not a member of this organization');
  }

  if (targetMembership.rows[0].role === 'admin') {
    throw new ValidationErrorClass('Cannot remove an admin from the organization');
  }

  await query(
    'DELETE FROM user_organisations WHERE user_id = $1 AND organisation_id = $2',
    [userId, orgId]
  );
  return true;
};

export const inviteMemberToOrganization = async (
  orgId: string,
  email: string,
  name: string,
  password: string,
  role: string = 'user'
) => {
  const normalizedEmail = email.toLowerCase().trim();

  if (!isValidEmail(normalizedEmail)) {
    throw new Error('Valid email required');
  }

  if (!isValidUserName(name)) {
    throw new Error('Name must be between 2 and 100 characters');
  }

  if (!isValidPassword(password)) {
    throw new Error('Password must be at least 8 characters with uppercase, number, and special character');
  }

  const existingUser = await query('SELECT id, name FROM users WHERE email = $1', [normalizedEmail]);

  let userId: string;
  let userName: string;
  let created = false;

  if (existingUser.rows.length > 0) {
    userId = existingUser.rows[0].id;
    userName = existingUser.rows[0].name;

    const membership = await query(
      'SELECT role FROM user_organisations WHERE user_id = $1 AND organisation_id = $2',
      [userId, orgId]
    );

    if (membership.rows.length > 0) {
      throw new Error('User is already a member of this organization');
    }
  } else {
    const newUser = await authService.createUser(normalizedEmail, name.trim(), password);
    userId = newUser.id;
    userName = newUser.name;
    created = true;
  }

  await addUserToOrganization(orgId, userId, role);

  return { id: userId, email: normalizedEmail, name: userName, role, created };
};
