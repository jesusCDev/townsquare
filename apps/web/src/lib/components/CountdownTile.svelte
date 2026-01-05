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

  function getStatus(targetDate: string): 'past' | 'today' | 'soon' | 'future' {
    const target = parseISO(targetDate);
    if (isPast(target) && !isToday(target)) return 'past';
    if (isToday(target)) return 'today';
    const days = getDaysRemaining(targetDate);
    if (days <= 7) return 'soon';
    return 'future';
  }

  function getUrgencyClass(days: number): string {
    if (days < 0) return 'past';
    if (days === 0) return 'today';
    if (days <= 3) return 'urgent';
    if (days <= 7) return 'soon';
    if (days <= 30) return 'upcoming';
    return 'distant';
  }

  onMount(() => {
    loadCountdowns();
    interval = setInterval(() => {
      now = new Date();
    }, 60000); // Update every minute
  });

  onDestroy(() => {
    if (interval) clearInterval(interval);
  });
</script>

<div class="countdown-tile">
  <div class="tile-header">
    <span class="tile-icon">&#8987;</span>
    <h3>Countdowns</h3>
  </div>

  {#if loading}
    <div class="loading-state">
      <div class="loader"></div>
    </div>
  {:else if countdowns.length === 0}
    <div class="empty-state">
      <span class="empty-icon">&#128467;</span>
      <p>No countdowns set</p>
    </div>
  {:else}
    <div class="countdown-list">
      {#each countdowns as countdown (countdown.id)}
        {@const days = getDaysRemaining(countdown.targetDate)}
        {@const urgency = getUrgencyClass(days)}
        <div class="countdown-item {urgency}">
          <div class="countdown-ring" style="--ring-color: {countdown.color}">
            <span class="days-number">{Math.abs(days)}</span>
            <span class="days-label">{days === 1 || days === -1 ? 'day' : 'days'}</span>
          </div>
          <div class="countdown-info">
            <span class="countdown-icon">{countdown.icon || '&#9200;'}</span>
            <span class="countdown-label">{countdown.label}</span>
            {#if days < 0}
              <span class="countdown-status past">passed</span>
            {:else if days === 0}
              <span class="countdown-status today">TODAY</span>
            {:else}
              <span class="countdown-status">remaining</span>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .countdown-tile {
    background: linear-gradient(
      135deg,
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

  .tile-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  }

  .tile-icon {
    font-size: 1rem;
    filter: grayscale(0.2);
  }

  .tile-header h3 {
    font-size: 0.75rem;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.7);
    letter-spacing: 0.04em;
    text-transform: uppercase;
    margin: 0;
  }

  .loading-state,
  .empty-state {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
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

  .countdown-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    flex: 1;
    overflow-y: auto;
  }

  .countdown-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.5rem 0.75rem;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 10px;
    border: 1px solid rgba(255, 255, 255, 0.05);
    transition: all 0.2s ease;
  }

  .countdown-item:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.08);
    transform: translateX(2px);
  }

  .countdown-ring {
    width: 46px;
    height: 46px;
    border-radius: 50%;
    background: linear-gradient(
      135deg,
      rgba(0, 0, 0, 0.4) 0%,
      rgba(0, 0, 0, 0.2) 100%
    );
    border: 2px solid var(--ring-color, #67fe99);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    box-shadow: 0 0 16px color-mix(in srgb, var(--ring-color) 30%, transparent),
                inset 0 2px 4px rgba(0, 0, 0, 0.3);
  }

  .days-number {
    font-family: 'JetBrains Mono', monospace;
    font-size: 1.1rem;
    font-weight: 700;
    line-height: 1;
    color: var(--text-primary);
  }

  .days-label {
    font-size: 0.5rem;
    font-weight: 500;
    color: rgba(255, 255, 255, 0.5);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .countdown-info {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    min-width: 0;
    flex: 1;
  }

  .countdown-icon {
    font-size: 0.9rem;
    line-height: 1;
  }

  .countdown-label {
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .countdown-status {
    font-size: 0.7rem;
    font-weight: 500;
    color: rgba(255, 255, 255, 0.4);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .countdown-status.today {
    color: #67fe99;
    font-weight: 700;
    animation: pulse-glow 1.5s ease-in-out infinite;
  }

  .countdown-status.past {
    color: rgba(239, 68, 68, 0.7);
  }

  @keyframes pulse-glow {
    0%, 100% { opacity: 1; text-shadow: 0 0 8px rgba(103, 254, 153, 0.5); }
    50% { opacity: 0.7; text-shadow: 0 0 4px rgba(103, 254, 153, 0.3); }
  }

  /* Urgency states */
  .countdown-item.today {
    background: linear-gradient(135deg, rgba(103, 254, 153, 0.15) 0%, rgba(103, 254, 153, 0.05) 100%);
    border-color: rgba(103, 254, 153, 0.3);
  }

  .countdown-item.urgent {
    background: linear-gradient(135deg, rgba(251, 191, 36, 0.12) 0%, rgba(251, 191, 36, 0.04) 100%);
    border-color: rgba(251, 191, 36, 0.25);
  }

  .countdown-item.past {
    opacity: 0.6;
    background: linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(239, 68, 68, 0.02) 100%);
    border-color: rgba(239, 68, 68, 0.15);
  }

  .countdown-item.past .countdown-ring {
    border-color: rgba(239, 68, 68, 0.5);
  }
</style>
