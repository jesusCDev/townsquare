<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { format } from 'date-fns';

  let currentTime = new Date();
  let interval: ReturnType<typeof setInterval>;

  onMount(() => {
    // Update every minute instead of every second since we only show HH:mm
    const now = new Date();
    const msUntilNextMinute = (60 - now.getSeconds()) * 1000 - now.getMilliseconds();
    
    // First update at the start of next minute
    setTimeout(() => {
      currentTime = new Date();
      // Then update every minute
      interval = setInterval(() => {
        currentTime = new Date();
      }, 60000);
    }, msUntilNextMinute);
  });

  onDestroy(() => {
    if (interval) clearInterval(interval);
  });

  $: timeStr = format(currentTime, 'HH:mm');
  $: dateStr = format(currentTime, 'EEEE, MMMM d');
</script>

<div class="clock-container glass">
  <div class="time-display">
    <div class="date">{dateStr}</div>
    <div class="time font-mono">{timeStr}</div>
  </div>
</div>

<style>
  .clock-container {
    padding: 1.5rem 2rem;
    border-radius: 16px;
    position: relative;
    overflow: hidden;
  }

  .clock-container::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg, 
      transparent,
      rgba(255, 255, 255, 0.15) 50%,
      transparent);
  }

  .time-display {
    display: flex;
    align-items: center;
    gap: 2rem;
    position: relative;
  }

  .date {
    font-size: clamp(0.85rem, 1vw, 0.95rem);
    font-weight: 500;
    color: var(--text-tertiary);
    letter-spacing: 0.01em;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .time {
    font-size: clamp(3rem, 6vw, 4.5rem);
    font-weight: 300;
    color: var(--accent-primary);
    letter-spacing: -0.02em;
    line-height: 1;
    text-shadow: 0 0 20px rgba(103, 254, 153, 0.3);
  }
</style>
