import { FastifyInstance } from 'fastify';
import { healthRoutes } from './health.js';
import { habitRoutes } from './habits.js';
import { scheduleRoutes } from './schedule.js';
import { alertRoutes } from './alerts.js';
import { backupRoutes } from './backup.js';
import { settingsRoutes } from './settings.js';

export async function registerRoutes(app: FastifyInstance) {
  // Health check
  await app.register(healthRoutes);
  
  // API routes
  await app.register(habitRoutes);
  await app.register(scheduleRoutes);
  await app.register(alertRoutes);
  await app.register(backupRoutes);
  await app.register(settingsRoutes);
}
