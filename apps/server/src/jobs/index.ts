import { Server } from 'socket.io';
import cron from 'node-cron';
import { jobLogger } from '../lib/logger.js';
import { checkNightMode } from './night-mode.js';
import { runAutoBackup } from './auto-backup.js';

export function initializeJobs(io: Server) {
  jobLogger.info('Initializing scheduled jobs...');

  // Check night mode every minute
  cron.schedule('* * * * *', () => {
    checkNightMode(io);
  });

  // Run auto-backup daily at 3:00 AM
  cron.schedule('0 3 * * *', () => {
    jobLogger.info('Running scheduled auto-backup...');
    runAutoBackup(io);
  });

  jobLogger.info('Scheduled jobs initialized');
}
