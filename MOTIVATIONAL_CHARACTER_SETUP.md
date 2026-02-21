# Motivational Character Feature - Setup Guide

## Features Added

### 1. **Motivational Character Component** 🎯
- AI-generated character images based on habit completion
- Motivational messages that adapt to your progress
- 20% sidebar next to habit tracker (80/20 split)
- Purple-themed design matching the app aesthetic

### 2. **Enhanced Countdown Progress** 📊
- Visual progress bar showing time elapsed from creation to target date
- Percentage complete indicator
- Smooth animated background

## Setup Instructions

### Step 1: Get Your OpenAI API Key

1. Go to [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Sign in or create an account
3. Click **Create new secret key**
4. Copy the key (it starts with `sk-`)
5. **Keep it safe!** You won't be able to see it again

### Step 2: Add API Key in Settings (Recommended)

**The easiest way - no server restart needed:**

1. Go to **Settings** page in your dashboard (`/admin`)
2. Scroll to **AI Settings** section
3. Paste your API key in the **OpenAI API Key** field
4. The key is saved automatically when you blur the input
5. Done! You can now generate motivational images

**Alternative: Environment Variable**

If you prefer, you can also set it as an environment variable:

```bash
# In /apps/server/.env
OPENAI_API_KEY=sk-your-api-key-here
```

The app will check Settings first, then fall back to the environment variable.

## How It Works

### Motivational Character

The character generates different images based on your habit completion rate:

- **80%+ completion**: 🔥 Celebrating character - "You're crushing it!"
- **50-79% completion**: 💪 Encouraging character - "You're doing great!"
- **0-49% completion**: 🌟 Supportive character - "It's okay to stumble!"

### API Cost

- Uses OpenAI's DALL-E 3 model
- Cost: ~$0.04 per image generated
- Images are only generated when you click "New Motivation"
- You control when to generate, so you control costs

### Countdown Progress

The countdown now shows:
- **Days remaining** (large number)
- **Progress bar** (visual background from left to right)
- **Percentage complete** (based on creation date to target date)

Example:
- Created: Jan 10, 2026
- Target: Jul 8, 2026
- Today: Feb 20, 2026
- Progress: ~26% complete (41 days / 179 total days)

## Testing Locally

1. **View the dashboard**: http://localhost:5173
2. **Check the layout**:
   - Habit tracker takes 80% width
   - Motivational character sidebar takes 20% width
3. **Test character generation**:
   - Click "New Motivation" button
   - Watch as AI generates a custom motivational image
4. **Check countdown progress**:
   - Look for the subtle gradient background
   - See "X% complete" text below the countdown

## Customization

### Adjust Character Prompts

Edit `/apps/server/src/routes/motivation.ts` to customize the image generation prompts:

```typescript
// Example: Change the celebrating prompt
if (completionRate >= 0.8) {
  mood = 'celebrating';
  message = "Custom message here!";
  prompt = "Your custom DALL-E prompt here";
}
```

### Adjust Layout Split

Edit `/apps/web/src/routes/+page.svelte` CSS to change the 80/20 split:

```css
.habit-main {
  flex: 0 1 75%;  /* Changed from 80% */
}

.motivational-sidebar {
  flex: 0 1 25%;  /* Changed from 20% */
}
```

### Disable Feature Temporarily

To test without the OpenAI API:
- The component will show a placeholder emoji (💪 or 🌟)
- Error messages will display if API key is missing
- Fallback motivational messages will still appear

## Files Modified

### New Files
- `/apps/web/src/lib/components/MotivationalCharacter.svelte` - Character component
- `/apps/server/src/routes/motivation.ts` - OpenAI API integration
- `MOTIVATIONAL_CHARACTER_SETUP.md` - This guide

### Modified Files
- `/apps/web/src/routes/+page.svelte` - Added 80/20 layout
- `/apps/web/src/lib/components/CountdownTile.svelte` - Added progress background
- `/apps/server/src/routes/index.ts` - Registered motivation routes

## Troubleshooting

### "OpenAI API key not configured" Error
- Go to **Settings → AI Settings** and add your key
- Make sure the key starts with `sk-`
- The key is saved automatically (no restart needed)
- If using environment variables, check `/apps/server/.env`

### Character Not Generating
- Open browser console (F12) and check for errors
- Verify API key has sufficient credits
- Check server logs for detailed error messages

### Layout Issues
- Clear browser cache and hard refresh (Ctrl+Shift+R)
- Check browser console for CSS errors
- Verify screen width is sufficient (minimum ~1280px recommended)

## Next Steps

Once you add your OpenAI API key:
1. ✅ Character will generate based on habit performance
2. ✅ Countdown shows visual progress
3. ✅ 80/20 layout provides focused habit tracking with motivational support

Enjoy your AI-powered motivational coach! 🚀
