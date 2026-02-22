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

    // Relay manual dim mode toggle to all other clients
    socket.on('nightmode:manual', (data: { enabled: boolean }) => {
      wsLogger.info({ enabled: data.enabled }, 'Relaying nightmode:manual');
      socket.broadcast.emit('nightmode:manual', data);
    });
  });

  wsLogger.info('WebSocket server initialized');
}
