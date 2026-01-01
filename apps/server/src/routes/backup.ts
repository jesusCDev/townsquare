import { FastifyPluginAsync } from 'fastify';
import { db } from '../db/index.js';
import { habits, habitEntries, scheduleBlocks, reminders, settings } from '../db/schema.js';
import fs from 'fs/promises';
import path from 'path';

export const backupRoutes: FastifyPluginAsync = async (app) => {
  // Export all data as JSON
  app.get('/api/backup/export', async (request, reply) => {
    try {
      const allHabits = await db.select().from(habits);
      const allHabitEntries = await db.select().from(habitEntries);
      const allSchedule = await db.select().from(scheduleBlocks);
      const allReminders = await db.select().from(reminders);
      const allSettings = await db.select().from(settings);

      const backup = {
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        data: {
          habits: allHabits,
          habitEntries: allHabitEntries,
          scheduleBlocks: allSchedule,
          reminders: allReminders,
          settings: allSettings,
        },
      };

      reply.header('Content-Type', 'application/json');
      reply.header('Content-Disposition', `attachment; filename="lifeboard-backup-${Date.now()}.json"`);
      return backup;
    } catch (error) {
      console.error('Failed to export backup:', error);
      reply.code(500).send({ error: 'Failed to export backup' });
    }
  });

  // Import data from JSON backup
  app.post('/api/backup/import', async (request, reply) => {
    try {
      const backup = request.body as any;

      if (!backup.data || !backup.version) {
        reply.code(400).send({ error: 'Invalid backup format' });
        return;
      }

      // Import habits
      if (backup.data.habits && backup.data.habits.length > 0) {
        await db.delete(habits);
        await db.insert(habits).values(backup.data.habits);
      }

      // Import habit entries
      if (backup.data.habitEntries && backup.data.habitEntries.length > 0) {
        await db.delete(habitEntries);
        await db.insert(habitEntries).values(backup.data.habitEntries);
      }

      // Import schedule blocks
      if (backup.data.scheduleBlocks && backup.data.scheduleBlocks.length > 0) {
        await db.delete(scheduleBlocks);
        await db.insert(scheduleBlocks).values(backup.data.scheduleBlocks);
      }

      // Import reminders
      if (backup.data.reminders && backup.data.reminders.length > 0) {
        await db.delete(reminders);
        await db.insert(reminders).values(backup.data.reminders);
      }

      // Import settings
      if (backup.data.settings && backup.data.settings.length > 0) {
        await db.delete(settings);
        await db.insert(settings).values(backup.data.settings);
      }

      // Emit WebSocket event
      app.io.emit('backup:imported', { timestamp: new Date().toISOString() });

      return { success: true, message: 'Backup imported successfully' };
    } catch (error) {
      console.error('Failed to import backup:', error);
      reply.code(500).send({ error: 'Failed to import backup' });
    }
  });
};
