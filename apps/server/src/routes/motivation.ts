import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { db } from '../db/index.js';
import { settings } from '../db/schema.js';
import { eq } from 'drizzle-orm';

const generateSchema = z.object({
  prompt: z.string().min(1).max(1000),
  mood: z.enum(['encouraging', 'celebrating', 'supportive']),
});

export const motivationRoutes: FastifyPluginAsync = async (app) => {
  // Generate motivational character image using OpenAI DALL-E
  app.post('/api/motivation/generate', async (request, reply) => {
    try {
      const { prompt, mood } = generateSchema.parse(request.body);

      // Try to get API key from settings first, then fall back to environment variable
      let openaiApiKey: string | null = null;

      try {
        const apiKeySetting = await db
          .select()
          .from(settings)
          .where(eq(settings.key, 'openai.apiKey'))
          .limit(1);

        if (apiKeySetting.length > 0 && apiKeySetting[0].value) {
          openaiApiKey = apiKeySetting[0].value;
        }
      } catch (err) {
        console.error('Failed to fetch OpenAI API key from settings:', err);
      }

      // Fall back to environment variable if not in settings
      if (!openaiApiKey) {
        openaiApiKey = process.env.OPENAI_API_KEY || null;
      }

      if (!openaiApiKey) {
        return reply.code(503).send({
          error: 'OpenAI API key not configured',
          message: 'Please add your OpenAI API key in Settings → AI Settings'
        });
      }

      // Call OpenAI DALL-E API
      const response = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiApiKey}`
        },
        body: JSON.stringify({
          model: 'dall-e-3',
          prompt: prompt,
          n: 1,
          size: '1024x1024',
          quality: 'standard',
          style: 'vivid'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('OpenAI API error:', errorData);
        return reply.code(response.status).send({
          error: 'Failed to generate image',
          details: errorData
        });
      }

      const data = await response.json();
      const imageUrl = data.data[0]?.url;

      if (!imageUrl) {
        return reply.code(500).send({ error: 'No image URL in response' });
      }

      return { imageUrl, mood };
    } catch (error) {
      console.error('Motivation generation error:', error);
      return reply.code(500).send({ error: 'Failed to generate motivation' });
    }
  });

  // Get motivational message based on habit stats
  app.get('/api/motivation/message', async (request, reply) => {
    const messages = {
      excellent: [
        "You're unstoppable! Keep that fire burning! 🔥",
        "Crushing it! This is what consistency looks like! 💪",
        "Phenomenal work! You're an inspiration! ⭐"
      ],
      good: [
        "Great progress! You're building something amazing! 🌟",
        "Solid work! Every step counts! 🎯",
        "You're doing fantastic! Stay the course! 💫"
      ],
      needsSupport: [
        "It's okay to stumble. What matters is getting back up! 🌅",
        "Every champion was once a beginner who refused to give up! 💪",
        "Tomorrow is a fresh start. You've got this! 🌟",
        "The comeback is always stronger than the setback! 🔥"
      ]
    };

    const category = (request.query as any).category || 'needsSupport';
    const categoryMessages = messages[category as keyof typeof messages] || messages.needsSupport;
    const randomMessage = categoryMessages[Math.floor(Math.random() * categoryMessages.length)];

    return { message: randomMessage };
  });
};
