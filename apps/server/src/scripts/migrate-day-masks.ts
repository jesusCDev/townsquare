import { db } from '../db/index.js';
import { scheduleBlocks, reminders } from '../db/schema.js';
import { eq } from 'drizzle-orm';

/**
 * Migration script to fix weekday/weekend daysMask values
 *
 * Old values (incorrect):
 * - Weekdays: 31 (Sun-Thu) ❌
 * - Weekend: 96 (Fri-Sat) ❌
 *
 * New values (correct):
 * - Weekdays: 62 (Mon-Fri) ✅
 * - Weekend: 65 (Sat-Sun) ✅
 */
async function migrateDayMasks() {
  console.log('Starting daysMask migration...\n');

  try {
    // Update schedule blocks with weekday mask (31 -> 62)
    const weekdayBlocks = await db
      .update(scheduleBlocks)
      .set({ daysMask: 62 })
      .where(eq(scheduleBlocks.daysMask, 31))
      .returning();

    console.log(`✅ Updated ${weekdayBlocks.length} schedule blocks from weekday mask 31 to 62`);
    weekdayBlocks.forEach(block => {
      console.log(`   - ${block.name}`);
    });

    // Update schedule blocks with weekend mask (96 -> 65)
    const weekendBlocks = await db
      .update(scheduleBlocks)
      .set({ daysMask: 65 })
      .where(eq(scheduleBlocks.daysMask, 96))
      .returning();

    console.log(`✅ Updated ${weekendBlocks.length} schedule blocks from weekend mask 96 to 65`);
    weekendBlocks.forEach(block => {
      console.log(`   - ${block.name}`);
    });

    // Update reminders with weekday mask (31 -> 62)
    const weekdayReminders = await db
      .update(reminders)
      .set({ daysMask: 62 })
      .where(eq(reminders.daysMask, 31))
      .returning();

    console.log(`✅ Updated ${weekdayReminders.length} reminders from weekday mask 31 to 62`);
    weekdayReminders.forEach(reminder => {
      console.log(`   - ${reminder.title}`);
    });

    // Update reminders with weekend mask (96 -> 65)
    const weekendReminders = await db
      .update(reminders)
      .set({ daysMask: 65 })
      .where(eq(reminders.daysMask, 96))
      .returning();

    console.log(`✅ Updated ${weekendReminders.length} reminders from weekend mask 96 to 65`);
    weekendReminders.forEach(reminder => {
      console.log(`   - ${reminder.title}`);
    });

    console.log('\n✅ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrateDayMasks();
