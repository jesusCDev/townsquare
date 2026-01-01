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
  icon: text('icon'),
  color: text('color').default('#3b82f6'),
  targetCount: integer('target_count').notNull().default(1),
  timedWindows: text('timed_windows'),
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
  date: text('date').notNull(),
  count: integer('count').notNull().default(1),
  completedAt: text('completed_at').notNull(),
  source: text('source').default('manual'),
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
  startTime: text('start_time').notNull(),
  endTime: text('end_time'),
  daysMask: integer('days_mask').notNull().default(127),
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
  time: text('time').notNull(),
  daysMask: integer('days_mask').notNull().default(127),
  warnMinutes: integer('warn_minutes').notNull().default(3),
  mode: text('mode').notNull().default('overlay'),
  sound: text('sound'),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  source: text('source').default('manual'),
  externalId: text('external_id'),
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
  action: text('action'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  reminderIdx: index('reminder_history_reminder_idx').on(table.reminderId),
  triggeredIdx: index('reminder_history_triggered_idx').on(table.triggeredAt),
}));

// ============================================
// WHOOP INTEGRATION
// ============================================

export const whoopAuth = sqliteTable('whoop_auth', {
  id: integer('id').primaryKey().default(1),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  expiresAt: text('expires_at'),
  userId: text('user_id'),
  scopes: text('scopes'),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

export const whoopData = sqliteTable('whoop_data', {
  id: integer('id').primaryKey().default(1),
  recoveryScore: real('recovery_score'),
  recoveryState: text('recovery_state'),
  strainScore: real('strain_score'),
  sleepHours: real('sleep_hours'),
  sleepEfficiency: real('sleep_efficiency'),
  sleepStages: text('sleep_stages'),
  hrv: integer('hrv'),
  rhr: integer('rhr'),
  respiratoryRate: real('respiratory_rate'),
  skinTemp: real('skin_temp'),
  spo2: real('spo2'),
  dataDate: text('data_date'),
  rawData: text('raw_data'),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

// ============================================
// BACKUPS
// ============================================

export const backups = sqliteTable('backups', {
  id: text('id').primaryKey(),
  appName: text('app_name').notNull(),
  filename: text('filename').notNull(),
  originalName: text('original_name').notNull(),
  size: integer('size').notNull(),
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
  value: text('value').notNull(),
  type: text('type').notNull().default('string'),
  description: text('description'),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});
