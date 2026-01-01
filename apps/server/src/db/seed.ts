import { db } from './index.js';
import { habits, scheduleBlocks, settings } from './schema.js';
import { nanoid } from 'nanoid';
import { logger } from '../lib/logger.js';

async function seedDatabase() {
  logger.info('Seeding database with initial data...');

  try {
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
        endTime: null,
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
    ]).onConflictDoNothing();

    // Default settings
    await db.insert(settings).values([
      { key: 'nightMode.start', value: '"20:00"', type: 'string' },
      { key: 'nightMode.end', value: '"06:00"', type: 'string' },
      { key: 'nightMode.brightness', value: '0.55', type: 'number' },
      { key: 'dimTimeout', value: '15', type: 'number', description: 'Minutes to disable dim mode after interaction' },
      { key: 'clock.format', value: '"12h"', type: 'string' },
      { key: 'clock.showSeconds', value: 'false', type: 'boolean' },
      { key: 'habitTracker.daysToShow', value: '30', type: 'number' },
      { key: 'timeline.showLabels', value: 'true', type: 'boolean' },
      { key: 'backups.maxPerApp', value: '30', type: 'number' },
    ]).onConflictDoNothing();

    logger.info('Database seeding completed');
  } catch (error) {
    logger.error(error, 'Seeding failed');
    throw error;
  }
}

seedDatabase().catch((error) => {
  console.error('Fatal seed error:', error);
  process.exit(1);
});
