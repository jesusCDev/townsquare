import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { config } from '../config.js';
import { dbLogger } from '../lib/logger.js';
import * as schema from './schema.js';
import fs from 'fs';
import path from 'path';

// Ensure database directory exists
const dbDir = path.dirname(config.databasePath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
  dbLogger.info({ path: dbDir }, 'Created database directory');
}

// Create SQLite connection
const sqlite = new Database(config.databasePath);

// Enable WAL mode for better concurrency
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

dbLogger.info({ path: config.databasePath }, 'Database connected');

// Create Drizzle instance
export const db = drizzle(sqlite, { schema, logger: false });
