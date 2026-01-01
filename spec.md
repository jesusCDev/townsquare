# LifeBoard Technical Specification
## Comprehensive Program Structure, Database Design & Infrastructure

---

## Table of Contents

1. [Technology Stack (Final)](#1-technology-stack-final)
2. [Program Structure](#2-program-structure)
3. [Database Design](#3-database-design)
4. [Logging Implementation](#4-logging-implementation)
5. [Docker Configuration](#5-docker-configuration)
6. [Infrastructure & DevOps](#6-infrastructure--devops)
7. [Environment Configuration](#7-environment-configuration)
8. [Development Workflow](#8-development-workflow)
9. [Monitoring & Observability](#9-monitoring--observability)
10. [Security Considerations](#10-security-considerations)

---

## 1. Technology Stack (Final)

### Core Stack

| Layer | Technology | Version | Justification |
|-------|------------|---------|---------------|
| **Runtime** | Node.js | 20 LTS | Long-term support, excellent Pi performance |
| **Language** | TypeScript | 5.x | Type safety, better IDE support, fewer runtime errors |
| **Backend Framework** | Fastify | 4.x | 2x faster than Express, low memory footprint |
| **Frontend Framework** | SvelteKit | 2.x | Minimal bundle size, reactive, great DX |
| **Database** | SQLite | 3.x | Zero-config, file-based, perfect for single-user |
| **ORM** | Drizzle ORM | 0.29+ | Type-safe, lightweight, SQLite-optimized |
| **Real-time** | Socket.IO | 4.x | Reliable WebSockets with fallback |
| **Styling** | Tailwind CSS | 3.x | Utility-first, dark mode built-in |

### Supporting Libraries

| Purpose | Library | Notes |
|---------|---------|-------|
| Validation | Zod | Runtime type validation for API inputs |
| Scheduling | node-cron | Lightweight cron for reminders/night mode |
| HTTP Client | undici | Fast HTTP client for Whoop API |
| Date/Time | date-fns | Lightweight date manipulation |
| Logging | Pino | High-performance JSON logging |
| File Upload | @fastify/multipart | Streaming file uploads for backups |
| Static Files | @fastify/static | Serve SvelteKit build |
| CORS | @fastify/cors | Cross-origin for local dev |
| Rate Limiting | @fastify/rate-limit | Protect API endpoints |
| ICS Parsing | node-ical | Calendar feed parsing |

### Infrastructure

| Component | Technology | Notes |
|-----------|------------|-------|
| Containerization | Docker + Docker Compose | Consistent deployment |
| Process Manager | PM2 (alternative to Docker) | If not using containers |
| Reverse Proxy | Caddy | Auto-HTTPS, simple config |
| Database Backup | Litestream | Real-time SQLite replication |
| Monitoring | Prometheus + Grafana (optional) | Metrics and dashboards |

---

## 2. Program Structure

### 2.1 Monorepo Layout

```
lifeboard/
├── .github/
│   └── workflows/
│       ├── ci.yml                    # Lint, type-check, test
│       └── deploy.yml                # Auto-deploy to Pi on push to main
│
├── apps/
│   ├── server/                       # Fastify backend
│   │   ├── src/
│   │   │   ├── index.ts              # Entry point
│   │   │   ├── app.ts                # Fastify app factory
│   │   │   ├── config.ts             # Environment config loader
│   │   │   │
│   │   │   ├── db/
│   │   │   │   ├── index.ts          # Drizzle client export
│   │   │   │   ├── schema.ts         # All table definitions
│   │   │   │   ├── migrate.ts        # Migration runner
│   │   │   │   └── seed.ts           # Initial data seeder
│   │   │   │
│   │   │   ├── routes/
│   │   │   │   ├── index.ts          # Route registration
│   │   │   │   ├── habits.ts         # /api/habits/*
│   │   │   │   ├── schedule.ts       # /api/schedule/*
│   │   │   │   ├── reminders.ts      # /api/reminders/*
│   │   │   │   ├── whoop.ts          # /api/whoop/*
│   │   │   │   ├── backup.ts         # /api/backup/*
│   │   │   │   ├── calendar.ts       # /api/calendar/*
│   │   │   │   ├── settings.ts       # /api/settings/*
│   │   │   │   └── health.ts         # /api/health (for monitoring)
│   │   │   │
│   │   │   ├── services/
│   │   │   │   ├── habits.service.ts
│   │   │   │   ├── schedule.service.ts
│   │   │   │   ├── reminders.service.ts
│   │   │   │   ├── whoop.service.ts
│   │   │   │   ├── backup.service.ts
│   │   │   │   ├── calendar.service.ts
│   │   │   │   └── system.service.ts  # Pi health metrics
│   │   │   │
│   │   │   ├── jobs/
│   │   │   │   ├── index.ts           # Job scheduler setup
│   │   │   │   ├── reminder-check.ts  # Every minute: check reminders
│   │   │   │   ├── night-mode.ts      # Check dim mode transitions
│   │   │   │   ├── whoop-refresh.ts   # Refresh tokens hourly
│   │   │   │   ├── calendar-sync.ts   # Sync ICS feeds
│   │   │   │   └── backup-cleanup.ts  # Prune old backups daily
│   │   │   │
│   │   │   ├── websocket/
│   │   │   │   ├── index.ts           # Socket.IO setup
│   │   │   │   ├── events.ts          # Event type definitions
│   │   │   │   └── handlers.ts        # Client event handlers
│   │   │   │
│   │   │   ├── middleware/
│   │   │   │   ├── api-key.ts         # X-API-Key validation
│   │   │   │   ├── error-handler.ts   # Global error handling
│   │   │   │   └── request-logger.ts  # Request/response logging
│   │   │   │
│   │   │   ├── lib/
│   │   │   │   ├── logger.ts          # Pino logger factory
│   │   │   │   ├── time.ts            # Time/date utilities
│   │   │   │   ├── bitmask.ts         # Days bitmask helpers
│   │   │   │   ├── streak.ts          # Streak calculation
│   │   │   │   └── urgency.ts         # Urgency scale calculation
│   │   │   │
│   │   │   └── types/
│   │   │       ├── index.ts           # Shared types
│   │   │       ├── api.ts             # API request/response types
│   │   │       ├── events.ts          # WebSocket event types
│   │   │       └── whoop.ts           # Whoop API types
│   │   │
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── drizzle.config.ts
│   │
│   └── web/                           # SvelteKit frontend
│       ├── src/
│       │   ├── routes/
│       │   │   ├── +layout.svelte     # Root layout (dark mode, socket)
│       │   │   ├── +layout.ts         # Load initial data
│       │   │   ├── +page.svelte       # Main dashboard
│       │   │   ├── +error.svelte      # Error page
│       │   │   └── admin/             # Optional admin UI
│       │   │       ├── +page.svelte   # Settings/config page
│       │   │       ├── habits/
│       │   │       │   └── +page.svelte
│       │   │       ├── schedule/
│       │   │       │   └── +page.svelte
│       │   │       └── reminders/
│       │   │           └── +page.svelte
│       │   │
│       │   ├── lib/
│       │   │   ├── components/
│       │   │   │   ├── widgets/
│       │   │   │   │   ├── Clock.svelte
│       │   │   │   │   ├── HabitTracker.svelte
│       │   │   │   │   ├── HabitRow.svelte
│       │   │   │   │   ├── HabitCell.svelte
│       │   │   │   │   ├── Timeline.svelte
│       │   │   │   │   ├── TimelineBlock.svelte
│       │   │   │   │   ├── NowNextLater.svelte
│       │   │   │   │   ├── WhoopWidget.svelte
│       │   │   │   │   ├── WeeklyLoad.svelte
│       │   │   │   │   └── SystemHealth.svelte
│       │   │   │   │
│       │   │   │   ├── overlays/
│       │   │   │   │   ├── ReminderBanner.svelte
│       │   │   │   │   ├── ReminderOverlay.svelte
│       │   │   │   │   ├── ReminderTakeover.svelte
│       │   │   │   │   └── NightMode.svelte
│       │   │   │   │
│       │   │   │   └── ui/
│       │   │   │       ├── Button.svelte
│       │   │   │       ├── Card.svelte
│       │   │   │       ├── ProgressBar.svelte
│       │   │   │       └── Sparkline.svelte
│       │   │   │
│       │   │   ├── stores/
│       │   │   │   ├── socket.ts       # Socket.IO connection
│       │   │   │   ├── habits.ts       # Habits state
│       │   │   │   ├── schedule.ts     # Schedule state
│       │   │   │   ├── reminders.ts    # Active reminders
│       │   │   │   ├── whoop.ts        # Whoop data
│       │   │   │   ├── time.ts         # Current time (reactive)
│       │   │   │   └── nightmode.ts    # Night mode state
│       │   │   │
│       │   │   ├── api/
│       │   │   │   └── client.ts       # Typed API client
│       │   │   │
│       │   │   └── utils/
│       │   │       ├── time.ts
│       │   │       ├── colors.ts
│       │   │       └── format.ts
│       │   │
│       │   ├── app.html
│       │   ├── app.css                 # Tailwind imports + CSS vars
│       │   └── app.d.ts
│       │
│       ├── static/
│       │   ├── favicon.ico
│       │   └── fonts/                  # Self-hosted fonts
│       │
│       ├── package.json
│       ├── svelte.config.js
│       ├── tailwind.config.js
│       ├── postcss.config.js
│       ├── vite.config.ts
│       └── tsconfig.json
│
├── packages/
│   └── shared/                         # Shared code between apps
│       ├── src/
│       │   ├── types.ts                # Shared TypeScript types
│       │   ├── constants.ts            # Shared constants
│       │   ├── validation.ts           # Zod schemas
│       │   └── utils.ts                # Shared utilities
│       ├── package.json
│       └── tsconfig.json
│
├── scripts/
│   ├── setup-pi.sh                     # First-time Pi setup
│   ├── deploy.sh                       # Pull + rebuild + restart
│   ├── backup-db.sh                    # Manual DB backup
│   ├── restore-db.sh                   # Restore from backup
│   └── generate-api-key.sh             # Generate secure API key
│
├── docker/
│   ├── Dockerfile                      # Multi-stage build
│   ├── Dockerfile.dev                  # Development with hot reload
│   ├── docker-compose.yml              # Production compose
│   ├── docker-compose.dev.yml          # Development compose
│   └── .dockerignore
│
├── data/                               # Persisted data (gitignored)
│   ├── lifeboard.db                    # SQLite database
│   ├── lifeboard.db-wal                # WAL file
│   ├── lifeboard.db-shm                # Shared memory
│   ├── backups/                        # App backup storage
│   │   ├── workout-app/
│   │   └── habit-app/
│   └── logs/                           # Log files
│       ├── app.log
│       ├── error.log
│       └── access.log
│
├── .env.example                        # Template environment file
├── .env                                # Local environment (gitignored)
├── .gitignore
├── package.json                        # Root package.json (workspaces)
├── pnpm-workspace.yaml                 # pnpm workspace config
├── turbo.json                          # Turborepo config (optional)
├── tsconfig.base.json                  # Shared TypeScript config
└── README.md
```

### 2.2 File Explanations

#### Entry Point (`apps/server/src/index.ts`)
```typescript
import { buildApp } from './app';
import { config } from './config';
import { logger } from './lib/logger';
import { initializeJobs } from './jobs';
import { db } from './db';

async function main() {
  const app = await buildApp();

  // Run migrations on startup
  await db.migrate();

  // Start scheduled jobs
  initializeJobs();

  // Start server
  await app.listen({
    port: config.port,
    host: config.host
  });

  logger.info({
    port: config.port,
    env: config.nodeEnv
  }, 'LifeBoard server started');
}

main().catch((err) => {
  logger.fatal(err, 'Failed to start server');
  process.exit(1);
});
```

#### App Factory (`apps/server/src/app.ts`)
```typescript
import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import { Server } from 'socket.io';
import { config } from './config';
import { logger } from './lib/logger';
import { registerRoutes } from './routes';
import { setupWebSocket } from './websocket';
import { errorHandler } from './middleware/error-handler';
import { requestLogger } from './middleware/request-logger';

export async function buildApp() {
  const app = Fastify({
    logger: false,  // We use our own Pino instance
    trustProxy: true,
  });

  // Global error handler
  app.setErrorHandler(errorHandler);

  // Request logging
  app.addHook('onRequest', requestLogger);

  // Plugins
  await app.register(cors, {
    origin: config.nodeEnv === 'development'
      ? true
      : config.corsOrigin,
  });

  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  });

  await app.register(multipart, {
    limits: {
      fileSize: 50 * 1024 * 1024, // 50MB max
    },
  });

  // API routes
  await registerRoutes(app);

  // Serve static files (SvelteKit build)
  if (config.nodeEnv === 'production') {
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
      origin: config.nodeEnv === 'development'
        ? '*'
        : config.corsOrigin,
    },
  });

  setupWebSocket(io);

  // Make io accessible to routes
  app.decorate('io', io);

  return app;
}
```

---

## 3. Database Design

### 3.1 Complete Schema (`apps/server/src/db/schema.ts`)

```typescript
import {
  sqliteTable,
  text,
  integer,
  real,
  index,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// ============================================
// HABITS
// ============================================

export const habits = sqliteTable('habits', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  icon: text('icon'),                           // Emoji or icon name
  color: text('color').default('#3b82f6'),      // Hex color
  targetCount: integer('target_count').notNull().default(1),
  timedWindows: text('timed_windows'),          // JSON: TimedWindow[]
  position: integer('position').notNull().default(0),
  isArchived: integer('is_archived', { mode: 'boolean' }).default(false),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  positionIdx: index('habits_position_idx').on(table.position),
  archivedIdx: index('habits_archived_idx').on(table.isArchived),
}));

export const habitEntries = sqliteTable('habit_entries', {
  id: text('id').primaryKey(),
  habitId: text('habit_id').notNull().references(() => habits.id, {
    onDelete: 'cascade'
  }),
  date: text('date').notNull(),                 // YYYY-MM-DD
  count: integer('count').notNull().default(1),
  completedAt: text('completed_at').notNull(),  // JSON: ISO timestamp[]
  source: text('source').default('manual'),     // manual | android-app | api
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  habitDateIdx: uniqueIndex('habit_entries_habit_date_idx')
    .on(table.habitId, table.date),
  dateIdx: index('habit_entries_date_idx').on(table.date),
}));

// ============================================
// SCHEDULE
// ============================================

export const scheduleBlocks = sqliteTable('schedule_blocks', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  color: text('color').notNull().default('#3b82f6'),
  icon: text('icon'),
  startTime: text('start_time').notNull(),      // HH:MM
  endTime: text('end_time'),                    // HH:MM or null (open-ended)
  daysMask: integer('days_mask').notNull().default(127), // Bitmask
  position: integer('position').notNull().default(0),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  positionIdx: index('schedule_position_idx').on(table.position),
  activeIdx: index('schedule_active_idx').on(table.isActive),
}));

// ============================================
// REMINDERS
// ============================================

export const reminders = sqliteTable('reminders', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  time: text('time').notNull(),                 // HH:MM
  daysMask: integer('days_mask').notNull().default(127),
  warnMinutes: integer('warn_minutes').notNull().default(3),
  mode: text('mode').notNull().default('overlay'), // banner|overlay|flash_takeover
  sound: text('sound'),                         // Sound file name
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  source: text('source').default('manual'),     // manual | ics
  externalId: text('external_id'),              // For ICS deduplication
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  activeIdx: index('reminders_active_idx').on(table.isActive),
  sourceIdx: index('reminders_source_idx').on(table.source),
  externalIdx: index('reminders_external_idx').on(table.externalId),
}));

export const reminderHistory = sqliteTable('reminder_history', {
  id: text('id').primaryKey(),
  reminderId: text('reminder_id').notNull().references(() => reminders.id, {
    onDelete: 'cascade'
  }),
  triggeredAt: text('triggered_at').notNull(),
  dismissedAt: text('dismissed_at'),
  action: text('action'),                       // dismissed | snoozed | auto-cleared
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  reminderIdx: index('reminder_history_reminder_idx').on(table.reminderId),
  triggeredIdx: index('reminder_history_triggered_idx').on(table.triggeredAt),
}));

// ============================================
// CALENDAR SOURCES
// ============================================

export const calendarSources = sqliteTable('calendar_sources', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  icsUrl: text('ics_url').notNull(),
  syncIntervalMinutes: integer('sync_interval_minutes').notNull().default(30),
  autoCreateReminders: integer('auto_create_reminders', { mode: 'boolean' }).default(true),
  defaultWarnMinutes: integer('default_warn_minutes').notNull().default(3),
  defaultReminderMode: text('default_reminder_mode').notNull().default('banner'),
  color: text('color').default('#6366f1'),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  lastSyncedAt: text('last_synced_at'),
  lastError: text('last_error'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const calendarEvents = sqliteTable('calendar_events', {
  id: text('id').primaryKey(),
  sourceId: text('source_id').notNull().references(() => calendarSources.id, {
    onDelete: 'cascade'
  }),
  externalId: text('external_id').notNull(),    // UID from ICS
  title: text('title').notNull(),
  description: text('description'),
  startTime: text('start_time').notNull(),      // ISO timestamp
  endTime: text('end_time'),                    // ISO timestamp
  isAllDay: integer('is_all_day', { mode: 'boolean' }).default(false),
  location: text('location'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  sourceExternalIdx: uniqueIndex('calendar_events_source_external_idx')
    .on(table.sourceId, table.externalId),
  startIdx: index('calendar_events_start_idx').on(table.startTime),
}));

// ============================================
// WHOOP INTEGRATION
// ============================================

export const whoopAuth = sqliteTable('whoop_auth', {
  id: integer('id').primaryKey().default(1),    // Single row constraint
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  expiresAt: text('expires_at'),
  userId: text('user_id'),
  scopes: text('scopes'),                       // JSON: string[]
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

export const whoopData = sqliteTable('whoop_data', {
  id: integer('id').primaryKey().default(1),    // Single row for "current"
  recoveryScore: real('recovery_score'),
  recoveryState: text('recovery_state'),        // green | yellow | red
  strainScore: real('strain_score'),
  sleepHours: real('sleep_hours'),
  sleepEfficiency: real('sleep_efficiency'),
  sleepStages: text('sleep_stages'),            // JSON: { light, deep, rem, awake }
  hrv: integer('hrv'),
  rhr: integer('rhr'),
  respiratoryRate: real('respiratory_rate'),
  skinTemp: real('skin_temp'),
  spo2: real('spo2'),
  dataDate: text('data_date'),                  // YYYY-MM-DD
  rawData: text('raw_data'),                    // JSON: full API response
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

export const whoopHistory = sqliteTable('whoop_history', {
  id: text('id').primaryKey(),
  dataDate: text('data_date').notNull(),
  recoveryScore: real('recovery_score'),
  strainScore: real('strain_score'),
  sleepHours: real('sleep_hours'),
  hrv: integer('hrv'),
  rhr: integer('rhr'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  dateIdx: uniqueIndex('whoop_history_date_idx').on(table.dataDate),
}));

// ============================================
// BACKUPS
// ============================================

export const backups = sqliteTable('backups', {
  id: text('id').primaryKey(),
  appName: text('app_name').notNull(),
  filename: text('filename').notNull(),
  originalName: text('original_name').notNull(),
  size: integer('size').notNull(),              // Bytes
  sha256: text('sha256').notNull(),
  mimeType: text('mime_type'),
  notes: text('notes'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  appNameIdx: index('backups_app_name_idx').on(table.appName),
  createdIdx: index('backups_created_idx').on(table.createdAt),
}));

// ============================================
// SETTINGS
// ============================================

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),               // JSON stringified
  type: text('type').notNull().default('string'), // string | number | boolean | json
  description: text('description'),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

// ============================================
// AUDIT LOG (Optional but recommended)
// ============================================

export const auditLog = sqliteTable('audit_log', {
  id: text('id').primaryKey(),
  entityType: text('entity_type').notNull(),    // habit | reminder | schedule | etc.
  entityId: text('entity_id').notNull(),
  action: text('action').notNull(),             // create | update | delete
  changes: text('changes'),                     // JSON: { before, after }
  source: text('source').default('api'),        // api | websocket | job | android
  ipAddress: text('ip_address'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  entityIdx: index('audit_log_entity_idx').on(table.entityType, table.entityId),
  createdIdx: index('audit_log_created_idx').on(table.createdAt),
}));
```

### 3.2 Type Definitions (from schema)

```typescript
// apps/server/src/types/index.ts
import { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import * as schema from '../db/schema';

// Inferred types from schema
export type Habit = InferSelectModel<typeof schema.habits>;
export type NewHabit = InferInsertModel<typeof schema.habits>;

export type HabitEntry = InferSelectModel<typeof schema.habitEntries>;
export type NewHabitEntry = InferInsertModel<typeof schema.habitEntries>;

export type ScheduleBlock = InferSelectModel<typeof schema.scheduleBlocks>;
export type Reminder = InferSelectModel<typeof schema.reminders>;
export type WhoopData = InferSelectModel<typeof schema.whoopData>;
export type Backup = InferSelectModel<typeof schema.backups>;

// Custom types
export interface TimedWindow {
  start: string;    // HH:MM
  end: string;      // HH:MM
  days: number;     // Bitmask
}

export interface HabitWithStats extends Habit {
  currentStreak: number;
  longestStreak: number;
  completionRate: number;
  urgencyScale: number;
  entries: HabitEntry[];
}

export interface CurrentSchedule {
  current: ScheduleBlock | null;
  next: ScheduleBlock | null;
  later: ScheduleBlock[];
  progress: number;         // 0-1
  timeRemaining: number;    // Seconds
  timeUntilNext: number;    // Seconds
}

export type ReminderMode = 'banner' | 'overlay' | 'flash_takeover';

export interface ActiveReminder {
  reminder: Reminder;
  triggeredAt: Date;
  timeUntilEvent: number;   // Seconds
}
```

### 3.3 Migration File

```typescript
// apps/server/src/db/migrate.ts
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import Database from 'better-sqlite3';
import { config } from '../config';
import { logger } from '../lib/logger';

export async function runMigrations() {
  const sqlite = new Database(config.databasePath);
  const db = drizzle(sqlite);

  logger.info('Running database migrations...');

  try {
    await migrate(db, {
      migrationsFolder: './drizzle/migrations'
    });
    logger.info('Migrations completed successfully');
  } catch (error) {
    logger.error(error, 'Migration failed');
    throw error;
  } finally {
    sqlite.close();
  }
}
```

### 3.4 Seed Data

```typescript
// apps/server/src/db/seed.ts
import { db } from './index';
import { habits, scheduleBlocks, reminders, settings } from './schema';
import { nanoid } from 'nanoid';
import { logger } from '../lib/logger';

export async function seedDatabase() {
  logger.info('Seeding database with initial data...');

  // Default habits
  await db.insert(habits).values([
    {
      id: nanoid(),
      name: 'Workout',
      icon: '💪',
      color: '#22c55e',
      targetCount: 1,
      timedWindows: JSON.stringify([
        { start: '10:30', end: '12:30', days: 127 }
      ]),
      position: 0,
    },
    {
      id: nanoid(),
      name: 'Brush Teeth AM',
      icon: '🦷',
      color: '#3b82f6',
      targetCount: 1,
      timedWindows: JSON.stringify([
        { start: '07:00', end: '09:00', days: 127 }
      ]),
      position: 1,
    },
    {
      id: nanoid(),
      name: 'Brush Teeth PM',
      icon: '🦷',
      color: '#3b82f6',
      targetCount: 1,
      timedWindows: JSON.stringify([
        { start: '21:00', end: '23:00', days: 127 }
      ]),
      position: 2,
    },
  ]).onConflictDoNothing();

  // Default schedule blocks (weekdays)
  await db.insert(scheduleBlocks).values([
    {
      id: nanoid(),
      name: 'Work',
      color: '#3b82f6',
      icon: '💼',
      startTime: '07:00',
      endTime: '10:30',
      daysMask: 31, // Mon-Fri
      position: 0,
    },
    {
      id: nanoid(),
      name: 'Workout',
      color: '#22c55e',
      icon: '💪',
      startTime: '10:30',
      endTime: '12:30',
      daysMask: 127, // Every day
      position: 1,
    },
    {
      id: nanoid(),
      name: 'Lunch',
      color: '#f59e0b',
      icon: '🍽️',
      startTime: '12:30',
      endTime: '13:00',
      daysMask: 127,
      position: 2,
    },
    {
      id: nanoid(),
      name: 'Work',
      color: '#3b82f6',
      icon: '💼',
      startTime: '13:00',
      endTime: '17:00',
      daysMask: 31, // Mon-Fri
      position: 3,
    },
    {
      id: nanoid(),
      name: 'Side Project',
      color: '#8b5cf6',
      icon: '🚀',
      startTime: '17:00',
      endTime: null, // Open-ended
      daysMask: 31, // Mon-Fri
      position: 4,
    },
    {
      id: nanoid(),
      name: 'Side Project',
      color: '#8b5cf6',
      icon: '🚀',
      startTime: '08:00',
      endTime: '10:30',
      daysMask: 96, // Sat-Sun
      position: 5,
    },
    {
      id: nanoid(),
      name: 'Side Project',
      color: '#8b5cf6',
      icon: '🚀',
      startTime: '13:00',
      endTime: '17:00',
      daysMask: 96, // Sat-Sun
      position: 6,
    },
  ]).onConflictDoNothing();

  // Default settings
  await db.insert(settings).values([
    { key: 'nightMode.start', value: '"20:00"', type: 'string' },
    { key: 'nightMode.end', value: '"06:00"', type: 'string' },
    { key: 'nightMode.brightness', value: '0.55', type: 'number' },
    { key: 'clock.format', value: '"12h"', type: 'string' },
    { key: 'clock.showSeconds', value: 'false', type: 'boolean' },
    { key: 'habitTracker.daysToShow', value: '30', type: 'number' },
    { key: 'timeline.showLabels', value: 'true', type: 'boolean' },
    { key: 'backups.maxPerApp', value: '30', type: 'number' },
  ]).onConflictDoNothing();

  logger.info('Database seeding completed');
}
```

---

## 4. Logging Implementation

### 4.1 Logger Factory (`apps/server/src/lib/logger.ts`)

```typescript
import pino from 'pino';
import { config } from '../config';
import path from 'path';
import fs from 'fs';

// Ensure log directory exists
const logDir = path.join(config.dataDir, 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Log destinations
const targets: pino.TransportTargetOptions[] = [];

// Console output (pretty in dev, JSON in prod)
if (config.nodeEnv === 'development') {
  targets.push({
    target: 'pino-pretty',
    level: 'debug',
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss',
      ignore: 'pid,hostname',
    },
  });
} else {
  targets.push({
    target: 'pino/file',
    level: 'info',
    options: { destination: 1 }, // stdout
  });
}

// File output (always JSON, rotated daily)
targets.push({
  target: 'pino/file',
  level: 'info',
  options: {
    destination: path.join(logDir, 'app.log'),
    mkdir: true,
  },
});

// Separate error log
targets.push({
  target: 'pino/file',
  level: 'error',
  options: {
    destination: path.join(logDir, 'error.log'),
    mkdir: true,
  },
});

// Create transport
const transport = pino.transport({
  targets,
});

// Create logger instance
export const logger = pino(
  {
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
  },
  transport
);

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
```

### 4.2 Request Logger Middleware

```typescript
// apps/server/src/middleware/request-logger.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { apiLogger } from '../lib/logger';
import { nanoid } from 'nanoid';

export async function requestLogger(
  request: FastifyRequest,
  reply: FastifyReply
) {
  // Add request ID
  const requestId = nanoid(10);
  request.requestId = requestId;
  reply.header('X-Request-ID', requestId);

  const startTime = process.hrtime.bigint();

  // Log on response finish
  reply.raw.on('finish', () => {
    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1_000_000; // ms

    const logData = {
      requestId,
      method: request.method,
      url: request.url,
      statusCode: reply.statusCode,
      duration: Math.round(duration * 100) / 100,
      userAgent: request.headers['user-agent'],
      ip: request.ip,
    };

    if (reply.statusCode >= 500) {
      apiLogger.error(logData, 'Request failed');
    } else if (reply.statusCode >= 400) {
      apiLogger.warn(logData, 'Request error');
    } else {
      apiLogger.info(logData, 'Request completed');
    }
  });
}

// Extend Fastify types
declare module 'fastify' {
  interface FastifyRequest {
    requestId: string;
  }
}
```

### 4.3 Error Handler with Logging

```typescript
// apps/server/src/middleware/error-handler.ts
import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { apiLogger } from '../lib/logger';
import { ZodError } from 'zod';

export function errorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply
) {
  const requestId = request.requestId;

  // Zod validation errors
  if (error instanceof ZodError) {
    apiLogger.warn(
      { requestId, errors: error.errors },
      'Validation error'
    );
    return reply.status(400).send({
      error: 'Validation error',
      details: error.errors.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
      })),
    });
  }

  // Known HTTP errors
  if (error.statusCode && error.statusCode < 500) {
    apiLogger.warn(
      { requestId, error: error.message },
      'Client error'
    );
    return reply.status(error.statusCode).send({
      error: error.message,
    });
  }

  // Unexpected errors
  apiLogger.error(
    {
      requestId,
      error: error.message,
      stack: error.stack,
      code: error.code,
    },
    'Unhandled error'
  );

  return reply.status(500).send({
    error: 'Internal server error',
    requestId, // Include for debugging
  });
}
```

### 4.4 Log Rotation Script

```bash
#!/bin/bash
# scripts/rotate-logs.sh
# Run daily via cron: 0 0 * * * /path/to/rotate-logs.sh

LOG_DIR="/home/pi/lifeboard/data/logs"
MAX_FILES=14  # Keep 2 weeks of logs

# Rotate with timestamp
for logfile in "$LOG_DIR"/*.log; do
  if [ -f "$logfile" ]; then
    timestamp=$(date +%Y%m%d)
    mv "$logfile" "${logfile%.log}-${timestamp}.log"
  fi
done

# Compress old logs
find "$LOG_DIR" -name "*.log" -mtime +1 -exec gzip {} \;

# Delete logs older than MAX_FILES days
find "$LOG_DIR" -name "*.log.gz" -mtime +$MAX_FILES -delete

echo "Log rotation completed at $(date)"
```

### 4.5 Cron Setup for Log Rotation

```bash
# Add to crontab on Raspberry Pi
# crontab -e

# Rotate logs daily at midnight
0 0 * * * /home/pi/lifeboard/scripts/rotate-logs.sh >> /home/pi/lifeboard/data/logs/cron.log 2>&1
```

---

## 5. Docker Configuration

### 5.1 Production Dockerfile

```dockerfile
# docker/Dockerfile

# ============================================
# Stage 1: Build
# ============================================
FROM node:20-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/server/package.json ./apps/server/
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build shared package
RUN pnpm --filter @lifeboard/shared build

# Build server
RUN pnpm --filter @lifeboard/server build

# Build web (SvelteKit)
RUN pnpm --filter @lifeboard/web build

# ============================================
# Stage 2: Production
# ============================================
FROM node:20-alpine AS production

# Install runtime dependencies
RUN apk add --no-cache \
    sqlite \
    tini \
    curl

# Create non-root user
RUN addgroup -g 1001 lifeboard && \
    adduser -u 1001 -G lifeboard -s /bin/sh -D lifeboard

WORKDIR /app

# Copy built artifacts
COPY --from=builder /app/apps/server/dist ./dist
COPY --from=builder /app/apps/server/package.json ./
COPY --from=builder /app/apps/server/drizzle ./drizzle
COPY --from=builder /app/apps/web/build ./static
COPY --from=builder /app/node_modules ./node_modules

# Create data directory
RUN mkdir -p /app/data/backups /app/data/logs && \
    chown -R lifeboard:lifeboard /app

# Switch to non-root user
USER lifeboard

# Environment
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0
ENV DATABASE_PATH=/app/data/lifeboard.db
ENV STATIC_DIR=/app/static
ENV DATA_DIR=/app/data

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Use tini as init system
ENTRYPOINT ["/sbin/tini", "--"]

# Start server
CMD ["node", "dist/index.js"]
```

### 5.2 Development Dockerfile

```dockerfile
# docker/Dockerfile.dev

FROM node:20-alpine

# Install pnpm and dev tools
RUN corepack enable && \
    corepack prepare pnpm@latest --activate && \
    apk add --no-cache git sqlite

WORKDIR /app

# Install dependencies (will be mounted as volume)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Expose ports
EXPOSE 3000 5173

# Default command (overridden in docker-compose)
CMD ["pnpm", "dev"]
```

### 5.3 Production Docker Compose

```yaml
# docker/docker-compose.yml

version: '3.8'

services:
  lifeboard:
    build:
      context: ..
      dockerfile: docker/Dockerfile
    container_name: lifeboard
    restart: unless-stopped
    ports:
      - "3000:3000"
    volumes:
      - lifeboard-data:/app/data
    environment:
      - NODE_ENV=production
      - PORT=3000
      - DATABASE_PATH=/app/data/lifeboard.db
      - LOG_LEVEL=info
      - API_KEY=${API_KEY}
      - WHOOP_CLIENT_ID=${WHOOP_CLIENT_ID}
      - WHOOP_CLIENT_SECRET=${WHOOP_CLIENT_SECRET}
    networks:
      - lifeboard-network
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s

  # Optional: Caddy reverse proxy for HTTPS
  caddy:
    image: caddy:2-alpine
    container_name: lifeboard-caddy
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy-data:/data
      - caddy-config:/config
    networks:
      - lifeboard-network
    depends_on:
      - lifeboard

  # Optional: Litestream for SQLite backup
  litestream:
    image: litestream/litestream:0.3
    container_name: lifeboard-litestream
    restart: unless-stopped
    volumes:
      - lifeboard-data:/data
      - ./litestream.yml:/etc/litestream.yml:ro
    command: replicate
    depends_on:
      - lifeboard

volumes:
  lifeboard-data:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: ${DATA_PATH:-./data}
  caddy-data:
  caddy-config:

networks:
  lifeboard-network:
    driver: bridge
```

### 5.4 Development Docker Compose

```yaml
# docker/docker-compose.dev.yml

version: '3.8'

services:
  lifeboard-dev:
    build:
      context: ..
      dockerfile: docker/Dockerfile.dev
    container_name: lifeboard-dev
    ports:
      - "3000:3000"   # API
      - "5173:5173"   # Vite dev server
    volumes:
      - ..:/app
      - /app/node_modules
      - lifeboard-dev-data:/app/data
    environment:
      - NODE_ENV=development
      - PORT=3000
      - DATABASE_PATH=/app/data/lifeboard.db
      - LOG_LEVEL=debug
    command: pnpm dev
    tty: true

volumes:
  lifeboard-dev-data:
```

### 5.5 Caddyfile (Reverse Proxy)

```caddyfile
# docker/Caddyfile

{
    # Global options
    email your@email.com
}

# Replace with your domain or use :80 for local
lifeboard.local {
    reverse_proxy lifeboard:3000

    # Enable compression
    encode gzip

    # Security headers
    header {
        X-Frame-Options "SAMEORIGIN"
        X-Content-Type-Options "nosniff"
        Referrer-Policy "strict-origin-when-cross-origin"
    }

    # Logging
    log {
        output file /var/log/caddy/access.log
        format json
    }
}
```

### 5.6 Litestream Configuration (SQLite Backup)

```yaml
# docker/litestream.yml
# Real-time SQLite replication to S3-compatible storage

dbs:
  - path: /data/lifeboard.db
    replicas:
      # Option 1: Local file backup
      - type: file
        path: /data/backups/db
        retention: 168h  # 7 days

      # Option 2: S3 backup (uncomment if using)
      # - type: s3
      #   bucket: your-bucket-name
      #   path: lifeboard/db
      #   endpoint: s3.amazonaws.com
      #   access-key-id: ${AWS_ACCESS_KEY_ID}
      #   secret-access-key: ${AWS_SECRET_ACCESS_KEY}
      #   retention: 720h  # 30 days
```

---

## 6. Infrastructure & DevOps

### 6.1 Raspberry Pi Setup Script

```bash
#!/bin/bash
# scripts/setup-pi.sh
# Run on fresh Raspberry Pi OS installation

set -e

echo "=========================================="
echo "LifeBoard Raspberry Pi Setup"
echo "=========================================="

# Update system
echo "Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install dependencies
echo "Installing dependencies..."
sudo apt install -y \
    git \
    curl \
    sqlite3 \
    chromium-browser \
    unclutter \
    xdotool \
    fonts-noto-color-emoji

# Install Docker
echo "Installing Docker..."
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Install Docker Compose
echo "Installing Docker Compose..."
sudo apt install -y docker-compose-plugin

# Create app directory
echo "Creating application directory..."
mkdir -p ~/lifeboard
cd ~/lifeboard

# Clone repository (if not already present)
if [ ! -d ".git" ]; then
    echo "Cloning repository..."
    git clone https://github.com/yourusername/lifeboard.git .
fi

# Create data directories
mkdir -p data/backups data/logs

# Copy environment file
if [ ! -f ".env" ]; then
    cp .env.example .env
    echo "Created .env file - please edit with your settings"
fi

# Generate API key if not set
if ! grep -q "API_KEY=." .env; then
    API_KEY=$(openssl rand -hex 32)
    echo "API_KEY=$API_KEY" >> .env
    echo "Generated API key: $API_KEY"
fi

# Set permissions
chmod 755 scripts/*.sh

# Build and start with Docker
echo "Building and starting LifeBoard..."
docker compose -f docker/docker-compose.yml up -d --build

# Setup kiosk mode autostart
echo "Configuring kiosk mode..."
mkdir -p ~/.config/autostart

cat > ~/.config/autostart/lifeboard-kiosk.desktop << 'EOF'
[Desktop Entry]
Type=Application
Name=LifeBoard Kiosk
Exec=/home/pi/lifeboard/scripts/start-kiosk.sh
X-GNOME-Autostart-enabled=true
EOF

# Create kiosk startup script
cat > ~/lifeboard/scripts/start-kiosk.sh << 'EOF'
#!/bin/bash

# Wait for Docker container to be ready
sleep 10

# Disable screen blanking
xset s off
xset -dpms
xset s noblank

# Hide cursor
unclutter -idle 0.1 -root &

# Start Chromium in kiosk mode
chromium-browser \
    --noerrdialogs \
    --disable-infobars \
    --disable-session-crashed-bubble \
    --disable-restore-session-state \
    --kiosk \
    --incognito \
    --disable-translate \
    --disable-features=TranslateUI \
    --check-for-update-interval=604800 \
    --disable-component-update \
    http://localhost:3000
EOF

chmod +x ~/lifeboard/scripts/start-kiosk.sh

# Setup log rotation cron
(crontab -l 2>/dev/null; echo "0 0 * * * ~/lifeboard/scripts/rotate-logs.sh") | crontab -

echo "=========================================="
echo "Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env with your Whoop credentials"
echo "2. Reboot to start kiosk mode: sudo reboot"
echo "=========================================="
```

### 6.2 Deploy Script

```bash
#!/bin/bash
# scripts/deploy.sh
# Run on Pi to update and restart LifeBoard

set -e

cd ~/lifeboard

echo "Pulling latest changes..."
git pull origin main

echo "Rebuilding Docker images..."
docker compose -f docker/docker-compose.yml build

echo "Restarting services..."
docker compose -f docker/docker-compose.yml up -d

echo "Cleaning up old images..."
docker image prune -f

echo "Deployment complete!"
docker compose -f docker/docker-compose.yml ps
```

### 6.3 GitHub Actions CI/CD

```yaml
# .github/workflows/ci.yml

name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  lint-and-type-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v2
        with:
          version: 8

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Lint
        run: pnpm lint

      - name: Type check
        run: pnpm type-check

  build:
    runs-on: ubuntu-latest
    needs: lint-and-type-check
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v2
        with:
          version: 8

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build
        run: pnpm build

  docker-build:
    runs-on: ubuntu-latest
    needs: build
    steps:
      - uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Build Docker image
        uses: docker/build-push-action@v5
        with:
          context: .
          file: ./docker/Dockerfile
          push: false
          tags: lifeboard:test
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

```yaml
# .github/workflows/deploy.yml

name: Deploy to Raspberry Pi

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - name: Deploy to Pi via SSH
        uses: appleboy/ssh-action@v1.0.0
        with:
          host: ${{ secrets.PI_HOST }}
          username: ${{ secrets.PI_USER }}
          key: ${{ secrets.PI_SSH_KEY }}
          script: |
            cd ~/lifeboard
            ./scripts/deploy.sh
```

### 6.4 PM2 Configuration (Alternative to Docker)

```javascript
// ecosystem.config.js
// Use if not running Docker

module.exports = {
  apps: [
    {
      name: 'lifeboard',
      script: './apps/server/dist/index.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      env_file: '.env',
      error_file: './data/logs/pm2-error.log',
      out_file: './data/logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
    },
  ],
};
```

---

## 7. Environment Configuration

### 7.1 Environment Variables

```bash
# .env.example

# ===========================================
# Server Configuration
# ===========================================
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
LOG_LEVEL=info

# ===========================================
# Paths
# ===========================================
DATABASE_PATH=./data/lifeboard.db
STATIC_DIR=./static
DATA_DIR=./data

# ===========================================
# Security
# ===========================================
# Generate with: openssl rand -hex 32
API_KEY=your-32-character-api-key-here

# Comma-separated list of allowed origins
CORS_ORIGIN=http://localhost:3000

# ===========================================
# Whoop Integration
# ===========================================
WHOOP_CLIENT_ID=your-whoop-client-id
WHOOP_CLIENT_SECRET=your-whoop-client-secret
WHOOP_REDIRECT_URI=http://localhost:3000/api/whoop/callback

# ===========================================
# Optional: Additional Integrations
# ===========================================
# OPENWEATHER_API_KEY=your-openweather-key
# SPOTIFY_CLIENT_ID=your-spotify-client-id
# SPOTIFY_CLIENT_SECRET=your-spotify-client-secret

# ===========================================
# Night Mode Defaults
# ===========================================
NIGHT_MODE_START=20:00
NIGHT_MODE_END=06:00
NIGHT_MODE_BRIGHTNESS=0.55

# ===========================================
# Backup Configuration
# ===========================================
BACKUP_MAX_PER_APP=30
BACKUP_MAX_SIZE_MB=50
```

### 7.2 Config Loader

```typescript
// apps/server/src/config.ts
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
  apiKey: z.string().min(16),
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
```

---

## 8. Development Workflow

### 8.1 Package.json Scripts

```json
{
  "name": "lifeboard",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "start": "node apps/server/dist/index.js",
    "lint": "turbo lint",
    "type-check": "turbo type-check",
    "test": "turbo test",
    "db:generate": "pnpm --filter @lifeboard/server db:generate",
    "db:migrate": "pnpm --filter @lifeboard/server db:migrate",
    "db:seed": "pnpm --filter @lifeboard/server db:seed",
    "db:studio": "pnpm --filter @lifeboard/server db:studio",
    "docker:dev": "docker compose -f docker/docker-compose.dev.yml up",
    "docker:build": "docker compose -f docker/docker-compose.yml build",
    "docker:up": "docker compose -f docker/docker-compose.yml up -d",
    "docker:down": "docker compose -f docker/docker-compose.yml down",
    "docker:logs": "docker compose -f docker/docker-compose.yml logs -f",
    "clean": "turbo clean && rm -rf node_modules"
  },
  "devDependencies": {
    "turbo": "^1.11.0",
    "typescript": "^5.3.0"
  },
  "packageManager": "pnpm@8.12.0"
}
```

### 8.2 Server Package.json

```json
{
  "name": "@lifeboard/server",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "lint": "eslint src/",
    "type-check": "tsc --noEmit",
    "db:generate": "drizzle-kit generate:sqlite",
    "db:migrate": "tsx src/db/migrate.ts",
    "db:seed": "tsx src/db/seed.ts",
    "db:studio": "drizzle-kit studio"
  },
  "dependencies": {
    "@fastify/cors": "^8.4.0",
    "@fastify/multipart": "^8.0.0",
    "@fastify/rate-limit": "^9.0.0",
    "@fastify/static": "^6.12.0",
    "better-sqlite3": "^9.2.0",
    "date-fns": "^3.0.0",
    "dotenv": "^16.3.0",
    "drizzle-orm": "^0.29.0",
    "fastify": "^4.24.0",
    "nanoid": "^5.0.0",
    "node-cron": "^3.0.0",
    "node-ical": "^0.16.0",
    "pino": "^8.17.0",
    "socket.io": "^4.7.0",
    "undici": "^6.0.0",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.0",
    "@types/node": "^20.10.0",
    "@types/node-cron": "^3.0.0",
    "drizzle-kit": "^0.20.0",
    "pino-pretty": "^10.3.0",
    "tsx": "^4.7.0",
    "typescript": "^5.3.0"
  }
}
```

### 8.3 Turbo Configuration

```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": [".env"],
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", "build/**", ".svelte-kit/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {},
    "type-check": {
      "dependsOn": ["^build"]
    },
    "clean": {
      "cache": false
    }
  }
}
```

---

## 9. Monitoring & Observability

### 9.1 Health Check Endpoint

```typescript
// apps/server/src/routes/health.ts
import { FastifyPluginAsync } from 'fastify';
import { db } from '../db';
import { settings } from '../db/schema';
import { config } from '../config';
import os from 'os';
import fs from 'fs';

interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  uptime: number;
  timestamp: string;
  checks: {
    database: { status: string; latency?: number };
    disk: { status: string; freeGb?: number };
    memory: { status: string; usedPercent?: number };
    cpu: { status: string; loadAvg?: number };
    temperature?: { status: string; celsius?: number };
  };
}

export const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get('/api/health', async (request, reply) => {
    const checks: HealthResponse['checks'] = {
      database: { status: 'unknown' },
      disk: { status: 'unknown' },
      memory: { status: 'unknown' },
      cpu: { status: 'unknown' },
    };

    // Database check
    const dbStart = Date.now();
    try {
      await db.select().from(settings).limit(1);
      checks.database = {
        status: 'ok',
        latency: Date.now() - dbStart,
      };
    } catch (error) {
      checks.database = { status: 'error' };
    }

    // Disk check
    try {
      const stats = fs.statfsSync(config.dataDir);
      const freeGb = (stats.bfree * stats.bsize) / (1024 ** 3);
      checks.disk = {
        status: freeGb > 1 ? 'ok' : freeGb > 0.5 ? 'warning' : 'critical',
        freeGb: Math.round(freeGb * 100) / 100,
      };
    } catch (error) {
      checks.disk = { status: 'error' };
    }

    // Memory check
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedPercent = ((totalMem - freeMem) / totalMem) * 100;
    checks.memory = {
      status: usedPercent < 80 ? 'ok' : usedPercent < 90 ? 'warning' : 'critical',
      usedPercent: Math.round(usedPercent),
    };

    // CPU check
    const loadAvg = os.loadavg()[0];
    const cpuCount = os.cpus().length;
    checks.cpu = {
      status: loadAvg / cpuCount < 0.7 ? 'ok' : loadAvg / cpuCount < 0.9 ? 'warning' : 'critical',
      loadAvg: Math.round(loadAvg * 100) / 100,
    };

    // Temperature check (Raspberry Pi specific)
    try {
      const tempFile = '/sys/class/thermal/thermal_zone0/temp';
      if (fs.existsSync(tempFile)) {
        const temp = parseInt(fs.readFileSync(tempFile, 'utf-8')) / 1000;
        checks.temperature = {
          status: temp < 70 ? 'ok' : temp < 80 ? 'warning' : 'critical',
          celsius: Math.round(temp * 10) / 10,
        };
      }
    } catch (error) {
      // Not on a Pi, skip temperature
    }

    // Overall status
    const statuses = Object.values(checks).map((c) => c.status);
    let status: HealthResponse['status'] = 'healthy';
    if (statuses.includes('critical') || statuses.includes('error')) {
      status = 'unhealthy';
    } else if (statuses.includes('warning')) {
      status = 'degraded';
    }

    const response: HealthResponse = {
      status,
      version: config.version,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      checks,
    };

    const statusCode = status === 'unhealthy' ? 503 : 200;
    return reply.status(statusCode).send(response);
  });

  // Lightweight liveness probe
  app.get('/api/health/live', async () => {
    return { status: 'ok' };
  });

  // Readiness probe (checks database)
  app.get('/api/health/ready', async (request, reply) => {
    try {
      await db.select().from(settings).limit(1);
      return { status: 'ready' };
    } catch (error) {
      return reply.status(503).send({ status: 'not ready' });
    }
  });
};
```

### 9.2 System Metrics for Dashboard Widget

```typescript
// apps/server/src/services/system.service.ts
import os from 'os';
import fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface SystemMetrics {
  cpu: {
    usage: number;       // Percentage
    cores: number;
    loadAvg: number[];
  };
  memory: {
    total: number;       // GB
    used: number;        // GB
    percent: number;
  };
  disk: {
    total: number;       // GB
    used: number;        // GB
    percent: number;
  };
  temperature?: number;  // Celsius (Pi only)
  uptime: {
    system: number;      // Seconds
    process: number;     // Seconds
  };
  network: {
    hostname: string;
    ip: string;
  };
}

export async function getSystemMetrics(): Promise<SystemMetrics> {
  const cpus = os.cpus();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();

  // Get disk usage
  let diskTotal = 0;
  let diskUsed = 0;
  try {
    const { stdout } = await execAsync("df -B1 / | tail -1 | awk '{print $2,$3}'");
    const [total, used] = stdout.trim().split(' ').map(Number);
    diskTotal = total / (1024 ** 3);
    diskUsed = used / (1024 ** 3);
  } catch (error) {
    // Fallback
  }

  // Get temperature (Pi)
  let temperature: number | undefined;
  try {
    const tempFile = '/sys/class/thermal/thermal_zone0/temp';
    if (fs.existsSync(tempFile)) {
      temperature = parseInt(fs.readFileSync(tempFile, 'utf-8')) / 1000;
    }
  } catch (error) {
    // Not on a Pi
  }

  // Get IP address
  const networkInterfaces = os.networkInterfaces();
  let ip = '127.0.0.1';
  for (const iface of Object.values(networkInterfaces)) {
    if (!iface) continue;
    for (const alias of iface) {
      if (alias.family === 'IPv4' && !alias.internal) {
        ip = alias.address;
        break;
      }
    }
  }

  return {
    cpu: {
      usage: await getCpuUsage(),
      cores: cpus.length,
      loadAvg: os.loadavg(),
    },
    memory: {
      total: Math.round((totalMem / (1024 ** 3)) * 100) / 100,
      used: Math.round(((totalMem - freeMem) / (1024 ** 3)) * 100) / 100,
      percent: Math.round(((totalMem - freeMem) / totalMem) * 100),
    },
    disk: {
      total: Math.round(diskTotal * 100) / 100,
      used: Math.round(diskUsed * 100) / 100,
      percent: diskTotal > 0 ? Math.round((diskUsed / diskTotal) * 100) : 0,
    },
    temperature,
    uptime: {
      system: os.uptime(),
      process: process.uptime(),
    },
    network: {
      hostname: os.hostname(),
      ip,
    },
  };
}

// Calculate CPU usage over a 100ms window
async function getCpuUsage(): Promise<number> {
  const cpus1 = os.cpus();
  await new Promise((resolve) => setTimeout(resolve, 100));
  const cpus2 = os.cpus();

  let idleDiff = 0;
  let totalDiff = 0;

  for (let i = 0; i < cpus1.length; i++) {
    const cpu1 = cpus1[i].times;
    const cpu2 = cpus2[i].times;

    const idle = cpu2.idle - cpu1.idle;
    const total =
      (cpu2.user - cpu1.user) +
      (cpu2.nice - cpu1.nice) +
      (cpu2.sys - cpu1.sys) +
      (cpu2.idle - cpu1.idle) +
      (cpu2.irq - cpu1.irq);

    idleDiff += idle;
    totalDiff += total;
  }

  return Math.round((1 - idleDiff / totalDiff) * 100);
}
```

### 9.3 WebSocket Events for Real-time Metrics

```typescript
// apps/server/src/jobs/system-metrics.ts
import cron from 'node-cron';
import { Server } from 'socket.io';
import { getSystemMetrics } from '../services/system.service';
import { jobLogger } from '../lib/logger';

export function scheduleSystemMetrics(io: Server) {
  // Broadcast system metrics every 30 seconds
  cron.schedule('*/30 * * * * *', async () => {
    try {
      const metrics = await getSystemMetrics();
      io.emit('system:metrics', metrics);
    } catch (error) {
      jobLogger.error(error, 'Failed to collect system metrics');
    }
  });
}
```

---

## 10. Security Considerations

### 10.1 API Key Middleware

```typescript
// apps/server/src/middleware/api-key.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { config } from '../config';
import { apiLogger } from '../lib/logger';

// Routes that require API key authentication
const PROTECTED_PREFIXES = [
  '/api/habits',
  '/api/backup',
];

// Routes that are always public
const PUBLIC_ROUTES = [
  '/api/health',
  '/api/health/live',
  '/api/health/ready',
  '/api/whoop/callback',  // OAuth callback
];

export async function apiKeyMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
) {
  // Skip non-API routes
  if (!request.url.startsWith('/api')) {
    return;
  }

  // Allow public routes
  if (PUBLIC_ROUTES.some((route) => request.url.startsWith(route))) {
    return;
  }

  // Check if route needs protection
  const needsAuth = PROTECTED_PREFIXES.some((prefix) =>
    request.url.startsWith(prefix)
  );

  if (!needsAuth) {
    return;
  }

  // Validate API key
  const apiKey = request.headers['x-api-key'];

  if (!apiKey || apiKey !== config.apiKey) {
    apiLogger.warn(
      { ip: request.ip, url: request.url },
      'Invalid API key attempt'
    );

    return reply.status(401).send({
      error: 'Unauthorized',
      message: 'Invalid or missing API key',
    });
  }
}
```

### 10.2 Generate API Key Script

```bash
#!/bin/bash
# scripts/generate-api-key.sh

NEW_KEY=$(openssl rand -hex 32)
echo "Generated API Key: $NEW_KEY"
echo ""
echo "Add this to your .env file:"
echo "API_KEY=$NEW_KEY"
echo ""
echo "Use in Android apps:"
echo "addHeader(\"X-API-Key\", \"$NEW_KEY\")"
```

### 10.3 Input Validation Schemas

```typescript
// packages/shared/src/validation.ts
import { z } from 'zod';

// Habit schemas
export const timedWindowSchema = z.object({
  start: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format'),
  end: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format'),
  days: z.number().int().min(0).max(127),
});

export const createHabitSchema = z.object({
  name: z.string().min(1).max(100),
  icon: z.string().max(10).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  targetCount: z.number().int().min(1).max(10).default(1),
  timedWindows: z.array(timedWindowSchema).optional(),
});

export const completeHabitSchema = z.object({
  timestamp: z.string().datetime().optional(),
  source: z.enum(['manual', 'android-app', 'api']).default('api'),
});

// Schedule schemas
export const createScheduleBlockSchema = z.object({
  name: z.string().min(1).max(100),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#3b82f6'),
  icon: z.string().max(10).optional(),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).nullable(),
  daysMask: z.number().int().min(0).max(127).default(127),
});

// Reminder schemas
export const createReminderSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  daysMask: z.number().int().min(0).max(127).default(127),
  warnMinutes: z.number().int().min(1).max(60).default(3),
  mode: z.enum(['banner', 'overlay', 'flash_takeover']).default('overlay'),
});

// Backup schema
export const uploadBackupSchema = z.object({
  appName: z.string().regex(/^[a-z0-9-]+$/).min(1).max(50),
});
```

### 10.4 Rate Limiting Configuration

```typescript
// In app.ts - Enhanced rate limiting

await app.register(rateLimit, {
  global: true,
  max: 100,
  timeWindow: '1 minute',
  // Different limits for different routes
  keyGenerator: (request) => {
    // Use API key if present, otherwise IP
    return (request.headers['x-api-key'] as string) || request.ip;
  },
  // Custom error response
  errorResponseBuilder: (request, context) => ({
    error: 'Too Many Requests',
    message: `Rate limit exceeded. Try again in ${Math.ceil(context.ttl / 1000)} seconds.`,
    retryAfter: Math.ceil(context.ttl / 1000),
  }),
});

// Stricter limits for auth endpoints
app.register(async (authApp) => {
  await authApp.register(rateLimit, {
    max: 5,
    timeWindow: '1 minute',
  });

  // Apply to Whoop OAuth routes
  authApp.register(whoopRoutes);
}, { prefix: '/api/whoop' });
```

---

## Summary

This technical specification provides:

1. **Complete Program Structure** - Monorepo with Turborepo, clear separation of concerns, typed throughout
2. **Comprehensive Database Schema** - SQLite with Drizzle ORM, migrations, audit logging
3. **Production Logging** - Pino with file rotation, request tracing, error segregation
4. **Docker Configuration** - Multi-stage builds, development compose, Litestream backups
5. **Infrastructure** - Pi setup scripts, GitHub Actions CI/CD, PM2 alternative
6. **Monitoring** - Health checks, system metrics, temperature monitoring
7. **Security** - API key auth, input validation, rate limiting

**Next Steps:**
1. Initialize the repository with this structure
2. Set up pnpm workspaces
3. Create the database schema and migrations
4. Build the core API routes
5. Develop the frontend components
6. Test locally, then deploy to Pi