import { Server } from 'socket.io';
import { db } from '../db/index.js';
import { habits, habitEntries, scheduleBlocks, reminders, settings, countdowns } from '../db/schema.js';
import { eq, lt } from 'drizzle-orm';
import { jobLogger } from '../lib/logger.js';
import fs from 'fs/promises';
import path from 'path';
import { format, subDays } from 'date-fns';

// Get backup path from settings
async function getBackupPath(): Promise<string | null> {
  const result = await db
    .select()
    .from(settings)
    .where(eq(settings.key, 'backup.path'));

  if (result.length > 0 && result[0].value) {
    try {
      return JSON.parse(result[0].value);
    } catch {
      return result[0].value;
    }
  }
  return null;
}

// Check if auto-backup is enabled
async function isAutoBackupEnabled(): Promise<boolean> {
  const result = await db
    .select()
    .from(settings)
    .where(eq(settings.key, 'backup.autoEnabled'));

  if (result.length > 0 && result[0].value) {
    try {
      return JSON.parse(result[0].value) === true;
    } catch {
      return false;
    }
  }
  return false;
}

// Create backup data object
async function createBackupData() {
  const allHabits = await db.select().from(habits);
  const allHabitEntries = await db.select().from(habitEntries);
  const allSchedule = await db.select().from(scheduleBlocks);
  const allReminders = await db.select().from(reminders);
  const allSettings = await db.select().from(settings);
  const allCountdowns = await db.select().from(countdowns);

  return {
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    data: {
      habits: allHabits,
      habitEntries: allHabitEntries,
      scheduleBlocks: allSchedule,
      reminders: allReminders,
      settings: allSettings,
      countdowns: allCountdowns,
    },
  };
}

// Delete backups older than 7 days
async function cleanupOldBackups(backupDir: string) {
  try {
    const files = await fs.readdir(backupDir);
    const cutoffDate = subDays(new Date(), 7);

    for (const file of files) {
      if (!file.startsWith('lifeboard-backup-') || !file.endsWith('.json')) {
        continue;
      }

      const filePath = path.join(backupDir, file);
      const stats = await fs.stat(filePath);

      if (stats.mtime < cutoffDate) {
        await fs.unlink(filePath);
        jobLogger.info(`Deleted old backup: ${file}`);
      }
    }
  } catch (error) {
    jobLogger.error({ error }, 'Failed to cleanup old backups');
  }
}

export async function runAutoBackup(io: Server) {
  try {
    // Check if auto-backup is enabled
    const enabled = await isAutoBackupEnabled();
    if (!enabled) {
      jobLogger.debug('Auto-backup is disabled, skipping');
      return;
    }

    // Get backup path
    const backupPath = await getBackupPath();
    if (!backupPath) {
      jobLogger.warn('Auto-backup path not configured, skipping');
      return;
    }

    // Ensure backup directory exists
    try {
      await fs.mkdir(backupPath, { recursive: true });
    } catch (error) {
      jobLogger.error({ error, path: backupPath }, 'Failed to create backup directory');
      return;
    }

    // Create backup data
    const backup = await createBackupData();

    // Generate filename with timestamp
    const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');
    const filename = `lifeboard-backup-${timestamp}.json`;
    const filePath = path.join(backupPath, filename);

    // Write backup file
    await fs.writeFile(filePath, JSON.stringify(backup, null, 2), 'utf-8');
    jobLogger.info(`Auto-backup created: ${filePath}`);

    // Cleanup old backups
    await cleanupOldBackups(backupPath);

    // Emit event
    io.emit('backup:auto-created', { filename, timestamp: new Date().toISOString() });

  } catch (error) {
    jobLogger.error({ error }, 'Auto-backup failed');
  }
}
