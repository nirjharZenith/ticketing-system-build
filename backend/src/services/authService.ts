import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../db';
import { v4 as uuidv4 } from 'uuid';
import { AuthenticationError, ConflictError } from '../middleware/errorHandler';

const JWT_EXPIRY = '24h';

const getJwtSecret = () => process.env.JWT_SECRET || 'your-secret-key';

export const createUser = async (email: string, name: string, password: string) => {
  const hashedPassword = await bcryptjs.hash(password, 10);
  const userId = uuidv4();

  try {
    await query(
      'INSERT INTO users (id, email, name, password_hash) VALUES ($1, $2, $3, $4)',
      [userId, email, name, hashedPassword]
    );
    return { id: userId, email, name };
  } catch (error: any) {
    if (error.code === '23505') {
      throw new ConflictError('Email already exists');
    }
    throw error;
  }
};

export const authenticateUser = async (email: string, password: string) => {
  // Add slight delay to prevent timing attacks
  const startTime = Date.now();
  
  const result = await query('SELECT * FROM users WHERE email = $1 AND is_active = true', [email]);

  if (result.rows.length === 0) {
    // Still perform bcrypt comparison to maintain consistent timing
    await bcryptjs.compare(password, '$2a$10$dummyhashvaluetopreventtimingattacks');
    throw new AuthenticationError('Invalid email or password');
  }

  const user = result.rows[0];
  const isPasswordValid = await bcryptjs.compare(password, user.password_hash);

  if (!isPasswordValid) {
    throw new AuthenticationError('Invalid email or password');
  }

  // Ensure minimum time to prevent timing attacks
  const elapsed = Date.now() - startTime;
  if (elapsed < 100) {
    await new Promise(resolve => setTimeout(resolve, 100 - elapsed));
  }

  const token = jwt.sign(
    { id: user.id, email: user.email },
    getJwtSecret(),
    { expiresIn: JWT_EXPIRY }
  );

  return {
    user: { id: user.id, email: user.email, name: user.name },
    token,
  };
};

export const getUserById = async (userId: string) => {
  const result = await query('SELECT id, email, name, created_at FROM users WHERE id = $1', [userId]);
  if (result.rows.length === 0) {
    throw new Error('User not found');
  }
  return result.rows[0];
};

export const verifyToken = (token: string) => {
  try {
    return jwt.verify(token, getJwtSecret());
  } catch (error) {
    throw new AuthenticationError('Invalid token');
  }
};
