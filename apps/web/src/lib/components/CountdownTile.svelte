<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { differenceInDays, parseISO, isPast, isToday } from 'date-fns';
  import { scrambleMode, scrambleText } from '$lib/stores/scramble';
  import { socket } from '$lib/stores/socket';

  interface Countdown {
    id: string;
    label: string;
    targetDate: string;
    icon: string | null;
    color: string;
    createdAt: string;
  }

  let countdowns: Countdown[] = [];
  let loading = true;
  let now = new Date();
  let interval: ReturnType<typeof setInterval>;
  let midnightTimeout: ReturnType<typeof setTimeout> | null = null;

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

  function getProgressPercentage(countdown: Countdown): number {
    if (!countdown.createdAt) return 0;

    const start = parseISO(countdown.createdAt);
    const target = parseISO(countdown.targetDate);
    const totalDays = differenceInDays(target, start);
    const daysPassed = differenceInDays(now, start);

    if (totalDays <= 0) return 100;
    const progress = (daysPassed / totalDays) * 100;
    return Math.min(Math.max(progress, 0), 100);
  }

  function updateNow() {
    now = new Date();
  }

  function scheduleNextMidnight() {
    // Clear any existing midnight timeout
    if (midnightTimeout) {
      clearTimeout(midnightTimeout);
    }

    // Calculate milliseconds until next midnight
    const tomorrow = new Date();
    tomorrow.setHours(24, 0, 0, 0); // Set to next midnight
    const msUntilMidnight = tomorrow.getTime() - Date.now();

    // Schedule update at midnight
    midnightTimeout = setTimeout(() => {
      updateNow();
      scheduleNextMidnight(); // Schedule the next one
    }, msUntilMidnight);
  }

  onMount(() => {
    loadCountdowns();

    // Update every 60 seconds as a backup
    interval = setInterval(updateNow, 60000);

    // Schedule precise midnight updates
    scheduleNextMidnight();

    // Listen for day-changed event from server
    const handleDayChanged = (data: { date: string; timestamp: string }) => {
      console.log('Day changed event received:', data);
      updateNow();
    };

    $socket?.on('day:changed', handleDayChanged);

    return () => {
      $socket?.off('day:changed', handleDayChanged);
    };
  });

  onDestroy(() => {
    if (interval) clearInterval(interval);
    if (midnightTimeout) clearTimeout(midnightTimeout);
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
    {@const days = differenceInDays(parseISO(primaryCountdown.targetDate), now)}
    {@const status = getStatus(days)}
    {@const totalDays = primaryCountdown.createdAt ? differenceInDays(parseISO(primaryCountdown.targetDate), parseISO(primaryCountdown.createdAt)) : 0}
    {@const daysPassed = primaryCountdown.createdAt ? differenceInDays(now, parseISO(primaryCountdown.createdAt)) : 0}
    {@const progress = totalDays <= 0 ? 100 : Math.min(Math.max((daysPassed / totalDays) * 100, 0), 100)}
    <div class="primary-countdown {status}">
      <div class="progress-background" style="--progress: {progress}%; --progress-color: {primaryCountdown.color}"></div>
      <div class="countdown-content">
        <div class="countdown-number-section">
          <span class="days-number" style="--accent-color: {primaryCountdown.color}">{Math.abs(days)}</span>
        </div>
        <div class="countdown-details-section">
          <div class="countdown-label">
            {#if primaryCountdown.icon && !$scrambleMode}
              <span class="label-icon">{primaryCountdown.icon}</span>
            {/if}
            <span class="label-text">{$scrambleMode ? scrambleText(primaryCountdown.label) : primaryCountdown.label}</span>
          </div>
          <div class="countdown-text">
            <span class="days-unit">{Math.abs(days) === 1 ? 'day' : 'days'}</span>
            <span class="days-direction">
              {#if days < 0}
                ago
              {:else if days === 0}
                today!
              {:else}
                left
              {/if}
            </span>
          </div>
          <div class="progress-info">
            <span class="progress-text">{Math.round(progress)}% complete</span>
          </div>
        </div>
      </div>
    </div>

    {#if additionalCountdowns.length > 0}
      <div class="additional-countdowns">
        {#each additionalCountdowns as countdown (countdown.id)}
          {@const d = differenceInDays(parseISO(countdown.targetDate), now)}
          <div class="mini-countdown">
            <span class="mini-days">{Math.abs(d)}</span>
            <span class="mini-label">{$scrambleMode ? scrambleText(countdown.label) : countdown.label}</span>
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
    position: relative;
    overflow: hidden;
    padding: 0 1rem;
  }

  .progress-background {
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    width: var(--progress, 0%);
    background: linear-gradient(
      90deg,
      color-mix(in srgb, var(--progress-color, #67fe99) 10%, transparent) 0%,
      color-mix(in srgb, var(--progress-color, #67fe99) 5%, transparent) 100%
    );
    transition: width 0.5s ease;
    z-index: 0;
  }

  .countdown-content {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    gap: 1.5rem;
    width: 100%;
    height: 100%;
  }

  .countdown-number-section {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .days-number {
    font-family: 'JetBrains Mono', monospace;
    font-size: 7rem;
    font-weight: 800;
    line-height: 0.9;
    color: var(--accent-color, #67fe99);
    text-shadow: 0 0 60px color-mix(in srgb, var(--accent-color, #67fe99) 50%, transparent);
    letter-spacing: -0.05em;
  }

  .countdown-details-section {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    flex-shrink: 0;
    justify-content: center;
  }

  .countdown-text {
    display: flex;
    align-items: baseline;
    gap: 0.4rem;
  }

  .progress-info {
    margin-top: 0.25rem;
  }

  .progress-text {
    font-size: 0.7rem;
    font-weight: 500;
    color: rgba(255, 255, 255, 0.4);
    font-family: 'JetBrains Mono', monospace;
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
    gap: 0.5rem;
    padding: 0.5rem 0.85rem;
    background: rgba(255, 255, 255, 0.04);
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.06);
    align-self: flex-start;
  }

  .label-icon {
    font-size: 1rem;
  }

  .label-text {
    font-size: 0.9rem;
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
