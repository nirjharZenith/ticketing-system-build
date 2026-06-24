import express, { Express } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import helmet from 'helmet';
import compression from 'compression';
import authRoutes from './routes/auth';
import orgRoutes from './routes/organizations';
import ticketRoutes from './routes/tickets';
import uploadRoutes from './routes/uploads';
import webhookRoutes from './routes/webhooks';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger, getHealthMetrics, requestIdMiddleware } from './middleware/logger';
import { globalRateLimiter, authRateLimiter } from './middleware/rateLimiter';

// Ensure uploads directory exists at startup (sync — runs once before any request)
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

export function createApp(): Express {
  const app: Express = express();

  app.use(requestIdMiddleware);

  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }));

  app.use(compression());

  // Request logging
  app.use(requestLogger);

  // Auth rate limiter — always active (strict: 10 req / 15 min per IP)
  app.use('/api/auth', authRateLimiter);

  // Global rate limiter — production only (200 req / 15 min)
  if (process.env.NODE_ENV === 'production') {
    app.use('/api/', globalRateLimiter);
  }

  // CORS
  app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    optionsSuccessStatus: 200,
  }));

  // Body parsing with size limits
  app.use(express.json({
    limit: '1mb',
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    },
  }));
  app.use(express.urlencoded({ limit: '1mb', extended: true }));

  // Static file serving
  app.use('/uploads', express.static(uploadsDir));

  // Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/orgs', orgRoutes);
  app.use('/api/tickets', ticketRoutes);
  app.use('/api/uploads', uploadRoutes);
  app.use('/api/webhooks', webhookRoutes);

  // Health check
  app.get('/api/health', async (_req, res) => {
    try {
      const { checkDatabaseConnection } = await import('./db');
      await checkDatabaseConnection();
      res.json({ status: 'ok', database: 'connected', metrics: getHealthMetrics() });
    } catch {
      res.status(503).json({ status: 'degraded', database: 'disconnected', metrics: getHealthMetrics() });
    }
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
