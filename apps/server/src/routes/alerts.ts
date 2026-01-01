import { FastifyPluginAsync } from 'fastify';
import { db } from '../db/index.js';
import { reminders } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { z } from 'zod';

const createAlertSchema = z.object({
  name: z.string().min(1).max(100),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  daysMask: z.number().int().min(0).max(127),
  gracePeriod: z.number().int().min(0).max(60).default(5),
});

export const alertRoutes: FastifyPluginAsync = async (app) => {
  // Get all alerts
  app.get('/api/alerts', async (request, reply) => {
    const allAlerts = await db
      .select()
      .from(reminders)
      .where(eq(reminders.isActive, true));
    
    const alerts = allAlerts.map(reminder => ({
      id: reminder.id,
      name: reminder.title,
      time: reminder.time,
      daysMask: reminder.daysMask,
      gracePeriod: reminder.warnMinutes,
      createdAt: reminder.createdAt,
    }));
    
    return { alerts };
  });

  // Create alert
  app.post('/api/alerts', async (request, reply) => {
    const body = createAlertSchema.parse(request.body);
    
    const newAlert = {
      id: nanoid(),
      title: body.name,
      description: null,
      time: body.time,
      daysMask: body.daysMask,
      warnMinutes: body.gracePeriod,
      mode: 'overlay',
      sound: null,
      isActive: true,
      source: 'manual',
      externalId: null,
    };

    await db.insert(reminders).values(newAlert);
    
    // Emit WebSocket event
    app.io.emit('alert:created', newAlert);
    
    return { 
      alert: {
        id: newAlert.id,
        name: newAlert.title,
        time: newAlert.time,
        daysMask: newAlert.daysMask,
        gracePeriod: newAlert.warnMinutes,
      }
    };
  });

  // Delete alert
  app.delete('/api/alerts/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    
    await db
      .update(reminders)
      .set({ isActive: false })
      .where(eq(reminders.id, id));
    
    // Emit WebSocket event
    app.io.emit('alert:deleted', { alertId: id });
    
    return { success: true };
  });
};
