import { FastifyPluginAsync } from 'fastify';
import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from '../lib/logger.js';

const execAsync = promisify(exec);

export const systemRoutes: FastifyPluginAsync = async (app) => {
  // Toggle fullscreen (F11) on the focused window via ydotool (Wayland-compatible)
  // F11 keycode = 87, :1 = press, :0 = release
  app.post('/api/system/fullscreen', async (request, reply) => {
    try {
      await execAsync('sudo ydotool key 87:1 87:0');

      logger.info('Sent F11 via ydotool');

      return {
        success: true,
        message: 'Sent F11 to focused window',
      };
    } catch (error: any) {
      logger.error({ error: error.message }, 'Failed to toggle fullscreen');
      return reply.code(500).send({
        success: false,
        message: 'Failed to toggle fullscreen. Is ydotool installed?',
        error: error.message,
      });
    }
  });

  // Reload all connected browser pages via socket event
  app.post('/api/system/refresh', async (request, reply) => {
    app.io.emit('system:refresh');
    logger.info('Broadcasted refresh to all clients');

    return {
      success: true,
      message: 'Refresh signal sent to all connected clients',
    };
  });
};
