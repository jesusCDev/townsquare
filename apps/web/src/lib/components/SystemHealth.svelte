<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { isConnected } from '$lib/stores/socket';
  import { nightModeInfo, temporarilyDisableDim } from '$lib/stores/nightmode';
  import { format } from 'date-fns';

  let health: any = null;
  let interval: ReturnType<typeof setInterval>;
  let currentTime = new Date();
  let timeInterval: ReturnType<typeof setInterval>;

  async function loadHealth() {
    try {
      const response = await fetch('/api/health');
      health = await response.json();
    } catch (error) {
      console.error('Failed to load health:', error);
    }
  }

  onMount(() => {
    loadHealth();
    interval = setInterval(loadHealth, 30000);
    // Only update time if dim mode is temporarily disabled (for countdown)
    timeInterval = setInterval(() => {
      if ($nightModeInfo.isTemporarilyDisabled) {
        currentTime = new Date();
      }
    }, 60000); // Update every minute instead of every second
  });

  onDestroy(() => {
    if (interval) clearInterval(interval);
    if (timeInterval) clearInterval(timeInterval);
  });

  $: memoryUsedPercent = health?.system?.memory
    ? ((health.system.memory.used / health.system.memory.total) * 100).toFixed(1)
    : '0';
  
  $: timeUntilRestore = $nightModeInfo.disableUntil 
    ? Math.ceil(($nightModeInfo.disableUntil - currentTime.getTime()) / 1000 / 60)
    : 0;

  function toggleDimMode() {
    if ($nightModeInfo.isTemporarilyDisabled) {
      // If currently disabled, enable it immediately by reloading
      window.location.reload();
    } else if ($nightModeInfo.isActive) {
      // If dim is active, disable it temporarily
      temporarilyDisableDim();
    }
  }
</script>

<div class="system-health glass">
  <div class="content">
    <div class="left-section">
      <div class="status-item">
        <span class="status-dot" class:connected={$isConnected} class:disconnected={!$isConnected}></span>
        <span>{$isConnected ? 'Connected' : 'Disconnected'}</span>
      </div>
      {#if health}
        <div class="metric">Memory: {memoryUsedPercent}%</div>
        <div class="metric">Uptime: {Math.floor(health.uptime / 3600)}h</div>
      {/if}
      
      {#if $nightModeInfo.isScheduled}
        <button 
          class="dim-toggle" 
          class:active={$nightModeInfo.isActive}
          class:disabled={$nightModeInfo.isTemporarilyDisabled}
          on:click={toggleDimMode}
          title={$nightModeInfo.isTemporarilyDisabled ? 'Enable dim mode' : 'Disable dim mode temporarily'}
        >
          <span class="moon-icon">🌙</span>
          {#if $nightModeInfo.isTemporarilyDisabled}
            <span class="dim-status">Off · {timeUntilRestore}m</span>
          {:else if $nightModeInfo.isActive}
            <span class="dim-status">Dim mode</span>
          {:else}
            <span class="dim-status">Ready</span>
          {/if}
        </button>
      {/if}
    </div>
    
    <div class="right-section">
      <a href="/admin" class="settings-link">⚙️ Settings</a>
      <div class="version">v{health?.version || '1.0.0'}</div>
    </div>
  </div>
</div>

<style>
  .system-health {
    font-family: 'JetBrains Mono', monospace;
    padding: 1rem 1.5rem;
    border-radius: 16px;
    font-size: 0.8rem;
  }

  .content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    color: var(--text-secondary);
  }

  .left-section, .right-section {
    display: flex;
    align-items: center;
    gap: 1.5rem;
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
    gap: 0.5rem;
    padding: 0.35rem 0.75rem;
    border-radius: 8px;
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
    font-size: 0.9rem;
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
    font-size: 0.75rem;
    font-weight: 500;
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

  .version {
    font-size: 0.75rem;
    color: var(--text-tertiary);
  }
</style>
