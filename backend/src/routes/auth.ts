import express, { Router, Response } from 'express';

import { AuthRequest, authenticateToken } from '../middleware/auth';
import * as authService from '../services/authService';
import { validateUserRegistration, ValidationException } from '../utils/validation';
import { AuthenticationError, ValidationError as ValidationErrorClass, asyncHandler } from '../middleware/errorHandler';

const router: express.Router = express.Router();

// Register
router.post(
  '/register',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { email, name, password, confirmPassword } = req.body;

    const validationErrors = validateUserRegistration({ email, name, password, confirmPassword });
    if (validationErrors.length > 0) {
      throw new ValidationException(validationErrors);
    }

    const user = await authService.createUser(email, name, password);
    res.status(201).json({ success: true, user });
  })
);

// Login
router.post(
  '/login',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { email, password } = req.body;

    if (!email || typeof email !== 'string' || email.trim().length === 0) {
      throw new ValidationErrorClass('Email is required', { field: 'email' });
    }

    if (!password || typeof password !== 'string' || password.length === 0) {
      throw new ValidationErrorClass('Password is required', { field: 'password' });
    }

    const { user, token } = await authService.authenticateUser(email.toLowerCase().trim(), password);
    res.json({ success: true, user, token });
  })
);

// Get current user
router.get(
  '/me',
  authenticateToken,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      throw new AuthenticationError('Unauthorized');
    }

    const user = await authService.getUserById(req.user.id);
    res.json({
      success: true,
      user: { id: user.id, email: user.email, name: user.name },
    });
  })
);

// Verify token
router.post(
  '/verify',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { token } = req.body;

    if (!token || typeof token !== 'string') {
      throw new ValidationErrorClass('Token is required', { field: 'token' });
    }

    const user = await authService.getUserFromToken(token);
    res.json({
      success: true,
      valid: true,
      user: { id: user.id, email: user.email, name: user.name },
    });
  })
);

export default router;
