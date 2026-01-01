import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import { Server } from 'socket.io';
import { config } from './config.js';
import { logger, apiLogger } from './lib/logger.js';
import { registerRoutes } from './routes/index.js';
import { setupWebSocket } from './websocket/index.js';

export async function buildApp() {
  const app = Fastify({
    logger: false,  // Using custom Pino
    trustProxy: true,
  });

  // Request logging
  app.addHook('onRequest', async (request, reply) => {
    const startTime = Date.now();
    reply.raw.on('finish', () => {
      const duration = Date.now() - startTime;
      apiLogger.info({
        method: request.method,
        url: request.url,
        statusCode: reply.statusCode,
        duration,
      });
    });
  });

  // CORS
  await app.register(cors, {
    origin: config.nodeEnv === 'development' ? true : config.corsOrigin,
  });

  // Rate limiting
  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  });

  // Multipart for file uploads
  await app.register(multipart, {
    limits: {
      fileSize: config.backupMaxSizeMb * 1024 * 1024,
    },
  });

  // API routes
  await registerRoutes(app);

  // Serve static files in production
  if (config.nodeEnv === 'production' && config.staticDir) {
    await app.register(fastifyStatic, {
      root: config.staticDir,
      prefix: '/',
    });

    // SPA fallback
    app.setNotFoundHandler((req, reply) => {
      if (req.url.startsWith('/api')) {
        reply.code(404).send({ error: 'Not found' });
      } else {
        reply.sendFile('index.html');
      }
    });
  }

  // WebSocket setup
  const io = new Server(app.server, {
    cors: {
      origin: config.nodeEnv === 'development' ? '*' : config.corsOrigin,
    },
  });

  setupWebSocket(io);

  // Make io accessible to routes
  app.decorate('io', io);

  return app;
}
