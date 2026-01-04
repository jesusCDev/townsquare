<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { format } from 'date-fns';
  import Header from '$lib/components/Header.svelte';
  import HabitTracker from '$lib/components/HabitTracker.svelte';
  import Timeline from '$lib/components/Timeline.svelte';
  import AlertNotification from '$lib/components/AlertNotification.svelte';
  import { nightModeInfo, temporarilyDisableDim, manuallyEnableDim } from '$lib/stores/nightmode';
  import { habits } from '$lib/stores/habits';
  import { triggerDismissAlert } from '$lib/stores/alertActions';

  let toastMessage = '';
  let showToast = false;

  function showNotification(message: string) {
    toastMessage = message;
    showToast = true;
    setTimeout(() => {
      showToast = false;
    }, 2000);
  }

  // Toggle habit by index (0-based, so key 1 = index 0)
  async function toggleHabitByIndex(index: number) {
    const habitList = $habits;
    if (index < 0 || index >= habitList.length) return;

    const habit = habitList[index];
    const dateStr = format(new Date(), 'yyyy-MM-dd');

    try {
      // Get current entry count
      const entriesRes = await fetch(`/api/habits/${habit.id}/entries?days=1`);
      const entriesData = await entriesRes.json();
      const entries = entriesData.entries || entriesData || [];
      const todayEntry = entries.find((e: any) => e.date === dateStr);
      const currentCount = todayEntry?.count || 0;

      // Calculate new count (cycle: 0 -> 1 -> ... -> target -> 0)
      const newCount = currentCount >= habit.targetCount ? 0 : currentCount + 1;

      if (newCount === 0) {
        // Delete entry to reset
        await fetch(`/api/habits/${habit.id}/entries/${dateStr}`, { method: 'DELETE' });
        showNotification(`${habit.icon || '▪'} ${habit.name} reset`);
      } else {
        // Complete/increment
        await fetch(`/api/habits/${habit.id}/complete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date: dateStr }),
        });
        const status = newCount >= habit.targetCount ? 'complete!' : `${newCount}/${habit.targetCount}`;
        showNotification(`${habit.icon || '▪'} ${habit.name} ${status}`);
      }
    } catch (error) {
      console.error('Failed to toggle habit:', error);
      showNotification('Failed to update habit');
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    // Ignore if user is typing in an input field
    if (event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement) {
      return;
    }

    // Space - Dismiss alert
    if (event.key === ' ' || event.code === 'Space') {
      event.preventDefault();
      triggerDismissAlert();
      return;
    }

    // Number keys 1-9 - Toggle habits
    if (event.key >= '1' && event.key <= '9') {
      event.preventDefault();
      const index = parseInt(event.key) - 1; // Convert to 0-based index
      toggleHabitByIndex(index);
      return;
    }

    // D key - Toggle dim mode
    if (event.key === 'd' || event.key === 'D') {
      event.preventDefault();
      event.stopPropagation(); // Prevent other handlers from catching this
      console.log('[Shortcut] D key pressed, nightModeInfo:', $nightModeInfo);

      if ($nightModeInfo.isActive) {
        // Dim mode is currently on - turn it off
        temporarilyDisableDim();
        showNotification('Dim mode disabled (auto re-enables at morning)');
      } else {
        // Dim mode is off - turn it on
        manuallyEnableDim();
        showNotification('Dim mode enabled');
      }
    }
  }

  onMount(() => {
    if (typeof window !== 'undefined') {
      // Add our handler in capture phase so it runs before the nightmode store's handler
      window.addEventListener('keydown', handleKeydown, true);
    }
  });

  onDestroy(() => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('keydown', handleKeydown, true);
    }
  });
</script>

<svelte:head>
  <title>LifeBoard</title>
</svelte:head>

<div class="dashboard">
  <!-- Header -->
  <div class="header-section animate-in animate-in-1">
    <Header />
  </div>

  <!-- Habit Tracker -->
  <div class="habit-section animate-in animate-in-2">
    <HabitTracker />
  </div>

  <!-- Timeline -->
  <div class="timeline-section animate-in animate-in-3">
    <Timeline />
  </div>

  <!-- Alert Notification Overlay -->
  <AlertNotification />

  <!-- Toast Notification -->
  {#if showToast}
    <div class="toast" class:show={showToast}>
      {toastMessage}
    </div>
  {/if}
</div>

<style>
  .dashboard {
    display: grid;
    grid-template-rows: auto 1fr auto;
    height: 100vh;
    width: 100vw;
    padding: 1.5rem;
    gap: 1.5rem;
    overflow: hidden;
    box-sizing: border-box;
  }

  .header-section {
    grid-row: 1;
  }

  .habit-section {
    grid-row: 2;
    overflow-y: auto;
  }

  .timeline-section {
    grid-row: 3;
  }

  .toast {
    position: fixed;
    bottom: 2rem;
    right: 2rem;
    background: rgba(0, 0, 0, 0.9);
    color: var(--accent-primary);
    padding: 1rem 1.5rem;
    border-radius: 12px;
    border: 2px solid var(--accent-primary);
    font-weight: 600;
    font-size: 0.95rem;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6),
                0 0 20px rgba(103, 254, 153, 0.3);
    z-index: 10000;
    animation: slideIn 0.3s ease-out;
  }

  @keyframes slideIn {
    from {
      transform: translateX(400px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  .toast.show {
    display: block;
  }
</style>
