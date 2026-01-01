import { FastifyPluginAsync } from 'fastify';
import { db } from '../db/index.js';
import { scheduleBlocks } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export const scheduleRoutes: FastifyPluginAsync = async (app) => {
  // Get all schedule blocks
  app.get('/api/schedule', async (request, reply) => {
    const blocks = await db
      .select()
      .from(scheduleBlocks)
      .where(eq(scheduleBlocks.isActive, true))
      .orderBy(scheduleBlocks.position);
    
    return { blocks };
  });

  // Get current schedule block
  app.get('/api/schedule/current', async (request, reply) => {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, ...
    const dayMask = 1 << dayOfWeek;
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM

    const blocks = await db
      .select()
      .from(scheduleBlocks)
      .where(eq(scheduleBlocks.isActive, true))
      .orderBy(scheduleBlocks.position);

    // Find current block
    let current = null;
    let next = null;

    for (const block of blocks) {
      // Check if block applies to today
      if ((block.daysMask & dayMask) === 0) continue;

      if (currentTime >= block.startTime && (!block.endTime || currentTime < block.endTime)) {
        current = block;
      } else if (currentTime < block.startTime && !next) {
        next = block;
      }
    }

    return {
      current,
      next,
      currentTime,
    };
  });

  // Create schedule block
  app.post('/api/schedule', async (request, reply) => {
    const body = request.body as any;
    
    const newBlock = {
      id: nanoid(),
      name: body.name,
      color: body.color || '#3b82f6',
      icon: body.icon,
      startTime: body.startTime,
      endTime: body.endTime,
      daysMask: body.daysMask || 127,
      position: body.position || 0,
    };

    await db.insert(scheduleBlocks).values(newBlock);
    
    app.io.emit('schedule:updated', newBlock);
    
    return { block: newBlock };
  });

  // Update schedule block
  app.patch('/api/schedule/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const updates = request.body as Partial<{
      name: string;
      icon: string;
      color: string;
      startTime: string;
      endTime: string;
      daysMask: number;
      position: number;
    }>;
    
    const updateData: any = {};
    if (updates.name) updateData.name = updates.name;
    if (updates.icon !== undefined) updateData.icon = updates.icon;
    if (updates.color) updateData.color = updates.color;
    if (updates.startTime) updateData.startTime = updates.startTime;
    if (updates.endTime !== undefined) updateData.endTime = updates.endTime;
    if (updates.daysMask !== undefined) updateData.daysMask = updates.daysMask;
    if (updates.position !== undefined) updateData.position = updates.position;
    
    await db
      .update(scheduleBlocks)
      .set(updateData)
      .where(eq(scheduleBlocks.id, id));
    
    app.io.emit('schedule:updated', { blockId: id });
    
    return { success: true };
  });

  // Delete schedule block
  app.delete('/api/schedule/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    
    await db
      .update(scheduleBlocks)
      .set({ isActive: false })
      .where(eq(scheduleBlocks.id, id));
    
    app.io.emit('schedule:deleted', { blockId: id });
    
    return { success: true };
  });
};
