import dotenv from 'dotenv';
import { Pool, PoolConfig } from 'pg';
import fs from 'fs';
import path from 'path';

dotenv.config();

const MAX_RETRIES = 10;
const RETRY_DELAY_MS = 2000;

const getPoolConfig = (): PoolConfig => {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      'DATABASE_URL is not set. Create backend/.env with your PostgreSQL connection string.'
    );
  }

  const config: PoolConfig = { connectionString };

  if (
    process.env.NODE_ENV === 'production' ||
    connectionString.includes('neon.tech') ||
    connectionString.includes('sslmode=require')
  ) {
    config.ssl = { rejectUnauthorized: false };
  }

  return config;
};

const pool = new Pool(getPoolConfig());

pool.on('error', (err) => {
  console.error('[db] Unexpected pool error:', err.message);
});

export const query = (text: string, params?: any[]) => pool.query(text, params);

export const getClient = () => pool.connect();

export const checkDatabaseConnection = async (): Promise<void> => {
  await pool.query('SELECT 1');
};

export const waitForDatabase = async (retries = MAX_RETRIES): Promise<void> => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await checkDatabaseConnection();
      return;
    } catch (error: any) {
      const isLastAttempt = attempt === retries;
      console.warn(
        `[db] Connection attempt ${attempt}/${retries} failed: ${error.message}`
      );

      if (isLastAttempt) {
        throw new Error(
          `Could not connect to PostgreSQL after ${retries} attempts. ` +
            'Ensure PostgreSQL is running and DATABASE_URL is correct.'
        );
      }

      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    }
  }
};

export const initializeDatabase = async () => {
  await waitForDatabase();

  const schemaPath = path.join(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf-8');

  try {
    await query(schema);
    console.log('[db] Database schema initialized successfully');
  } catch (error) {
    console.error('[db] Error initializing database:', error);
    throw error;
  }
};

export const closeDatabase = async (): Promise<void> => {
  try {
    await pool.end();
    console.log('[db] Database connection closed.');
  } catch (error) {
    console.error('[db] Error closing database connection:', error);
  }
};

export default pool;
