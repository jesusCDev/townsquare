import { FastifyPluginAsync } from 'fastify';
import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from '../lib/logger.js';

const execAsync = promisify(exec);

export const systemRoutes: FastifyPluginAsync = async (app) => {
  // Toggle fullscreen (F11) on all Firefox windows via xdotool
  app.post('/api/system/fullscreen', async (request, reply) => {
    try {
      // Find all Firefox windows and send F11 to each
      const { stdout } = await execAsync(
        'DISPLAY=:0 xdotool search --class Firefox',
      );

      const windowIds = stdout.trim().split('\n').filter(Boolean);

      if (windowIds.length === 0) {
        return reply.code(404).send({
          success: false,
          message: 'No Firefox windows found',
        });
      }

      // Send F11 to each Firefox window
      for (const wid of windowIds) {
        await execAsync(`DISPLAY=:0 xdotool key --window ${wid} F11`);
      }

      logger.info({ windowCount: windowIds.length }, 'Toggled fullscreen on Firefox windows');

      return {
        success: true,
        message: `Toggled fullscreen on ${windowIds.length} Firefox window(s)`,
        windows: windowIds.length,
      };
    } catch (error: any) {
      logger.error({ error: error.message }, 'Failed to toggle fullscreen');
      return reply.code(500).send({
        success: false,
        message: 'Failed to toggle fullscreen. Is xdotool installed?',
        error: error.message,
      });
    }
  });
};
