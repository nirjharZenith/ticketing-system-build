import { Router, Response, Router as ExpressRouter } from 'express';
import { AuthRequest, authenticateToken } from '../middleware/auth';
import * as authService from '../services/authService';
import { validateUserRegistration, ValidationException } from '../utils/validation';
import { AuthenticationError, ValidationError as ValidationErrorClass } from '../middleware/errorHandler';

const router: ExpressRouter = Router();

// Register
router.post('/register', async (req: AuthRequest, res: Response, next: any) => {
  try {
    const { email, name, password, confirmPassword } = req.body;

    // Validate input
    const validationErrors = validateUserRegistration({ email, name, password, confirmPassword });
    if (validationErrors.length > 0) {
      throw new ValidationException(validationErrors);
    }

    const user = await authService.createUser(email, name, password);
    res.status(201).json({ success: true, user });
  } catch (error) {
    next(error);
  }
});

// Login
router.post('/login', async (req: AuthRequest, res: Response, next: any) => {
  try {
    const { email, password } = req.body;

    if (!email || typeof email !== 'string' || email.trim().length === 0) {
      throw new ValidationErrorClass('Email is required', { field: 'email' });
    }

    if (!password || typeof password !== 'string' || password.length === 0) {
      throw new ValidationErrorClass('Password is required', { field: 'password' });
    }

    const { user, token } = await authService.authenticateUser(email.toLowerCase().trim(), password);
    res.json({ success: true, user, token });
  } catch (error) {
    next(error);
  }
});

// Get current user
router.get('/me', authenticateToken, async (req: AuthRequest, res: Response, next: any) => {
  try {
    if (!req.user) {
      throw new AuthenticationError('Unauthorized');
    }

    const user = await authService.getUserById(req.user.id);
    res.json({ success: true, user });
  } catch (error) {
    next(error);
  }
});

// Verify token
router.post('/verify', async (req: AuthRequest, res: Response, next: any) => {
  try {
    const { token } = req.body;

    if (!token || typeof token !== 'string') {
      throw new ValidationErrorClass('Token is required', { field: 'token' });
    }

    const decoded = authService.verifyToken(token);
    res.json({ success: true, valid: true, decoded });
  } catch (error) {
    next(error);
  }
});

export default router;
