import { query, checkDatabaseConnection } from '../db';

async function migrateStatuses() {
  try {
    console.log('Connecting to database...');
    await checkDatabaseConnection();

    console.log('Updating check constraint...');
    await query(`
      DO $$
      BEGIN
        ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_status_check;
        ALTER TABLE tickets ADD CONSTRAINT tickets_status_check CHECK (status IN ('To triage', 'Backlog', 'Ready', 'In progress', 'In review', 'Done', 'open', 'in_progress', 'in_verification', 'resolved', 'closed'));
      EXCEPTION
        WHEN OTHERS THEN
          NULL;
      END $$;
    `);
    
    console.log('Migrating existing statuses...');
    await query(`UPDATE tickets SET status = 'To triage' WHERE status = 'open'`);
    await query(`UPDATE tickets SET status = 'In progress' WHERE status = 'in_progress'`);
    await query(`UPDATE tickets SET status = 'In review' WHERE status = 'in_verification'`);
    await query(`UPDATE tickets SET status = 'Done' WHERE status IN ('resolved', 'closed')`);

    console.log('Dropping old constraints and updating to new statuses only...');
    await query(`
      DO $$
      BEGIN
        ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_status_check;
        ALTER TABLE tickets ADD CONSTRAINT tickets_status_check CHECK (status IN ('To triage', 'Backlog', 'Ready', 'In progress', 'In review', 'Done'));
      EXCEPTION
        WHEN OTHERS THEN
          NULL;
      END $$;
    `);

    console.log('Migration completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrateStatuses();
