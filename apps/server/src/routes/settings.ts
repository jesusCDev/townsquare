import { FastifyPluginAsync } from 'fastify';
import { db } from '../db/index.js';
import { settings } from '../db/schema.js';
import { eq } from 'drizzle-orm';

export const settingsRoutes: FastifyPluginAsync = async (app) => {
  // Get all settings
  app.get('/api/settings', async (request, reply) => {
    const allSettings = await db.select().from(settings);
    
    // Convert to key-value object
    const settingsObj: Record<string, any> = {};
    for (const setting of allSettings) {
      try {
        settingsObj[setting.key] = JSON.parse(setting.value);
      } catch {
        settingsObj[setting.key] = setting.value;
      }
    }
    
    return { settings: settingsObj };
  });

  // Get single setting
  app.get('/api/settings/:key', async (request, reply) => {
    const { key } = request.params as { key: string };
    
    const setting = await db
      .select()
      .from(settings)
      .where(eq(settings.key, key))
      .limit(1);
    
    if (setting.length === 0) {
      reply.code(404).send({ error: 'Setting not found' });
      return;
    }
    
    try {
      return { value: JSON.parse(setting[0].value) };
    } catch {
      return { value: setting[0].value };
    }
  });

  // Update setting
  app.put('/api/settings/:key', async (request, reply) => {
    const { key } = request.params as { key: string };
    const { value } = request.body as { value: any };
    
    const valueStr = typeof value === 'string' ? value : JSON.stringify(value);
    
    await db
      .insert(settings)
      .values({ key, value: valueStr })
      .onConflictDoUpdate({
        target: settings.key,
        set: { value: valueStr },
      });
    
    app.io.emit('settings:updated', { key, value });
    
    return { success: true };
  });
};
