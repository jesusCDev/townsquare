<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';
  import { afterNavigate } from '$app/navigation';
  import { page } from '$app/stores';
  import { socket, connectSocket } from '$lib/stores/socket';
  import { nightMode } from '$lib/stores/nightmode';
  import { blurMode } from '$lib/stores/blurmode';

  let refreshPulse = false;
  let refreshInterval: ReturnType<typeof setInterval>;

  // Only show dim overlay on main dashboard and mobile pages
  $: showDimOverlay = $page.url.pathname === '/' || $page.url.pathname === '/mobile';
  $: isDimActive = $nightMode && showDimOverlay;

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

<div class="app-container" class:dim-active={isDimActive}>
  <slot />
  <div class="dim-overlay" class:active={isDimActive}></div>
  <div class="blur-overlay" class:active={$blurMode}></div>
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
      rgba(0, 0, 0, 0.85) 0%,
      rgba(5, 5, 20, 0.9) 100%
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

  .blur-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    z-index: 9998;
    will-change: opacity;
  }

  .blur-overlay.active {
    opacity: 1;
  }

  /* Dim mode clock enhancement - make it bigger and lighter */
  .app-container.dim-active :global(.time) {
    font-size: clamp(4rem, 8vw, 6rem) !important;
    color: rgba(103, 254, 153, 0.95) !important;
    text-shadow: 0 0 30px rgba(103, 254, 153, 0.5) !important;
  }

  .app-container.dim-active :global(.center-section .time) {
    font-size: clamp(3.5rem, 7vw, 5rem) !important;
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
