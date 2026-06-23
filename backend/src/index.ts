import dotenv from 'dotenv';
import { initializeDatabase, closeDatabase } from './db';
import { createApp } from './app';
import { logger } from './middleware/logger';
import http from 'http';

dotenv.config();

const PORT = process.env.BACKEND_PORT || 5000;
const app = createApp();

let server: http.Server;

const startServer = async () => {
  try {
    logger.info('[server] Waiting for database connection...');
    await initializeDatabase();
    logger.info('[server] Database ready');
    
    server = app.listen(PORT, () => {
      logger.info(`[server] Backend running on http://localhost:${PORT}`);
      logger.info(`[server] Health check: http://localhost:${PORT}/api/health`);
    });

    const shutdown = async (signal: string) => {
      logger.info(`[server] Received ${signal}. Starting graceful shutdown...`);
      if (server) {
        server.close(async () => {
          logger.info('[server] HTTP server closed.');
          await closeDatabase();
          process.exit(0);
        });
      } else {
        await closeDatabase();
        process.exit(0);
      }
      
      // Force shutdown after 10 seconds
      setTimeout(() => {
        logger.error('[server] Graceful shutdown timeout, forcing exit.');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (error) {
    logger.error('[server] Failed to start:', { error: error instanceof Error ? error.message : String(error) });
    process.exit(1);
  }
};

startServer();

export default app;
