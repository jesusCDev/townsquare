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

<div class:night-mode={$nightMode}>
  <slot />
</div>
