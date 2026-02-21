import { FastifyPluginAsync } from 'fastify';
import { broadcastDayChanged } from '../jobs/daily-update.js';

/**
 * Test endpoints for development and debugging
 */
export const testRoutes: FastifyPluginAsync = async (app) => {
  // Manually trigger day-changed event (for testing midnight updates)
  app.post('/api/test/day-changed', async (request, reply) => {
    broadcastDayChanged(app.io);
    return {
      success: true,
      message: 'day:changed event broadcasted to all clients',
      timestamp: new Date().toISOString()
    };
  });
};
