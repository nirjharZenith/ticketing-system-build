import dotenv from 'dotenv';
import { initializeDatabase } from './db';
import { createApp } from './app';

dotenv.config();

const PORT = process.env.BACKEND_PORT || 5000;
const app = createApp();

const startServer = async () => {
  try {
    await initializeDatabase();
    console.log('[v0] Database initialized');
    app.listen(PORT, () => {
      console.log(`[v0] Backend server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('[v0] Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;
