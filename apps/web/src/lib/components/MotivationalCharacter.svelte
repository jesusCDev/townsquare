<script lang="ts">
  import { onMount } from 'svelte';
  import { scrambleMode, scrambleText } from '$lib/stores/scramble';

  export let habitStats: { totalHabits: number; completedToday: number; currentStreak: number } = {
    totalHabits: 0,
    completedToday: 0,
    currentStreak: 0
  };

  let imageUrl: string | null = null;
  let message: string = '';
  let loading = false;
  let error: string | null = null;

  async function generateMotivation() {
    if (loading) return;

    loading = true;
    error = null;

    try {
      // Determine the mood based on habit completion
      const completionRate = habitStats.totalHabits > 0
        ? habitStats.completedToday / habitStats.totalHabits
        : 0;

      let mood: 'encouraging' | 'celebrating' | 'supportive';
      let prompt: string;

      if (completionRate >= 0.8) {
        mood = 'celebrating';
        message = "You're crushing it! Keep that momentum going! 🔥";
        prompt = "A cheerful, energetic anime-style character celebrating with raised fists, vibrant colors, inspiring and motivational, digital art";
      } else if (completionRate >= 0.5) {
        mood = 'encouraging';
        message = "You're doing great! Small steps lead to big wins! 💪";
        prompt = "A friendly, supportive anime-style character with an encouraging smile, warm colors, gentle and motivating, digital art";
      } else {
        mood = 'supportive';
        message = "It's okay to stumble. What matters is getting back up! 🌟";
        prompt = "A kind, empathetic anime-style character with outstretched hand offering help, soft pastel colors, comforting and uplifting, digital art";
      }

      const response = await fetch('/api/motivation/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, mood })
      });

      if (!response.ok) {
        throw new Error('Failed to generate motivation');
      }

      const data = await response.json();
      imageUrl = data.imageUrl;
    } catch (err: any) {
      console.error('Failed to generate motivation:', err);

      // Check if it's an API key error
      if (err?.message?.includes('API key') || err?.response?.status === 503) {
        error = 'OpenAI API key not configured. Add it in Settings → AI Settings.';
      } else {
        error = 'Could not generate motivation. Check console for details.';
      }

      message = "Every day is a new chance to be better! 🌅";
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    // Generate on mount if completion rate is low
    const completionRate = habitStats.totalHabits > 0
      ? habitStats.completedToday / habitStats.totalHabits
      : 0;

    if (completionRate < 0.5) {
      generateMotivation();
    } else {
      message = "Keep up the great work! 🎯";
    }
  });

  $: completionRate = habitStats.totalHabits > 0
    ? habitStats.completedToday / habitStats.totalHabits
    : 0;
</script>

<div class="motivational-character">
  <div class="character-header">
    <h3>Your Coach</h3>
    <div class="stats">
      <span class="stat">
        <span class="stat-value">{habitStats.completedToday}/{habitStats.totalHabits}</span>
        <span class="stat-label">Today</span>
      </span>
      <span class="stat">
        <span class="stat-value">{habitStats.currentStreak}</span>
        <span class="stat-label">Streak</span>
      </span>
    </div>
  </div>

  <div class="character-display">
    {#if loading}
      <div class="loading-state">
        <div class="loader"></div>
        <p>Generating motivation...</p>
      </div>
    {:else if imageUrl}
      <div class="character-image">
        <img src={imageUrl} alt="Motivational character" />
      </div>
    {:else if error}
      <div class="placeholder-character">
        <span class="emoji">💪</span>
      </div>
    {:else}
      <div class="placeholder-character">
        <span class="emoji">🌟</span>
      </div>
    {/if}
  </div>

  <div class="message">
    <p>{$scrambleMode ? scrambleText(message) : message}</p>
    {#if error && error.includes('API key')}
      <a href="/admin" class="settings-link">Go to Settings →</a>
    {/if}
  </div>

  <button class="regenerate-btn" on:click={generateMotivation} disabled={loading}>
    {loading ? '⏳' : '🔄'} New Motivation
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
