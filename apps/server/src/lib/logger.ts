import pino from 'pino';
import { config } from '../config.js';
import path from 'path';
import fs from 'fs';

// Ensure log directory exists
const logDir = config.logsDir;
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Create logger instance
export const logger = pino({
  level: config.logLevel,
  base: {
    env: config.nodeEnv,
    version: config.version,
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level: (label) => ({ level: label }),
  },
  // Redact sensitive fields
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers["x-api-key"]',
      'accessToken',
      'refreshToken',
      'password',
      'secret',
    ],
    censor: '[REDACTED]',
  },
  transport: config.nodeEnv === 'development' ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss',
      ignore: 'pid,hostname',
    },
  } : undefined,
});

// Child loggers for different modules
export const createLogger = (module: string) => {
  return logger.child({ module });
};

// Specific loggers
export const dbLogger = createLogger('database');
export const apiLogger = createLogger('api');
export const wsLogger = createLogger('websocket');
export const jobLogger = createLogger('jobs');
export const whoopLogger = createLogger('whoop');
