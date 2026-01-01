import { FastifyPluginAsync } from 'fastify';
import { config } from '../config.js';
import os from 'os';

export const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get('/api/health', async (request, reply) => {
    return {
      status: 'healthy',
      version: config.version,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      system: {
        platform: os.platform(),
        arch: os.arch(),
        memory: {
          total: os.totalmem(),
          free: os.freemem(),
          used: os.totalmem() - os.freemem(),
        },
        loadAvg: os.loadavg(),
      },
    };
  });
};
