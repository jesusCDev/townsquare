import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import Database from 'better-sqlite3';
import { config } from '../config.js';
import { logger } from '../lib/logger.js';
import path from 'path';
import fs from 'fs';

async function runMigrations() {
  // Ensure data directory exists
  const dataDir = path.dirname(config.databasePath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const sqlite = new Database(config.databasePath);
  const db = drizzle(sqlite);

  logger.info('Running database migrations...');

  try {
    const migrationsFolder = path.join(process.cwd(), 'drizzle');
    
    // Check if migrations folder exists
    if (!fs.existsSync(migrationsFolder)) {
      logger.warn('No migrations folder found, skipping migrations');
      return;
    }

    await migrate(db, {
      migrationsFolder,
    });
    logger.info('Migrations completed successfully');
  } catch (error) {
    logger.error(error, 'Migration failed');
    throw error;
  } finally {
    sqlite.close();
  }
}

runMigrations().catch((error) => {
  console.error('Fatal migration error:', error);
  process.exit(1);
});
