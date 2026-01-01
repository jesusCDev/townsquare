import { Server } from 'socket.io';
import cron from 'node-cron';
import { jobLogger } from '../lib/logger.js';
import { checkNightMode } from './night-mode.js';

export function initializeJobs(io: Server) {
  jobLogger.info('Initializing scheduled jobs...');

  // Check night mode every minute
  cron.schedule('* * * * *', () => {
    checkNightMode(io);
  });

  // Add more jobs here as needed
  // Example: reminder checks, backup cleanup, etc.

  jobLogger.info('Scheduled jobs initialized');
}
