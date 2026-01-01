import { z } from 'zod';
import path from 'path';
import dotenv from 'dotenv';

// Load .env file
dotenv.config();

const configSchema = z.object({
  // Server
  nodeEnv: z.enum(['development', 'production', 'test']).default('development'),
  port: z.coerce.number().default(3000),
  host: z.string().default('0.0.0.0'),
  logLevel: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  version: z.string().default('1.0.0'),

  // Paths
  databasePath: z.string().default('./data/lifeboard.db'),
  staticDir: z.string().default('./static'),
  dataDir: z.string().default('./data'),

  // Security
  apiKey: z.string().min(16).default('dev-api-key-change-in-production'),
  corsOrigin: z.string().default('*'),

  // Whoop
  whoopClientId: z.string().optional(),
  whoopClientSecret: z.string().optional(),
  whoopRedirectUri: z.string().optional(),

  // Night Mode
  nightModeStart: z.string().default('20:00'),
  nightModeEnd: z.string().default('06:00'),
  nightModeBrightness: z.coerce.number().min(0).max(1).default(0.55),

  // Backups
  backupMaxPerApp: z.coerce.number().default(30),
  backupMaxSizeMb: z.coerce.number().default(50),
});

function loadConfig() {
  const rawConfig = {
    nodeEnv: process.env.NODE_ENV,
    port: process.env.PORT,
    host: process.env.HOST,
    logLevel: process.env.LOG_LEVEL,
    version: process.env.npm_package_version || '1.0.0',

    databasePath: process.env.DATABASE_PATH,
    staticDir: process.env.STATIC_DIR,
    dataDir: process.env.DATA_DIR,

    apiKey: process.env.API_KEY,
    corsOrigin: process.env.CORS_ORIGIN,

    whoopClientId: process.env.WHOOP_CLIENT_ID,
    whoopClientSecret: process.env.WHOOP_CLIENT_SECRET,
    whoopRedirectUri: process.env.WHOOP_REDIRECT_URI,

    nightModeStart: process.env.NIGHT_MODE_START,
    nightModeEnd: process.env.NIGHT_MODE_END,
    nightModeBrightness: process.env.NIGHT_MODE_BRIGHTNESS,

    backupMaxPerApp: process.env.BACKUP_MAX_PER_APP,
    backupMaxSizeMb: process.env.BACKUP_MAX_SIZE_MB,
  };

  const result = configSchema.safeParse(rawConfig);

  if (!result.success) {
    console.error('Configuration validation failed:');
    console.error(result.error.format());
    process.exit(1);
  }

  // Resolve paths
  const config = result.data;
  return {
    ...config,
    databasePath: path.resolve(config.databasePath),
    staticDir: path.resolve(config.staticDir),
    dataDir: path.resolve(config.dataDir),
    backupsDir: path.resolve(config.dataDir, 'backups'),
    logsDir: path.resolve(config.dataDir, 'logs'),
  };
}

export const config = loadConfig();
export type Config = typeof config;
