import { Server } from 'socket.io';
import { wsLogger } from '../lib/logger.js';

export function setupWebSocket(io: Server) {
  io.on('connection', (socket) => {
    wsLogger.info({ socketId: socket.id }, 'Client connected');

    socket.on('disconnect', () => {
      wsLogger.info({ socketId: socket.id }, 'Client disconnected');
    });

    // Handle client events
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: Date.now() });
    });
  });

  wsLogger.info('WebSocket server initialized');
}
