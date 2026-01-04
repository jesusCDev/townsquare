<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';
  import { afterNavigate } from '$app/navigation';
  import { socket, connectSocket } from '$lib/stores/socket';
  import { nightMode } from '$lib/stores/nightmode';

  let refreshPulse = false;
  let refreshInterval: ReturnType<typeof setInterval>;

  // Trigger a subtle screen refresh to clear TV ghosting
  function triggerRefresh() {
    refreshPulse = true;
    // Use requestAnimationFrame for smooth timing
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        refreshPulse = false;
      });
    });
  }

  onMount(() => {
    connectSocket();

    // Periodic refresh every 45 seconds to prevent ghosting buildup
    refreshInterval = setInterval(triggerRefresh, 45000);

    return () => {
      $socket?.disconnect();
      if (refreshInterval) clearInterval(refreshInterval);
    };
  });

  // Refresh on page navigation
  afterNavigate(() => {
    triggerRefresh();
  });
</script>

<div class="app-container">
  <slot />
  <div class="dim-overlay" class:active={$nightMode}></div>
  <div class="refresh-pulse" class:active={refreshPulse}></div>
</div>

<style>
  .app-container {
    position: relative;
    min-height: 100vh;
  }

  .dim-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(
      135deg,
      rgba(0, 0, 0, 0.65) 0%,
      rgba(5, 5, 20, 0.7) 100%
    );
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.8s cubic-bezier(0.4, 0, 0.2, 1);
    z-index: 9999;
    will-change: opacity;
  }

  .dim-overlay.active {
    opacity: 1;
  }

  /* Subtle refresh pulse - nearly invisible but forces TV pixel refresh */
  .refresh-pulse {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(128, 128, 128, 0);
    pointer-events: none;
    z-index: 10000;
    will-change: background;
  }

  .refresh-pulse.active {
    background: rgba(128, 128, 128, 0.008);
  }
</style>
