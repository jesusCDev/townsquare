import { FastifyPluginAsync } from 'fastify';
import { db } from '../db/index.js';
import { habits, habitEntries } from '../db/schema.js';
import { eq, desc, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { z } from 'zod';

const createHabitSchema = z.object({
  name: z.string().min(1).max(100),
  icon: z.string().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  targetCount: z.number().int().min(1).default(1),
  timedWindows: z.array(z.object({
    start: z.string().regex(/^\d{2}:\d{2}$/),
    end: z.string().regex(/^\d{2}:\d{2}$/),
    days: z.number().int().min(0).max(127),
  })).optional(),
});

const completeHabitSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  timestamp: z.string().datetime().optional(),
});

export const habitRoutes: FastifyPluginAsync = async (app) => {
  // Get all habits
  app.get('/api/habits', async (request, reply) => {
    const allHabits = await db
      .select()
      .from(habits)
      .where(eq(habits.isArchived, false))
      .orderBy(habits.position);
    
    return { habits: allHabits };
  });

  // Create habit
  app.post('/api/habits', async (request, reply) => {
    const body = createHabitSchema.parse(request.body);
    
    const newHabit = {
      id: nanoid(),
      ...body,
      timedWindows: body.timedWindows ? JSON.stringify(body.timedWindows) : null,
    };

    await db.insert(habits).values(newHabit);
    
    // Emit WebSocket event
    app.io.emit('habit:created', newHabit);
    
    return { habit: newHabit };
  });

  // Get habit by ID
  app.get('/api/habits/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    
    const habit = await db
      .select()
      .from(habits)
      .where(eq(habits.id, id))
      .limit(1);
    
    if (habit.length === 0) {
      reply.code(404).send({ error: 'Habit not found' });
      return;
    }
    
    return { habit: habit[0] };
  });

  // Complete habit
  app.post('/api/habits/:id/complete', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = completeHabitSchema.parse(request.body);
    
    const habit = await db
      .select()
      .from(habits)
      .where(eq(habits.id, id))
      .limit(1);
    
    if (habit.length === 0) {
      reply.code(404).send({ error: 'Habit not found' });
      return;
    }

    const date = body.date || new Date().toISOString().split('T')[0];
    const timestamp = body.timestamp || new Date().toISOString();

    // Check if entry exists for this date
    const existingEntry = await db
      .select()
      .from(habitEntries)
      .where(and(eq(habitEntries.habitId, id), eq(habitEntries.date, date)))
      .limit(1);

    if (existingEntry.length > 0) {
      // Update existing entry
      const completedAtArray = JSON.parse(existingEntry[0].completedAt);
      completedAtArray.push(timestamp);
      
      await db
        .update(habitEntries)
        .set({
          count: completedAtArray.length,
          completedAt: JSON.stringify(completedAtArray),
        })
        .where(eq(habitEntries.id, existingEntry[0].id));
    } else {
      // Create new entry
      await db.insert(habitEntries).values({
        id: nanoid(),
        habitId: id,
        date,
        count: 1,
        completedAt: JSON.stringify([timestamp]),
        source: 'api',
      });
    }

    // Emit WebSocket event for entry update (not habit metadata)
    app.io.emit('habit:entry-updated', { habitId: id, date });
    
    return { success: true };
  });

  // Get habit entries
  app.get('/api/habits/:id/entries', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { days = '30' } = request.query as { days?: string };
    
    const entries = await db
      .select()
      .from(habitEntries)
      .where(eq(habitEntries.habitId, id))
      .orderBy(desc(habitEntries.date))
      .limit(parseInt(days));
    
    return { entries };
  });

  // Delete habit entry (reset for a specific date)
  app.delete('/api/habits/:id/entries/:date', async (request, reply) => {
    const { id, date } = request.params as { id: string; date: string };
    
    await db
      .delete(habitEntries)
      .where(and(eq(habitEntries.habitId, id), eq(habitEntries.date, date)));
    
    // Emit WebSocket event for entry update (not habit metadata)
    app.io.emit('habit:entry-updated', { habitId: id, date });
    
    return { success: true };
  });

  // Update habit
  app.patch('/api/habits/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const updates = request.body as Partial<{
      position: number;
      name: string;
      icon: string;
      color: string;
      targetCount: number;
      timedWindows: any;
    }>;
    
    const updateData: any = {};
    if (updates.position !== undefined) updateData.position = updates.position;
    if (updates.name) updateData.name = updates.name;
    if (updates.icon !== undefined) updateData.icon = updates.icon;
    if (updates.color) updateData.color = updates.color;
    if (updates.targetCount) updateData.targetCount = updates.targetCount;
    if (updates.timedWindows) updateData.timedWindows = JSON.stringify(updates.timedWindows);
    
    await db
      .update(habits)
      .set(updateData)
      .where(eq(habits.id, id));
    
    app.io.emit('habit:updated', { habitId: id });
    
    return { success: true };
  });

  // Delete habit
  app.delete('/api/habits/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    
    await db
      .update(habits)
      .set({ isArchived: true })
      .where(eq(habits.id, id));
    
    // Emit WebSocket event
    app.io.emit('habit:deleted', { habitId: id });
    
    return { success: true };
  });
};
