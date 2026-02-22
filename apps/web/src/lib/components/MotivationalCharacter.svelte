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
  let currentMood: string = 'healthy';
  let cachedImages: Record<string, { url: string; date: string }> = {};

  // Load cached images from localStorage
  if (typeof window !== 'undefined') {
    // Clear old storage format
    const oldStorage = localStorage.getItem('shibaState');
    if (oldStorage) {
      console.log('Migrating from old Shiba storage format...');
      localStorage.removeItem('shibaState');
    }

    const stored = localStorage.getItem('shibaCache');
    if (stored) {
      try {
        cachedImages = JSON.parse(stored);
      } catch (e) {
        console.error('Failed to load Shiba cache:', e);
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

  function getMoodFromHealthScore(score: number): string {
    if (score >= 80) return 'thriving';
    if (score >= 60) return 'healthy';
    if (score >= 40) return 'needs_care';
    return 'neglected';
  }

  async function generateShibaImage(forceGenerate = false) {
    if (loading) return;

    const today = format(new Date(), 'yyyy-MM-dd');
    healthScore = calculateHealthScore();
    const mood = getMoodFromHealthScore(healthScore);
    currentMood = mood;

    // Check if we have a cached image for this mood from today
    if (!forceGenerate && cachedImages[mood] && cachedImages[mood].date === today) {
      console.log(`Using cached ${mood} Shiba from today`);
      imageUrl = cachedImages[mood].url;
      updateMessage();
      return;
    }

    // If forcing regenerate, clear the cached image for this mood
    if (forceGenerate && cachedImages[mood]) {
      delete cachedImages[mood];
    }

    loading = true;
    error = null;

    try {
      let prompt: string;

      // Shiba Inu states based on mood
      if (mood === 'thriving') {
        message = "Your Shiba is thriving! Keep it up! 🐕✨";
        prompt = "A joyful happy Shiba Inu dog sitting proudly next to a full food bowl with kibble, sparkling bright eyes, fluffy ultra clean golden coat, wagging tail, big cheerful smile, colorful toys scattered around, cozy home setting, pastel pink and blue sky background, vibrant rainbow colors, glowing warm sunlight, kawaii aesthetic, digital art, cute, adorable, high quality";
      } else if (mood === 'healthy') {
        message = "Your Shiba is doing well! 🐕💚";
        prompt = "A content cheerful Shiba Inu dog sitting calmly beside a food bowl with some kibble, bright alert eyes, well-groomed shiny coat, gentle happy expression, simple comfortable home, pastel green and yellow background, soft vibrant colors, warm pleasant lighting, kawaii style, digital art, cute and healthy";
      } else if (mood === 'needs_care') {
        message = "Your Shiba needs more attention... 🐕💛";
        prompt = "A tired but hopeful Shiba Inu dog sitting with slightly droopy ears next to a half-empty food bowl, gentle pleading eyes looking at viewer, coat a bit messy but still cute, sparse simple room, pastel lavender and peach background, soft muted but warm colors, gentle lighting, kawaii aesthetic, digital art, needs care but still adorable";
      } else {
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

      // Cache the image for this mood
      cachedImages[mood] = {
        url: imageUrl,
        date: today
      };

      // Save cache to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('shibaCache', JSON.stringify(cachedImages));
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
    const mood = getMoodFromHealthScore(healthScore);
    currentMood = mood;

    if (mood === 'thriving') {
      message = "Your Shiba is thriving! Keep it up! 🐕✨";
    } else if (mood === 'healthy') {
      message = "Your Shiba is doing well! 🐕💚";
    } else if (mood === 'needs_care') {
      message = "Your Shiba needs more attention... 🐕💛";
    } else {
      message = "Your Shiba is feeling neglected... 🐕💔";
    }

    // Load cached image for current mood if available
    const today = format(new Date(), 'yyyy-MM-dd');
    if (cachedImages[mood] && cachedImages[mood].date === today) {
      imageUrl = cachedImages[mood].url;
    }
  }

  onMount(() => {
    updateMessage();

    // Generate initial image if we don't have one for the current mood
    const today = format(new Date(), 'yyyy-MM-dd');
    const mood = getMoodFromHealthScore(calculateHealthScore());

    if (!cachedImages[mood] || cachedImages[mood].date !== today) {
      // Only auto-generate if all habits are checked
      const allChecked = habitStats.totalHabits > 0 && habitStats.completedToday === habitStats.totalHabits;
      if (allChecked) {
        generateShibaImage();
      }
    }
  });

  // Watch for habit changes
  $: {
    healthScore = calculateHealthScore();
    const mood = getMoodFromHealthScore(healthScore);
    currentMood = mood;

    // Auto-generate when all habits are checked for the first time today
    const today = format(new Date(), 'yyyy-MM-dd');
    const allChecked = habitStats.totalHabits > 0 && habitStats.completedToday === habitStats.totalHabits;

    if (allChecked && (!cachedImages[mood] || cachedImages[mood].date !== today) && !loading) {
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
    <div class="character-image-full" on:click={() => generateShibaImage(true)} role="button" tabindex="0" title="Click to regenerate Shiba image">
      <img src={imageUrl} alt="Your Shiba Inu reflecting your habit progress" />
      <button class="regenerate-btn" on:click|stopPropagation={() => generateShibaImage(true)} title="Generate new image">
        🔄
      </button>
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
    position: relative;
    cursor: pointer;
    transition: transform 0.2s ease;
  }

  .character-image-full:hover {
    transform: scale(1.02);
  }

  .character-image-full:active {
    transform: scale(0.98);
  }

  .character-image-full img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 12px;
  }

  .regenerate-btn {
    position: absolute;
    bottom: 12px;
    right: 12px;
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: rgba(18, 18, 18, 0.85);
    backdrop-filter: blur(10px);
    border: 2px solid rgba(147, 51, 234, 0.5);
    color: #9333ea;
    font-size: 1.3rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s ease;
    opacity: 0;
    transform: scale(0.8);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
  }

  .character-image-full:hover .regenerate-btn {
    opacity: 1;
    transform: scale(1);
  }

  .regenerate-btn:hover {
    background: rgba(147, 51, 234, 0.2);
    border-color: rgba(147, 51, 234, 0.8);
    transform: scale(1.1) rotate(180deg);
    box-shadow: 0 6px 16px rgba(147, 51, 234, 0.4);
  }

  .regenerate-btn:active {
    transform: scale(0.95) rotate(180deg);
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
