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
        prompt = "A joyful happy Shiba Inu dog sitting proudly next to a full food bowl with kibble, sparkling bright eyes, fluffy ultra clean golden coat, wagging tail, big cheerful smile, colorful toys scattered around, cozy home setting, pastel pink and blue sky background, vibrant rainbow colors, glowing warm sunlight, kawaii aesthetic, digital art, cute, adorable, high quality";
      } else if (healthScore >= 60) {
        mood = 'healthy';
        message = "Your Shiba is doing well! 🐕💚";
        prompt = "A content cheerful Shiba Inu dog sitting calmly beside a food bowl with some kibble, bright alert eyes, well-groomed shiny coat, gentle happy expression, simple comfortable home, pastel green and yellow background, soft vibrant colors, warm pleasant lighting, kawaii style, digital art, cute and healthy";
      } else if (healthScore >= 40) {
        mood = 'needs_care';
        message = "Your Shiba needs more attention... 🐕💛";
        prompt = "A tired but hopeful Shiba Inu dog sitting with slightly droopy ears next to a half-empty food bowl, gentle pleading eyes looking at viewer, coat a bit messy but still cute, sparse simple room, pastel lavender and peach background, soft muted but warm colors, gentle lighting, kawaii aesthetic, digital art, needs care but still adorable";
      } else {
        mood = 'neglected';
        message = "Your Shiba is feeling neglected... 🐕💔";
        prompt = "A sad lonely Shiba Inu dog sitting behind shelter kennel bars with droopy ears and tail down, empty food bowl beside them, gentle tired eyes, slightly disheveled messy coat, looking down sadly through the bars, shelter setting with concrete floor, pastel grey and soft blue background, muted pastel colors, dim soft lighting, kawaii style, digital art, needs love and care but still cute, emotional";
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
  {#if loading}
    <div class="loading-state">
      <div class="loader"></div>
      <p>Checking on your Shiba...</p>
    </div>
  {:else if imageUrl}
    <div class="character-image-full">
      <img src={imageUrl} alt="Your Shiba Inu reflecting your habit progress" />
    </div>
  {:else if error}
    <div class="placeholder-character-full">
      <span class="emoji-large">🐕</span>
      {#if error.includes('API key')}
        <a href="/admin" class="settings-link-center">Add API Key in Settings →</a>
      {/if}
    </div>
  {:else}
    <div class="placeholder-character-full">
      <span class="emoji-large">🐕</span>
    </div>
  {/if}
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
    padding: 0.5rem;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4),
                inset 0 1px 0 rgba(255, 255, 255, 0.05);
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    overflow: hidden;
  }

  .character-image-full {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 12px;
    overflow: hidden;
  }

  .character-image-full img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 12px;
  }

  .placeholder-character-full {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    gap: 1rem;
  }

  .emoji-large {
    font-size: 8rem;
    opacity: 0.6;
    filter: drop-shadow(0 0 30px rgba(147, 51, 234, 0.4));
  }

  .loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    gap: 1rem;
    color: rgba(255, 255, 255, 0.4);
  }

  .loader {
    width: 48px;
    height: 48px;
    border: 4px solid rgba(147, 51, 234, 0.2);
    border-top-color: #9333ea;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .loading-state p {
    font-size: 0.85rem;
    margin: 0;
  }

  .settings-link-center {
    display: inline-block;
    margin-top: 1rem;
    font-size: 0.85rem;
    color: #9333ea;
    text-decoration: none;
    font-weight: 600;
    transition: color 0.2s ease;
  }

  .settings-link-center:hover {
    color: #a855f7;
    text-decoration: underline;
  }
</style>
