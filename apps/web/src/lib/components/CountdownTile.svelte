<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { differenceInDays, parseISO, isPast, isToday } from 'date-fns';

  interface Countdown {
    id: string;
    label: string;
    targetDate: string;
    icon: string | null;
    color: string;
  }

  let countdowns: Countdown[] = [];
  let loading = true;
  let now = new Date();
  let interval: ReturnType<typeof setInterval>;

  async function loadCountdowns() {
    try {
      const response = await fetch('/api/countdowns');
      const data = await response.json();
      countdowns = data.countdowns || [];
    } catch (error) {
      console.error('Failed to load countdowns:', error);
    } finally {
      loading = false;
    }
  }

  function getDaysRemaining(targetDate: string): number {
    const target = parseISO(targetDate);
    return differenceInDays(target, now);
  }

  function getStatus(days: number): 'past' | 'today' | 'urgent' | 'soon' | 'normal' {
    if (days < 0) return 'past';
    if (days === 0) return 'today';
    if (days <= 3) return 'urgent';
    if (days <= 14) return 'soon';
    return 'normal';
  }

  onMount(() => {
    loadCountdowns();
    interval = setInterval(() => {
      now = new Date();
    }, 60000);
  });

  onDestroy(() => {
    if (interval) clearInterval(interval);
  });

  $: primaryCountdown = countdowns[0];
  $: additionalCountdowns = countdowns.slice(1);
</script>

<div class="countdown-tile">
  {#if loading}
    <div class="loading-state">
      <div class="loader"></div>
    </div>
  {:else if !primaryCountdown}
    <div class="empty-state">
      <span class="empty-icon">⏳</span>
      <p>No countdown set</p>
    </div>
  {:else}
    {@const days = getDaysRemaining(primaryCountdown.targetDate)}
    {@const status = getStatus(days)}
    <div class="primary-countdown {status}">
      <div class="countdown-display">
        <span class="days-number" style="--accent-color: {primaryCountdown.color}">{Math.abs(days)}</span>
        <span class="days-unit">{Math.abs(days) === 1 ? 'day' : 'days'}</span>
        <span class="days-direction">
          {#if days < 0}
            ago
          {:else if days === 0}
            — today!
          {:else}
            left
          {/if}
        </span>
      </div>
      <div class="countdown-label">
        {#if primaryCountdown.icon}
          <span class="label-icon">{primaryCountdown.icon}</span>
        {/if}
        <span class="label-text">{primaryCountdown.label}</span>
      </div>
    </div>

    {#if additionalCountdowns.length > 0}
      <div class="additional-countdowns">
        {#each additionalCountdowns as countdown (countdown.id)}
          {@const d = getDaysRemaining(countdown.targetDate)}
          <div class="mini-countdown">
            <span class="mini-days">{Math.abs(d)}</span>
            <span class="mini-label">{countdown.label}</span>
          </div>
        {/each}
      </div>
    {/if}
  {/if}
</div>

<style>
  .countdown-tile {
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
    justify-content: center;
    position: relative;
    overflow: hidden;
  }

  .countdown-tile::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(
      90deg,
      transparent 0%,
      rgba(103, 254, 153, 0.3) 50%,
      transparent 100%
    );
  }

  .loading-state,
  .empty-state {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    color: rgba(255, 255, 255, 0.4);
  }

  .loader {
    width: 24px;
    height: 24px;
    border: 2px solid rgba(103, 254, 153, 0.2);
    border-top-color: #67fe99;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .empty-icon {
    font-size: 2rem;
    opacity: 0.5;
  }

  .empty-state p {
    font-size: 0.8rem;
    margin: 0;
  }

  .primary-countdown {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    flex: 1;
    gap: 0.25rem;
  }

  .countdown-display {
    display: flex;
    align-items: baseline;
    gap: 0.4rem;
  }

  .days-number {
    font-family: 'JetBrains Mono', monospace;
    font-size: 4rem;
    font-weight: 800;
    line-height: 1;
    color: var(--accent-color, #67fe99);
    text-shadow: 0 0 40px color-mix(in srgb, var(--accent-color, #67fe99) 50%, transparent);
    letter-spacing: -0.03em;
  }

  .days-unit {
    font-size: 1.1rem;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.6);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .days-direction {
    font-size: 0.85rem;
    font-weight: 500;
    color: rgba(255, 255, 255, 0.4);
    margin-left: 0.25rem;
  }

  .countdown-label {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    margin-top: 0.5rem;
    padding: 0.35rem 0.75rem;
    background: rgba(255, 255, 255, 0.04);
    border-radius: 20px;
    border: 1px solid rgba(255, 255, 255, 0.06);
  }

  .label-icon {
    font-size: 0.9rem;
  }

  .label-text {
    font-size: 0.8rem;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.8);
    letter-spacing: 0.02em;
  }

  /* Status variations */
  .primary-countdown.today .days-number {
    color: #67fe99;
    animation: pulse-glow 1.5s ease-in-out infinite;
  }

  .primary-countdown.urgent .days-number {
    color: #fb923c;
    text-shadow: 0 0 40px rgba(251, 146, 60, 0.5);
  }

  .primary-countdown.past .days-number {
    color: rgba(239, 68, 68, 0.7);
    text-shadow: 0 0 40px rgba(239, 68, 68, 0.3);
  }

  .primary-countdown.past .days-direction {
    color: rgba(239, 68, 68, 0.6);
  }

  @keyframes pulse-glow {
    0%, 100% {
      opacity: 1;
      text-shadow: 0 0 40px rgba(103, 254, 153, 0.6);
    }
    50% {
      opacity: 0.85;
      text-shadow: 0 0 60px rgba(103, 254, 153, 0.8);
    }
  }

  /* Additional countdowns - compact row */
  .additional-countdowns {
    display: flex;
    gap: 0.5rem;
    margin-top: 0.75rem;
    padding-top: 0.75rem;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
    justify-content: center;
    flex-wrap: wrap;
  }

  .mini-countdown {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0.25rem 0.5rem;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 6px;
    font-size: 0.7rem;
  }

  .mini-days {
    font-family: 'JetBrains Mono', monospace;
    font-weight: 700;
    color: var(--text-primary);
  }

  .mini-label {
    color: rgba(255, 255, 255, 0.5);
    max-width: 80px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
