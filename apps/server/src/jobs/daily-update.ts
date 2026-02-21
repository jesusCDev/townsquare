import { Server } from 'socket.io';
import { jobLogger } from '../lib/logger.js';

/**
 * Broadcasts a day-changed event at midnight to notify all clients
 * to refresh date-dependent components like countdowns
 */
export function broadcastDayChanged(io: Server) {
  const now = new Date();
  jobLogger.info({ date: now.toISOString() }, 'Broadcasting day-changed event');

  io.emit('day:changed', {
    date: now.toISOString().split('T')[0], // YYYY-MM-DD
    timestamp: now.toISOString(),
  });
}
