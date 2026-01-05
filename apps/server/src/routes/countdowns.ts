import { FastifyPluginAsync } from 'fastify';
import { db } from '../db/index.js';
import { countdowns } from '../db/schema.js';
import { eq, asc } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { z } from 'zod';

const createCountdownSchema = z.object({
  label: z.string().min(1).max(100),
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  icon: z.string().max(10).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});

const updateCountdownSchema = createCountdownSchema.partial().extend({
  position: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

export const countdownRoutes: FastifyPluginAsync = async (app) => {
  // Get all active countdowns
  app.get('/api/countdowns', async (request, reply) => {
    const allCountdowns = await db
      .select()
      .from(countdowns)
      .where(eq(countdowns.isActive, true))
      .orderBy(asc(countdowns.position));

    return { countdowns: allCountdowns };
  });

  // Create countdown
  app.post('/api/countdowns', async (request, reply) => {
    const body = createCountdownSchema.parse(request.body);

    // Get max position
    const existing = await db.select().from(countdowns);
    const maxPosition = existing.length > 0
      ? Math.max(...existing.map(c => c.position)) + 1
      : 0;

    const newCountdown = {
      id: nanoid(),
      label: body.label,
      targetDate: body.targetDate,
      icon: body.icon || null,
      color: body.color || '#67fe99',
      position: maxPosition,
      isActive: true,
    };

    await db.insert(countdowns).values(newCountdown);

    // Emit WebSocket event
    app.io.emit('countdown:created', newCountdown);

    return { countdown: newCountdown };
  });

  // Update countdown
  app.patch('/api/countdowns/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = updateCountdownSchema.parse(request.body);

    const updateData: Record<string, any> = {};
    if (body.label !== undefined) updateData.label = body.label;
    if (body.targetDate !== undefined) updateData.targetDate = body.targetDate;
    if (body.icon !== undefined) updateData.icon = body.icon;
    if (body.color !== undefined) updateData.color = body.color;
    if (body.position !== undefined) updateData.position = body.position;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;

    await db
      .update(countdowns)
      .set(updateData)
      .where(eq(countdowns.id, id));

    // Emit WebSocket event
    app.io.emit('countdown:updated', { countdownId: id, ...updateData });

    return { success: true };
  });

  // Delete countdown
  app.delete('/api/countdowns/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    await db
      .delete(countdowns)
      .where(eq(countdowns.id, id));

    // Emit WebSocket event
    app.io.emit('countdown:deleted', { countdownId: id });

    return { success: true };
  });
};
