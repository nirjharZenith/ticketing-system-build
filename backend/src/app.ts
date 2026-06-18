import express, { Express } from 'express';
import cors from 'cors';
import path from 'path';
import authRoutes from './routes/auth';
import orgRoutes from './routes/organizations';
import ticketRoutes from './routes/tickets';
import uploadRoutes from './routes/uploads';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger, getHealthMetrics } from './middleware/logger';
import { globalRateLimiter, authRateLimiter } from './middleware/rateLimiter';

export function createApp(): Express {
  const app: Express = express();

  // Request logging
  app.use(requestLogger);

  // Rate limiting (disabled in test/development environments)
  if (process.env.NODE_ENV === 'production') {
    app.use('/api/auth', authRateLimiter);
    app.use('/api/', globalRateLimiter);
  }

  // CORS
  app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    optionsSuccessStatus: 200,
  }));

  // Body parsing with size limits
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ limit: '1mb', extended: true }));

  // Static file serving
  app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

  // Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/orgs', orgRoutes);
  app.use('/api/tickets', ticketRoutes);
  app.use('/api/uploads', uploadRoutes);

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', metrics: getHealthMetrics() });
  });

  // 404 fallthrough
  app.use((_req, res) => {
    res.status(404).json({
      success: false,
      code: 'NOT_FOUND',
      message: 'Endpoint not found',
    });
  });

  // Global error handler (must be last)
  app.use(errorHandler as express.ErrorRequestHandler);

  return app;
}
