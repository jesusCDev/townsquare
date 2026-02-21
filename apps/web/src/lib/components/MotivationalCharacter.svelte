<script lang="ts">
  import { onMount } from 'svelte';
  import { scrambleMode, scrambleText } from '$lib/stores/scramble';
  import { format } from 'date-fns';

  export let habitStats: { totalHabits: number; completedToday: number; currentStreak: number } = {
    totalHabits: 0,
    completedToday: 0,
    currentStreak: 0
  };

  let imageUrl: string | null = null;
  let message: string = '';
  let loading = false;
  let error: string | null = null;
  let healthScore: number = 50; // 0-100 scale
  let lastGeneratedDate: string | null = null;
  let allHabitsChecked: boolean = false;

  // Load from localStorage
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('shibaState');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        imageUrl = parsed.imageUrl || null;
        lastGeneratedDate = parsed.lastGeneratedDate || null;
        healthScore = parsed.healthScore ?? 50;
      } catch (e) {
        console.error('Failed to load Shiba state:', e);
      }
    }
  }

  // Calculate health score based on habit performance
  function calculateHealthScore(): number {
    if (habitStats.totalHabits === 0) return 50;

    // Today's completion contributes 40%
    const todayScore = (habitStats.completedToday / habitStats.totalHabits) * 40;

    // Streak contributes 30% (cap at 7 days for max score)
    const streakScore = Math.min(habitStats.currentStreak / 7, 1) * 30;

    // Base health of 30% (gives some baseline even on bad days)
    const baseScore = 30;

    return Math.round(todayScore + streakScore + baseScore);
  }

  async function generateShibaImage(forceGenerate = false) {
    if (loading) return;

    const today = format(new Date(), 'yyyy-MM-dd');
    healthScore = calculateHealthScore();
    allHabitsChecked = habitStats.totalHabits > 0 && habitStats.completedToday === habitStats.totalHabits;

    // Only generate if:
    // 1. Forced (manual button click)
    // 2. All habits checked AND it's a new day
    // 3. No image exists yet
    if (!forceGenerate && imageUrl && lastGeneratedDate === today) {
      console.log('Shiba already generated today');
      updateMessage();
      return;
    }

    if (!forceGenerate && !allHabitsChecked && imageUrl) {
      console.log('Not all habits checked yet');
      updateMessage();
      return;
    }

    loading = true;
    error = null;

    try {
      let prompt: string;
      let mood: string;

      // Shiba Inu states based on health score
      if (healthScore >= 80) {
        mood = 'thriving';
        message = "Your Shiba is thriving! Keep it up! 🐕✨";
        prompt = "A happy, healthy Shiba Inu dog sitting proudly, bright eyes, fluffy clean coat, wagging tail, cheerful expression, sunny background, vibrant colors, warm lighting, digital art, cute, high quality";
      } else if (healthScore >= 60) {
        mood = 'healthy';
        message = "Your Shiba is doing well! 🐕💚";
        prompt = "A content Shiba Inu dog sitting calmly, alert eyes, well-groomed coat, neutral happy expression, pleasant background, natural colors, soft lighting, digital art, cute";
      } else if (healthScore >= 40) {
        mood = 'needs_care';
        message = "Your Shiba needs more attention... 🐕💛";
        prompt = "A tired Shiba Inu dog sitting with slightly droopy ears, looking up hopefully, coat a bit messy, gentle sad eyes, muted colors, cloudy background, digital art, cute but needs care";
      } else {
        mood = 'neglected';
        message = "Your Shiba is feeling neglected... 🐕💔";
        prompt = "A sad Shiba Inu dog sitting alone with droopy ears and tail, tired eyes, disheveled coat, looking down, dark muted colors, gloomy background, digital art, needs love and care";
      }

      const response = await fetch('/api/motivation/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, mood })
      });

      if (!response.ok) {
        throw new Error('Failed to generate Shiba');
      }

      const data = await response.json();
      imageUrl = data.imageUrl;
      lastGeneratedDate = today;

      // Save to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('shibaState', JSON.stringify({
          imageUrl,
          lastGeneratedDate,
          healthScore
        }));
      }
    } catch (err: any) {
      console.error('Failed to generate Shiba:', err);

      if (err?.message?.includes('API key') || err?.response?.status === 503) {
        error = 'OpenAI API key not configured. Add it in Settings → AI Settings.';
      } else {
        error = 'Could not generate Shiba. Check console for details.';
      }

      message = "Your Shiba is waiting for you... 🐕";
    } finally {
      loading = false;
    }
  }

  function updateMessage() {
    healthScore = calculateHealthScore();

    if (healthScore >= 80) {
      message = "Your Shiba is thriving! Keep it up! 🐕✨";
    } else if (healthScore >= 60) {
      message = "Your Shiba is doing well! 🐕💚";
    } else if (healthScore >= 40) {
      message = "Your Shiba needs more attention... 🐕💛";
    } else {
      message = "Your Shiba is feeling neglected... 🐕💔";
    }
  }

  onMount(() => {
    updateMessage();

    // Check if we should generate (all habits checked today and it's a new day)
    const today = format(new Date(), 'yyyy-MM-dd');
    allHabitsChecked = habitStats.totalHabits > 0 && habitStats.completedToday === habitStats.totalHabits;

    if (allHabitsChecked && lastGeneratedDate !== today) {
      generateShibaImage();
    } else if (!imageUrl) {
      // No image yet, generate one
      generateShibaImage();
    }
  });

  // Watch for habit changes
  $: {
    healthScore = calculateHealthScore();
    allHabitsChecked = habitStats.totalHabits > 0 && habitStats.completedToday === habitStats.totalHabits;

    // Auto-generate when all habits are checked for the first time today
    const today = format(new Date(), 'yyyy-MM-dd');
    if (allHabitsChecked && lastGeneratedDate !== today && !loading) {
      generateShibaImage();
    } else {
      updateMessage();
    }
  }
</script>

<div class="motivational-character">
  <div class="character-header">
    <h3>Your Shiba 🐕</h3>
    <div class="stats">
      <span class="stat">
        <span class="stat-value">{habitStats.completedToday}/{habitStats.totalHabits}</span>
        <span class="stat-label">Today</span>
      </span>
      <span class="stat">
        <span class="stat-value">{Math.round(healthScore)}%</span>
        <span class="stat-label">Health</span>
      </span>
    </div>
  </div>

  <div class="character-display">
    {#if loading}
      <div class="loading-state">
        <div class="loader"></div>
        <p>Checking on your Shiba...</p>
      </div>
    {:else if imageUrl}
      <div class="character-image">
        <img src={imageUrl} alt="Your Shiba Inu" />
      </div>
    {:else if error}
      <div class="placeholder-character">
        <span class="emoji">🐕</span>
      </div>
    {:else}
      <div class="placeholder-character">
        <span class="emoji">🐕</span>
      </div>
    {/if}
  </div>

  <div class="message">
    <p>{$scrambleMode ? scrambleText(message) : message}</p>
    {#if error && error.includes('API key')}
      <a href="/admin" class="settings-link">Go to Settings →</a>
    {/if}
  </div>

  <button class="regenerate-btn" on:click={() => generateShibaImage(true)} disabled={loading}>
    {loading ? '⏳' : '🐾'} Check on Shiba
  </button>
</div>

<style>
  .motivational-character {
    background: linear-gradient(
      145deg,
      rgba(18, 18, 18, 0.95) 0%,
      rgba(25, 25, 30, 0.92) 100%
    );
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 16px;
    padding: 1rem;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4),
                inset 0 1px 0 rgba(255, 255, 255, 0.05);
    height: 100%;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    position: relative;
    overflow: hidden;
  }

  .motivational-character::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(
      90deg,
      transparent 0%,
      rgba(147, 51, 234, 0.3) 50%,
      transparent 100%
    );
  }

  .character-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  h3 {
    font-size: 0.9rem;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.8);
    margin: 0;
  }

  .stats {
    display: flex;
    gap: 0.75rem;
  }

  .stat {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.1rem;
  }

  .stat-value {
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.9rem;
    font-weight: 700;
    color: #9333ea;
  }

  .stat-label {
    font-size: 0.65rem;
    color: rgba(255, 255, 255, 0.4);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .character-display {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 200px;
    position: relative;
  }

  .loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    color: rgba(255, 255, 255, 0.4);
  }

  .loader {
    width: 32px;
    height: 32px;
    border: 3px solid rgba(147, 51, 234, 0.2);
    border-top-color: #9333ea;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .loading-state p {
    font-size: 0.75rem;
    margin: 0;
  }

  .character-image {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 12px;
    overflow: hidden;
  }

  .character-image img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    border-radius: 8px;
  }

  .placeholder-character {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
  }

  .emoji {
    font-size: 4rem;
    opacity: 0.6;
    filter: drop-shadow(0 0 20px rgba(147, 51, 234, 0.3));
  }

  .message {
    background: rgba(147, 51, 234, 0.08);
    border: 1px solid rgba(147, 51, 234, 0.2);
    border-radius: 10px;
    padding: 0.75rem;
    text-align: center;
  }

  .message p {
    margin: 0;
    font-size: 0.85rem;
    font-weight: 500;
    color: rgba(255, 255, 255, 0.9);
    line-height: 1.4;
  }

  .settings-link {
    display: inline-block;
    margin-top: 0.5rem;
    font-size: 0.75rem;
    color: #9333ea;
    text-decoration: none;
    font-weight: 600;
    transition: color 0.2s ease;
  }

  .settings-link:hover {
    color: #a855f7;
    text-decoration: underline;
  }

  .regenerate-btn {
    background: linear-gradient(135deg, rgba(147, 51, 234, 0.15), rgba(168, 85, 247, 0.15));
    border: 1px solid rgba(147, 51, 234, 0.3);
    border-radius: 8px;
    padding: 0.6rem 1rem;
    font-size: 0.8rem;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.8);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .regenerate-btn:hover:not(:disabled) {
    background: linear-gradient(135deg, rgba(147, 51, 234, 0.25), rgba(168, 85, 247, 0.25));
    border-color: rgba(147, 51, 234, 0.5);
    transform: translateY(-1px);
  }

  .regenerate-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
