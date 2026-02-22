<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { format } from 'date-fns';
  import { isConnected } from '$lib/stores/socket';
  import { nightModeInfo, temporarilyDisableDim } from '$lib/stores/nightmode';
  import { timeFormat, formatTime } from '$lib/stores/timeFormat';
  import { blurModeInfo } from '$lib/stores/blurmode';
  import { scrambleMode, scrambleText } from '$lib/stores/scramble';

  let currentTime = new Date();
  let interval: ReturnType<typeof setInterval>;
  let health: any = null;
  let healthInterval: ReturnType<typeof setInterval>;
  let timeInterval: ReturnType<typeof setInterval>;
  let alerts: any[] = [];
  let alertsInterval: ReturnType<typeof setInterval>;

  async function loadHealth() {
    try {
      const response = await fetch('/api/health');
      health = await response.json();
    } catch (error) {
      console.error('Failed to load health:', error);
    }
  }

  async function loadAlerts() {
    try {
      const response = await fetch('/api/alerts');
      const data = await response.json();
      alerts = data.alerts || [];
    } catch (error) {
      console.error('Failed to load alerts:', error);
    }
  }

  function getNextAlert() {
    const now = new Date();
    const currentDay = now.getDay();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const dayMask = 1 << currentDay;

    let nextAlert = null;
    let minMinutesUntil = Infinity;

    for (const alert of alerts) {
      if ((alert.daysMask & dayMask) === 0) continue;

      const [hours, minutes] = alert.time.split(':').map(Number);
      const alertMinutes = hours * 60 + minutes;
      const minutesUntil = alertMinutes - currentMinutes;

      if (minutesUntil >= 0 && minutesUntil < minMinutesUntil) {
        minMinutesUntil = minutesUntil;
        nextAlert = { ...alert, minutesUntil };
      }
    }

    return nextAlert;
  }

  let blurUpdateInterval: ReturnType<typeof setInterval>;
  let currentTimeForBlur = new Date();

  onMount(() => {
    loadHealth();
    loadAlerts();
    healthInterval = setInterval(loadHealth, 30000);
    alertsInterval = setInterval(loadAlerts, 60000);
    
    // Update clock every minute
    const now = new Date();
    const msUntilNextMinute = (60 - now.getSeconds()) * 1000 - now.getMilliseconds();
    
    setTimeout(() => {
      currentTime = new Date();
      interval = setInterval(() => {
        currentTime = new Date();
      }, 60000);
    }, msUntilNextMinute);
    
    // Update for dim mode countdown
    timeInterval = setInterval(() => {
      if ($nightModeInfo.isTemporarilyDisabled) {
        currentTime = new Date();
      }
    }, 60000);
    
    // Update for blur mode countdown
    blurUpdateInterval = setInterval(() => {
      if ($blurModeInfo.enabled) {
        currentTimeForBlur = new Date();
      }
    }, 5000); // Update every 5 seconds for more accurate countdown
  });

  onDestroy(() => {
    if (interval) clearInterval(interval);
    if (healthInterval) clearInterval(healthInterval);
    if (timeInterval) clearInterval(timeInterval);
    if (alertsInterval) clearInterval(alertsInterval);
    if (blurUpdateInterval) clearInterval(blurUpdateInterval);
  });

  function toggleDimMode() {
    if ($nightModeInfo.isTemporarilyDisabled) {
      window.location.reload();
    } else if ($nightModeInfo.isActive) {
      temporarilyDisableDim();
    }
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error('Error entering fullscreen:', err);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  }

  $: timeStr = formatTime(currentTime, $timeFormat);
  $: dateStr = format(currentTime, 'EEEE, MMMM d');
  $: memoryUsedPercent = health?.system?.memory
    ? ((health.system.memory.used / health.system.memory.total) * 100).toFixed(1)
    : '0';
  $: timeUntilRestore = $nightModeInfo.disableUntil
    ? Math.ceil(($nightModeInfo.disableUntil - currentTime.getTime()) / 1000 / 60)
    : 0;
  $: nextAlert = getNextAlert();
  $: blurMinutesRemaining = $blurModeInfo.disableAt
    ? Math.max(0, Math.ceil(($blurModeInfo.disableAt - currentTimeForBlur.getTime()) / 1000 / 60))
    : 0;

  // Split time and period (AM/PM) for better dim mode layout
  $: {
    const parts = timeStr.match(/^(.*?)(\s*[AP]M)?$/);
    if (parts) {
      timePart = parts[1] || timeStr;
      periodPart = parts[2]?.trim() || '';
    } else {
      timePart = timeStr;
      periodPart = '';
    }
  }
  let timePart = '';
  let periodPart = '';
</script>

<div class="header glass">
  <!-- Left section: System info -->
  <div class="left-section">
    <div class="status-item">
      <span class="status-dot" class:connected={$isConnected} class:disconnected={!$isConnected}></span>
      <span>{$isConnected ? 'Connected' : 'Disconnected'}</span>
    </div>
    {#if health}
      <div class="metric">Mem: {memoryUsedPercent}%</div>
      <div class="metric">Up: {Math.floor(health.uptime / 3600)}h</div>
    {/if}
    
    {#if $nightModeInfo.isScheduled || $nightModeInfo.isManuallyEnabled}
      <button
        class="dim-toggle"
        class:active={$nightModeInfo.isActive}
        class:disabled={$nightModeInfo.isTemporarilyDisabled}
        on:click={toggleDimMode}
        title={$nightModeInfo.isTemporarilyDisabled ? 'Enable dim mode' : 'Disable dim mode'}
      >
        <span class="moon-icon">🌙</span>
        {#if $nightModeInfo.isTemporarilyDisabled}
          <span class="dim-status">Off · {timeUntilRestore}m</span>
        {:else if $nightModeInfo.isActive}
          <span class="dim-status">Dim</span>
        {:else}
          <span class="dim-status">Ready</span>
        {/if}
      </button>
    {/if}
  </div>

  <!-- Center section: Clock -->
  <div class="center-section">
    <div class="date">{dateStr}</div>
    {#if $nightModeInfo.isActive}
      <div class="time-container dim-mode">
        <span class="time-main font-mono">{timePart}</span>
        {#if periodPart}
          <span class="time-period font-mono">{periodPart}</span>
        {/if}
      </div>
    {:else}
      <div class="time font-mono">{timeStr}</div>
    {/if}
    {#if nextAlert}
      <div class="next-alert">
        <span class="alert-icon">⏰</span>
        {$scrambleMode ? scrambleText(nextAlert.name) : nextAlert.name} at {nextAlert.time}
        {#if nextAlert.minutesUntil <= 10}
          <span class="alert-soon">in {nextAlert.minutesUntil}m</span>
        {/if}
      </div>
    {/if}
  </div>

  <!-- Right section: Settings -->
  <div class="right-section">
    {#if $blurModeInfo.enabled}
      <div class="blur-timer" title="Blur mode will auto-disable in {blurMinutesRemaining} minutes">
        <span class="blur-icon">👁️</span>
        <span class="blur-time">{blurMinutesRemaining}m</span>
      </div>
    {/if}
    <div class="version">v{health?.version || '1.0.0'}</div>
    <button class="fullscreen-btn" on:click={toggleFullscreen} title="Toggle fullscreen">
      ⛶
    </button>
    <a href="/admin" class="settings-link">⚙️ Settings</a>
  </div>
</div>

<style>
  .header {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    padding: 1rem 1.5rem;
    border-radius: 16px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.8rem;
    gap: 2rem;
    position: relative;
  }

  .header::before {
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

  .left-section, .right-section {
    display: flex;
    align-items: center;
    gap: 1rem;
    color: var(--text-secondary);
  }

  .left-section {
    justify-self: start;
  }

  .right-section {
    justify-self: end;
  }

  .status-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .status-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    transition: background 0.3s;
  }

  .status-dot.connected {
    background: var(--accent-success);
    box-shadow: 0 0 8px var(--accent-success);
  }

  .status-dot.disconnected {
    background: var(--accent-warning);
  }

  .metric {
    font-size: 0.8rem;
  }

  .dim-toggle {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.3rem 0.6rem;
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.08);
    transition: all 0.2s ease;
    cursor: pointer;
    font-family: inherit;
    font-size: inherit;
    color: inherit;
  }

  .dim-toggle:hover {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.12);
  }

  .dim-toggle.active {
    background: rgba(59, 130, 246, 0.15);
    border-color: rgba(59, 130, 246, 0.4);
  }

  .dim-toggle.active:hover {
    background: rgba(59, 130, 246, 0.2);
  }

  .dim-toggle.disabled {
    background: rgba(239, 68, 68, 0.1);
    border-color: rgba(239, 68, 68, 0.3);
  }

  .dim-toggle.disabled:hover {
    background: rgba(239, 68, 68, 0.15);
  }

  .moon-icon {
    font-size: 0.85rem;
    filter: grayscale(0.3);
    transition: filter 0.2s;
  }

  .dim-toggle.active .moon-icon {
    filter: grayscale(0);
  }

  .dim-toggle.disabled .moon-icon {
    filter: grayscale(0.6) opacity(0.6);
  }

  .dim-status {
    font-size: 0.7rem;
    font-weight: 500;
  }

  /* Center section */
  .center-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
    justify-self: center;
    position: relative;
    z-index: 10000; /* Above dim overlay */
  }

  .date {
    font-size: 0.85rem;
    font-weight: 500;
    color: var(--text-tertiary);
    letter-spacing: 0.01em;
    white-space: nowrap;
    position: relative;
    z-index: 10000; /* Above dim overlay */
  }

  .time {
    font-size: 2.5rem;
    font-weight: 300;
    color: var(--accent-primary);
    letter-spacing: -0.02em;
    line-height: 1;
    text-shadow: 0 0 20px rgba(103, 254, 153, 0.3);
    transition: font-size 0.4s ease;
    position: relative;
    z-index: 10000; /* Above dim overlay */
  }

  .time-container {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1.5rem;
    position: relative;
    z-index: 10000;
  }

  .time-container.dim-mode {
    gap: clamp(1rem, 3vw, 3rem);
  }

  .time-main {
    font-size: clamp(8rem, 20vw, 24rem);
    font-weight: 200;
    color: rgba(103, 254, 153, 1);
    letter-spacing: -0.02em;
    line-height: 1;
    text-shadow: 0 0 60px rgba(103, 254, 153, 0.8),
                 0 0 120px rgba(103, 254, 153, 0.4);
  }

  .time-period {
    font-size: clamp(3rem, 7vw, 8rem);
    font-weight: 300;
    color: rgba(103, 254, 153, 0.8);
    letter-spacing: 0.05em;
    line-height: 1;
    text-shadow: 0 0 40px rgba(103, 254, 153, 0.6),
                 0 0 80px rgba(103, 254, 153, 0.3);
    align-self: flex-end;
    padding-bottom: clamp(0.5rem, 2vw, 2rem);
  }

  .next-alert {
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.7);
    margin-top: 0.5rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .alert-icon {
    font-size: 0.9rem;
  }

  .alert-soon {
    color: var(--accent-warning);
    font-weight: 600;
    margin-left: 0.25rem;
  }

  .version {
    font-size: 0.7rem;
    color: var(--text-tertiary);
  }

  .fullscreen-btn {
    background: none;
    border: none;
    color: var(--accent-primary);
    font-size: 1.2rem;
    cursor: pointer;
    transition: opacity 0.2s, transform 0.2s;
    padding: 0.25rem;
    line-height: 1;
  }

  .fullscreen-btn:hover {
    opacity: 0.7;
    transform: scale(1.1);
  }

  .fullscreen-btn:active {
    transform: scale(0.95);
  }

  .settings-link {
    color: var(--accent-primary);
    text-decoration: none;
    font-weight: 600;
    transition: opacity 0.2s;
  }

  .settings-link:hover {
    opacity: 0.7;
  }

  .blur-timer {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.3rem 0.6rem;
    border-radius: 6px;
    background: rgba(59, 130, 246, 0.15);
    border: 1px solid rgba(59, 130, 246, 0.4);
    font-size: 0.8rem;
    font-weight: 600;
    color: rgba(59, 130, 246, 1);
  }

  .blur-icon {
    font-size: 0.85rem;
  }

  .blur-time {
    font-size: 0.75rem;
    font-weight: 700;
  }
</style>
