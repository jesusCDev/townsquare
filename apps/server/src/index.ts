import { buildApp } from './app.js';
import { config } from './config.js';
import { logger } from './lib/logger.js';
import { initializeJobs } from './jobs/index.js';

async function main() {
  try {
    const app = await buildApp();

    // Start scheduled jobs
    initializeJobs(app.io);

    // Start server
    await app.listen({
      port: config.port,
      host: config.host,
    });

    logger.info({
      port: config.port,
      env: config.nodeEnv,
      host: config.host,
    }, 'LifeBoard server started');
  } catch (err) {
    logger.fatal(err, 'Failed to start server');
    process.exit(1);
  }
}

main();
