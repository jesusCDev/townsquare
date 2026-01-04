<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';
  import { socket, connectSocket } from '$lib/stores/socket';
  import { nightMode } from '$lib/stores/nightmode';

  onMount(() => {
    connectSocket();

    return () => {
      $socket?.disconnect();
    };
  });
</script>

<div class="app-container">
  <slot />
  <div class="dim-overlay" class:active={$nightMode}></div>
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
</style>
